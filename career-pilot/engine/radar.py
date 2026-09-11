from __future__ import annotations
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import base64, json, os, re, time, urllib.parse
import requests
from bs4 import BeautifulSoup
from common import BASE, CONFIG_PATH, DATA_DIR, ARTIFACT_DIR, canonical, clean, job_key, load_json, same_domain
from cv_standard import build_cv

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 CareerPilot-Retail/6.0"
HEADERS = {
    "User-Agent": UA,
    "Accept-Language": "it-IT,it;q=0.9,en;q=0.5",
    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
}
JOB_PATH_HINTS = ("job", "jobs", "career", "carriere", "posizioni", "position", "vacanc", "offert", "opportun", "lavora", "recruit", "selezion", "assunz", "viewjob")
HIRING_HINTS = ("candidati", "candidatura", "requisiti", "mansioni", "responsabilità", "responsabilita", "offerta di lavoro", "posizione aperta", "posizioni aperte", "lavora con noi", "assunzioni", "selezione personale", "recruiting day", "career day", "job day")
GENERIC_TITLES = ("lavora con noi", "carriere", "career", "posizioni aperte", "opportunità di lavoro", "opportunita di lavoro")
PROTECTED_HINTS = (
    "categoria protetta", "categorie protette", "legge 68/99", "l. 68/99", "l.68/99", "l68/99",
    "collocamento mirato", "inserimento mirato", "appartenente alle categorie protette",
    "iscritto al collocamento mirato", "art. 1 l.68/99", "articolo 1 legge 68/99",
)


@dataclass
class Job:
    key: str
    title: str
    company: str
    location: str
    url: str
    source: str
    description: str = ""
    requirements: str = ""
    date_posted: str = ""
    contract: str = ""
    score: int = 0
    reasons: list[str] | None = None
    first_seen: str = ""
    whatsapp_status: str = ""
    discovery: str = ""


def fetch(url: str, timeout: int) -> str:
    r = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
    r.raise_for_status()
    ctype = (r.headers.get("content-type") or "text/html").lower()
    return r.text if "text" in ctype or "json" in ctype or "html" in ctype else ""


def jsonld_jobs(body: str) -> list[dict]:
    soup = BeautifulSoup(body, "html.parser")
    out = []
    for node in soup.find_all("script", attrs={"type": re.compile("ld\\+json", re.I)}):
        try:
            data = json.loads(node.string or node.get_text() or "")
        except Exception:
            continue
        stack = data if isinstance(data, list) else [data]
        while stack:
            item = stack.pop(0)
            if not isinstance(item, dict):
                continue
            typ = item.get("@type")
            if typ == "JobPosting" or (isinstance(typ, list) and "JobPosting" in typ):
                out.append(item)
            if isinstance(item.get("@graph"), list):
                stack.extend(item["@graph"])
    return out


def ld_location(item: dict) -> str:
    loc = item.get("jobLocation")
    loc = loc[0] if isinstance(loc, list) and loc else loc
    if isinstance(loc, dict) and isinstance(loc.get("address"), dict):
        addr = loc["address"]
        return clean(" ".join(str(addr.get(k, "")) for k in ["streetAddress", "addressLocality", "addressRegion", "postalCode"] if addr.get(k)))
    return ""


def ld_company(item: dict, fallback: str) -> str:
    org = item.get("hiringOrganization")
    return clean(str(org.get("name"))) if isinstance(org, dict) and org.get("name") else fallback


def infer_location(text: str, cfg: dict) -> str:
    low = text.lower()
    hits = [x for x in cfg.get("target_locations", []) if x.lower() in low]
    return ", ".join(hits[:3])


def infer_location_html(soup: BeautifulSoup, text: str, cfg: dict) -> str:
    selectors = [
        '[data-testid="job-location"]', '.companyLocation', '.jobsearch-JobInfoHeader-subtitle div',
        '[class*="location"]', '[data-testid*="location"]'
    ]
    for sel in selectors:
        node = soup.select_one(sel)
        if node:
            value = clean(node.get_text(" ", strip=True))
            if value and len(value) <= 160:
                return value
    return infer_location(text, cfg)


