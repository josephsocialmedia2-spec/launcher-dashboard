from __future__ import annotations
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import base64, json, os, re, time, urllib.parse
import requests
from bs4 import BeautifulSoup
from common import BASE, CONFIG_PATH, DATA_DIR, ARTIFACT_DIR, canonical, clean, job_key, load_json, same_domain
from cv_standard import build_cv
from whatsapp import send_job

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 CareerPilot-Retail/4.0"
HEADERS = {"User-Agent": UA, "Accept-Language": "it-IT,it;q=0.9,en;q=0.5"}
JOB_PATH_HINTS = ("job", "jobs", "career", "carriere", "posizioni", "position", "vacanc", "offert", "opportun", "lavora")

@dataclass
class Job:
    key: str; title: str; company: str; location: str; url: str; source: str
    description: str = ""; requirements: str = ""; date_posted: str = ""; contract: str = ""; score: int = 0; reasons: list[str] | None = None; first_seen: str = ""; whatsapp_status: str = ""

def fetch(url: str, timeout: int) -> str:
    r = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True); r.raise_for_status(); ctype = (r.headers.get("content-type") or "text/html").lower()
    return r.text if "text" in ctype or "json" in ctype else ""

def jsonld_jobs(body: str) -> list[dict]:
    soup = BeautifulSoup(body, "html.parser"); out = []
    for node in soup.find_all("script", attrs={"type": re.compile("ld\\+json", re.I)}):
        try: data = json.loads(node.string or node.get_text() or "")
        except Exception: continue
        stack = data if isinstance(data, list) else [data]
        while stack:
            item = stack.pop(0)
            if not isinstance(item, dict): continue
            typ = item.get("@type")
            if typ == "JobPosting" or (isinstance(typ, list) and "JobPosting" in typ): out.append(item)
            if isinstance(item.get("@graph"), list): stack.extend(item["@graph"])
    return out

def ld_location(item: dict) -> str:
    loc = item.get("jobLocation"); loc = loc[0] if isinstance(loc, list) and loc else loc
    if isinstance(loc, dict) and isinstance(loc.get("address"), dict):
        addr = loc["address"]; return clean(" ".join(str(addr.get(k, "")) for k in ["streetAddress","addressLocality","addressRegion","postalCode"] if addr.get(k)))
    return ""

def ld_company(item: dict, fallback: str) -> str:
    org = item.get("hiringOrganization"); return clean(str(org.get("name"))) if isinstance(org, dict) and org.get("name") else fallback

def extract_detail(url: str, company: str, timeout: int) -> list[Job]:
    try: body = fetch(url, timeout)
    except Exception: return []
    out = []
    for item in jsonld_jobs(body):
        title = clean(str(item.get("title", "")))
        if not title: continue
        desc = clean(str(item.get("description", "")))[:12000]; quals = item.get("qualifications") or item.get("skills") or item.get("experienceRequirements") or ""
        if isinstance(quals, (dict, list)): quals = json.dumps(quals, ensure_ascii=False)
        location = ld_location(item); comp = ld_company(item, company); contract = item.get("employmentType", ""); contract = ", ".join(map(str, contract)) if isinstance(contract, list) else str(contract)
        out.append(Job(key=job_key(title, comp, location, url), title=title, company=comp, location=location, url=canonical(url), source=urllib.parse.urlsplit(url).netloc, description=desc, requirements=clean(str(quals)), date_posted=clean(str(item.get("datePosted", ""))), contract=clean(contract)))
    return out

def discover_links(start_url: str, domains: list[str], cfg: dict) -> list[str]:
    timeout = int(cfg.get("request_timeout_seconds", 20)); max_links = int(cfg.get("max_detail_pages_per_source", 35))
    try: body = fetch(start_url, timeout)
    except Exception: return []
    soup = BeautifulSoup(body, "html.parser"); links = []
    for a in soup.find_all("a", href=True):
        href = canonical(urllib.parse.urljoin(start_url, a["href"])); text = clean(a.get_text(" ")); low = (href + " " + text).lower()
        if not href.startswith("http") or not same_domain(href, domains) or href == canonical(start_url): continue
        if any(h in low for h in JOB_PATH_HINTS) or any(t.lower() in low for t in cfg["role_terms"]): links.append(href)
    return list(dict.fromkeys(links))[:max_links]

def ddg_search(query: str, timeout: int, limit: int = 8) -> list[str]:
    try: r = requests.get("https://html.duckduckgo.com/html/", params={"q": query}, headers=HEADERS, timeout=timeout); r.raise_for_status()
    except Exception: return []
    soup = BeautifulSoup(r.text, "html.parser"); out = []
    for a in soup.select("a.result__a"):
        href = a.get("href") or ""; q = urllib.parse.parse_qs(urllib.parse.urlsplit(href).query)
        if q.get("uddg"): href = q["uddg"][0]
        if href.startswith("http"): out.append(canonical(href))
        if len(out) >= limit: break
    return out

