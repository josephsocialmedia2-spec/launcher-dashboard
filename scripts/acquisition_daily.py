#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""F1 Acquisition Engine — public daily task generator.

Canonical directives:
- Villar Dora is the single radial hub for canonical territory configuration.
- Every commune is resolved through config/territory.json and tagged CENTRO/SINISTRA/DESTRA.
- Market observations are classified as competitor/private/expired candidate without inventing certainty.
- Every observed market signal becomes a privacy-safe public Seller Radar record/task.
- Private CRM data stays in Supabase; this file never publishes private contact details.
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
FORBIDDEN_PUBLIC_KEYS = {"telefono", "phone", "email", "nome", "cognome", "author_public", "phone_public", "email_public", "public_entities"}


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
        seed = "|".join([str(signal.get("comune") or "").strip(), str(signal.get("indirizzo") or "").strip(), str(signal.get("immobile") or "").strip()])
    return "PROP-" + hashlib.sha1(seed.encode("utf-8", errors="ignore")).hexdigest()[:16].upper()


def territory_side(comune: str, territory: dict) -> str:
    c = norm(comune)
    if c == norm(territory.get("reference_hub")):
        return "CENTRO"
    if c in {norm(x) for x in territory.get("sinistra") or []}:
        return "SINISTRA"
    if c in {norm(x) for x in territory.get("destra") or []}:
        return "DESTRA"
    return "FUORI_TERRITORIO"


def classify(signal: dict) -> dict:
    hay = norm(" ".join(str(signal.get(k) or "") for k in ("seller_signal", "priorita", "immobile", "fonte", "status")))
    event, task, reason, core, market = "PROPERTY_FIRST_SEEN", "MONITOR", "Annuncio di mercato registrato e da monitorare", "", "MARKET_LISTING"
    flags: list[str] = []

    explicit_fsbo = re.search(r"\bfsbo\b|vendita privata|trattativa privata", hay)
    private_candidate = re.search(r"indizio privat|(^|\s)privato(\s|$)|no agenzi|no intermediari", hay)
    explicit_expired = re.search(r"incarico scaduto|mandato scaduto|scaduto verificato", hay)
    expired_candidate = re.search(r"invendut|possibile scadut|ritirat|non piu rilevat|cambio agenz|ripubblic|relist", hay)
    competitor = re.search(r"indizio agenz|competitor|agenzia", hay)

    if explicit_fsbo:
        event, task, reason, core, market = "FSBO_FOUND", "CALL", "FSBO / vendita privata con evidenza esplicita", "FSBO", "FSBO"
        flags.append("FSBO_NEW")
        if re.search(r"no agenzi|no intermediari", hay): flags.append("NO_AGENCIES")
    elif private_candidate:
        event, task, reason, core, market = "FSBO_CANDIDATE_FOUND", "VERIFY", "Indizio di vendita privata da verificare", "FSBO_CANDIDATE", "FSBO_CANDIDATE"
        flags.append("FSBO_NEW")
    elif explicit_expired:
        event, task, reason, core, market = "EXPIRED_VERIFIED", "VERIFY", "Incarico scaduto con evidenza esplicita: verificare contattabilità", "EXPIRED_OR_POSSIBLE_EXPIRED", "EXPIRED_VERIFIED"
        flags.append("EXPIRED_CANDIDATE")
    elif expired_candidate:
        if "cambio agenz" in hay:
            event = "PROPERTY_AGENCY_CHANGED"; flags.append("AGENCY_CHANGE")
        elif re.search(r"ripubblic|relist", hay):
            event = "PROPERTY_RELISTED"; flags.append("RELISTED")
        else:
            event = "EXPIRED_CANDIDATE_FOUND"
        task, reason, core, market = "VERIFY", "Possibile scaduto / stato incarico da verificare", "EXPIRED_OR_POSSIBLE_EXPIRED", "EXPIRED_CANDIDATE"
        flags.append("EXPIRED_CANDIDATE")
    elif re.search(r"ribasso|price", hay):
        event, task, reason, market = "PROPERTY_PRICE_CHANGED", "MONITOR", "Variazione prezzo: continua monitoraggio concorrenza", "COMPETITOR_LISTING"
        flags.append("PRICE_DROP")
    elif competitor:
        event, task, reason, market = "COMPETITOR_LISTING_FOUND", "MONITOR", "Annuncio di agenzia concorrente da monitorare", "COMPETITOR_LISTING"
        flags.append("COMPETITOR_LISTING")

    return {"pillar": 1, "event_type": event, "task_type": task, "reason": reason, "core_category": core, "market_category": market, "flags": flags}


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
    immobile = str(signal.get("immobile") or "").strip()
    prezzo = str(signal.get("prezzo") or "").strip()
    confidence = "HIGH" if source_url else "MEDIUM"
    side = territory_side(comune, territory)
    event = {
        "event_id": event_id, "event_type": c["event_type"], "pillar": 1, "property_id": property_id,
        "source": source, "source_url": source_url, "comune": comune, "via": indirizzo,
        "immobile": immobile, "prezzo": prezzo,
        "territory_side": side, "market_category": c["market_category"], "confidence": confidence,
        "occurred_at": str(signal.get("first_seen") or signal.get("enriched_at") or ""),
        "evidence_rule": "Non inferire FSBO verificato, VENDUTO, INCARICO_SCADUTO o proprietà personale senza evidenza sufficiente."
    }
    task = {
        "task_id": task_id, "event_id": event_id, "lead_id": "", "property_id": property_id, "pillar": 1,
        "task_type": c["task_type"], "reason": c["reason"], "priority": priority, "due_date": today,
        "assigned_to": "", "status": "OPEN", "created_at": str(signal.get("first_seen") or datetime.now(tz=ZoneInfo("Europe/Rome")).isoformat()),
        "completed_at": "", "outcome": "", "source": source, "source_url": source_url, "comune": comune, "via": indirizzo,
        "immobile": immobile, "prezzo": prezzo,
        "civico": "", "zona": "", "lead_reason": c["reason"], "confidence": confidence,
        "core_category": c["core_category"], "market_category": c["market_category"], "territory_side": side,
        "seller_signal": str(signal.get("seller_signal") or "").strip(), "is_new": bool(signal.get("is_new")),
        "territory_hub": territory.get("reference_hub", ""), "crm_required": True,
        "updated_at": datetime.now(tz=ZoneInfo("Europe/Rome")).isoformat(),
    }
    return event, task


