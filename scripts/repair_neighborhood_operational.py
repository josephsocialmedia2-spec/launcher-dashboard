#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

# 1) Repair engine classifier/versioning
p = ROOT / 'scripts' / 'neighborhood_intelligence.py'
s = p.read_text(encoding='utf-8')
if 'ENGINE_VERSION =' not in s:
    s = s.replace(
        'MAX_ENRICH = int(os.getenv("F1_NEIGHBORHOOD_MAX_ENRICH", "12"))\n',
        'MAX_ENRICH = int(os.getenv("F1_NEIGHBORHOOD_MAX_ENRICH", "12"))\nENGINE_VERSION = "2"\n'
    )

new_classify = '''def classify(tags):
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
'''

s = re.sub(
    r'def classify\(tags\):\n.*?\ndef public_entity\(element\):',
    new_classify + '\ndef public_entity(element):',
    s,
    flags=re.S,
)

old = '"enrichment_status": prev.get("enrichment_status","PENDING"), "geocode": prev.get("geocode"), "radius_m": prev.get("radius_m", RADIUS), "context": prev.get("context", {}), "public_entities": prev.get("public_entities", []), "enriched_at": prev.get("enriched_at")}'
new = '"engine_version": ENGINE_VERSION, "enrichment_status": (prev.get("enrichment_status","PENDING") if prev.get("engine_version") == ENGINE_VERSION else "PENDING"), "geocode": prev.get("geocode"), "radius_m": prev.get("radius_m", RADIUS), "context": prev.get("context", {}), "public_entities": prev.get("public_entities", []), "enriched_at": prev.get("enriched_at")}'
if old in s:
    s = s.replace(old, new)
if 'payload = {"engine_version": ENGINE_VERSION,' not in s:
    s = s.replace(
        'payload = {"territorial_rule": "FASCIA_CONTINUA",',
        'payload = {"engine_version": ENGINE_VERSION, "territorial_rule": "FASCIA_CONTINUA",'
    )

# Invalid/placeholder addresses are terminal and must never occupy the recurring queue.
needle = 'def enrich_signal(signal):\n    geo = geocode(signal["comune"], signal["indirizzo"])'
replacement = 'def enrich_signal(signal):\n    if not str(signal.get("indirizzo") or "").strip() or "DA VERIFICARE" in str(signal.get("indirizzo") or "").upper():\n        signal["enrichment_status"] = "SKIPPED_NO_ADDRESS"\n        return signal\n    geo = geocode(signal["comune"], signal["indirizzo"])'
if needle in s:
    s = s.replace(needle, replacement)

s = s.replace(
    '    candidates = [s for s in signals if s["enrichment_status"] != "ENRICHED"]\n    candidates.sort(key=lambda s: (s.get("territorial_rank", 9999), -int(float(s["score"] or 0)), not s["is_new"]))',
    '    candidates = [s for s in signals if s.get("enrichment_status") in {"PENDING", "ERROR"}]\n    candidates.sort(key=lambda s: (s.get("enrichment_status") == "ERROR", s.get("territorial_rank", 9999), -int(float(s["score"] or 0)), not s["is_new"]))'
)
p.write_text(s, encoding='utf-8')

# 2) Fix strict territorial ordering + WhatsApp prefill
p = ROOT / 'neighborhood-intelligence.html'
s = p.read_text(encoding='utf-8')
s = s.replace(
    '.sort((a,b)=>a.territorial_rank-b.territorial_rank-(Number(b.score||0)-Number(a.score||0)))',
    '.sort((a,b)=>a.territorial_rank-b.territorial_rank || Number(b.score||0)-Number(a.score||0))'
)
wa = '<a class="btn" target="_blank" rel="noopener" href="https://wa.me/393713708294?text=F1%20Neighborhood%20Intelligence%20operativo">WHATSAPP OPERATIVO</a>'
if 'WHATSAPP OPERATIVO' not in s:
    s = s.replace('<a class="btn alt" href="oggi.html">OGGI</a>', '<a class="btn alt" href="oggi.html">OGGI</a>' + wa)
p.write_text(s, encoding='utf-8')

p = ROOT / 'telefonate-oggi.html'
s = p.read_text(encoding='utf-8')
# The first integration wrote line separators as literal backslash+n sequences.
# Convert only the Neighborhood JS block, leaving regex escapes intact.
start_marker = r'\nconst NI_DATA='
end_marker = r'\nloadNeighborhood();\n'
if start_marker in s:
    start = s.index(start_marker)
    end = s.index(end_marker, start) + len(end_marker)
    block = s[start:end].replace(r'\n', '\n')
    s = s[:start] + block + s[end:]
wa = '<a href="https://wa.me/393713708294?text=F1%20Neighborhood%20Intelligence%20operativo" target="_blank" rel="noopener">WHATSAPP OPERATIVO</a>'
if 'WHATSAPP OPERATIVO' not in s:
    s = s.replace('<a href="crm.html">CRM</a>', '<a href="crm.html">CRM</a>' + wa)
p.write_text(s, encoding='utf-8')

# 3) Hard assertions
engine = (ROOT / 'scripts' / 'neighborhood_intelligence.py').read_text(encoding='utf-8')
view = (ROOT / 'neighborhood-intelligence.html').read_text(encoding='utf-8')
phone = (ROOT / 'telefonate-oggi.html').read_text(encoding='utf-8')
assert 'ENGINE_VERSION = "2"' in engine
assert 'SCUOLA_CULTURA' in engine
assert 'amenity in {"restaurant", "cafe", "bar"' in engine
assert 'SKIPPED_NO_ADDRESS' in engine
assert 'in {"PENDING", "ERROR"}' in engine
assert 'territorial_rank-b.territorial_rank || Number(b.score||0)-Number(a.score||0)' in view
assert r'\nconst NI_DATA=' not in phone
assert 'const NI_DATA=' in phone
assert 'WHATSAPP OPERATIVO' in view and 'WHATSAPP OPERATIVO' in phone
print('PASS repair script')
