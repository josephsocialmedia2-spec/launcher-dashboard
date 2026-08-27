#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Helper CAPTCHA per i programmi Selenium F1.
Non aggira il controllo: notifica l'operatore, lascia Chrome aperto sulla pagina
corrente e attende la risoluzione manuale.
"""
from __future__ import annotations
import json, subprocess, time
from datetime import datetime
from pathlib import Path

STATE = Path.home()/"Documents"/"F1_Bridge"/"data"/"captcha_state.json"

def _notify_windows(title: str, message: str):
    ps = (
      "Add-Type -AssemblyName System.Windows.Forms;"
      f"[System.Windows.Forms.MessageBox]::Show('{message.replace(chr(39), chr(39)*2)}',"
      f"'{title.replace(chr(39), chr(39)*2)}',"
      "[System.Windows.Forms.MessageBoxButtons]::OK,"
      "[System.Windows.Forms.MessageBoxIcon]::Warning) | Out-Null"
    )
    subprocess.Popen(["powershell.exe","-NoProfile","-WindowStyle","Normal","-Command",ps])

def captcha_wait(driver, context: str = "F1"):
    STATE.parent.mkdir(parents=True, exist_ok=True)
    try: url = driver.current_url
    except Exception: url = ""
    STATE.write_text(json.dumps({
        "status":"ATTESA OPERATORE",
        "reason":"CAPTCHA / controllo manuale",
        "context":context,
        "url":url,
        "detected_at":datetime.now().isoformat(timespec="seconds")
    },ensure_ascii=False,indent=2),encoding="utf-8")
    try:
        driver.maximize_window()
        driver.switch_to.window(driver.current_window_handle)
        driver.execute_script("window.focus()")
    except Exception:
        pass
    _notify_windows("F1 — INTERVENTO RICHIESTO", f"CAPTCHA rilevato in {context}.\nChrome è aperto sulla pagina da completare manualmente.")
    print("\n[F1] CAPTCHA RILEVATO — ATTESA OPERATORE")
    print("Completa manualmente il controllo nella finestra Chrome.")
    while True:
        input("Quando hai completato il CAPTCHA premi INVIO qui: ")
        time.sleep(1)
        try:
            text=(driver.page_source or "").lower()
            title=(driver.title or "").lower()
            if not any(x in text or x in title for x in ("captcha","recaptcha","verify you are human","verifica di essere umano","unusual traffic")):
                break
            print("Il controllo sembra ancora presente. Completa la pagina e riprova.")
        except Exception:
            break
    STATE.write_text(json.dumps({
        "status":"RISOLTO",
        "context":context,
        "url":getattr(driver,"current_url",url),
        "resolved_at":datetime.now().isoformat(timespec="seconds")
    },ensure_ascii=False,indent=2),encoding="utf-8")
