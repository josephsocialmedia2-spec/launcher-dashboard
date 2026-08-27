#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Helper CAPTCHA per i programmi Selenium F1.

Non aggira il controllo. Porta Chrome in primo piano, salva stato locale,
mostra avviso Windows e, se GitHub CLI e' gia autenticato sul PC, attiva
un avviso GitHub Mobile senza pubblicare l'URL della pagina.
"""
from __future__ import annotations
import json, shutil, subprocess, time
from datetime import datetime
from pathlib import Path

STATE = Path.home()/"Documents"/"F1_Bridge"/"data"/"captcha_state.json"
REPO = "josephsocialmedia2-spec/launcher-dashboard"
WORKFLOW = "f1-captcha-alert.yml"

def _notify_windows(title: str, message: str):
    ps=("Add-Type -AssemblyName System.Windows.Forms;"f"[System.Windows.Forms.MessageBox]::Show('{message.replace(chr(39),chr(39)*2)}','{title.replace(chr(39),chr(39)*2)}',[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Warning) | Out-Null")
    subprocess.Popen(["powershell.exe","-NoProfile","-WindowStyle","Normal","-Command",ps])

def _notify_github_mobile(context: str) -> bool:
    gh=shutil.which("gh")
    if not gh:return False
    try:
        chk=subprocess.run([gh,"auth","status"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=8)
        if chk.returncode!=0:return False
        r=subprocess.run([gh,"workflow","run",WORKFLOW,"--repo",REPO,"-f",f"context={context[:80]}"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=15)
        return r.returncode==0
    except Exception:return False

def captcha_wait(driver, context: str = "F1"):
    STATE.parent.mkdir(parents=True,exist_ok=True)
    try:url=driver.current_url
    except Exception:url=""
    mobile=_notify_github_mobile(context)
    STATE.write_text(json.dumps({"status":"ATTESA OPERATORE","reason":"CAPTCHA / controllo manuale","context":context,"url":url,"github_mobile_alert":mobile,"detected_at":datetime.now().isoformat(timespec="seconds")},ensure_ascii=False,indent=2),encoding="utf-8")
    try:
        driver.maximize_window();driver.switch_to.window(driver.current_window_handle);driver.execute_script("window.focus()")
    except Exception:pass
    suffix="\nNotifica GitHub Mobile inviata." if mobile else "\nAvviso smartphone non disponibile: GitHub CLI non autenticato sul PC."
    _notify_windows("F1 — INTERVENTO RICHIESTO",f"CAPTCHA rilevato in {context}.\nChrome è già aperto sulla pagina da completare manualmente.{suffix}")
    print("\n[F1] CAPTCHA RILEVATO — ATTESA OPERATORE")
    print("Chrome resta sulla pagina. Completa manualmente il controllo.")
    while True:
        input("Quando hai completato il CAPTCHA premi INVIO qui: ")
        time.sleep(1)
        try:
            blob=((driver.page_source or "")+"\n"+(driver.title or "")+"\n"+(driver.current_url or "")).lower()
            if not any(x in blob for x in ("captcha","recaptcha","hcaptcha","verify you are human","verifica di essere umano","unusual traffic","traffico insolito","/sorry/")):break
            print("Il controllo sembra ancora presente. Completa la pagina e riprova.")
        except Exception:break
    STATE.write_text(json.dumps({"status":"RISOLTO","context":context,"url":getattr(driver,"current_url",url),"resolved_at":datetime.now().isoformat(timespec="seconds")},ensure_ascii=False,indent=2),encoding="utf-8")
