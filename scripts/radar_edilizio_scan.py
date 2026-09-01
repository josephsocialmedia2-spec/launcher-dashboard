#!/usr/bin/env python3
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SOURCES_FILE = DATA / "radar_sources.json"
DB_FILE = DATA / "radar_edilizio.json"
SEEN_FILE = DATA / "radar_seen.json"
LOG_FILE = DATA / "radar_scan_log.json"

UA = "F1-Radar-Edilizio/3.0 (+public-data-monitor)"
TIMEOUT = 20
SCHEMA_VERSION = 3
NAV_TERMS = (
    "albo pretorio", "documenti albo", "atti amministrativi", "pubblicazioni",
    "urbanistica", "edilizia privata", "sportello unico edilizia", "sue",
    "piano regolatore", "prgc"
)
EXTRA_KEYWORDS = (
    "permesso a costruire", "permesso di costruire", "pdc",
    "scia", "s.c.i.a", "scia alternativa",
    "cila", "c.i.l.a", "agibilita", "agibilità",
    "pubblicazione pratiche edilizie", "autorizzazione paesaggistica",
    "variante urbanistica", "variante prgc", "piano regolatore", "piano di recupero",
    "ampliamento", "manutenzione straordinaria", "ristrutturazione", "riqualificazione",
    "restauro", "risanamento", "recupero fabbricato", "demolizione", "ricostruzione",
    "cambio di destinazione", "lottizzazione", "piano attuativo", "piano esecutivo",
    "vendita immobile", "vendita terreno", "lotto edificabile", "terreno edificabile",
    "alienazione", "asta", "permesso convenzionato"
)


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def save(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normalize(s):
    return re.sub(r"\s+", " ", (s or "").strip())


def relevant(text, keywords):
    t = normalize(text).lower()
    return any(k.lower() in t for k in keywords)


def valid_href(href):
    h = (href or "").strip().lower()
    return bool(h) and not h.startswith(("javascript:", "mailto:", "tel:", "#"))


def discover_links(url, html, keywords):
    soup = BeautifulSoup(html, "html.parser")
    out = []
    for a in soup.find_all("a", href=True):
        if not valid_href(a["href"]):
            continue
        label = normalize(a.get_text(" ", strip=True))
        href = urljoin(url, a["href"])
        context = normalize(a.parent.get_text(" ", strip=True) if a.parent else label)
        ext_ok = any(x in href.lower() for x in (".pdf", "dettaglio.aspx", "download", "/document", "documenti/", "/atti-amministrativi/"))
        if ext_ok and relevant(label + " " + context, keywords):
            out.append({"url": href, "label": label or context[:180], "context": context[:500]})
    seen = set()
    uniq = []
    for item in out:
        if item["url"] not in seen:
            seen.add(item["url"])
            uniq.append(item)
    return uniq


def discover_navigation(url, html, max_links=2):
    soup = BeautifulSoup(html, "html.parser")
    candidates = []
    for a in soup.find_all("a", href=True):
        if not valid_href(a["href"]):
            continue
        label = normalize(a.get_text(" ", strip=True)).lower()
        title = normalize(a.get("title", "")).lower()
        haystack = f"{label} {title}"
        if any(term in haystack for term in NAV_TERMS):
            href = urljoin(url, a["href"])
            if href != url and href not in candidates:
                candidates.append(href)
        if len(candidates) >= max_links:
            break
    return candidates


def collect_source_links(session, url, keywords):
    response = session.get(url, timeout=TIMEOUT, allow_redirects=True)
    response.raise_for_status()
    pages = [response.url]
    warnings = []
    all_links = discover_links(response.url, response.text, keywords)

    if len(all_links) < 3:
        for nav_url in discover_navigation(response.url, response.text, max_links=2):
            try:
                nav = session.get(nav_url, timeout=TIMEOUT, allow_redirects=True)
                nav.raise_for_status()
                pages.append(nav.url)
                all_links.extend(discover_links(nav.url, nav.text, keywords))
            except Exception as exc:
                warnings.append(f"{nav_url}: {type(exc).__name__}")

    by_url = {}
    for item in all_links:
        by_url.setdefault(item["url"], item)
    return response.status_code, list(by_url.values()), pages, warnings


def make_id(comune, url):
    digest = hashlib.sha1(f"{comune}|{url}".encode()).hexdigest()[:10].upper()
    return f"AUTO-{digest}"


def main():
    cfg = load(SOURCES_FILE)
    db = load(DB_FILE)
    state = load(SEEN_FILE) if SEEN_FILE.exists() else {"initialized_sources": [], "seen_urls": []}
    initialized = set(state.get("initialized_sources", []))
    seen_urls = set(state.get("seen_urls", []))
    state_version = int(state.get("schema_version", 1))
    rebaseline_all = state_version != SCHEMA_VERSION
    keywords = list(dict.fromkeys(list(cfg["keywords"]) + list(EXTRA_KEYWORDS)))
    now = datetime.now(timezone.utc).isoformat()
    log = {
        "started_at": now,
        "scanner_version": SCHEMA_VERSION,
        "rebaseline": rebaseline_all,
        "sources": [],
        "new_records": 0,
        "errors": 0,
    }

    existing_urls = {x.get("source_url") for x in db.get("opportunities", [])}
    session = requests.Session()
    session.headers.update({"User-Agent": UA})

    for src in cfg["sources"]:
        if not src.get("enabled", True):
            continue
        comune, url = src["comune"], src["url"]
        entry = {"comune": comune, "url": url, "status": "", "links": 0, "new": 0, "pages_checked": 0}
        try:
            http_status, links, pages, warnings = collect_source_links(session, url, keywords)
            entry["http_status"] = http_status
            entry["links"] = len(links)
            entry["pages_checked"] = len(pages)
            if warnings:
                entry["warnings"] = warnings
            source_key = f"{comune}|{url}"

            if rebaseline_all or source_key not in initialized:
                for item in links:
                    seen_urls.add(item["url"])
                initialized.add(source_key)
                entry["status"] = "BASELINE_CREATED"
                entry["baseline_count"] = len(links)
            else:
                for item in links:
                    source_url = item["url"]
                    if source_url in seen_urls:
                        continue
                    seen_urls.add(source_url)
                    entry["new"] += 1
                    if source_url not in existing_urls:
                        db.setdefault("opportunities", []).append({
                            "id": make_id(comune, source_url),
                            "comune": comune,
                            "date": datetime.now().date().isoformat(),
                            "atto": item["label"][:160] or "Nuovo atto rilevato",
                            "tipo": "Nuovo documento edilizio da analizzare",
                            "indirizzo": "DA APPROFONDIRE",
                            "catasto": "",
                            "descrizione": item["context"][:350],
                            "societa": "",
                            "professionista": "",
                            "priorita": "MEDIA",
                            "stato": "DA APPROFONDIRE",
                            "azione": "Aprire il documento, estrarre intervento, indirizzo, tecnico e impresa; poi qualificare priorità F1.",
                            "source_url": source_url,
                            "verified": False,
                        })
                        existing_urls.add(source_url)
                        log["new_records"] += 1
                entry["status"] = "OK"
        except Exception as exc:
            entry["status"] = "ERROR"
            entry["error"] = f"{type(exc).__name__}: {exc}"[:500]
            log["errors"] += 1
        log["sources"].append(entry)

    db["meta"]["last_automatic_scan_utc"] = now
    db["meta"]["last_scan_new_records"] = log["new_records"]
    db["meta"]["scanner_version"] = SCHEMA_VERSION
    save(DB_FILE, db)
    save(SEEN_FILE, {
        "schema_version": SCHEMA_VERSION,
        "initialized_sources": sorted(initialized),
        "seen_urls": sorted(seen_urls),
    })
    log["finished_at"] = datetime.now(timezone.utc).isoformat()
    save(LOG_FILE, log)
    print(json.dumps({
        "new_records": log["new_records"],
        "errors": log["errors"],
        "sources": len(log["sources"]),
        "links_seen": sum(x.get("links", 0) for x in log["sources"]),
        "pages_checked": sum(x.get("pages_checked", 0) for x in log["sources"]),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
