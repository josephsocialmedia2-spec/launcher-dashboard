#!/usr/bin/env python3
from __future__ import annotations

import json
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PATH = ROOT / "config" / "territory.json"
MANDATORY_HUB = "Villar Dora"


def norm(value: object) -> str:
    text = str(value or "").strip().lower().replace("’", "'")
    text = "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")
    return " ".join(text.split())


def load_territory(path: Path = DEFAULT_PATH) -> dict:
    cfg = json.loads(path.read_text(encoding="utf-8"))
    if cfg.get("reference_hub") != MANDATORY_HUB:
        raise ValueError(f"territory.json: reference_hub deve essere {MANDATORY_HUB}")
    if not isinstance(cfg.get("sinistra"), list) or not isinstance(cfg.get("destra"), list):
        raise ValueError("territory.json: sinistra/destra devono essere array")
    mandatory = cfg.get("mandatory_rules") or {}
    required = ("radial_view_required", "left_right_required", "all_modules_use_this_config", "all_market_observations_to_crm", "competitor_listing_monitoring_required", "private_listing_monitoring_required", "expired_candidate_monitoring_required")
    missing = [key for key in required if mandatory.get(key) is not True]
    if missing:
        raise ValueError("territory.json: direttive obbligatorie mancanti: " + ", ".join(missing))
    return cfg


def communes(cfg: dict) -> list[str]:
    values = [cfg.get("reference_hub"), *(cfg.get("sinistra") or []), *(cfg.get("destra") or [])]
    out, seen = [], set()
    for value in values:
        if not value:
            continue
        key = norm(value)
        if key in seen:
            continue
        seen.add(key)
        out.append(str(value))
    return out


def allowed_set(cfg: dict) -> set[str]:
    return {norm(x) for x in communes(cfg)}


def rank_map(cfg: dict) -> dict[str, int]:
    return {norm(name): i for i, name in enumerate(communes(cfg))}


def side_of(cfg: dict, comune: str) -> str:
    key = norm(comune)
    if key == norm(cfg.get("reference_hub")):
        return "CENTRO"
    if key in {norm(x) for x in cfg.get("sinistra") or []}:
        return "SINISTRA"
    if key in {norm(x) for x in cfg.get("destra") or []}:
        return "DESTRA"
    return "FUORI_TERRITORIO"


def coverage_required(cfg: dict) -> bool:
    return bool((cfg.get("market_coverage") or {}).get("crm_required"))