def infer_company_html(soup: BeautifulSoup, fallback: str) -> str:
    selectors = [
        '[data-testid="inlineHeader-companyName"]', '.companyName', '[data-company-name]',
        '.jobsearch-InlineCompanyRating', '[class*="companyName"]'
    ]
    for sel in selectors:
        node = soup.select_one(sel)
        if node:
            value = clean(node.get_text(" ", strip=True))
            if value and len(value) <= 140:
                return value
    return fallback


def infer_contract(text: str) -> str:
    low = text.lower()
    hits = []
    for term in ["part-time", "part time", "full-time", "full time", "tempo indeterminato", "tempo determinato", "apprendistato", "weekend"]:
        if term in low and term not in hits:
            hits.append(term)
    return ", ".join(hits[:4])


def html_fallback_job(body: str, url: str, company: str, cfg: dict) -> list[Job]:
    soup = BeautifulSoup(body, "html.parser")
    h1 = soup.find("h1")
    og = soup.find("meta", attrs={"property": "og:title"})
    title_tag = soup.find("title")
    title = clean((h1.get_text(" ") if h1 else "") or (og.get("content") if og else "") or (title_tag.get_text(" ") if title_tag else ""))
    if not title:
        return []
    meta = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
    meta_desc = clean(meta.get("content", "")) if meta else ""
    page_text = clean(soup.get_text(" ", strip=True))[:18000]
    full = f"{title} {meta_desc} {page_text}".lower()
    role_hit = any(t.lower() in full for t in cfg.get("role_terms", []))
    sector_hit = any(t.lower() in full for t in cfg.get("sector_terms", []))
    protected_hit = any(t in full for t in PROTECTED_HINTS)
    hiring_hit = any(t in full for t in HIRING_HINTS)
    path_hit = any(h in (urllib.parse.urlsplit(url).path or "").lower() for h in JOB_PATH_HINTS)
    generic = title.lower().strip() in GENERIC_TITLES
    if generic:
        return []
    if not (path_hit or hiring_hit):
        return []
    if not (role_hit or sector_hit or protected_hit):
        return []
    comp = infer_company_html(soup, company)
    location = infer_location_html(soup, full, cfg)
    date_node = soup.find("meta", attrs={"itemprop": "datePosted"}) or soup.find("time")
    date_posted = clean((date_node.get("content") or date_node.get("datetime") or date_node.get_text(" ")) if date_node else "")
    desc = clean((meta_desc + " " + page_text))[:12000]
    return [Job(
        key=job_key(title, comp, location, url), title=title, company=comp, location=location,
        url=canonical(url), source=urllib.parse.urlsplit(url).netloc, description=desc,
        date_posted=date_posted, contract=infer_contract(full)
    )]


def extract_detail(url: str, company: str, timeout: int, cfg: dict, discovery: str = "") -> list[Job]:
    try:
        body = fetch(url, timeout)
    except Exception:
        return []
    out = []
    for item in jsonld_jobs(body):
        title = clean(str(item.get("title", "")))
        if not title:
            continue
        desc = clean(str(item.get("description", "")))[:12000]
        quals = item.get("qualifications") or item.get("skills") or item.get("experienceRequirements") or ""
        if isinstance(quals, (dict, list)):
            quals = json.dumps(quals, ensure_ascii=False)
        location = ld_location(item)
        comp = ld_company(item, company)
        contract = item.get("employmentType", "")
        contract = ", ".join(map(str, contract)) if isinstance(contract, list) else str(contract)
        out.append(Job(
            key=job_key(title, comp, location, url), title=title, company=comp, location=location,
            url=canonical(url), source=urllib.parse.urlsplit(url).netloc, description=desc,
            requirements=clean(str(quals)), date_posted=clean(str(item.get("datePosted", ""))),
            contract=clean(contract), discovery=discovery
        ))
    if out:
        return out
    fallback = html_fallback_job(body, url, company, cfg)
    for job in fallback:
        job.discovery = discovery
    return fallback


