#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""F1 LISTA_MATTINO V3 — output operativo unico.

Unisce sul PC:
- microzone pubbliche del Radar;
- work_queue con score/prezzi/segnali/tipo opportunita/PDF;
- assegnazioni dei 10 funzionari;
- nominativi e telefoni presenti esclusivamente nel database locale.

Nessun nominativo o telefono viene caricato su GitHub.
"""
from __future__ import annotations

import csv
import html
import importlib.util
import io
import json
import re
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

BASE = Path.home() / "Documents" / "F1_Directory_Microzone"
BASE.mkdir(parents=True, exist_ok=True)
V2_FILE = BASE / "_f1_microzone_directory_v2.py"
V2_URL = "https://raw.githubusercontent.com/josephsocialmedia2-spec/launcher-dashboard/main/windows-bridge/f1_microzone_directory_v2.py"
RAW = "https://raw.githubusercontent.com/josephsocialmedia2-spec/immobili-in-zona/main/seller_radar_auto"
WORK_QUEUE_URL = RAW + "/data/work_queue.csv"
ASSIGN_URL = RAW + "/data/giro_funzionari.csv"
CONFIG_URL = RAW + "/f1_microzone_config.json"


def download_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "F1Immobiliare-Desktop/3.0"})
    with urllib.request.urlopen(req, timeout=40) as response:
        return response.read()


def read_csv_url(url: str):
    text = download_bytes(url).decode("utf-8-sig", errors="replace")
    return list(csv.DictReader(io.StringIO(text)))


def safe_url(value):
    value = str(value or "").strip()
    if not value:
        return ""
    try:
        p = urllib.parse.urlparse(value)
    except Exception:
        return ""
    return value if p.scheme in {"http", "https"} and p.netloc else ""


def url_key(value):
    value = safe_url(value)
    if not value:
        return ""
    p = urllib.parse.urlsplit(value)
    path = re.sub(r"/+$", "", p.path or "/")
    return urllib.parse.urlunsplit((p.scheme.lower(), p.netloc.lower(), path, p.query, ""))


def esc(value):
    return html.escape(str(value or ""))


def money(value):
    s = str(value or "").strip()
    if not s or s.upper().startswith("PREZZO"):
        return s or "NON DISPONIBILE"
    try:
        n = float(s.replace(".", "").replace(",", "."))
        return f"€ {n:,.0f}".replace(",", ".")
    except Exception:
        return s


def days_from(value):
    value = str(value or "").strip()
    if not value:
        return ""
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return str(max(0, (datetime.now(timezone.utc) - dt.astimezone(timezone.utc)).days))
    except Exception:
        return ""


def btn(url, label, cls="btn"):
    u = safe_url(url)
    if not u:
        return f"<span class='{cls} disabled'>{esc(label)}: NON DISPONIBILE</span>"
    return f"<a class='{cls}' href='{html.escape(u, quote=True)}' target='_blank' rel='noopener noreferrer'>{esc(label)}</a>"


# Carica V2 senza sostituirla: V3 e' un livello aggiuntivo.
V2_FILE.write_bytes(download_bytes(V2_URL))
spec = importlib.util.spec_from_file_location("f1_microzone_v2", V2_FILE)
v2 = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(v2)
engine = v2.base

# Le aree operative vengono lette dalla configurazione Radar, evitando divergenze future.
try:
    cfg = json.loads(download_bytes(CONFIG_URL).decode("utf-8"))
    enabled = {engine.norm(x) for x in cfg.get("main_towns", [])}
    excluded = {engine.norm(x) for x in cfg.get("excluded_towns", [])}
    engine.MAIN_TOWNS = enabled - excluded
except Exception as exc:
    engine.log(f"V3 config aree: {exc}; uso configurazione V2")

try:
    WORK_ROWS = read_csv_url(WORK_QUEUE_URL)
except Exception as exc:
    engine.log(f"V3 work_queue: {exc}")
    WORK_ROWS = []
try:
    ASSIGN_ROWS = read_csv_url(ASSIGN_URL)
except Exception as exc:
    engine.log(f"V3 giro_funzionari: {exc}")
    ASSIGN_ROWS = []

WORK_BY_URL = {}
for row in WORK_ROWS:
    k = url_key(row.get("URL"))
    if k and k not in WORK_BY_URL:
        WORK_BY_URL[k] = row
ASSIGN_BY_URL = {}
for row in ASSIGN_ROWS:
    k = url_key(row.get("URL"))
    if k and k not in ASSIGN_BY_URL:
        ASSIGN_BY_URL[k] = row


def fuzzy_work(target):
    """Fallback prudente solo quando URL esatto manca."""
    comune = engine.norm(target.get("COMUNE"))
    via = engine.norm(target.get("VIA_ANNUNCIO"))
    ref = engine.norm(target.get("RIFERIMENTO_ANNUNCIO"))
    candidates = [r for r in WORK_ROWS if engine.norm(r.get("COMUNE")) == comune]
    if via:
        for row in candidates:
            blob = engine.norm(" ".join([row.get("VIA_RADAR", ""), row.get("DOVE_ANDRE", ""), row.get("TITOLO", "")]))
            if via in blob:
                return row
    if ref and len(ref) > 12:
        for row in candidates:
            if ref in engine.norm(row.get("TITOLO", "")):
                return row
    return {}


def work_for(target):
    return WORK_BY_URL.get(url_key(target.get("ANNUNCIO_URL"))) or fuzzy_work(target)


def assignment_for(target, work):
    for candidate in (target.get("ANNUNCIO_URL"), work.get("URL")):
        row = ASSIGN_BY_URL.get(url_key(candidate))
        if row:
            return row
    return {}


def radar_field(work, assign, name, default=""):
    return work.get(name) or assign.get(name) or default


def key_value(label, value, strong=False):
    if value is None or str(value).strip() == "":
        value = "—"
    klass = "kv strong" if strong else "kv"
    return f"<div class='{klass}'><span>{esc(label)}</span><b>{esc(value)}</b></div>"


def full_radar_details(work):
    if not work:
        return "<div class='muted'>Nessun record work_queue collegato con certezza.</div>"
    rows = []
    for k, v in work.items():
        if str(v or "").strip():
            if k in {"URL", "PDF_DA_VERIFICARE", "F1_INDIRIZZO_REMOTO_URL"}:
                rows.append(f"<tr><th>{esc(k)}</th><td>{btn(v, 'APRI', 'mini')}</td></tr>")
            else:
                rows.append(f"<tr><th>{esc(k)}</th><td>{esc(v)}</td></tr>")
    return "<table class='raw'><tbody>" + "".join(rows) + "</tbody></table>"


def generate_report(targets):
    zones = defaultdict(list)
    for target in targets:
        zid = target.get("ZONE_ID") or f"{target.get('COMUNE','')}|{target.get('VIA_ANNUNCIO','')}"
        zones[zid].append(target)

    candidates = []
    zone_meta = {}
    for zid, ztargets in zones.items():
        ordered = sorted(ztargets, key=lambda t: int(t.get("RANK") or 99))
        first = ordered[0]
        work = work_for(first)
        assign = assignment_for(first, work)
        zone_meta[zid] = {"first": first, "ordered": ordered, "work": work, "assign": assign}
        for target in ordered:
            for contact in engine.existing_for_target(target):
                rank = int(target.get("RANK") or 99)
                candidates.append({
                    "ZONE_ID": zid,
                    "COMUNE": target.get("COMUNE", ""),
                    "VIA_TARGET": target.get("VIA_ANNUNCIO", "") or target.get("VIA_DA_LAVORARE", ""),
                    "RIFERIMENTO_ANNUNCIO": target.get("RIFERIMENTO_ANNUNCIO", ""),
                    "ANNUNCIO_URL": safe_url(target.get("ANNUNCIO_URL", "")),
                    "TIPO_VIA": "TARGET" if rank == 0 else f"VICINA {rank}",
                    "RANK_VIA": str(rank),
                    "VIA_CONTATTO": target.get("VIA_DA_LAVORARE", ""),
                    "DISTANZA_M": target.get("DISTANZA_M", ""),
                    "RELAZIONE": target.get("RELAZIONE", ""),
                    "NOME": contact.get("name", "") or "",
                    "TELEFONO": contact.get("phone", "") or "",
                    "CIVICO": contact.get("civic", "") or "",
                    "FONTE_CONTATTO": contact.get("source", "") or "",
                    "URL_CONTATTO": safe_url(contact.get("source_url", "")),
                    "RPO_STATUS": "DA_VERIFICARE",
                    "OWNER_VERIFIED": "NO",
                })

    best = {}
    for row in candidates:
        phone = engine.digits(row["TELEFONO"])
        if not phone:
            continue
        key = (row["ZONE_ID"], phone)
        if key not in best or int(row["RANK_VIA"]) < int(best[key]["RANK_VIA"]):
            best[key] = row
    contact_rows = sorted(best.values(), key=lambda r: (r["COMUNE"], r["VIA_TARGET"], int(r["RANK_VIA"]), r["VIA_CONTATTO"], r["CIVICO"]))
    rows_by_zone = defaultdict(list)
    for row in contact_rows:
        rows_by_zone[row["ZONE_ID"]].append(row)

    # CSV operativo arricchito: dati Radar + assegnazione + incrocio numero.
    radar_columns = list(WORK_ROWS[0].keys()) if WORK_ROWS else []
    local_columns = ["FUNZIONARIO", "NUM_FUNZIONARIO", "ZONE_ID", "VIA_TARGET", "VIE_VICINE", "TIPO_VIA", "RANK_VIA", "VIA_CONTATTO", "DISTANZA_M", "RELAZIONE", "NOME", "TELEFONO", "CIVICO", "FONTE_CONTATTO", "URL_CONTATTO", "RPO_STATUS", "OWNER_VERIFIED"]
    csv_fields = local_columns + ["RADAR_" + c for c in radar_columns]
    out_rows = []
    for row in contact_rows:
        meta = zone_meta.get(row["ZONE_ID"], {})
        work = meta.get("work", {})
        assign = meta.get("assign", {})
        nearby = [t.get("VIA_DA_LAVORARE", "") for t in meta.get("ordered", []) if int(t.get("RANK") or 99) > 0]
        out = {k: row.get(k, "") for k in local_columns}
        out["FUNZIONARIO"] = assign.get("FUNZIONARIO", "")
        out["NUM_FUNZIONARIO"] = assign.get("NUM_FUNZIONARIO", "")
        out["VIE_VICINE"] = " | ".join(nearby)
        for c in radar_columns:
            out["RADAR_" + c] = work.get(c, "")
        out_rows.append(out)
    with engine.OUT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=csv_fields)
        writer.writeheader()
        writer.writerows(out_rows)

    cards = []
    microzone_urls = set()
    for zid, meta in sorted(zone_meta.items(), key=lambda item: (item[1]["first"].get("COMUNE", ""), item[1]["first"].get("VIA_ANNUNCIO", ""))):
        first = meta["first"]
        ordered = meta["ordered"]
        work = meta["work"]
        assign = meta["assign"]
        zone_rows = rows_by_zone.get(zid, [])
        comune = first.get("COMUNE", "")
        via = first.get("VIA_ANNUNCIO", "") or first.get("VIA_DA_LAVORARE", "")
        ref = first.get("RIFERIMENTO_ANNUNCIO", "")
        ann_url = safe_url(first.get("ANNUNCIO_URL")) or safe_url(work.get("URL"))
        if ann_url:
            microzone_urls.add(url_key(ann_url))
        nearby = [t.get("VIA_DA_LAVORARE", "") for t in ordered if int(t.get("RANK") or 99) > 0]

        score = radar_field(work, assign, "SCORE", "—")
        priority = radar_field(work, assign, "PRIORITA", "—")
        tipo = radar_field(work, assign, "TIPO_OPPORTUNITA", "NON DETERMINATO")
        fase = radar_field(work, assign, "FASE_PROGETTO", "—")
        objective = radar_field(work, assign, "OBIETTIVO_COMMERCIALE", "—")
        title = radar_field(work, assign, "TITOLO", radar_field(work, assign, "COSA_CERCO", ref))
        price = radar_field(work, assign, "PREZZO", radar_field(work, assign, "PREZZO_OPERATIVO", "NON DISPONIBILE"))
        prev = radar_field(work, assign, "PREZZO_PRECEDENTE", "—")
        drops = radar_field(work, assign, "RIBASSI", "0")
        signal = radar_field(work, assign, "INDIZIO_INSERZIONISTA", radar_field(work, assign, "SELLER_SIGNAL", "—"))
        state = radar_field(work, assign, "STATO", "—")
        reasons = radar_field(work, assign, "MOTIVI", "—")
        first_seen = radar_field(work, assign, "PRIMA_RILEVAZIONE", "")
        days = days_from(first_seen) or "—"
        source = radar_field(work, assign, "FONTE", "—")
        pdf = radar_field(work, assign, "PDF_DA_VERIFICARE", "")
        local_f1 = radar_field(work, assign, "F1_INDIRIZZO_REMOTO_URL", "")
        funz = assign.get("FUNZIONARIO", "NON ASSEGNATO")
        nfun = assign.get("NUM_FUNZIONARIO", "—")

        streets_html = "".join(f"<span class='street'>{esc(s)}</span>" for s in nearby) or "<span class='muted'>Nessuna via vicina disponibile</span>"
        table_rows = []
        for row in zone_rows:
            table_rows.append(
                "<tr>"
                f"<td><b>{esc(row['TIPO_VIA'])}</b></td><td>{esc(row['VIA_CONTATTO'])}</td><td>{esc(row['CIVICO'])}</td>"
                f"<td>{esc(row['NOME'])}</td><td><strong>{esc(row['TELEFONO'])}</strong></td>"
                f"<td>{esc(row['FONTE_CONTATTO'])}<br>{btn(row['URL_CONTATTO'], 'APRI FONTE NUMERO', 'mini')}</td>"
                "<td>DA VERIFICARE</td><td>NO</td></tr>"
            )
        if not table_rows:
            table_rows.append("<tr><td colspan='8' class='empty'>0 numeri incrociati: microzona mantenuta per verifica/ricerca.</td></tr>")

        metrics = "".join([
            key_value("FUNZIONARIO", f"{funz} · #{nfun}", True),
            key_value("SCORE", score, True), key_value("PRIORITÀ", priority), key_value("TIPO", tipo),
            key_value("FASE", fase), key_value("OBIETTIVO", objective), key_value("PREZZO", money(price), True),
            key_value("PREZZO PRECEDENTE", money(prev) if prev != "—" else "—"), key_value("RIBASSI", drops),
            key_value("GIORNI MONITORATI", days), key_value("SEGNALE", signal), key_value("STATO", state),
            key_value("SUPERFICIE", "NON DISPONIBILE NEL RADAR"), key_value("FONTE", source),
        ])

        cards.append(
            f"<section class='card' data-search='{html.escape((funz+' '+comune+' '+via+' '+tipo+' '+title+' '+source).lower(), quote=True)}'>"
            f"<div class='head'><div><div class='town'>{esc(comune)}</div><h2>{esc(via)}</h2><div class='title'>{esc(title)}</div></div><div class='count'>{len(zone_rows)} numeri</div></div>"
            f"<div class='metrics'>{metrics}</div>"
            f"<div class='signal'><b>MOTIVI / SEGNALE:</b> {esc(reasons)}</div>"
            f"<div class='actions'>{btn(ann_url, 'APRI ANNUNCIO')} {btn(pdf, 'APRI PDF DA VERIFICARE')} {btn(local_f1, 'APRI F1 INDIRIZZO', 'btn secondary')}</div>"
            f"<div class='ref'>Riferimento: {esc(ref)}</div>"
            "<div class='label'>VIA CENTRALE</div>" f"<div class='target'>{esc(via)}</div>"
            "<div class='label'>FINO A 4 VIE VICINE / COLLEGATE</div>" f"<div class='streets'>{streets_html}</div>"
            "<div class='table-wrap'><table><thead><tr><th>Match</th><th>Via numero</th><th>Civico</th><th>Contatto pubblico</th><th>Telefono</th><th>Fonte numero</th><th>RPO</th><th>Proprietario verificato</th></tr></thead><tbody>"
            + "".join(table_rows) + "</tbody></table></div>"
            f"<details><summary>TUTTI I DATI RADAR</summary>{full_radar_details(work)}</details>"
            "</section>"
        )

    # Le opportunita assegnate ai funzionari che non hanno una microzona restano visibili.
    extra_by_func = defaultdict(list)
    for a in ASSIGN_ROWS:
        if a.get("STATO_ASSEGNAZIONE") != "ASSEGNATO":
            continue
        if url_key(a.get("URL")) in microzone_urls:
            continue
        extra_by_func[a.get("FUNZIONARIO") or "NON ASSEGNATO"].append(a)
    extra_blocks = []
    for funz, items in sorted(extra_by_func.items()):
        trs = []
        for a in sorted(items, key=lambda x: -int(float(x.get("SCORE") or 0))):
            trs.append(
                f"<tr><td>{esc(a.get('SCORE'))}</td><td>{esc(a.get('TIPO_OPPORTUNITA'))}</td><td>{esc(a.get('COMUNE'))}</td>"
                f"<td>{esc(a.get('DOVE_ANDRE'))}</td><td>{esc(a.get('COSA_CERCO'))}</td><td>{esc(money(a.get('PREZZO')))}</td>"
                f"<td>{btn(a.get('URL'), 'APRI ANNUNCIO', 'mini')} {btn(a.get('PDF_DA_VERIFICARE'), 'PDF', 'mini')}</td></tr>"
            )
        extra_blocks.append(f"<details class='extra'><summary>{esc(funz)} — {len(items)} opportunità senza microzona/numeri</summary><div class='table-wrap'><table><thead><tr><th>Score</th><th>Tipo</th><th>Comune</th><th>Dove</th><th>Opportunità</th><th>Prezzo</th><th>Link</th></tr></thead><tbody>{''.join(trs)}</tbody></table></div></details>")

    func_counts = Counter(a.get("FUNZIONARIO") for a in ASSIGN_ROWS if a.get("STATO_ASSEGNAZIONE") == "ASSEGNATO")
    func_summary = "".join(f"<span class='pill'>{esc(k)}: {v}</span>" for k, v in sorted(func_counts.items()) if k)

    page = f"""<!doctype html><html lang='it'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>F1 Lista Mattino Completa</title><style>
