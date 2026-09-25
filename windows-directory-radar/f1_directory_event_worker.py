#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""F1 Directory Radar — worker eventi cloud.

Flusso:
1) preleva fino a N vie QUEUED da Supabase;
2) apre Chrome visibile solo se esistono lavori;
3) cerca contatti pubblici sulle stesse vie con il motore Directory Radar;
4) unisce/deduplica con gli archivi locali;
5) sincronizza i risultati nella tabella contacts con RPO=DA_VERIFICARE;
6) chiude il job cloud.

Nessun contatto viene promosso automaticamente in leads: la promozione avviene
solo dopo conferma RPO dalla dashboard Directory Radar.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime
from pathlib import Path

import f1_directory_radar as core
import f1_directory_mobile_sync as cloud


def api_headers(cfg, token, prefer="return=representation"):
    return {
        "apikey": cfg["anon_key"],
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
        "Prefer": prefer,
    }


def rpc(cfg, token, name, payload):
    base = str(cfg["supabase_url"]).rstrip("/")
    return cloud.http_json(
        base + "/rest/v1/rpc/" + name,
        "POST",
        payload,
        api_headers(cfg, token),
    )


def claim_jobs(cfg, token, limit=3):
    data = rpc(cfg, token, "f1_directory_claim_jobs_v1", {"p_limit": int(limit)}) or {}
    jobs = data.get("jobs") if isinstance(data, dict) else []
    return jobs if isinstance(jobs, list) else []


def complete_job(cfg, token, job_id, status, count=0, error=""):
    return rpc(
        cfg,
        token,
        "f1_directory_complete_job_v1",
        {
            "p_job_id": job_id,
            "p_status": status,
            "p_result_count": int(count or 0),
            "p_error": str(error or "")[:2000],
        },
    )


def target_from_job(j):
    return {
        "id": j.get("opportunity_id") or j.get("id") or "",
        "comune": j.get("comune") or "",
        "address": " ".join(x for x in [j.get("via"), j.get("civico")] if x).strip(),
        "street": j.get("via") or "",
        "civic": j.get("civico") or "",
        "property": j.get("listing_title") or "",
        "price": "",
        "listing_source": j.get("listing_source") or "",
        "listing_url": j.get("listing_url") or "",
        "signal": j.get("seller_signal") or "",
    }


def stable_contact_id(row):
    phone = core.pd(row.get("Telefono"))
    key = "|".join([
        phone,
        core.norm(row.get("Comune")),
        core.skey(row.get("Via contatto")),
        core.norm(row.get("Civico contatto")),
    ])
    return "DIR2-" + hashlib.sha1(key.encode("utf-8")).hexdigest()[:24]


def contact_cloud_row(row, job):
    phone = str(row.get("Telefono") or "").strip()
    if not core.pd(phone):
        return None

    contact_address = " ".join(
        x for x in [row.get("Via contatto", ""), row.get("Civico contatto", "")] if x
    ).strip()
    if row.get("Comune"):
        contact_address = (contact_address + ", " + row["Comune"]).strip(", ")

    note_parts = [
        "DIRECTORY RADAR EVENTO",
        "Match: " + (row.get("Match") or "DA_VERIFICARE"),
        "Annuncio: " + (row.get("Immobile") or ""),
        "Indirizzo annuncio: " + " ".join(
            x for x in [row.get("Via annuncio", ""), row.get("Civico annuncio", "")] if x
        ),
        "Fonte annuncio: " + (row.get("Fonte annuncio") or ""),
        "URL annuncio: " + (row.get("URL annuncio") or ""),
        "Fonte contatto: " + (row.get("Fonte contatto") or ""),
        "URL contatto: " + (row.get("URL contatto") or ""),
        "RPO: DA_VERIFICARE",
        "CALL ALLOWED: NO",
        "Stessa via/civico non prova la proprieta dell'immobile.",
    ]

    return {
        "id": stable_contact_id(row),
        "name": row.get("Contatto pubblico") or "Contatto pubblico",
        "phone": phone,
        "address": contact_address,
        "source": "Directory Radar · " + (row.get("Fonte contatto") or "Fonte pubblica"),
        "note": " | ".join(x for x in note_parts if x),
        "outcome": "RPO da verificare",
        "next_action": "Verifica RPO prima della chiamata",
        "followup_date": None,
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "device_id": "directory-radar-event",
        "deleted": False,
        "rpo_status": "DA_VERIFICARE",
        "call_allowed": False,
        "directory_job_id": job.get("id"),
        "listing_url": row.get("URL annuncio") or job.get("listing_url") or "",
        "listing_address": " ".join(
            x for x in [row.get("Via annuncio", ""), row.get("Civico annuncio", "")] if x
        ).strip(),
        "listing_title": row.get("Immobile") or job.get("listing_title") or "",
        "listing_source": row.get("Fonte annuncio") or job.get("listing_source") or "",
        "directory_match": row.get("Match") or "DA_VERIFICARE",
        "directory_comune": row.get("Comune") or job.get("comune") or "",
        "directory_via": row.get("Via contatto") or job.get("via") or "",
        "directory_civico": row.get("Civico contatto") or "",
    }