def discover_links(start_url: str, domains: list[str], cfg: dict) -> list[str]:
    timeout = int(cfg.get("request_timeout_seconds", 20))
    max_links = int(cfg.get("max_detail_pages_per_source", 45))
    try:
        body = fetch(start_url, timeout)
    except Exception:
        return []
    soup = BeautifulSoup(body, "html.parser")
    links = []
    terms = [*cfg.get("role_terms", []), *cfg.get("sector_terms", [])]
    for a in soup.find_all("a", href=True):
        href = canonical(urllib.parse.urljoin(start_url, a["href"]))
        text = clean(a.get_text(" "))
        low = (href + " " + text).lower()
        if not href.startswith("http") or not same_domain(href, domains) or href == canonical(start_url):
            continue
        if any(h in low for h in JOB_PATH_HINTS) or any(t.lower() in low for t in terms):
            links.append(href)
    return list(dict.fromkeys(links))[:max_links]


def indeed_area_listing_urls(cfg: dict) -> list[str]:
    area = cfg.get("search_area", {}) if isinstance(cfg.get("search_area"), dict) else {}
    center = str(area.get("center") or "Avigliana, Piemonte")
    radius = int(area.get("radius_km") or 35)
    pages = max(1, min(int(cfg.get("indeed_area_pages", 5)), 10))
    base = "https://it.indeed.com/jobs"
    urls = []
    for page in range(pages):
        params = {"l": center, "radius": radius, "sort": "date", "start": page * 10}
        # Nessun parametro q: prima costruiamo la lista geografica, poi CareerPilot classifica gli annunci.
        urls.append(base + "?" + urllib.parse.urlencode(params))
    return urls


def discover_indeed_area(cfg: dict) -> tuple[list[str], int, int]:
    timeout = int(cfg.get("request_timeout_seconds", 20))
    links = []
    listing_pages = 0
    errors = 0
    for listing_url in indeed_area_listing_urls(cfg):
        try:
            body = fetch(listing_url, timeout)
            listing_pages += 1
        except Exception as e:
            errors += 1
            print("[WARN] Indeed listing", listing_url, e)
            continue
        soup = BeautifulSoup(body, "html.parser")
        for node in soup.select("[data-jk]"):
            jk = clean(str(node.get("data-jk") or ""))
            if jk:
                links.append("https://it.indeed.com/viewjob?" + urllib.parse.urlencode({"jk": jk}))
        for a in soup.find_all("a", href=True):
            href = urllib.parse.urljoin("https://it.indeed.com", a.get("href") or "")
            parsed = urllib.parse.urlsplit(href)
            query = urllib.parse.parse_qs(parsed.query)
            jk = (query.get("jk") or [""])[0]
            if jk:
                links.append("https://it.indeed.com/viewjob?" + urllib.parse.urlencode({"jk": jk}))
            elif "/viewjob" in parsed.path.lower():
                links.append(canonical(href))
        time.sleep(float(cfg.get("request_delay_seconds", 0.4)))
    return list(dict.fromkeys(links)), listing_pages, errors


def ddg_search(query: str, timeout: int, limit: int = 8) -> list[str]:
    try:
        r = requests.get("https://html.duckduckgo.com/html/", params={"q": query}, headers=HEADERS, timeout=timeout)
        r.raise_for_status()
    except Exception:
        return []
    soup = BeautifulSoup(r.text, "html.parser")
    out = []
    for a in soup.select("a.result__a"):
        href = a.get("href") or ""
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(href).query)
        if q.get("uddg"):
            href = q["uddg"][0]
        if href.startswith("http"):
            out.append(canonical(href))
        if len(out) >= limit:
            break
    return out


def location_clause(cfg: dict, n: int = 10) -> str:
    locs = cfg.get("target_locations", [])[:n]
    return "(" + " OR ".join(f'\"{x}\"' for x in locs) + ")" if locs else ""


def fallback_search(source: dict, cfg: dict) -> list[str]:
    timeout = int(cfg.get("request_timeout_seconds", 20))
    out = []
    locs = location_clause(cfg)
    core = cfg.get("master_queries", [])[:4]
    company_name = source["company"].split("/")[0].strip().lower()
    company_specific = [q for q in cfg.get("company_queries", []) if company_name in q.lower()][:4]
    for domain in source["domains"]:
        for q in company_specific + core:
            out.extend(ddg_search(f"site:{domain} {q} {locs}", timeout, 5))
    return list(dict.fromkeys(out))


