from __future__ import annotations
from datetime import datetime
from zoneinfo import ZoneInfo
import json
import os

from common import DATA_DIR, load_json
from whatsapp import configured, send_text

ROME = ZoneInfo("Europe/Rome")
DASHBOARD = "https://josephsocialmedia2-spec.github.io/launcher-dashboard/career-pilot/"


def local_date(iso_value: str) -> str:
    if not iso_value:
        return ""
    try:
        dt = datetime.fromisoformat(iso_value.replace("Z", "+00:00"))
        return dt.astimezone(ROME).date().isoformat()
    except Exception:
        return ""


def chunks_for_jobs(jobs: list[dict], stats: dict, today: str) -> list[str]:
    area = stats.get("search_area") or {"center": "Avigliana, Piemonte", "radius_km": 35}
    center = area.get("center", "Avigliana, Piemonte")
    radius = area.get("radius_km", 35)
    header = (
        f"CAREERPILOT GDO — REPORT ORE 08:00\n"
        f"Ricerca: {center} + {radius} km\n"
        f"Nuove offerte: {len(jobs)}\n"
    )
    if not jobs:
        return [
            header
            + f"Offerte rilevate nell'ultimo ciclo: {stats.get('found', 0)}\n"
            + f"Errori tecnici: {stats.get('errors', 0)}\n\n"
            + f"Dashboard: {DASHBOARD}"
        ]

    messages = []
    current = header
    for idx, job in enumerate(jobs, 1):
        block = (
            f"\n{idx}) {job.get('company','')} — {job.get('title','')}\n"
            f"{job.get('location') or 'Località non rilevata'}\n"
            f"Score: {job.get('score',0)}/100\n"
            f"{job.get('url','')}\n"
        )
        if len(current) + len(block) > 3500:
            current += f"\nDashboard: {DASHBOARD}"
            messages.append(current)
            current = "CAREERPILOT GDO — continua\n" + block
        else:
            current += block
    current += f"\nDashboard: {DASHBOARD}"
    messages.append(current)
    return messages


def main():
    now = datetime.now(ROME)
    today = now.date().isoformat()
    data_path = DATA_DIR / "jobs.json"
    state_path = DATA_DIR / "notification_state.json"
    data = load_json(data_path, {"jobs": [], "stats": {}})
    state = load_json(state_path, {})

    if state.get("last_date") == today and os.getenv("FORCE_NOTIFY", "").lower() not in {"1", "true", "yes"}:
        print(json.dumps({"status": "ALREADY_SENT", "date": today}, ensure_ascii=False))
        return

    if not configured():
        print(json.dumps({"status": "NOT_CONFIGURED", "missing": "WA_TOKEN/WA_PHONE_NUMBER_ID/WA_TO/WA_GRAPH_VERSION"}, ensure_ascii=False))
        raise SystemExit(2)

    jobs = [j for j in data.get("jobs", []) if local_date(j.get("first_seen", "")) == today]
    jobs.sort(key=lambda j: int(j.get("score", 0) or 0), reverse=True)

    messages = chunks_for_jobs(jobs, data.get("stats", {}), today)
    for message in messages:
        result = send_text(message)
        if result != "TEXT_SENT":
            raise RuntimeError(f"Invio WhatsApp non riuscito: {result}")

    for job in data.get("jobs", []):
        if local_date(job.get("first_seen", "")) == today:
            job["whatsapp_status"] = "SENT_08"
    data_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    state = {
        "last_date": today,
        "sent_at": now.isoformat(timespec="seconds"),
        "new_jobs": len(jobs),
        "messages": len(messages),
    }
    state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"status": "SENT", **state}, ensure_ascii=False))


if __name__ == "__main__":
    main()
