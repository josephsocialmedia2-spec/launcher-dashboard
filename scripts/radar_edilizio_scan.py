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

UA = "F1-Radar-Edilizio/1.0 (+public-data-monitor)"
TIMEOUT = 25


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def save(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normalize(s):
    return re.sub(r"\s+", " ", (s or "").strip())


def relevant(text, keywords):
    t = normalize(text).lower()
    return any(k.lower() in t for k in keywords)


def discover_links(url, html, keywords):
    soup = BeautifulSoup(html, "html.parser")
    out = []
    for a in soup.find_all("a", href=True):
        label = normalize(a.get_text(" ", strip=True))
        href = urljoin(url, a["href"])
        context = normalize(a.parent.get_text(" ", strip=True) if a.parent else label)
        ext_ok = any(x in href.lower() for x in (".pdf", "dettaglio.aspx", "download", "document"))
        if ext_ok and relevant(label + " " + context, keywords):
            out.append({"url": href, "label": label or context[:180], "context": context[:500]})
    seen = set()
    uniq = []
    for item in out:
        if item["url"] not in seen:
            seen.add(item["url"])
            uniq.append(item)
    return uniq


def make_id(comune, url):
    digest = hashlib.sha1(f"{comune}|{url}".encode()).hexdigest()[:10].upper()
    return f"AUTO-{digest}"


def main():
    cfg = load(SOURCES_FILE)
    db = load(DB_FILE)
    state = load(SEEN_FILE) if SEEN_FILE.exists() else {"initialized_sources": [], "seen_urls": []}
    initialized = set(state.get("initialized_sources", []))
    seen_urls = set(state.get("seen_urls", []))
    keywords = cfg["keywords"]
    now = datetime.now(timezone.utc).isoformat()
    log = {"started_at": now, "sources": [], "new_records": 0, "errors": 0}

    existing_urls = {x.get("source_url") for x in db.get("opportunities", [])}
    session = requests.Session()
    session.headers.update({"User-Agent": UA})

    for src in cfg["sources"]:
        if not src.get("enabled", True):
            continue
        comune, url = src["comune"], src["url"]
        entry = {"comune": comune, "url": url, "status": "", "links": 0, "new": 0}
        try:
            response = session.get(url, timeout=TIMEOUT, allow_redirects=True)
            entry["http_status"] = response.status_code
            response.raise_for_status()
            links = discover_links(response.url, response.text, keywords)
            entry["links"] = len(links)
            source_key = f"{comune}|{url}"

            if source_key not in initialized:
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
                            "verified": False
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
    save(DB_FILE, db)
    save(SEEN_FILE, {"initialized_sources": sorted(initialized), "seen_urls": sorted(seen_urls)})
    log["finished_at"] = datetime.now(timezone.utc).isoformat()
    save(LOG_FILE, log)
    print(json.dumps({"new_records": log["new_records"], "errors": log["errors"], "sources": len(log["sources"])}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