def fallback_search(source: dict, cfg: dict) -> list[str]:
    roles = " OR ".join(f'"{x}"' for x in cfg["role_terms"][:10]); locs = " OR ".join(f'"{x}"' for x in cfg["target_locations"][:10]); timeout = int(cfg.get("request_timeout_seconds", 20)); out = []
    for domain in source["domains"]: out.extend(ddg_search(f"site:{domain} ({roles}) ({locs})", timeout))
    return list(dict.fromkeys(out))

def looks_target(job: Job, cfg: dict) -> bool:
    text = " ".join([job.title, job.location, job.description, job.requirements]).lower(); return any(t.lower() in text for t in cfg["role_terms"])

def score(job: Job, cfg: dict) -> Job:
    text = " ".join([job.title, job.location, job.description, job.requirements, job.contract]).lower(); points = 0; reasons = []
    role_hits = sum(1 for t in cfg["role_terms"] if t.lower() in text)
    if role_hits: points += min(35, 22 + role_hits * 3); reasons.append("ruolo coerente")
    if any(x.lower() in text for x in cfg["target_locations"]): points += 25; reasons.append("zona target")
    priority_hits = [x for x in cfg.get("priority_terms", []) if x.lower() in text]
    if priority_hits: points += min(20, len(priority_hits) * 5); reasons.append("priorità: " + ", ".join(priority_hits[:3]))
    if job.date_posted: points += 8; reasons.append("data pubblicazione disponibile")
    if job.description: points += 7
    if job.url.startswith("https://"): points += 5
    job.score = min(100, points); job.reasons = reasons; return job

def load_profile() -> dict | None:
    raw = os.getenv("CAREERPILOT_PROFILE_B64", "").strip()
    if raw:
        try: return json.loads(base64.b64decode(raw).decode("utf-8"))
        except Exception as e: print("[WARN] CAREERPILOT_PROFILE_B64 non valido:", e)
    raw = os.getenv("CAREERPILOT_PROFILE_JSON", "").strip()
    if raw:
        try: return json.loads(raw)
        except Exception as e: print("[WARN] CAREERPILOT_PROFILE_JSON non valido:", e)
    local = BASE / "profile.local.json"; return load_json(local, None) if local.exists() else None

def main():
    cfg = load_json(CONFIG_PATH, {}); DATA_DIR.mkdir(exist_ok=True); ARTIFACT_DIR.mkdir(exist_ok=True)
    old_seen = load_json(DATA_DIR / "seen_jobs.json", {}); previous = load_json(DATA_DIR / "jobs.json", {"jobs": []}); previous_jobs = {j.get("key"): j for j in previous.get("jobs", []) if j.get("key")}; found = {}; stats = {"sources":0,"detail_pages":0,"errors":0,"found":0}; delay = float(cfg.get("request_delay_seconds", 0.5))
    for source in cfg.get("sources", []):
        stats["sources"] += 1; urls = [source["career_url"]] + discover_links(source["career_url"], source["domains"], cfg)
        if len(urls) <= 1: urls += fallback_search(source, cfg)
        for url in list(dict.fromkeys(urls))[: int(cfg.get("max_detail_pages_per_source", 35)) + 1]:
            stats["detail_pages"] += 1
            try: jobs = extract_detail(url, source["company"], int(cfg.get("request_timeout_seconds", 20)))
            except Exception: stats["errors"] += 1; jobs = []
            for job in jobs:
                if not looks_target(job, cfg): continue
                score(job, cfg)
                if job.key not in found or job.score > found[job.key].score: found[job.key] = job
            time.sleep(delay)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds"); profile = load_profile(); min_cv = int(cfg.get("min_score_for_cv", 55)); new_jobs = []
    for key, job in found.items():
        if key not in old_seen: job.first_seen = now; new_jobs.append(job)
        else: job.first_seen = old_seen[key].get("first_seen", now)
        old_seen[key] = {"first_seen":job.first_seen,"last_seen":now,"url":job.url}
    for job in sorted(new_jobs, key=lambda j: -j.score):
        pdf = None
        if profile and job.score >= min_cv:
            safe = re.sub(r"[^A-Za-z0-9._-]+", "_", f"CV_{job.company}_{job.title}_{job.key}")[:120]; pdf = build_cv(profile, asdict(job), ARTIFACT_DIR / f"{safe}.pdf")
        try: job.whatsapp_status = send_job(asdict(job), pdf)
        except Exception as e: job.whatsapp_status = "ERROR"; print("[WARN] WhatsApp:", e)
    merged = {**previous_jobs}; merged.update({k:asdict(v) for k,v in found.items()}); jobs_sorted = sorted(merged.values(), key=lambda j:(j.get("first_seen", ""), j.get("score",0)), reverse=True)[:500]
    stats.update({"found":len(found),"new":len(new_jobs),"profile_configured":bool(profile),"generated_pdfs":len(list(ARTIFACT_DIR.glob("*.pdf")))})
    (DATA_DIR / "seen_jobs.json").write_text(json.dumps(old_seen, ensure_ascii=False, indent=2), encoding="utf-8"); (DATA_DIR / "jobs.json").write_text(json.dumps({"updated_at":now,"stats":stats,"jobs":jobs_sorted}, ensure_ascii=False, indent=2), encoding="utf-8"); print(json.dumps(stats, ensure_ascii=False))

if __name__ == "__main__": main()
