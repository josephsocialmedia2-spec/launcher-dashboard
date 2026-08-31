#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sincronizza i risultati F1 Directory Radar nel cloud autenticato F1.

Legge l'ultimo LISTA_TELEFONATE_*.csv generato sul PC e crea record dedicati
nel CRM cloud con prefisso DIR-. I dati personali non vengono mai scritti su
GitHub: transitano solo dal PC al progetto Supabase già autenticato nel Bridge.
"""
from __future__ import annotations
import csv, hashlib, json, time, urllib.request
from datetime import datetime
from pathlib import Path

DOCS = Path.home() / "Documents"
RADAR = DOCS / "F1_Directory_Radar"
RESULTS = RADAR / "RISULTATI"
BRIDGE_CFG = DOCS / "F1_Bridge" / "config.json"
LOG = RADAR / "mobile_sync.log"


def log(msg):
    RADAR.mkdir(parents=True, exist_ok=True)
    line = f"{datetime.now():%Y-%m-%d %H:%M:%S} | {msg}"
    print(line)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def load_cfg():
    if not BRIDGE_CFG.exists():
        raise RuntimeError("Bridge F1 non configurato: manca Documents/F1_Bridge/config.json")
    c = json.loads(BRIDGE_CFG.read_text(encoding="utf-8"))
    if not c.get("supabase_url") or not c.get("anon_key"):
        raise RuntimeError("Cloud F1 non configurato nel Bridge")
    return c


def save_cfg(c):
    BRIDGE_CFG.write_text(json.dumps(c, ensure_ascii=False, indent=2), encoding="utf-8")


def http_json(url, method="GET", data=None, headers=None, timeout=45):
    body = None if data is None else json.dumps(data, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=body, method=method, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        raw = res.read().decode("utf-8")
    return json.loads(raw) if raw else None


def access_token(c):
    if c.get("access_token") and time.time() < float(c.get("expires_at", 0)) - 60:
        return c["access_token"]
    if not c.get("refresh_token"):
        raise RuntimeError("Login cloud mancante nel Bridge F1")
    base = str(c["supabase_url"]).rstrip("/")
    j = http_json(
        base + "/auth/v1/token?grant_type=refresh_token",
        "POST",
        {"refresh_token": c["refresh_token"]},
        {"apikey": c["anon_key"], "Content-Type": "application/json"},
    )
    c["access_token"] = j["access_token"]
    c["refresh_token"] = j.get("refresh_token", c["refresh_token"])
    c["expires_at"] = time.time() + float(j.get("expires_in", 3600))
    save_cfg(c)
    return c["access_token"]


def latest_report():
    files = sorted(RESULTS.glob("LISTA_TELEFONATE_*.csv"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        raise RuntimeError("Nessuna LISTA_TELEFONATE trovata")
    return files[0]


def read_rows(path):
    with path.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def stable_id(r):
    key = "|".join([
        r.get("Comune", ""), r.get("Via annuncio", ""), r.get("Civico annuncio", ""), r.get("Telefono", "")
    ]).lower().strip()
    return "DIR-" + hashlib.sha1(key.encode("utf-8")).hexdigest()[:20]


def make_row(r):
    phone = str(r.get("Telefono", "")).strip()
    if not phone:
        return None
    address = " ".join(x for x in [r.get("Via contatto", ""), r.get("Civico contatto", "")] if x).strip()
    if r.get("Comune"):
        address = (address + ", " + r["Comune"]).strip(", ")
    details = [
        "DIRECTORY RADAR",
        f"Match: {r.get('Match','DA_VERIFICARE')}",
        f"Annuncio: {r.get('Immobile','')}",
        f"Indirizzo annuncio: {r.get('Via annuncio','')} {r.get('Civico annuncio','')}, {r.get('Comune','')}",
        f"Prezzo: {r.get('Prezzo','')}",
        f"Fonte annuncio: {r.get('Fonte annuncio','')}",
        f"URL annuncio: {r.get('URL annuncio','')}",
        f"URL contatto: {r.get('URL contatto','')}",
        "RPO: DA_VERIFICARE",
        "CALL ALLOWED: NO",
        "Stessa via/civico non prova la proprietà dell'immobile.",
    ]
    return {
        "id": stable_id(r),
        "name": r.get("Contatto pubblico", "") or "Contatto pubblico",
        "phone": phone,
        "address": address,
        "source": "Directory Radar · " + (r.get("Fonte contatto", "") or "Fonte pubblica"),
        "note": " | ".join(x for x in details if x),
        "outcome": "Da verificare",
        "next_action": "Verifica RPO prima della chiamata",
        "followup_date": None,
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "device_id": "directory-radar",
        "deleted": False,
    }


def sync():
    path = latest_report()
    rows = [x for r in read_rows(path) if (x := make_row(r))]
    if not rows:
        log("Nessun numero da sincronizzare")
        return 0
    c = load_cfg()
    token = access_token(c)
    base = str(c["supabase_url"]).rstrip("/")
    table = c.get("contacts_table", "contacts")
    url = base + f"/rest/v1/{table}?on_conflict=id"
    headers = {
        "apikey": c["anon_key"],
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    for i in range(0, len(rows), 200):
        http_json(url, "POST", rows[i:i+200], headers)
    log(f"F1 OS Mobile Ready aggiornato: {len(rows)} risultati da {path.name}")
    return len(rows)


if __name__ == "__main__":
    try:
        sync()
    except Exception as e:
        log(f"Sync mobile non eseguito: {e}")
        raise SystemExit(2)