def secondary_search(cfg: dict) -> list[tuple[str, str]]:
    timeout = int(cfg.get("request_timeout_seconds", 20))
    locs = location_clause(cfg)
    out = []
    # Indeed viene scandito separatamente senza query, partendo da Avigliana + 35 km.
    domains = [d for d in cfg.get("secondary_domains", []) if "indeed" not in d.lower()]
    for domain in domains:
        for q in cfg.get("master_queries", [])[:3]:
            for url in ddg_search(f"site:{domain} {q} {locs}", timeout, 4):
                out.append((domain, url))
    return list(dict.fromkeys(out))


def known_gdo(job: Job, cfg: dict) -> bool:
    hay = f"{job.company} {job.title} {job.description}".lower()
    return any(str(name).lower() in hay for name in cfg.get("known_gdo_companies", []))


def looks_target(job: Job, cfg: dict) -> bool:
    text = " ".join([job.title, job.company, job.location, job.description, job.requirements]).lower()
    if any(t.lower() in text for t in cfg.get("exclude_terms", [])):
        return False
    role_hit = any(t.lower() in text for t in cfg.get("role_terms", []))
    sector_hit = any(t.lower() in text for t in cfg.get("sector_terms", []))
    protected_hit = any(t in text for t in PROTECTED_HINTS)
    gdo_hit = known_gdo(job, cfg)
    hiring_event = any(x in text for x in ("nuova apertura", "prossima apertura", "recruiting day", "career day", "job day", "assunzioni"))
    if gdo_hit and (role_hit or protected_hit or hiring_event):
        return True
    if sector_hit and (role_hit or protected_hit or hiring_event):
        return True
    return False


def score(job: Job, cfg: dict) -> Job:
    text = " ".join([job.title, job.company, job.location, job.description, job.requirements, job.contract]).lower()
    points = 0
    reasons = []
    role_hits = sum(1 for t in cfg.get("role_terms", []) if t.lower() in text)
    sector_hits = sum(1 for t in cfg.get("sector_terms", []) if t.lower() in text)
    if role_hits:
        points += min(35, 20 + role_hits * 2)
        reasons.append("ruolo coerente")
    if sector_hits:
        points += min(12, 4 + sector_hits * 2)
        reasons.append("settore GDO")
    if known_gdo(job, cfg):
        points += 10
        reasons.append("azienda GDO")
    if job.discovery == "indeed_area":
        points += 25
        reasons.append("Avigliana +35 km")
    elif any(x.lower() in text for x in cfg.get("target_locations", [])):
        points += 25
        reasons.append("zona target")
    priority_hits = [x for x in cfg.get("priority_terms", []) if x.lower() in text]
    if priority_hits:
        points += min(18, len(priority_hits) * 4)
        reasons.append("priorità: " + ", ".join(priority_hits[:3]))
    if job.date_posted:
        points += 5
        reasons.append("data pubblicazione disponibile")
    if job.description:
        points += 3
    if job.url.startswith("https://"):
        points += 2
    job.score = min(100, points)
    job.reasons = reasons
    return job


def load_profile() -> dict | None:
    raw = os.getenv("CAREERPILOT_PROFILE_B64", "").strip()
    if raw:
        try:
            return json.loads(base64.b64decode(raw).decode("utf-8"))
        except Exception as e:
            print("[WARN] CAREERPILOT_PROFILE_B64 non valido:", e)
    raw = os.getenv("CAREERPILOT_PROFILE_JSON", "").strip()
    if raw:
        try:
            return json.loads(raw)
        except Exception as e:
            print("[WARN] CAREERPILOT_PROFILE_JSON non valido:", e)
    local = BASE / "profile.local.json"
    return load_json(local, None) if local.exists() else None


def add_jobs(found: dict, jobs: list[Job], cfg: dict):
    for job in jobs:
        if not looks_target(job, cfg):
            continue
        score(job, cfg)
        if job.key not in found or job.score > found[job.key].score:
            found[job.key] = job


