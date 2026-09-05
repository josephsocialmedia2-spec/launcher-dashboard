#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""F1 Neighborhood Intelligence.

Per ogni segnale presente in giro_acquisizione_oggi.csv:
- crea un SIGNAL_ID stabile;
- conserva Comune + Indirizzo + annuncio;
- prepara query operative;
- arricchisce progressivamente la microzona con OpenStreetMap/Overpass;
- raccoglie solo recapiti pubblici di attività/enti/professionisti;
- non raccoglie nomi, email o cellulari di residenti privati;
- mantiene lo storico e riconosce i nuovi segnali.

Output:
- data/neighborhood_intelligence.json
- data/neighborhood_seen.json
"""
from __future__ import annotations
import csv, hashlib, io, json, os, time, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
DATA.mkdir(parents=True, exist_ok=True)
OUT = DATA / "neighborhood_intelligence.json"
SEEN = DATA / "neighborhood_seen.json"

GIRO_URL = "https://raw.githubusercontent.com/josephsocialmedia2-spec/immobili-in-zona/main/seller_radar_auto/data/giro_acquisizione_oggi.csv"
NOMINATIM = "https://nominatim.openstreetmap.org/search"
OVERPASS = "https://overpass-api.de/api/interpreter"
UA = "F1-Neighborhood-Intelligence/1.0 (public-business-context)"
RADIUS = int(os.getenv("F1_NEIGHBORHOOD_RADIUS", "500"))
MAX_ENRICH = int(os.getenv("F1_NEIGHBORHOOD_MAX_ENRICH", "12"))
ENGINE_VERSION = "2"

TERRITORIAL_ROUTE = ['Susa', 'Bussoleno', 'Chianocco', 'San Giorio di Susa', 'Bruzolo', 'San Didero', 'Villar Focchiardo', 'Borgone Susa', 'Sant’Antonino di Susa', 'Vaie', 'Condove', 'Chiusa di San Michele', 'Caprie', 'Sant’Ambrogio di Torino', 'Villar Dora', 'Almese']
TERRITORIAL_INDEX = {name.lower().replace("’", "\'"): i for i, name in enumerate(TERRITORIAL_ROUTE)}

def territorial_rank(comune):
    key = str(comune or "").strip().lower().replace("’", "\'")
    return TERRITORIAL_INDEX.get(key, 9999)

def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

def fetch_text(url, data=None, timeout=45):
    headers = {"User-Agent": UA, "Accept": "*/*"}
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8-sig", errors="replace")

def load_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default

def stable_id(row):
    seed = (row.get("URL") or "").strip()
    if not seed:
        seed = "|".join([row.get("COMUNE","").strip(), row.get("DOVE_ANDRE","").strip(), row.get("COSA_CERCO","").strip()])
    return "SIG-" + hashlib.sha1(seed.encode("utf-8", errors="ignore")).hexdigest()[:14].upper()

def qurl(query):
    return "https://www.google.com/search?q=" + urllib.parse.quote_plus(query)

def mapurl(address):
    return "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote_plus(address)

def queries(comune, indirizzo):
    target = f"{indirizzo}, {comune}, Italia".strip(", ")
    exact = f'"{indirizzo}" "{comune}"'
    return {
        "google": qurl(target),
        "google_maps": mapurl(target),
        "attivita_vicine": qurl(f'attività aziende negozi servizi vicino "{indirizzo}" "{comune}"'),
        "pagine_gialle": qurl(f'site:paginegialle.it "{indirizzo}" "{comune}"'),
        "pagine_bianche": qurl(f'site:paginebianche.it "{indirizzo}" "{comune}"'),
        "territorio": qurl(f'{exact} associazione proloco parrocchia azienda agricola eventi'),
        "animali_agricoltura": qurl(f'{exact} allevamento stalla canile azienda agricola animali'),
        "dork_contesto": qurl(f'{exact} (azienda OR associazione OR negozio OR ristorante OR officina OR agriturismo)'),
    }

def geocode(comune, indirizzo):
    params = urllib.parse.urlencode({"q": f"{indirizzo}, {comune}, Italia", "format": "jsonv2", "limit": 1, "countrycodes": "it", "addressdetails": 1})
    data = json.loads(fetch_text(NOMINATIM + "?" + params))
    if not data:
        return None
    x = data[0]
    return {"lat": float(x["lat"]), "lon": float(x["lon"]), "display_name": x.get("display_name",""), "osm_type": x.get("osm_type",""), "osm_id": x.get("osm_id")}

def overpass(lat, lon):
    r = RADIUS
    query = f'''[out:json][timeout:35];
(
 nwr(around:{r},{lat},{lon})["amenity"];
 nwr(around:{r},{lat},{lon})["shop"];
 nwr(around:{r},{lat},{lon})["office"];
 nwr(around:{r},{lat},{lon})["craft"];
 nwr(around:{r},{lat},{lon})["tourism"];
 nwr(around:{r},{lat},{lon})["leisure"];
 nwr(around:{r},{lat},{lon})["healthcare"];
 nwr(around:{r},{lat},{lon})["industrial"];
 nwr(around:{r},{lat},{lon})["landuse"="farmyard"];
 nwr(around:{r},{lat},{lon})["landuse"="farmland"];
 nwr(around:{r},{lat},{lon})["animal"];
 nwr(around:{r},{lat},{lon})["building"~"^(house|residential|apartments|detached|semidetached_house)$"];
);
out tags center;'''
    payload = urllib.parse.urlencode({"data": query}).encode("utf-8")
    return json.loads(fetch_text(OVERPASS, data=payload, timeout=55)).get("elements", [])

def first(tags, *keys):
    for k in keys:
        v = str(tags.get(k,"") or "").strip()
        if v:
            return v
    return ""

def classify(tags):
    amenity = str(tags.get("amenity", "") or "").lower()
    shop = str(tags.get("shop", "") or "").lower()
    office = str(tags.get("office", "") or "").lower()
    craft = str(tags.get("craft", "") or "").lower()
    tourism = str(tags.get("tourism", "") or "").lower()
    leisure = str(tags.get("leisure", "") or "").lower()
    healthcare = str(tags.get("healthcare", "") or "").lower()
    industrial = str(tags.get("industrial", "") or "").lower()
    landuse = str(tags.get("landuse", "") or "").lower()
    animal = str(tags.get("animal", "") or "").lower()

    if animal or landuse in {"farmyard", "farmland"} or amenity in {"animal_shelter", "veterinary"} or leisure in {"dog_park", "horse_riding"}:
        return "AGRICOLTURA_ANIMALI"
    if industrial or craft:
        return "INDUSTRIA_ARTIGIANATO"
    if amenity in {"restaurant", "cafe", "bar", "fast_food", "pub", "food_court"}:
        return "RISTORAZIONE"
    if shop:
        return "COMMERCIO"
    if amenity in {"school", "kindergarten", "college", "university", "library"}:
        return "SCUOLA_CULTURA"
    if amenity in {"clinic", "hospital", "pharmacy", "doctors", "dentist"} or healthcare:
        return "SALUTE"
    if amenity in {"place_of_worship", "community_centre", "social_centre", "townhall"}:
        return "RETE_TERRITORIALE"
    if leisure or amenity in {"sports_centre", "swimming_pool"}:
        return "SPORT_TEMPO_LIBERO"
    if tourism:
        return "TURISMO"
    if office:
        return "SERVIZI_PROFESSIONALI"
    if amenity:
        return "SERVIZI"
    return "ALTRO"

def public_entity(element):
    tags = element.get("tags") or {}
    if tags.get("building") in {"house","residential","apartments","detached","semidetached_house"} and not any(k in tags for k in ("amenity","shop","office","craft","tourism","leisure","healthcare","industrial","animal")):
        return None
    name = first(tags, "name", "operator", "brand")
    phone = first(tags, "contact:phone", "phone")
    email = first(tags, "contact:email", "email")
    website = first(tags, "contact:website", "website", "url")
    street = first(tags, "addr:street"); house = first(tags, "addr:housenumber"); city = first(tags, "addr:city")
    return {"name": name or "Attività/ente senza nome OSM", "category": classify(tags), "address": " ".join(x for x in [street, house, city] if x).strip(), "phone_public": phone, "email_public": email, "website": website, "osm_id": element.get("id"), "osm_type": element.get("type"), "source": "OpenStreetMap"}

def enrich_signal(signal):
    geo = geocode(signal["comune"], signal["indirizzo"])
    if not geo:
        signal["enrichment_status"] = "GEOCODE_NOT_FOUND"; return signal
    time.sleep(1.05)
    elements = overpass(geo["lat"], geo["lon"])
    residential = 0; entities = []; keys = set()
    for el in elements:
        tags = el.get("tags") or {}
        if tags.get("building") in {"house","residential","apartments","detached","semidetached_house"}: residential += 1
        ent = public_entity(el)
        if not ent: continue
        key = (ent["name"].lower(), ent["phone_public"], ent["email_public"], ent["website"])
        if key in keys: continue
        keys.add(key); entities.append(ent)
    entities.sort(key=lambda x: (x["category"], x["name"].lower()))
    signal["geocode"] = geo; signal["radius_m"] = RADIUS
    signal["context"] = {"residential_buildings_osm": residential, "public_entities_count": len(entities), "note_residents": "Solo contesto aggregato: nessun nominativo o recapito di residente privato viene raccolto."}
    signal["public_entities"] = entities[:150]
    signal["enrichment_status"] = "ENRICHED"; signal["enriched_at"] = now_iso()
    return signal

def main():
    rows = list(csv.DictReader(io.StringIO(fetch_text(GIRO_URL))))
    old = load_json(OUT, {"signals":[]}); old_by_id = {x.get("signal_id"): x for x in old.get("signals",[]) if x.get("signal_id")}
    seen_state = load_json(SEEN, {"seen":{}}); seen_map = seen_state.setdefault("seen", {})
    stamp = now_iso(); signals = []
    for row in rows:
        comune = (row.get("COMUNE") or "").strip(); indirizzo = (row.get("DOVE_ANDRE") or "").strip()
        if not comune or not indirizzo: continue
        sid = stable_id(row); first_seen = seen_map.get(sid) or stamp; seen_map[sid] = first_seen; prev = old_by_id.get(sid, {})
        signals.append({"signal_id": sid, "first_seen": first_seen, "is_new": first_seen == stamp, "territorial_rank": territorial_rank(comune), "territorial_route": TERRITORIAL_ROUTE, "comune": comune, "indirizzo": indirizzo, "immobile": (row.get("COSA_CERCO") or "").strip(), "prezzo": (row.get("PREZZO") or "").strip(), "fonte": (row.get("FONTE") or "").strip(), "seller_signal": (row.get("SELLER_SIGNAL") or "").strip(), "priorita": (row.get("PRIORITA") or "").strip(), "score": (row.get("SCORE") or "").strip(), "url_annuncio": (row.get("URL") or "").strip(), "queries": queries(comune, indirizzo), "engine_version": ENGINE_VERSION, "enrichment_status": (prev.get("enrichment_status","PENDING") if prev.get("engine_version") == ENGINE_VERSION else "PENDING"), "geocode": prev.get("geocode"), "radius_m": prev.get("radius_m", RADIUS), "context": prev.get("context", {}), "public_entities": prev.get("public_entities", []), "enriched_at": prev.get("enriched_at")})
    candidates = [s for s in signals if s["enrichment_status"] != "ENRICHED"]
    candidates.sort(key=lambda s: (s.get("territorial_rank", 9999), -int(float(s["score"] or 0)), not s["is_new"]))
    for s in candidates[:MAX_ENRICH]:
        try: enrich_signal(s)
        except Exception as exc:
            s["enrichment_status"] = "ERROR"; s["enrichment_error"] = str(exc)[:300]
        time.sleep(0.5)
    signals.sort(key=lambda s: (s.get("territorial_rank", 9999), -int(float(s.get("score") or 0)), not s.get("is_new")))
    payload = {"engine_version": ENGINE_VERSION, "territorial_rule": "FASCIA_CONTINUA", "territorial_route": TERRITORIAL_ROUTE, "generated_at": stamp, "source": GIRO_URL, "radius_m": RADIUS, "privacy": "Residenti: solo dati aggregati. Recapiti: solo attività/enti/professionisti pubblici.", "signals_count": len(signals), "signals": signals}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    SEEN.write_text(json.dumps({"updated_at": stamp, "seen": seen_map}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Neighborhood Intelligence: {len(signals)} segnali, {sum(s['enrichment_status']=='ENRICHED' for s in signals)} arricchiti.")

if __name__ == "__main__":
    main()
