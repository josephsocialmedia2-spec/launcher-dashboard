#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""F1 Territory — bridge locale per upload CRM verso una chat ChatGPT.

Riceve SOLO da localhost/GitHub Pages il payload generato dalla sessione
autenticata F1 Territory, salva file temporanei locali, apre la chat indicata
con un profilo Chrome dedicato e allega XLSX/JSON tramite Selenium.

Nessun dato CRM viene scritto nel repository o pubblicato su GitHub Pages.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

HOST = "127.0.0.1"
PORT = 8765
BASE = Path.home() / "Documents" / "F1_Bridge"
AI_DIR = BASE / "AI_UPLOADS"
CHROME_PROFILE = BASE / "chrome-chatgpt-profile"
DEBUG_PORT = 9222
DEFAULT_CHAT = "https://chatgpt.com/c/6a96ef0b-789c-83eb-80ea-b88137c3a5e1"
ALLOWED_ORIGINS = {
    "https://josephsocialmedia2-spec.github.io",
    "http://127.0.0.1",
    "http://localhost",
}


def ensure_dirs() -> None:
    BASE.mkdir(parents=True, exist_ok=True)
    AI_DIR.mkdir(parents=True, exist_ok=True)
    CHROME_PROFILE.mkdir(parents=True, exist_ok=True)


def chrome_candidates() -> list[Path]:
    roots = [
        Path(os.environ.get("PROGRAMFILES", "")),
        Path(os.environ.get("PROGRAMFILES(X86)", "")),
        Path(os.environ.get("LOCALAPPDATA", "")),
    ]
    rels = [
        Path("Google/Chrome/Application/chrome.exe"),
        Path("Microsoft/Edge/Application/msedge.exe"),
    ]
    return [root / rel for root in roots for rel in rels if str(root)]


def find_chrome() -> Path | None:
    for p in chrome_candidates():
        if p.exists():
            return p
    return None


def launch_login_browser(chat_url: str = DEFAULT_CHAT) -> bool:
    """Apre il profilo F1 ChatGPT con remote debugging per il login una tantum."""
    ensure_dirs()
    exe = find_chrome()
    if not exe:
        return False
    args = [
        str(exe),
        f"--user-data-dir={CHROME_PROFILE}",
        f"--remote-debugging-port={DEBUG_PORT}",
        "--remote-allow-origins=*",
        chat_url,
    ]
    subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return True


def selenium_driver():
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
    except Exception as exc:
        raise RuntimeError("SELENIUM_NON_INSTALLATO") from exc

    # 1) Preferisci un Chrome F1 già aperto con remote debugging.
    try:
        opts = Options()
        opts.debugger_address = f"127.0.0.1:{DEBUG_PORT}"
        return webdriver.Chrome(options=opts), False
    except Exception:
        pass

    # 2) Altrimenti apri Chrome con il profilo persistente dedicato.
    opts = Options()
    opts.add_argument(f"--user-data-dir={CHROME_PROFILE}")
    opts.add_argument("--profile-directory=Default")
    opts.add_argument("--start-maximized")
    opts.add_argument("--disable-notifications")
    opts.add_argument("--disable-popup-blocking")
    return webdriver.Chrome(options=opts), True


def wait_for_composer(driver, timeout: int = 35):
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait

    selectors = [
        "#prompt-textarea",
        "textarea[data-testid='prompt-textarea']",
        "textarea",
        "[contenteditable='true']",
    ]

    def _find(_driver):
        for sel in selectors:
            for el in _driver.find_elements(By.CSS_SELECTOR, sel):
                try:
                    if el.is_displayed() and el.is_enabled():
                        return el
                except Exception:
                    continue
        return False

    return WebDriverWait(driver, timeout).until(_find)


