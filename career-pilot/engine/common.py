from __future__ import annotations
import hashlib, html, json, re, urllib.parse
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
CONFIG_PATH = BASE / "config.json"
EXTENSIONS_PATH = BASE / "search_extensions.json"
DATA_DIR = BASE / "data"
ARTIFACT_DIR = BASE / "artifacts"

def _merge_unique(base, extra):
    out = []
    seen = set()
    for item in [*(base or []), *(extra or [])]:
        key = str(item).strip().lower()
        if key and key not in seen:
            seen.add(key)
            out.append(item)
    return out

def load_json(path: Path, default):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default

    try:
        if path.resolve() == CONFIG_PATH.resolve() and EXTENSIONS_PATH.exists() and isinstance(data, dict):
            ext = json.loads(EXTENSIONS_PATH.read_text(encoding="utf-8"))
            if isinstance(ext, dict):
                for key, value in ext.items():
                    if isinstance(value, list):
                        data[key] = _merge_unique(data.get(key, []), value)
                    elif isinstance(value, dict):
                        current = data.get(key, {}) if isinstance(data.get(key), dict) else {}
                        data[key] = {**current, **value}
                    else:
                        data[key] = value
    except Exception as e:
        print("[WARN] search_extensions.json non applicato:", e)

    return data

def clean(text: str) -> str:
    text = html.unescape(text or "")
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()

def canonical(url: str) -> str:
    try:
        u = urllib.parse.urlsplit(url)
        q = urllib.parse.parse_qsl(u.query, keep_blank_values=True)
        q = [(k, v) for k, v in q if k.lower() not in {"utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "src"}]
        return urllib.parse.urlunsplit((u.scheme.lower(), u.netloc.lower(), u.path.rstrip("/"), urllib.parse.urlencode(q), ""))
    except Exception:
        return url

def job_key(title: str, company: str, location: str, url: str) -> str:
    raw = "|".join([clean(title).lower(), clean(company).lower(), clean(location).lower(), canonical(url).lower()])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]

def same_domain(url: str, domains: list[str]) -> bool:
    host = urllib.parse.urlsplit(url).netloc.lower().lstrip("www.")
    return any(host == d.lower().lstrip("www.") or host.endswith("." + d.lower().lstrip("www.")) for d in domains)
