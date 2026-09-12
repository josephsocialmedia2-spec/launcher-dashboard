#!/usr/bin/env python3
from __future__ import annotations

import json
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PATH = ROOT / "config" / "territory.json"


def norm(value: object) -> str:
    text = str(value or "").strip().lower().replace("’", "'")
    text = "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")
    return " ".join(text.split())


def load_territory(path: Path = DEFAULT_PATH) -> dict:
    cfg = json.loads(path.read_text(encoding="utf-8"))
    if not cfg.get("reference_hub"):
        raise ValueError("territory.json: reference_hub mancante")
    if not isinstance(cfg.get("sinistra"), list) or not isinstance(cfg.get("destra"), list):
        raise ValueError("territory.json: sinistra/destra devono essere array")
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