def main():
    cfg = load_json(CONFIG_PATH, {})
    DATA_DIR.mkdir(exist_ok=True)
    ARTIFACT_DIR.mkdir(exist_ok=True)
    old_seen = load_json(DATA_DIR / "seen_jobs.json", {})
    previous = load_json(DATA_DIR / "jobs.json", {"jobs": []})
    previous_jobs = {j.get("key"): j for j in previous.get("jobs", []) if j.get("key")}
    found = {}
    stats = {
        "sources": 0,
        "detail_pages": 0,
        "secondary_pages": 0,
        "indeed_listing_pages": 0,
        "indeed_candidate_links": 0,
        "errors": 0,
        "found": 0,
    }
    delay = float(cfg.get("request_delay_seconds", 0.4))
    timeout = int(cfg.get("request_timeout_seconds", 20))

    # 1) Indeed: nessuna query. Lista geografica Avigliana +35 km, poi filtro interno CareerPilot.
    indeed_links, listing_pages, indeed_errors = discover_indeed_area(cfg)
    stats["indeed_listing_pages"] = listing_pages
    stats["indeed_candidate_links"] = len(indeed_links)
    stats["errors"] += indeed_errors
    for url in indeed_links:
        stats["detail_pages"] += 1
        try:
            add_jobs(found, extract_detail(url, "Indeed", timeout, cfg, discovery="indeed_area"), cfg)
        except Exception as e:
            stats["errors"] += 1
            print("[WARN] Indeed detail", url, e)
        time.sleep(delay)

    # 2) Siti ufficiali GDO: ricerca diretta + fallback mirato.
    for source in cfg.get("sources", []):
        stats["sources"] += 1
        urls = [source["career_url"]] + discover_links(source["career_url"], source["domains"], cfg)
        urls += fallback_search(source, cfg)
        limit = int(cfg.get("max_detail_pages_per_source", 45)) + 1
        for url in list(dict.fromkeys(urls))[:limit]:
            stats["detail_pages"] += 1
            try:
                add_jobs(found, extract_detail(url, source["company"], timeout, cfg, discovery="official"), cfg)
            except Exception as e:
                stats["errors"] += 1
                print("[WARN] source", source["company"], url, e)
            time.sleep(delay)

    # 3) Portali secondari: query ridotte per evitare cicli infiniti; Indeed escluso perché già scansionato per area.
    for domain, url in secondary_search(cfg):
        stats["secondary_pages"] += 1
        try:
            host = urllib.parse.urlsplit(url).netloc
            add_jobs(found, extract_detail(url, host, timeout, cfg, discovery="secondary"), cfg)
        except Exception as e:
            stats["errors"] += 1
            print("[WARN] secondary", domain, url, e)
        time.sleep(delay)

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    profile = load_profile()
    min_cv = int(cfg.get("min_score_for_cv", 55))
    new_jobs = []
    for key, job in found.items():
        if key not in old_seen:
            job.first_seen = now
            job.whatsapp_status = "PENDING_08"
            new_jobs.append(job)
        else:
            job.first_seen = old_seen[key].get("first_seen", now)
            previous_status = previous_jobs.get(key, {}).get("whatsapp_status", "")
            job.whatsapp_status = previous_status or "SEEN"
        old_seen[key] = {"first_seen": job.first_seen, "last_seen": now, "url": job.url}

    for job in sorted(new_jobs, key=lambda j: -j.score):
        if profile and job.score >= min_cv:
            safe = re.sub(r"[^A-Za-z0-9._-]+", "_", f"CV_{job.company}_{job.title}_{job.key}")[:120]
            build_cv(profile, asdict(job), ARTIFACT_DIR / f"{safe}.pdf")

    merged = {**previous_jobs}
    merged.update({k: asdict(v) for k, v in found.items()})
    jobs_sorted = sorted(merged.values(), key=lambda j: (j.get("first_seen", ""), j.get("score", 0)), reverse=True)[:500]
    stats.update({
        "found": len(found),
        "new": len(new_jobs),
        "profile_configured": bool(profile),
        "generated_pdfs": len(list(ARTIFACT_DIR.glob("*.pdf"))),
        "search_area": cfg.get("search_area", {}),
    })
    (DATA_DIR / "seen_jobs.json").write_text(json.dumps(old_seen, ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA_DIR / "jobs.json").write_text(json.dumps({"updated_at": now, "stats": stats, "jobs": jobs_sorted}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(stats, ensure_ascii=False))


if __name__ == "__main__":
    main()
