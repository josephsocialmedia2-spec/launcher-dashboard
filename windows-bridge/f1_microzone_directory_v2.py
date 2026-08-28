#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""F1 bridge V2.

Mantiene il motore locale esistente e corregge l'output operativo:
- usa tutte le microzone correnti del Radar, inclusa la prima cintura/Ferriera;
- confronta via annuncio + massimo 4 vie vicine con i contatti locali;
- genera SEMPRE LISTA_MATTINO.html come output finale;
- mostra separatamente APRI ANNUNCIO e APRI FONTE NUMERO;
- mantiene nomi e telefoni esclusivamente sul PC.
"""
from __future__ import annotations

import csv
import html
import importlib.util
import sqlite3
import urllib.request
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

BASE = Path.home() / "Documents" / "F1_Directory_Microzone"
BASE.mkdir(parents=True, exist_ok=True)
BASE_BRIDGE = BASE / "_f1_microzone_directory_base.py"
BASE_URL = "https://raw.githubusercontent.com/josephsocialmedia2-spec/launcher-dashboard/main/windows-bridge/f1_microzone_directory.py"

req = urllib.request.Request(BASE_URL, headers={"User-Agent": "F1Immobiliare-Desktop/2.0"})
with urllib.request.urlopen(req, timeout=30) as response:
    BASE_BRIDGE.write_bytes(response.read())

spec = importlib.util.spec_from_file_location("f1_microzone_base", BASE_BRIDGE)
base = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(base)

# Il bridge precedente era rimasto fermo agli 8 comuni originari.
# La V2 segue le aree oggi abilitate nel Radar/microzone.
base.MAIN_TOWNS = {
    "avigliana", "almese", "condove", "sant antonino di susa",
    "vaie", "chiusa di san michele", "bussoleno", "susa",
    "collegno", "grugliasco", "rivoli", "alpignano", "pianezza",
    "rosta", "buttigliera alta", "ferriera di buttigliera alta",
    "villarbasse", "caselette", "val della torre"
}


def town_aliases(comune):
    n = base.norm(comune)
    if n == "ferriera di buttigliera alta":
        return {"ferriera di buttigliera alta", "buttigliera alta"}
    return {n}


def safe_url(value):
    value = str(value or "").strip()
    try:
        p = urlparse(value)
    except Exception:
        return ""
    return value if p.scheme in {"http", "https"} and p.netloc else ""


def existing_for_target(target):
    aliases = town_aliases(target.get("COMUNE", ""))
    street = base.norm(target.get("VIA_DA_LAVORARE", ""))
    if not street:
        return []
    conn = sqlite3.connect(base.DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("select * from contacts").fetchall()
    conn.close()
    out = []
    for row in rows:
        r = dict(row)
        if base.norm(r.get("comune")) not in aliases:
            continue
        rs = base.norm(r.get("street"))
        if rs and (street in rs or rs in street):
            out.append(r)
    return out


base.existing_for_target = existing_for_target
_original_parse_profile = base.parse_profile


def parse_profile(driver, target):
    # Le directory possono indicare Ferriera semplicemente come Buttigliera Alta.
    if base.norm(target.get("COMUNE")) != "ferriera di buttigliera alta":
        return _original_parse_profile(driver, target)
    shadow = dict(target)
    shadow["COMUNE"] = "Buttigliera Alta"
    contacts = _original_parse_profile(driver, shadow)
    for contact in contacts:
        contact["comune"] = "Ferriera di Buttigliera Alta"
    return contacts


base.parse_profile = parse_profile


def generate_report(targets):
    # Conserva tutte le microzone, anche se una via oggi non ha ancora numeri.
    zones = {}
    for target in targets:
        zid = target.get("ZONE_ID", "") or f"{target.get('COMUNE','')}|{target.get('VIA_ANNUNCIO','')}"
        zones.setdefault(zid, []).append(target)

    candidates = []
    for target in targets:
        for contact in existing_for_target(target):
            rank = int(target.get("RANK") or 99)
            candidates.append({
                "ZONE_ID": target.get("ZONE_ID", ""),
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

    # Stesso numero nella stessa microzona: conserva il match sulla via con rank migliore.
    best = {}
    for row in candidates:
        phone = base.digits(row["TELEFONO"])
        if not phone:
            continue
        key = (row["ZONE_ID"], phone)
        if key not in best or int(row["RANK_VIA"]) < int(best[key]["RANK_VIA"]):
            best[key] = row
    rows = sorted(
        best.values(),
        key=lambda r: (r["COMUNE"], r["VIA_TARGET"], int(r["RANK_VIA"]), r["VIA_CONTATTO"], r["CIVICO"], r["NOME"]),
    )

    # Aggiunge al CSV anche l'elenco delle quattro vie vicine della microzona.
    nearby_by_zone = {}
    for zid, ztargets in zones.items():
        ordered = sorted(ztargets, key=lambda t: int(t.get("RANK") or 99))
        nearby_by_zone[zid] = " | ".join(
            t.get("VIA_DA_LAVORARE", "") for t in ordered if int(t.get("RANK") or 99) > 0
        )
    for row in rows:
        row["VIE_VICINE"] = nearby_by_zone.get(row["ZONE_ID"], "")

    fields = [
        "ZONE_ID", "COMUNE", "VIA_TARGET", "VIE_VICINE", "RIFERIMENTO_ANNUNCIO", "ANNUNCIO_URL",
        "TIPO_VIA", "RANK_VIA", "VIA_CONTATTO", "DISTANZA_M", "RELAZIONE",
        "NOME", "TELEFONO", "CIVICO", "FONTE_CONTATTO", "URL_CONTATTO",
        "RPO_STATUS", "OWNER_VERIFIED"
    ]
    with base.OUT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    rows_by_zone = {}
    for row in rows:
        rows_by_zone.setdefault(row["ZONE_ID"], []).append(row)

    cards = []
    for zid, ztargets in sorted(zones.items(), key=lambda item: (item[1][0].get("COMUNE", ""), item[1][0].get("VIA_ANNUNCIO", ""))):
        ordered = sorted(ztargets, key=lambda t: int(t.get("RANK") or 99))
        first = ordered[0]
        comune = first.get("COMUNE", "")
        target_street = first.get("VIA_ANNUNCIO", "") or next((t.get("VIA_DA_LAVORARE", "") for t in ordered if int(t.get("RANK") or 99) == 0), "")
        ref = first.get("RIFERIMENTO_ANNUNCIO", "")
        announcement = next((safe_url(t.get("ANNUNCIO_URL", "")) for t in ordered if safe_url(t.get("ANNUNCIO_URL", ""))), "")
        nearby = [t.get("VIA_DA_LAVORARE", "") for t in ordered if int(t.get("RANK") or 99) > 0]
        zone_rows = rows_by_zone.get(zid, [])

        announce_html = (
            f"<a class='btn' href='{html.escape(announcement, quote=True)}' target='_blank' rel='noopener noreferrer'>APRI ANNUNCIO</a>"
            if announcement else "<span class='btn disabled'>ANNUNCIO: LINK NON DISPONIBILE</span>"
        )
        nearby_html = "".join(f"<span class='street'>{html.escape(street)}</span>" for street in nearby) or "<span class='muted'>Nessuna via vicina disponibile</span>"

        table_rows = []
        for row in zone_rows:
            contact_url = row["URL_CONTATTO"]
            contact_link = (
                f"<a class='source' href='{html.escape(contact_url, quote=True)}' target='_blank' rel='noopener noreferrer'>APRI FONTE NUMERO</a>"
                if contact_url else "<span class='muted'>LINK NON SALVATO</span>"
            )
            table_rows.append(
                "<tr>"
                f"<td><b>{html.escape(row['TIPO_VIA'])}</b></td>"
                f"<td>{html.escape(row['VIA_CONTATTO'])}</td>"
                f"<td>{html.escape(row['CIVICO'])}</td>"
                f"<td>{html.escape(row['NOME'])}</td>"
                f"<td><strong>{html.escape(row['TELEFONO'])}</strong></td>"
                f"<td>{html.escape(row['FONTE_CONTATTO'])}<br>{contact_link}</td>"
                "<td>DA VERIFICARE</td><td>NO</td>"
                "</tr>"
            )
        if not table_rows:
            table_rows.append("<tr><td colspan='8' class='empty'>0 numeri trovati: la microzona resta visibile e verificabile.</td></tr>")

        cards.append(
            "<section class='card'>"
            f"<div class='head'><div><div class='town'>{html.escape(comune)}</div><h2>{html.escape(target_street)}</h2></div><div class='count'>{len(zone_rows)} numeri</div></div>"
            f"<div class='ref'>{html.escape(ref)}</div>"
            f"<div class='actions'>{announce_html}</div>"
            "<div class='label'>VIA CENTRALE</div>"
            f"<div class='target'>{html.escape(target_street)}</div>"
            "<div class='label'>4 VIE VICINE / COLLEGATE</div>"
            f"<div class='streets'>{nearby_html}</div>"
            "<div class='table-wrap'><table><thead><tr>"
            "<th>Match</th><th>Via numero</th><th>Civico</th><th>Contatto pubblico</th><th>Telefono</th><th>Fonte numero</th><th>RPO</th><th>Proprietario verificato</th>"
            f"</tr></thead><tbody>{''.join(table_rows)}</tbody></table></div></section>"
        )

    page = f"""<!doctype html><html lang='it'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>F1 Lista Mattino</title><style>