body{{font-family:Segoe UI,Arial,sans-serif;background:#070907;color:#fff;margin:0}}main{{max-width:1550px;margin:auto;padding:20px}}h1{{color:#39f28a;margin:0 0 4px}}h2{{margin:3px 0}}.summary,.muted,.ref{{color:#aeb7b0}}.note{{background:#17140d;border:1px solid #5b4c25;padding:12px;border-radius:12px;margin:15px 0}}.toolbar{{position:sticky;top:0;background:#070907eF;padding:10px 0;z-index:5}}input{{width:100%;box-sizing:border-box;background:#111812;color:white;border:1px solid #35513e;border-radius:10px;padding:12px;font-size:15px}}.pills,.streets{{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}}.pill,.street{{border:1px solid #35513e;background:#142018;padding:6px 9px;border-radius:999px}}.card{{background:#101510;border:1px solid #2a342c;border-radius:16px;padding:16px;margin:14px 0}}.head{{display:flex;justify-content:space-between;gap:12px;align-items:start}}.town{{color:#39f28a;font-weight:800}}.title{{color:#dfe7e1;margin-top:6px;max-width:950px}}.count{{background:#17251c;padding:8px 12px;border-radius:999px;white-space:nowrap}}.metrics{{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin:14px 0}}.kv{{background:#141a15;border:1px solid #263128;border-radius:10px;padding:9px}}.kv span{{display:block;color:#98a49b;font-size:10px;font-weight:800}}.kv b{{display:block;margin-top:4px}}.kv.strong{{border-color:#39f28a}}.signal{{background:#0d120e;padding:10px;border-radius:10px;margin:8px 0}}.actions{{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}}.btn,.mini{{display:inline-block;color:#071008;background:#39f28a;padding:8px 11px;border-radius:8px;text-decoration:none;font-weight:800}}.btn.secondary{{background:#50c9e8}}.mini{{padding:5px 7px;font-size:11px;margin:2px}}.disabled{{background:#303633;color:#aeb7b0}}.label{{font-size:11px;color:#aeb7b0;font-weight:800;margin-top:12px}}.target{{font-size:18px;font-weight:800;margin:5px 0}}.table-wrap{{overflow-x:auto}}table{{width:100%;border-collapse:collapse;font-size:13px}}td,th{{border-bottom:1px solid #2a342c;padding:8px;text-align:left;vertical-align:top}}th{{color:#aeb7b0}}.empty{{color:#aeb7b0;padding:16px}}details{{margin-top:14px;border-top:1px solid #263128;padding-top:10px}}summary{{cursor:pointer;color:#39f28a;font-weight:800}}.raw th{{width:220px}}.extra{{background:#101510;border:1px solid #2a342c;border-radius:12px;padding:12px;margin:10px 0}}@media(max-width:700px){{main{{padding:12px}}.head{{display:block}}.count{{display:inline-block;margin-top:8px}}td,th{{white-space:nowrap}}}}
</style></head><body><main><h1>F1 — LISTA MATTINO COMPLETA</h1><div class='summary'>Generata {datetime.now():%d/%m/%Y %H:%M} · {len(zones)} microzone · {len(contact_rows)} numeri incrociati · {len(ASSIGN_ROWS)} righe assegnazione Radar.</div><div class='pills'>{func_summary}</div><div class='note'><b>CONTROLLO OBBLIGATORIO:</b> via/civico non prova la proprietà. Prima di contatti commerciali verifica RPO e base giuridica applicabile. I nominativi e telefoni di questa pagina restano esclusivamente su questo PC.</div><div class='toolbar'><input id='search' placeholder='Filtra per funzionario, comune, via, tipo, immobile, fonte...' oninput='filterCards()'></div><div id='cards'>{''.join(cards)}</div><h2>OPPORTUNITÀ ASSEGNATE SENZA MICROZONA / NUMERI</h2><p class='muted'>Restano qui per non perdere il lavoro del Radar. Apri la fonte e verifica l'indirizzo prima di generare una microzona.</p>{''.join(extra_blocks) if extra_blocks else '<div class="card">Nessuna opportunità extra.</div>'}<script>function filterCards(){{const q=document.getElementById('search').value.toLowerCase().trim();document.querySelectorAll('.card[data-search]').forEach(c=>{{c.style.display=(!q||c.dataset.search.includes(q))?'block':'none';}});}}</script></main></body></html>"""
    engine.OUT_HTML.write_text(page, encoding="utf-8")
    engine.log(f"LISTA_MATTINO V3: {len(contact_rows)} numeri, {len(zones)} microzone, {len(ASSIGN_ROWS)} assegnazioni Radar")
    return contact_rows


engine.generate_report = generate_report

if __name__ == "__main__":
    raise SystemExit(engine.main())
