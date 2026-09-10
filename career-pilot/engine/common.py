from __future__ import annotations
import hashlib, html, json, re, urllib.parse
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
CONFIG_PATH = BASE / "config.json"
DATA_DIR = BASE / "data"
ARTIFACT_DIR = BASE / "artifacts"

def load_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default

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
