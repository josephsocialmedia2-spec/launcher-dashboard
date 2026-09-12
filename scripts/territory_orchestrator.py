#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from territory_config import allowed_set, communes as territory_communes, load_territory, norm

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "neighborhood_intelligence.json"
OUT = ROOT / "data" / "territory_operations.json"
GEO_CACHE = ROOT / "data" / "territory_geocache.json"


def score(signal: dict) -> float:
    try:
        return float(signal.get("score") or 0)
    except Exception:
        return 0.0


def load_geo_cache() -> dict:
    if GEO_CACHE.exists():
        try:
            return json.loads(GEO_CACHE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def geocode(comune: str, cache: dict) -> dict | None:
    key = norm(comune)
    cached = cache.get(key)
    if cached and cached.get("lat") is not None and cached.get("lon") is not None:
        return cached
    q = urllib.parse.urlencode({"q": f"{comune}, Torino, Piemonte, Italia", "format": "jsonv2", "limit": 1, "countrycodes": "it"})
    req = urllib.request.Request(
        "https://nominatim.openstreetmap.org/search?" + q,
        headers={"User-Agent": "F1Immobiliare-Territory/3.0 (public geocoding cache)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            rows = json.loads(response.read().decode("utf-8"))
        if not rows:
            return None
        item = {"lat": float(rows[0]["lat"]), "lon": float(rows[0]["lon"]), "display_name": rows[0].get("display_name", "")}
        cache[key] = item
        time.sleep(1.05)
        return item
    except Exception:
        return None


def haversine_km(a: dict | None, b: dict | None) -> float | None:
    if not a or not b:
        return None
    lat1, lon1 = math.radians(a["lat"]), math.radians(a["lon"])
    lat2, lon2 = math.radians(b["lat"]), math.radians(b["lon"])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0088 * 2 * math.asin(math.sqrt(h))


def band_for(distance: float | None, bands: list[float], hub: bool = False) -> tuple[int, str]:
    if hub:
        return 0, "CENTRO"
    if distance is None:
        return 99, "DISTANZA_DA_VERIFICARE"
    finite = [float(x) for x in bands if float(x) < 999]
    if len(finite) < 4:
        finite = [0, 8, 15, 25]
    upper = finite[1:]
    previous = 0.0
    for idx, limit in enumerate(upper, start=1):
        if distance <= limit:
            return idx, f"ANELLO_{idx}_{int(previous)}_{int(limit)}_KM"
        previous = limit
    return len(upper) + 1, f"ANELLO_{len(upper)+1}_{int(previous)}_PLUS_KM"


def main() -> None:
    cfg = load_territory()
    src = json.loads(SOURCE.read_text(encoding="utf-8"))
    all_signals = list(src.get("signals") or [])

    left = {norm(x) for x in cfg["sinistra"]}
    right = {norm(x) for x in cfg["destra"]}
    configured = territory_communes(cfg)
    allowed = allowed_set(cfg)
    hub_name = cfg["reference_hub"]
    bands = cfg.get("distance_bands_km", [0, 8, 15, 25, 999])

    signals = [s for s in all_signals if norm(s.get("comune")) in allowed]
    grouped: dict[str, list[dict]] = defaultdict(list)
    for s in signals:
        grouped[norm(s.get("comune") or "NON_CLASSIFICATO")].append(s)

    geo_cache = load_geo_cache()
    hub_geo = geocode(hub_name, geo_cache)

    communes = []
    for comune in configured:
        nk = norm(comune)
        items = list(grouped.get(nk, []))
        items.sort(key=lambda s: (-score(s), not bool(s.get("is_new")), s.get("signal_id") or ""))
        if nk == norm(hub_name):
            side = "SINISTRA" if nk in left else "DESTRA" if nk in right else "CENTRO"
        else:
            side = "SINISTRA" if nk in left else "DESTRA" if nk in right else "CENTRO"
        geo = geocode(comune, geo_cache)
        distance = haversine_km(hub_geo, geo)
        is_hub = nk == norm(hub_name)
        band_rank, band = band_for(distance, bands, is_hub)
        enriched = sum(1 for s in items if s.get("enrichment_status") == "ENRICHED")
        pending = sum(1 for s in items if s.get("enrichment_status") in {"PENDING", "ERROR"})
        contacts = sum(
            1
            for s in items
            for e in (s.get("public_entities") or [])
            if e.get("phone_public") or e.get("email_public") or e.get("website")
        )
        communes.append({
            "comune": comune,
            "side": side,
            "is_hub": is_hub,
            "air_distance_km": None if distance is None else round(distance, 1),
            "band_rank": band_rank,
            "distance_band": band,
            "coordinates": geo,
            "signals_count": len(items),
            "new_signals": sum(1 for s in items if s.get("is_new")),
            "enriched_signals": enriched,
            "pending_signals": pending,
            "public_contacts_count": contacts,
            "signals": items,
        })

    communes.sort(key=lambda c: (c["band_rank"], 9999 if c["air_distance_km"] is None else c["air_distance_km"], norm(c["comune"])))
    GEO_CACHE.write_text(json.dumps(geo_cache, ensure_ascii=False, indent=2), encoding="utf-8")

    excluded_signals = [s for s in all_signals if norm(s.get("comune")) not in allowed]
    excluded_communes = sorted({s.get("comune") or "NON_CLASSIFICATO" for s in excluded_signals}, key=norm)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source_generated_at": src.get("generated_at"),
        "territory_version": cfg.get("version"),
        "policy": cfg["policy"],
        "reference_hub": hub_name,
        "ordering": "DISTANZA_LINEA_ARIA_DAL_REFERENCE_HUB",
        "distance_bands_km": bands,
        "excluded_policy": "ALL_FUORI_LISTA",
        "excluded_communes": excluded_communes,
        "configured_comuni": {
            "sinistra": cfg["sinistra"],
            "destra": cfg["destra"],
            "total": len(configured),
        },
        "summary": {
            "signals_total": len(signals),
            "signals_excluded": len(excluded_signals),
            "communes_with_signals": sum(1 for c in communes if c["signals_count"] > 0),
            "configured_communes": len(communes),
            "excluded_communes_count": len(excluded_communes),
            "enriched_total": sum(1 for s in signals if s.get("enrichment_status") == "ENRICHED"),
            "new_total": sum(1 for s in signals if s.get("is_new")),
            "public_contacts_total": sum(c["public_contacts_count"] for c in communes),
        },
        "communes": communes,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"Territory Orchestrator: centro={hub_name}; {len(communes)} comuni configurati; "
        f"{payload['summary']['signals_total']} segnali; {payload['summary']['communes_with_signals']} comuni con segnali."
    )


if __name__ == "__main__":
    main()