def assert_public_safe(payload: object, path="root"):
    if isinstance(payload, dict):
        for key, value in payload.items():
            if norm(key) in FORBIDDEN_PUBLIC_KEYS: raise ValueError(f"Forbidden public key at {path}.{key}")
            assert_public_safe(value, f"{path}.{key}")
    elif isinstance(payload, list):
        for i, value in enumerate(payload): assert_public_safe(value, f"{path}[{i}]")


def build_payload(territory: dict, engine: dict, neighborhood: dict) -> dict:
    now = datetime.now(tz=ZoneInfo("Europe/Rome")); today = now.date().isoformat(); allowed = allowed_communes(territory)
    events, tasks = [], []
    for signal in neighborhood.get("signals") or []:
        if norm(signal.get("comune")) not in allowed: continue
        event, task = event_and_task(signal, engine, territory, today); events.append(event); tasks.append(task)
    events = list({e["event_id"]: e for e in events}.values()); tasks = list({t["task_id"]: t for t in tasks}.values())
    side_rank = {"CENTRO": 0, "SINISTRA": 1, "DESTRA": 2, "FUORI_TERRITORIO": 9}
    tasks.sort(key=lambda x: (side_rank.get(x.get("territory_side"), 9), -safe_int(x.get("priority")), x.get("comune", ""), x.get("via", "")))
    summary = {
        "signals": len(events), "tasks": len(tasks),
        "competitor_listings": sum(t.get("market_category") == "COMPETITOR_LISTING" for t in tasks),
        "market_unclassified": sum(t.get("market_category") == "MARKET_LISTING" for t in tasks),
        "fsbo": sum(t.get("core_category") == "FSBO" for t in tasks),
        "fsbo_candidates": sum(t.get("core_category") == "FSBO_CANDIDATE" for t in tasks),
        "possible_expired": sum(t.get("market_category") == "EXPIRED_CANDIDATE" for t in tasks),
        "expired_verified": sum(t.get("market_category") == "EXPIRED_VERIFIED" for t in tasks),
        "price_changes": sum(e.get("event_type") == "PROPERTY_PRICE_CHANGED" for e in events),
        "agency_changes": sum(e.get("event_type") == "PROPERTY_AGENCY_CHANGED" for e in events),
        "relisted": sum(e.get("event_type") == "PROPERTY_RELISTED" for e in events),
    }
    payload = {
        "version": 4, "generated_at": now.isoformat(), "territory_version": territory.get("version"),
        "reference_hub": territory.get("reference_hub"), "territory_policy": territory.get("policy"),
        "territory_sides": {"sinistra": territory.get("sinistra") or [], "destra": territory.get("destra") or []},
        "market_coverage": territory.get("market_coverage") or {},
        "privacy": "Feed pubblico non sensibile. Nessun telefono, email, nominativo privato o contatto di residente.",
        "summary": summary, "events": events, "tasks": tasks,
    }
    assert_public_safe(payload); return payload


def main():
    territory = load_json(TERRITORY_PATH, {}); engine = load_json(ENGINE_PATH, {}); neighborhood = load_json(NEIGHBORHOOD_PATH, {"signals": []})
    if territory.get("reference_hub") != "Villar Dora": raise SystemExit("config/territory.json non valido: Villar Dora deve essere reference_hub")
    if not engine.get("pillars"): raise SystemExit("config/acquisition-engine.json non valido: pillars mancanti")
    payload = build_payload(territory, engine, neighborhood)
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("F1 Acquisition Daily:", f"hub={payload['reference_hub']}", f"events={len(payload['events'])}", f"tasks={len(payload['tasks'])}")


if __name__ == "__main__": main()