body{{font-family:Segoe UI,Arial,sans-serif;background:#070907;color:#fff;margin:0}}main{{max-width:1500px;margin:auto;padding:22px}}h1{{color:#39f28a;margin-bottom:4px}}h2{{margin:3px 0}}.summary{{color:#aeb7b0;margin-bottom:18px}}.note{{background:#17140d;border:1px solid #5b4c25;padding:12px;border-radius:12px;margin-bottom:18px}}.card{{background:#101510;border:1px solid #2a342c;border-radius:16px;padding:16px;margin:14px 0}}.head{{display:flex;justify-content:space-between;gap:12px;align-items:center}}.town{{color:#39f28a;font-weight:800}}.count{{background:#17251c;padding:8px 12px;border-radius:999px}}.ref,.muted{{color:#aeb7b0;font-size:13px}}.actions{{margin:12px 0}}.btn,.source{{display:inline-block;color:#071008;background:#39f28a;padding:8px 11px;border-radius:8px;text-decoration:none;font-weight:800}}.source{{padding:5px 7px;font-size:11px;margin-top:4px}}.disabled{{background:#303633;color:#aeb7b0}}.label{{font-size:11px;color:#aeb7b0;font-weight:800;margin-top:12px}}.target{{font-size:18px;font-weight:800;margin:5px 0}}.streets{{display:flex;gap:7px;flex-wrap:wrap;margin:7px 0 14px}}.street{{border:1px solid #35513e;background:#142018;padding:6px 9px;border-radius:999px}}.table-wrap{{overflow-x:auto}}table{{width:100%;border-collapse:collapse;font-size:13px}}td,th{{border-bottom:1px solid #2a342c;padding:8px;text-align:left;vertical-align:top}}th{{color:#aeb7b0}}.empty{{color:#aeb7b0;padding:16px}}
</style></head><body><main><h1>F1 — LISTA MATTINO</h1><div class='summary'>Generata {datetime.now():%d/%m/%Y %H:%M} · {len(zones)} microzone · {len(rows)} numeri incrociati. Annuncio → via centrale → massimo 4 vie vicine → numeri pubblici.</div><div class='note'><b>CONTROLLO OBBLIGATORIO:</b> la corrispondenza di via/civico non dimostra la proprietà. Prima del contatto commerciale verifica RPO e base giuridica applicabile.</div>{''.join(cards) if cards else '<div class="card">Nessuna microzona disponibile. Controlla motore.log.</div>'}</main></body></html>"""
    base.OUT_HTML.write_text(page, encoding="utf-8")
    base.log(f"LISTA_MATTINO V2: {len(rows)} numeri incrociati, {len(zones)} microzone")
    return rows


base.generate_report = generate_report

if __name__ == "__main__":
    raise SystemExit(base.main())