def upsert_contacts(cfg, token, rows):
    if not rows:
        return 0
    base = str(cfg["supabase_url"]).rstrip("/")
    url = base + "/rest/v1/contacts?on_conflict=id"
    headers = api_headers(cfg, token, "resolution=merge-duplicates,return=minimal")
    for i in range(0, len(rows), 100):
        cloud.http_json(url, "POST", rows[i:i+100], headers)
    return len(rows)


def blocked_for_job(blocks, job):
    jc = core.norm(job.get("comune"))
    jv = core.skey(job.get("via"))
    return any(
        core.norm(b.get("COMUNE")) == jc and core.skey(b.get("VIA")) == jv
        for b in (blocks or [])
    )


def run():
    core.ensure()
    cfg = cloud.load_cfg()
    token = cloud.access_token(cfg)
    local_cfg = core.cfg()
    limit = int(local_cfg.get("event_max_jobs", 3) or 3)

    jobs = claim_jobs(cfg, token, limit)
    if not jobs:
        core.log("Directory Event Worker: nessun nuovo segnale in coda")
        return 0

    core.log(f"Directory Event Worker: {len(jobs)} vie da elaborare")
    targets = [target_from_job(j) for j in jobs]

    try:
        local = core.local_contacts()
        fresh, blocks = core.collect(targets, local_cfg)
        merged = core.dedupe(local + fresh)
        core.write_master(merged)

        total_synced = 0
        for job, target in zip(jobs, targets):
            try:
                report_rows = core.cross([target], merged)
                useful = [r for r in report_rows if core.pd(r.get("Telefono"))]
                cloud_rows = [
                    x for r in useful
                    if (x := contact_cloud_row(r, job)) is not None
                ]
                synced = upsert_contacts(cfg, token, cloud_rows)
                total_synced += synced

                if synced:
                    status = "DONE"
                    err = ""
                elif blocked_for_job(blocks, job):
                    status = "BLOCKED"
                    err = "Directory/CAPTCHA bloccato; nessun contatto nuovo sincronizzato"
                else:
                    status = "DONE"
                    err = "Nessun contatto pubblico trovato per la via"

                complete_job(cfg, token, job["id"], status, synced, err)
                core.log(
                    f"Evento {job.get('comune')} · {job.get('via')}: "
                    f"{synced} contatti · {status}"
                )
            except Exception as exc:
                complete_job(cfg, token, job["id"], "ERROR", 0, str(exc))
                core.log(
                    f"Evento {job.get('comune')} · {job.get('via')} fallito: {exc}"
                )

        core.log(f"Directory Event Worker completato: {total_synced} contatti sincronizzati")
        return total_synced

    except Exception as exc:
        for job in jobs:
            try:
                complete_job(cfg, token, job["id"], "ERROR", 0, str(exc))
            except Exception:
                pass
        core.log(f"Directory Event Worker errore batch: {exc}")
        raise


if __name__ == "__main__":
    try:
        run()
    except Exception:
        raise SystemExit(2)