def find_file_input(driver, timeout: int = 15):
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait

    def _find(_driver):
        els = _driver.find_elements(By.CSS_SELECTOR, "input[type='file']")
        return els[-1] if els else False

    try:
        return WebDriverWait(driver, 2).until(_find)
    except Exception:
        pass

    # Se l'input non è ancora nel DOM, prova ad aprire il menu allegati.
    labels = ["Allega", "Attach", "Aggiungi", "Add files", "Upload", "Carica"]
    buttons = driver.find_elements(By.CSS_SELECTOR, "button")
    for button in buttons:
        try:
            aria = (button.get_attribute("aria-label") or "")
            title = (button.get_attribute("title") or "")
            text = (button.text or "")
            blob = f"{aria} {title} {text}".lower()
            if any(x.lower() in blob for x in labels):
                button.click()
                break
        except Exception:
            continue

    return WebDriverWait(driver, timeout).until(_find)


def put_prompt(composer, prompt: str) -> None:
    try:
        composer.click()
    except Exception:
        pass
    tag = (composer.tag_name or "").lower()
    if tag == "textarea":
        composer.clear()
        composer.send_keys(prompt)
    else:
        # contenteditable/ProseMirror
        try:
            composer.send_keys(prompt)
        except Exception:
            driver = composer.parent
            raise


def click_send(driver, timeout: int = 20) -> None:
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait

    selectors = [
        "button[data-testid='send-button']",
        "button[aria-label*='Send']",
        "button[aria-label*='Invia']",
    ]

    def _find(_driver):
        for sel in selectors:
            for el in _driver.find_elements(By.CSS_SELECTOR, sel):
                try:
                    if el.is_displayed() and el.is_enabled():
                        return el
                except Exception:
                    continue
        return False

    btn = WebDriverWait(driver, timeout).until(_find)
    btn.click()


def upload_to_chatgpt(chat_url: str, prompt: str, paths: list[Path]) -> dict[str, Any]:
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait

    driver, owns_driver = selenium_driver()
    try:
        driver.get(chat_url)
        composer = wait_for_composer(driver, 35)
        if not composer:
            raise RuntimeError("CHATGPT_COMPOSER_NON_TROVATO")

        # Se compare una pagina di login, la sessione dedicata non è autenticata.
        u = (driver.current_url or "").lower()
        if "/auth/" in u or "/login" in u:
            raise RuntimeError("CHATGPT_LOGIN_REQUIRED")

        file_input = find_file_input(driver, 15)
        for index, path in enumerate(paths):
            if index > 0:
                file_input = find_file_input(driver, 15)
            try:
                file_input.send_keys(str(path.resolve()))
            except Exception:
                # L'input nascosto può essere reso visibile senza cambiare il file.
                driver.execute_script(
                    "arguments[0].style.display='block';"
                    "arguments[0].style.visibility='visible';"
                    "arguments[0].style.opacity='1';",
                    file_input,
                )
                file_input.send_keys(str(path.resolve()))

        names = [p.name for p in paths]

        def _attachments_visible(_driver):
            text = _driver.find_element(By.TAG_NAME, "body").text
            return all(name in text for name in names)

        WebDriverWait(driver, 25).until(_attachments_visible)

        composer = wait_for_composer(driver, 10)
        put_prompt(composer, prompt)
        click_send(driver, 20)

        first_line = prompt.strip().splitlines()[0][:60]

        def _sent(_driver):
            try:
                body = _driver.find_element(By.TAG_NAME, "body").text
                return first_line in body
            except Exception:
                return False

        WebDriverWait(driver, 25).until(_sent)
        return {
            "ok": True,
            "chat_url": driver.current_url,
            "files": names,
            "message_sent": True,
        }
    finally:
        if owns_driver:
            try:
                driver.quit()
            except Exception:
                pass


def write_payload_files(payload: dict[str, Any]) -> tuple[list[Path], Path]:
    ensure_dirs()
    run_dir = Path(tempfile.mkdtemp(prefix="f1-ai-", dir=str(AI_DIR)))
    files: list[Path] = []

    xlsx = payload.get("xlsx") or {}
    if xlsx.get("base64"):
        name = Path(str(xlsx.get("filename") or "F1_TERRITORY.xlsx")).name
        p = run_dir / name
        p.write_bytes(base64.b64decode(xlsx["base64"]))
        files.append(p)

    j = payload.get("json") or {}
    if j.get("text"):
        name = Path(str(j.get("filename") or "F1_TERRITORY.json")).name
        p = run_dir / name
        p.write_text(str(j["text"]), encoding="utf-8")
        files.append(p)

    if not files:
        raise RuntimeError("NESSUN_FILE_RICEVUTO")
    return files, run_dir


