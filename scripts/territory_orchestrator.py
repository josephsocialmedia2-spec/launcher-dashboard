#!/usr/bin/env python3
from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "territory.json"
SOURCE = ROOT / "data" / "neighborhood_intelligence.json"
OUT = ROOT / "data" / "territory_operations.json"


def norm(value: str) -> str:
    return str(value or "").strip().lower().replace("’", "'")


def score(signal: dict) -> float:
    try:
        return float(signal.get("score") or 0)
    except Exception:
        return 0.0


def main() -> None:
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    src = json.loads(SOURCE.read_text(encoding="utf-8"))
    all_signals = list(src.get("signals") or [])

    left = {norm(x) for x in cfg["sinistra"]}
    right = {norm(x) for x in cfg["destra"]}
    allowed = left | right

    # Regola operativa: Territory Control contiene esclusivamente i comuni configurati.
    signals = [s for s in all_signals if norm(s.get("comune")) in allowed]

    primary = [x for x in cfg["primary_route"] if norm(x) in allowed]
    primary_index = {norm(x): i for i, x in enumerate(primary)}

    grouped: dict[str, list[dict]] = defaultdict(list)
    for s in signals:
        grouped[s.get("comune") or "NON_CLASSIFICATO"].append(s)

    communes = []
    for comune, items in grouped.items():
        nk = norm(comune)
        side = "SINISTRA" if nk in left else "DESTRA"

        items.sort(key=lambda s: (-score(s), not bool(s.get("is_new")), s.get("signal_id") or ""))
        enriched = sum(1 for s in items if s.get("enrichment_status") == "ENRICHED")
        pending = sum(1 for s in items if s.get("enrichment_status") in {"PENDING", "ERROR"})
        contacts = sum(
            1
            for s in items
            for e in (s.get("public_entities") or [])
            if e.get("phone_public") or e.get("email_public") or e.get("website")
        )
        communes.append(
            {
                "comune": comune,
                "side": side,
                "primary_rank": primary_index.get(nk, 9999),
                "signals_count": len(items),
                "new_signals": sum(1 for s in items if s.get("is_new")),
                "enriched_signals": enriched,
                "pending_signals": pending,
                "public_contacts_count": contacts,
                "signals": items,
            }
        )

    communes.sort(key=lambda c: (c["primary_rank"], c["side"], norm(c["comune"])))

    excluded_signals = [s for s in all_signals if norm(s.get("comune")) not in allowed]
    excluded_communes = sorted({s.get("comune") or "NON_CLASSIFICATO" for s in excluded_signals}, key=norm)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source_generated_at": src.get("generated_at"),
        "policy": cfg["policy"],
        "reference_hub": cfg["reference_hub"],
        "primary_route": primary,
        "excluded_policy": "ALL_FUORI_LISTA",
        "excluded_communes": excluded_communes,
        "configured_comuni": {
            "sinistra": cfg["sinistra"],
            "destra": cfg["destra"],
            "total": len(cfg["sinistra"]) + len(cfg["destra"]),
        },
        "summary": {
            "signals_total": len(signals),
            "signals_excluded": len(excluded_signals),
            "communes_with_signals": len(grouped),
            "excluded_communes_count": len(excluded_communes),
            "enriched_total": sum(1 for s in signals if s.get("enrichment_status") == "ENRICHED"),
            "new_total": sum(1 for s in signals if s.get("is_new")),
            "public_contacts_total": sum(c["public_contacts_count"] for c in communes),
        },
        "communes": communes,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"Territory Orchestrator: {payload['summary']['signals_total']} segnali operativi, "
        f"{payload['summary']['signals_excluded']} segnali FUORI_LISTA esclusi, "
        f"{payload['summary']['communes_with_signals']} comuni operativi, "
        f"{payload['summary']['public_contacts_total']} riferimenti pubblici."
    )


if __name__ == "__main__":
    main()
