from __future__ import annotations
import os
from pathlib import Path
import requests


def configured() -> bool:
    return all(os.getenv(k) for k in ["WA_TOKEN", "WA_PHONE_NUMBER_ID", "WA_TO", "WA_GRAPH_VERSION"])


def _settings():
    if not configured():
        return None
    token = os.environ["WA_TOKEN"]
    phone_id = os.environ["WA_PHONE_NUMBER_ID"]
    to = os.environ["WA_TO"]
    version = os.environ["WA_GRAPH_VERSION"].strip().lstrip("/")
    return token, phone_id, to, version


def send_text(text: str) -> str:
    settings = _settings()
    if not settings:
        return "NOT_CONFIGURED"
    token, phone_id, to, version = settings
    base = f"https://graph.facebook.com/{version}/{phone_id}"
    r = requests.post(
        base + "/messages",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": text[:4096], "preview_url": True},
        },
        timeout=30,
    )
    r.raise_for_status()
    return "TEXT_SENT"


def send_job(job: dict, pdf_path: Path | None) -> str:
    settings = _settings()
    if not settings:
        return "NOT_CONFIGURED"
    token, phone_id, to, version = settings
    base = f"https://graph.facebook.com/{version}/{phone_id}"
    headers = {"Authorization": f"Bearer {token}"}
    text = (
        f"NUOVA OFFERTA CAREERPILOT\n\n"
        f"{job.get('company','')} — {job.get('title','')}\n"
        f"{job.get('location','')}\n"
        f"Score: {job.get('score',0)}/100\n\n"
        f"Annuncio: {job.get('url','')}"
    )
    send_text(text)
    if not pdf_path or not pdf_path.exists():
        return "TEXT_SENT"
    with pdf_path.open("rb") as f:
        up = requests.post(
            base + "/media",
            headers=headers,
            files={"file": (pdf_path.name, f, "application/pdf")},
            data={"messaging_product": "whatsapp", "type": "application/pdf"},
            timeout=60,
        )
    up.raise_for_status()
    media_id = up.json()["id"]
    doc = requests.post(
        base + "/messages",
        headers={**headers, "Content-Type": "application/json"},
        json={
            "messaging_product": "whatsapp",
            "to": to,
            "type": "document",
            "document": {
                "id": media_id,
                "filename": pdf_path.name,
                "caption": f"CV per {job.get('company','')} — {job.get('title','')}",
            },
        },
        timeout=30,
    )
    doc.raise_for_status()
    return "TEXT_AND_PDF_SENT"
