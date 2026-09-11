from __future__ import annotations

from datetime import datetime
from email.message import EmailMessage
from html import escape
from zoneinfo import ZoneInfo
import json
import os
import smtplib

from common import DATA_DIR, load_json

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


def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Variabile GitHub Secret mancante: {name}")
    return value


def build_email(jobs: list[dict], stats: dict, today: str) -> tuple[str, str, str]:
    area = stats.get("search_area") or {"center": "Avigliana, Piemonte", "radius_km": 35}
    center = str(area.get("center", "Avigliana, Piemonte"))
    radius = int(area.get("radius_km", 35) or 35)
    subject = f"CareerPilot GDO — {len(jobs)} nuove offerte — {today}"

    if jobs:
        text_rows = []
        html_rows = []
        for idx, job in enumerate(jobs, 1):
            company = str(job.get("company") or "Azienda non rilevata")
            title = str(job.get("title") or "Offerta di lavoro")
            location = str(job.get("location") or "Località non rilevata")
            url = str(job.get("url") or "")
            score = int(job.get("score", 0) or 0)
            text_rows.append(f"{idx}) {company} — {title}\n{location} — Score {score}/100\n{url}")
            html_rows.append(
                "<tr>"
                f"<td style='padding:14px;border-bottom:1px solid #e5e7eb'>"
                f"<strong>{escape(company)}</strong><br>"
                f"{escape(title)}<br>"
                f"<span style='color:#667085'>{escape(location)} · Score {score}/100</span><br>"
                f"<a href='{escape(url)}' style='display:inline-block;margin-top:8px;padding:8px 12px;background:#17202a;color:#fff;text-decoration:none;border-radius:7px'>Apri annuncio</a>"
                "</td></tr>"
            )
        text_body = (
            f"CAREERPILOT GDO — REPORT ORE 08:00\n"
            f"Ricerca: {center} + {radius} km\n"
            f"Nuove offerte: {len(jobs)}\n\n"
            + "\n\n".join(text_rows)
            + f"\n\nDashboard: {DASHBOARD}"
        )
        html_body = (
            "<html><body style='font-family:Arial,sans-serif;color:#17202a'>"
            f"<h2>CareerPilot GDO — Report ore 08:00</h2>"
            f"<p><strong>Ricerca:</strong> {escape(center)} + {radius} km<br>"
            f"<strong>Nuove offerte:</strong> {len(jobs)}</p>"
            "<table style='border-collapse:collapse;width:100%;max-width:760px'>"
            + "".join(html_rows)
            + "</table>"
            f"<p style='margin-top:20px'><a href='{DASHBOARD}'>Apri dashboard CareerPilot</a></p>"
            "</body></html>"
        )
    else:
        text_body = (
            f"CAREERPILOT GDO — REPORT ORE 08:00\n"
            f"Ricerca: {center} + {radius} km\n"
            "Nuove offerte: 0\n"
            f"Offerte rilevate nell'ultimo ciclo: {stats.get('found', 0)}\n"
            f"Errori tecnici: {stats.get('errors', 0)}\n\n"
            f"Dashboard: {DASHBOARD}"
        )
        html_body = (
            "<html><body style='font-family:Arial,sans-serif;color:#17202a'>"
            "<h2>CareerPilot GDO — Report ore 08:00</h2>"
            f"<p><strong>Ricerca:</strong> {escape(center)} + {radius} km<br>"
            "<strong>Nuove offerte:</strong> 0<br>"
            f"<strong>Offerte rilevate nell'ultimo ciclo:</strong> {stats.get('found', 0)}<br>"
            f"<strong>Errori tecnici:</strong> {stats.get('errors', 0)}</p>"
            f"<p><a href='{DASHBOARD}'>Apri dashboard CareerPilot</a></p>"
            "</body></html>"
        )
    return subject, text_body, html_body


def send_email(subject: str, text_body: str, html_body: str) -> None:
    host = os.getenv("EMAIL_SMTP_HOST", "smtp.gmail.com").strip() or "smtp.gmail.com"
    port = int(os.getenv("EMAIL_SMTP_PORT", "465").strip() or "465")
    sender = required_env("EMAIL_FROM")
    recipient = required_env("EMAIL_TO")
    password = required_env("EMAIL_APP_PASSWORD")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = recipient
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")

    with smtplib.SMTP_SSL(host, port, timeout=30) as smtp:
        smtp.login(sender, password)
        smtp.send_message(msg)


def main() -> None:
    now = datetime.now(ROME)
    today = now.date().isoformat()
    data_path = DATA_DIR / "jobs.json"
    state_path = DATA_DIR / "email_notification_state.json"
    data = load_json(data_path, {"jobs": [], "stats": {}})
    state = load_json(state_path, {})

    if state.get("last_date") == today and os.getenv("FORCE_NOTIFY", "").lower() not in {"1", "true", "yes"}:
        print(json.dumps({"status": "ALREADY_SENT", "date": today}, ensure_ascii=False))
        return

    jobs = [j for j in data.get("jobs", []) if local_date(j.get("first_seen", "")) == today]
    jobs.sort(key=lambda j: int(j.get("score", 0) or 0), reverse=True)

    subject, text_body, html_body = build_email(jobs, data.get("stats", {}), today)
    send_email(subject, text_body, html_body)

    state = {
        "last_date": today,
        "sent_at": now.isoformat(timespec="seconds"),
        "new_jobs": len(jobs),
        "channel": "email",
    }
    state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"status": "SENT", **state}, ensure_ascii=False))


if __name__ == "__main__":
    main()