class Handler(BaseHTTPRequestHandler):
    server_version = "F1ChatGPTUploader/1.0"

    def _origin_ok(self) -> bool:
        origin = (self.headers.get("Origin") or "").rstrip("/")
        return (not origin) or origin in ALLOWED_ORIGINS or origin.startswith("http://127.0.0.1:") or origin.startswith("http://localhost:")

    def _cors(self) -> None:
        origin = (self.headers.get("Origin") or "").rstrip("/")
        if self._origin_ok():
            self.send_header("Access-Control-Allow-Origin", origin or "*")
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def _json(self, code: int, obj: dict[str, Any]) -> None:
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self) -> None:
        if not self._origin_ok():
            self._json(403, {"ok": False, "error": "ORIGIN_NON_AUTORIZZATA"})
            return
        self._json(204, {})

    def do_GET(self) -> None:
        if self.path.startswith("/health"):
            self._json(200, {
                "ok": True,
                "service": "F1 ChatGPT Uploader",
                "chat_url": DEFAULT_CHAT,
                "profile": str(CHROME_PROFILE),
            })
            return
        if self.path.startswith("/login"):
            ok = launch_login_browser(DEFAULT_CHAT)
            self._json(200 if ok else 500, {"ok": ok, "error": None if ok else "CHROME_NON_TROVATO"})
            return
        self._json(404, {"ok": False, "error": "NOT_FOUND"})

    def do_POST(self) -> None:
        if self.path != "/chatgpt-upload":
            self._json(404, {"ok": False, "error": "NOT_FOUND"})
            return
        if not self._origin_ok():
            self._json(403, {"ok": False, "error": "ORIGIN_NON_AUTORIZZATA"})
            return

        try:
            n = int(self.headers.get("Content-Length") or "0")
            if n <= 0 or n > 35 * 1024 * 1024:
                raise RuntimeError("PAYLOAD_NON_VALIDO")
            payload = json.loads(self.rfile.read(n).decode("utf-8"))
            chat_url = str(payload.get("chat_url") or DEFAULT_CHAT)
            if not chat_url.startswith("https://chatgpt.com/c/"):
                raise RuntimeError("CHAT_URL_NON_AUTORIZZATA")
            prompt = str(payload.get("prompt") or "").strip()
            if not prompt:
                raise RuntimeError("PROMPT_MANCANTE")

            files, run_dir = write_payload_files(payload)
            try:
                result = upload_to_chatgpt(chat_url, prompt, files)
                # Minimizza la permanenza locale dei dati dopo upload verificato.
                shutil.rmtree(run_dir, ignore_errors=True)
                self._json(200, {**result, "counts": payload.get("counts") or {}})
            except Exception:
                # In caso di errore conserva i file SOLO localmente per retry/debug.
                raise
        except Exception as exc:
            msg = str(exc)
            status = 401 if "LOGIN_REQUIRED" in msg else 500
            self._json(status, {
                "ok": False,
                "error": msg,
                "hint": "Esegui F1 - ChatGPT Login una sola volta e accedi a ChatGPT nel profilo F1." if "LOGIN_REQUIRED" in msg else "",
            })

    def log_message(self, fmt: str, *args: Any) -> None:
        return


def serve() -> None:
    ensure_dirs()
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    httpd.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--login", action="store_true")
    parser.add_argument("--chat-url", default=DEFAULT_CHAT)
    args = parser.parse_args()

    if args.login:
        if not launch_login_browser(args.chat_url):
            raise SystemExit("Chrome/Edge non trovato")
        return
    serve()


if __name__ == "__main__":
    main()
