#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""F1 Acquisition Engine — public daily task generator.

Reads existing non-sensitive Seller/Neighborhood signals and produces a compact,
privacy-safe task/event feed for GitHub Pages. Private CRM data belongs in Supabase
and is intentionally not read or written by this script.
"""
from __future__ import annotations

import hashlib
import json
import re
import unicodedata
import uuid
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
TERRITORY_PATH = ROOT / "config" / "territory.json"
ENGINE_PATH = ROOT / "config" / "acquisition-engine.json"
NEIGHBORHOOD_PATH = ROOT / "data" / "neighborhood_intelligence.json"
OUT_PATH = ROOT / "data" / "acquisition-public.json"

NAMESPACE = uuid.UUID("6f15dc95-a23b-48e8-91e8-67c3e96770f1")
FORBIDDEN_PUBLIC_KEYS = {
    "telefono", "phone", "email", "nome", "cognome", "author_public",
    "phone_public", "email_public", "public_entities",
}


def load_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def norm(value: object) -> str:
    text = str(value or "").strip().lower().replace("’", "'")
    text = "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", text)


def safe_int(value, default=0):
    try:
        return int(float(value))
    except Exception:
        return default


def stable_property_id(signal: dict) -> str:
    seed = str(signal.get("url_annuncio") or "").strip()
    if not seed:
        seed = "|".join([
            str(signal.get("comune") or "").strip(),
            str(signal.get("indirizzo") or "").strip(),
            str(signal.get("immobile") or "").strip(),
        ])
    return "PROP-" + hashlib.sha1(seed.encode("utf-8", errors="ignore")).hexdigest()[:16].upper()


def classify(signal: dict) -> dict:
    hay = norm(" ".join(str(signal.get(k) or "") for k in ("seller_signal", "priorita", "immobile")))
    event = "PROPERTY_FIRST_SEEN"
    task = "VERIFY"
    reason = "Segnale immobiliare da verificare"
    core = ""
    flags: list[str] = []

    explicit_fsbo = re.search(r"\bfsbo\b|vendita privata|trattativa privata", hay)
    private_candidate = re.search(r"indizio privat|(^|\s)privato(\s|$)|no agenzi|no intermediari", hay)

    if explicit_fsbo:
        event, task, reason, core = "FSBO_FOUND", "CALL", "FSBO / vendita privata con evidenza esplicita", "FSBO"
        flags.append("FSBO_NEW")
        if re.search(r"no agenzi|no intermediari", hay):
            flags.append("NO_AGENCIES")
    elif private_candidate:
        event, task, reason, core = "FSBO_CANDIDATE_FOUND", "VERIFY", "Indizio di vendita privata da verificare", "FSBO_CANDIDATE"
        flags.append("FSBO_NEW")
        if re.search(r"no agenzi|no intermediari", hay):
            flags.append("NO_AGENCIES")
    elif "cambio agenz" in hay:
        event, task, reason, core = "PROPERTY_AGENCY_CHANGED", "VERIFY", "Cambio agenzia rilevato", "EXPIRED_OR_POSSIBLE_EXPIRED"
        flags.append("AGENCY_CHANGE")
    elif re.search(r"ripubblic|relist", hay):
        event, task, reason, core = "PROPERTY_RELISTED", "VERIFY", "Immobile ripubblicato", "EXPIRED_OR_POSSIBLE_EXPIRED"
        flags.append("RELISTED")
    elif re.search(r"ribasso|price", hay):
        event, task, reason = "PROPERTY_PRICE_CHANGED", "VERIFY", "Variazione prezzo rilevata"
        flags.append("PRICE_DROP")
        if re.search(r"multiplo|piu ribassi|multiple", hay):
            flags.append("MULTIPLE_PRICE_DROPS")
    elif re.search(r"invendut|possibile scadut|ritirat|non piu rilevat", hay):
        event, task, reason, core = "PROPERTY_NOT_SEEN", "VERIFY", "Possibile scaduto / stato da verificare", "EXPIRED_OR_POSSIBLE_EXPIRED"

    return {"pillar": 1, "event_type": event, "task_type": task, "reason": reason, "core_category": core, "flags": flags}


def score(signal: dict, classification: dict, engine: dict) -> int:
    rules = engine.get("scoring") or {}
    bonus = sum(safe_int(rules.get(flag), 0) for flag in classification.get("flags", []))
    existing = max(0, min(100, safe_int(signal.get("score"), 0)))
    return max(existing, min(100, bonus))


def allowed_communes(territory: dict) -> set[str]:
    values = [territory.get("reference_hub"), *(territory.get("sinistra") or []), *(territory.get("destra") or [])]
    return {norm(x) for x in values if x}


def event_and_task(signal: dict, engine: dict, territory: dict, today: str) -> tuple[dict, dict]:
    c = classify(signal)
    property_id = stable_property_id(signal)
    signal_id = str(signal.get("signal_id") or property_id)
    event_id = str(uuid.uuid5(NAMESPACE, f"{signal_id}|{c['event_type']}"))
    task_id = str(uuid.uuid5(NAMESPACE, f"{event_id}|{c['task_type']}"))
    priority = score(signal, c, engine)
    comune = str(signal.get("comune") or "").strip()
    indirizzo = str(signal.get("indirizzo") or "").strip()
    source_url = str(signal.get("url_annuncio") or "").strip()
    source = str(signal.get("fonte") or "Seller Radar F1").strip()
    confidence = "HIGH" if source_url else "MEDIUM"
    event = {
        "event_id": event_id,
        "event_type": c["event_type"],
        "pillar": c["pillar"],
        "property_id": property_id,
        "source": source,
        "source_url": source_url,
        "comune": comune,
        "via": indirizzo,
        "confidence": confidence,
        "occurred_at": str(signal.get("first_seen") or signal.get("enriched_at") or ""),
        "evidence_rule": "Non inferire FSBO verificato, VENDUTO, INCARICO_SCADUTO o proprietà personale senza evidenza sufficiente.",
    }
    task = {
        "task_id": task_id,
        "event_id": event_id,
        "lead_id": "",
        "property_id": property_id,
        "pillar": c["pillar"],
        "task_type": c["task_type"],
        "reason": c["reason"],
        "priority": priority,
        "due_date": today,
        "assigned_to": "",
        "status": "OPEN",
        "created_at": str(signal.get("first_seen") or datetime.now(tz=ZoneInfo("Europe/Rome")).isoformat()),
        "completed_at": "",
        "outcome": "",
        "source": source,
        "source_url": source_url,
        "comune": comune,
        "via": indirizzo,
        "civico": "",
        "zona": "",
        "lead_reason": c["reason"],
        "confidence": confidence,
        "core_category": c["core_category"],
        "seller_signal": str(signal.get("seller_signal") or "").strip(),
        "is_new": bool(signal.get("is_new")),
        "territory_hub": territory.get("reference_hub", ""),
        "updated_at": datetime.now(tz=ZoneInfo("Europe/Rome")).isoformat(),
    }
    return event, task


def assert_public_safe(payload: object, path="root"):
    if isinstance(payload, dict):
        for key, value in payload.items():
            if norm(key) in FORBIDDEN_PUBLIC_KEYS:
                raise ValueError(f"Forbidden public key at {path}.{key}")
            assert_public_safe(value, f"{path}.{key}")
    elif isinstance(payload, list):
        for i, value in enumerate(payload):
            assert_public_safe(value, f"{path}[{i}]")


def build_payload(territory: dict, engine: dict, neighborhood: dict) -> dict:
    now = datetime.now(tz=ZoneInfo("Europe/Rome"))
    today = now.date().isoformat()
    allowed = allowed_communes(territory)
    events, tasks = [], []
    for signal in neighborhood.get("signals") or []:
        if norm(signal.get("comune")) not in allowed:
            continue
        event, task = event_and_task(signal, engine, territory, today)
        events.append(event)
        tasks.append(task)

    events = list({e["event_id"]: e for e in events}.values())
    tasks = list({t["task_id"]: t for t in tasks}.values())
    tasks.sort(key=lambda x: (-safe_int(x.get("priority")), x.get("comune", ""), x.get("via", "")))

    summary = {
        "signals": len(events),
        "tasks": len(tasks),
        "fsbo": sum(t.get("core_category") == "FSBO" for t in tasks),
        "fsbo_candidates": sum(t.get("core_category") == "FSBO_CANDIDATE" for t in tasks),
        "possible_expired": sum(t.get("core_category") == "EXPIRED_OR_POSSIBLE_EXPIRED" for t in tasks),
        "price_changes": sum(e.get("event_type") == "PROPERTY_PRICE_CHANGED" for e in events),
        "agency_changes": sum(e.get("event_type") == "PROPERTY_AGENCY_CHANGED" for e in events),
        "relisted": sum(e.get("event_type") == "PROPERTY_RELISTED" for e in events),
    }
    payload = {
        "version": 2,
        "generated_at": now.isoformat(),
        "territory_version": territory.get("version"),
        "reference_hub": territory.get("reference_hub"),
        "territory_policy": territory.get("policy"),
        "privacy": "Feed pubblico non sensibile. Nessun telefono, email, nominativo privato o contatto di residente.",
        "summary": summary,
        "events": events,
        "tasks": tasks,
    }
    assert_public_safe(payload)
    return payload


def main():
    territory = load_json(TERRITORY_PATH, {})
    engine = load_json(ENGINE_PATH, {})
    neighborhood = load_json(NEIGHBORHOOD_PATH, {"signals": []})
    if not territory.get("reference_hub"):
        raise SystemExit("config/territory.json non valido: reference_hub mancante")
    if not engine.get("pillars"):
        raise SystemExit("config/acquisition-engine.json non valido: pillars mancanti")
    payload = build_payload(territory, engine, neighborhood)
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("F1 Acquisition Daily:",f"hub={payload['reference_hub']}",f"events={len(payload['events'])}",f"tasks={len(payload['tasks'])}")


if __name__ == "__main__":
    main()
