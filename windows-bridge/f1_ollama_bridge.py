#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""F1 IMMOBILIARE — BRIDGE LOCALE CONTATTI ↔ CLOUD ↔ OLLAMA

Scopo:
- mantiene sul PC una copia locale dei contatti confermati nel CRM cloud;
- importa CSV/XLSX prodotti dal programma contatti;
- normalizza Comune/Via/Civico senza inventare dati;
- permette a Ollama di classificare e ordinare SOLO i record forniti;
- non carica dati personali su GitHub;
- non usa OpenAI o IA esterne.

Variabili ambiente opzionali:
  F1_SUPABASE_URL
  F1_SUPABASE_ANON_KEY
  F1_SUPABASE_TABLE=contacts
  OLLAMA_URL=http://127.0.0.1:11434
  OLLAMA_MODEL=<modello installato>
"""
from __future__ import annotations
import csv, json, os, re, sys, time, urllib.parse, urllib.request
from datetime import datetime
from pathlib import Path

BASE = Path.home() / "Documents" / "F1_Bridge"
IMPORT_DIR = BASE / "IMPORTA_CONTATTI"
DATA_DIR = BASE / "data"
CONTACTS_JSON = DATA_DIR / "contacts_snapshot.json"
QUEUE_JSON = DATA_DIR / "telefonate_pronte.json"
LOG = BASE / "bridge.log"
SUPABASE_URL = os.getenv("F1_SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("F1_SUPABASE_ANON_KEY", "")
SUPABASE_TABLE = os.getenv("F1_SUPABASE_TABLE", "contacts")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "")

def log(msg: str):
    BASE.mkdir(parents=True, exist_ok=True)
    line = f"{datetime.now():%Y-%m-%d %H:%M:%S} | {msg}"
    print(line)
    with LOG.open("a", encoding="utf-8") as f: f.write(line+"\n")

def ensure():
    IMPORT_DIR.mkdir(parents=True, exist_ok=True); DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not CONTACTS_JSON.exists(): CONTACTS_JSON.write_text("[]", encoding="utf-8")

def norm(s):
    s = str(s or "").lower().strip()
    tr = str.maketrans("àèéìòù", "aeeiou")
    s = s.translate(tr)
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9/ ]+", " ", s)).strip()

def digits(s): return re.sub(r"\D+", "", str(s or ""))

def first(row, *names):
    low={norm(k):v for k,v in row.items()}
    for n in names:
        if norm(n) in low and str(low[norm(n)]).strip(): return str(low[norm(n)]).strip()
    return ""

def parse_csv(path: Path):
    raw=path.read_text(encoding="utf-8-sig",errors="replace")
    sample=raw[:4096]
    try: delim=csv.Sniffer().sniff(sample, delimiters=";,\t,").delimiter
    except Exception: delim=";"
    out=[]
    for r in csv.DictReader(raw.splitlines(), delimiter=delim):
        c=normalize_row(r,path.name)
        if c: out.append(c)
    return out

def parse_xlsx(path: Path):
    try: from openpyxl import load_workbook
    except ImportError: raise RuntimeError("Per XLSX installa: py -m pip install openpyxl")
    wb=load_workbook(path,read_only=True,data_only=True); out=[]
    for ws in wb.worksheets:
        rows=ws.iter_rows(values_only=True); headers=None
        for vals in rows:
            vals=["" if v is None else str(v) for v in vals]
            if headers is None:
                nvals=[norm(v) for v in vals]
                if "telefono" in nvals and ("via" in nvals or "indirizzo" in nvals): headers=vals
                continue
            r={headers[i]:vals[i] if i<len(vals) else "" for i in range(len(headers))}
            c=normalize_row(r,path.name)
            if c: out.append(c)
    return out

def normalize_row(r, source_file):
    phone=first(r,"Telefono","Phone","Tel")
    via=first(r,"Via","Indirizzo","Address")
    if not digits(phone) or not via: return None
    return {
      "id":"F1-"+digits(phone),
      "name":first(r,"Nome","Name","Nominativo"),
      "phone":phone,
      "address":" ".join(x for x in [via,first(r,"Civico"),first(r,"Comune")] if x),
      "street":via,"civic":first(r,"Civico"),"comune":first(r,"Comune"),
      "source":first(r,"Fonte") or source_file,
      "source_url":first(r,"Link","URL","URL Fonte"),
      "owner_verified":False,"rpo_status":"DA_VERIFICARE",
      "updated_at":datetime.now().isoformat(timespec="seconds")
    }

def load_local():
    try: return json.loads(CONTACTS_JSON.read_text(encoding="utf-8"))
    except Exception: return []

def merge_contacts(items):
    m={digits(x.get("phone")):x for x in load_local() if digits(x.get("phone"))}
    for x in items:
        p=digits(x.get("phone")); old=m.get(p,{})
        m[p]={**old,**{k:v for k,v in x.items() if v not in (None,"")}}
    arr=sorted(m.values(),key=lambda x:(norm(x.get("comune")),norm(x.get("street")),norm(x.get("civic"))))
    CONTACTS_JSON.write_text(json.dumps(arr,ensure_ascii=False,indent=2),encoding="utf-8")
    return arr

def http_json(url, method="GET", data=None, headers=None, timeout=20):
    body=None if data is None else json.dumps(data).encode("utf-8")
    req=urllib.request.Request(url,data=body,method=method,headers=headers or {})
    with urllib.request.urlopen(req,timeout=timeout) as res:
        txt=res.read().decode("utf-8")
        return json.loads(txt) if txt else None

def cloud_ready(): return bool(SUPABASE_URL and SUPABASE_KEY)

def cloud_headers(): return {"apikey":SUPABASE_KEY,"Authorization":"Bearer "+SUPABASE_KEY,"Content-Type":"application/json"}

def pull_cloud():
    if not cloud_ready(): return []
    url=f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}?select=*&deleted=eq.false&order=updated_at.desc"
    rows=http_json(url,headers=cloud_headers()) or []
    return [{"id":r.get("id"),"name":r.get("name",""),"phone":r.get("phone",""),"address":r.get("address",""),"street":r.get("address",""),"source":r.get("source","CRM cloud"),"note":r.get("note",""),"outcome":r.get("outcome",""),"updated_at":r.get("updated_at","")} for r in rows]

def push_cloud(items):
    if not cloud_ready() or not items: return 0
    rows=[]
    for c in items:
        rows.append({"id":str(c["id"]),"name":c.get("name",""),"phone":c.get("phone",""),"address":c.get("address",""),"source":c.get("source","Import PC"),"note":c.get("note",""),"outcome":c.get("outcome","Da richiamare"),"next_action":"Verifica RPO prima della chiamata","followup_date":None,"updated_at":datetime.now().isoformat(),"device_id":"ollama-bridge","deleted":False})
    url=f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}?on_conflict=id"
    h={**cloud_headers(),"Prefer":"resolution=merge-duplicates,return=minimal"}
    http_json(url,"POST",rows,h); return len(rows)

def ollama_models():
    try: return [m.get("name") for m in http_json(OLLAMA_URL+"/api/tags").get("models",[])]
    except Exception: return []

def choose_model():
    models=ollama_models()
    if OLLAMA_MODEL and any(m==OLLAMA_MODEL or m.startswith(OLLAMA_MODEL+":") for m in models): return OLLAMA_MODEL
    return models[0] if models else ""

def crossmatch(comune, via, limit=50):
    c0,v0=norm(comune),norm(via)
    candidates=[c for c in load_local() if (not c0 or c0 in norm(c.get("comune") or c.get("address"))) and v0 and (v0 in norm(c.get("street") or c.get("address")) or norm(c.get("street") or c.get("address")) in v0)]
    candidates=candidates[:limit]
    model=choose_model()
    if not model: return candidates
    prompt={"task":"Ordina i contatti per pertinenza territoriale. Non inventare dati, non dedurre proprietà. Restituisci solo gli id nell'ordine migliore.","comune":comune,"via":via,"contacts":[{"id":x["id"],"address":x.get("address"),"source":x.get("source"),"rpo_status":x.get("rpo_status","DA_VERIFICARE")} for x in candidates]}
    try:
        res=http_json(OLLAMA_URL+"/api/chat","POST",{"model":model,"stream":False,"format":"json","messages":[{"role":"user","content":json.dumps(prompt,ensure_ascii=False)}]}, {"Content-Type":"application/json"},60)
        obj=json.loads(res["message"]["content"]); ids=obj.get("ids",[]); rank={str(x):i for i,x in enumerate(ids)}
        return sorted(candidates,key=lambda x:rank.get(str(x["id"]),9999))
    except Exception as e:
        log(f"Ollama non disponibile/risposta non valida: {e}"); return candidates

def import_folder():
    new=[]
    for p in sorted(IMPORT_DIR.iterdir()):
        if p.suffix.lower()==".csv": new+=parse_csv(p)
        elif p.suffix.lower() in (".xlsx",".xlsm"): new+=parse_xlsx(p)
    if new:
        merged=merge_contacts(new); log(f"Importati/aggiornati {len(new)} record; archivio locale {len(merged)}")
        if cloud_ready(): log(f"Cloud aggiornato: {push_cloud(new)} record")
    return new

def sync_once():
    ensure(); import_folder()
    if cloud_ready():
        rows=pull_cloud(); merge_contacts(rows); log(f"Cloud → PC: {len(rows)} contatti")
    else: log("Cloud non configurato: lavoro solo locale")
    model=choose_model(); log("Ollama: "+(model or "NON DISPONIBILE"))

def main():
    ensure()
    if len(sys.argv)>=3 and sys.argv[1]=="match":
        sync_once(); print(json.dumps(crossmatch(sys.argv[2]," ".join(sys.argv[3:])),ensure_ascii=False,indent=2)); return
    sync_once()
    if "--watch" in sys.argv:
        log("Bridge attivo. Sincronizzazione ogni 60 secondi.")
        while True:
            time.sleep(60)
            try: sync_once()
            except Exception as e: log(f"Errore sync: {e}")

if __name__=="__main__": main()
