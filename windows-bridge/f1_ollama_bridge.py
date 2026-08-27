#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""F1 IMMOBILIARE — BRIDGE LOCALE CONTATTI ↔ APP ↔ OLLAMA.

Il bridge NON addestra Ollama con i numeri e NON deduce proprietari.
Mantiene una copia locale dei contatti autorizzati, sincronizza con Supabase
tramite sessione autenticata e passa a Ollama solo i record pertinenti alla
zona richiesta.
"""
from __future__ import annotations
import csv, json, os, re, sys, time, urllib.request
from datetime import datetime
from pathlib import Path

BASE = Path.home() / "Documents" / "F1_Bridge"
IMPORT_DIR = BASE / "IMPORTA_CONTATTI"
DATA_DIR = BASE / "data"
CONFIG = BASE / "config.json"
CONTACTS_JSON = DATA_DIR / "contacts_snapshot.json"
VISITS_JSON = DATA_DIR / "field_visits_snapshot.json"
LOG = BASE / "bridge.log"

def log(msg: str):
    BASE.mkdir(parents=True, exist_ok=True)
    line=f"{datetime.now():%Y-%m-%d %H:%M:%S} | {msg}"
    print(line)
    with LOG.open("a",encoding="utf-8") as f:f.write(line+"\n")

def ensure():
    IMPORT_DIR.mkdir(parents=True,exist_ok=True);DATA_DIR.mkdir(parents=True,exist_ok=True)
    if not CONTACTS_JSON.exists():CONTACTS_JSON.write_text("[]",encoding="utf-8")
    if not VISITS_JSON.exists():VISITS_JSON.write_text("[]",encoding="utf-8")

def cfg():
    try:d=json.loads(CONFIG.read_text(encoding="utf-8"))
    except Exception:d={}
    d.setdefault("supabase_url",os.getenv("F1_SUPABASE_URL",""));d.setdefault("anon_key",os.getenv("F1_SUPABASE_ANON_KEY",""));d.setdefault("contacts_table","contacts");d.setdefault("visits_table","field_visits");d.setdefault("ollama_url",os.getenv("OLLAMA_URL","http://127.0.0.1:11434"));d.setdefault("ollama_model",os.getenv("OLLAMA_MODEL",""))
    return d

def save_cfg(d):
    BASE.mkdir(parents=True,exist_ok=True);CONFIG.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding="utf-8")

def norm(s):
    s=str(s or "").lower().strip().translate(str.maketrans("àèéìòù","aeeiou"))
    return re.sub(r"\s+"," ",re.sub(r"[^a-z0-9/ ]+"," ",s)).strip()

def digits(s):return re.sub(r"\D+","",str(s or ""))
def first(row,*names):
    low={norm(k):v for k,v in row.items()}
    for n in names:
        if norm(n) in low and str(low[norm(n)]).strip():return str(low[norm(n)]).strip()
    return ""

def normalize_row(r,source_file):
    phone=first(r,"Telefono","Phone","Tel");via=first(r,"Via","Indirizzo","Address")
    if not digits(phone) or not via:return None
    return {"id":"CRM-"+digits(phone),"name":first(r,"Nome","Name","Nominativo"),"phone":phone,"address":" ".join(x for x in [via,first(r,"Civico"),first(r,"Comune")] if x),"street":via,"civic":first(r,"Civico"),"comune":first(r,"Comune"),"source":first(r,"Fonte") or source_file,"source_url":first(r,"Link","URL","URL Fonte"),"owner_verified":False,"rpo_status":"DA_VERIFICARE","updated_at":datetime.now().isoformat(timespec="seconds")}

def parse_csv(path):
    raw=path.read_text(encoding="utf-8-sig",errors="replace")
    try:delim=csv.Sniffer().sniff(raw[:4096],delimiters=";,\t,").delimiter
    except Exception:delim=";"
    return [c for r in csv.DictReader(raw.splitlines(),delimiter=delim) if (c:=normalize_row(r,path.name))]

def parse_xlsx(path):
    try:from openpyxl import load_workbook
    except ImportError:raise RuntimeError("Manca openpyxl")
    wb=load_workbook(path,read_only=True,data_only=True);out=[]
    for ws in wb.worksheets:
        headers=None
        for vals in ws.iter_rows(values_only=True):
            vals=["" if v is None else str(v) for v in vals]
            if headers is None:
                nv=[norm(v) for v in vals]
                if "telefono" in nv and ("via" in nv or "indirizzo" in nv):headers=vals
                continue
            r={headers[i]:vals[i] if i<len(vals) else "" for i in range(len(headers))}
            c=normalize_row(r,path.name)
            if c:out.append(c)
    return out

def load_json(path):
    try:return json.loads(path.read_text(encoding="utf-8"))
    except Exception:return []

def merge_contacts(items):
    m={digits(x.get("phone")):x for x in load_json(CONTACTS_JSON) if digits(x.get("phone"))}
    for x in items:
        p=digits(x.get("phone"));old=m.get(p,{})
        m[p]={**old,**{k:v for k,v in x.items() if v not in (None,"")}}
    a=sorted(m.values(),key=lambda x:(norm(x.get("comune")),norm(x.get("street") or x.get("address")),norm(x.get("civic"))))
    CONTACTS_JSON.write_text(json.dumps(a,ensure_ascii=False,indent=2),encoding="utf-8");return a

def http_json(url,method="GET",data=None,headers=None,timeout=30):
    body=None if data is None else json.dumps(data).encode("utf-8")
    req=urllib.request.Request(url,data=body,method=method,headers=headers or {})
    with urllib.request.urlopen(req,timeout=timeout) as res:
        txt=res.read().decode("utf-8");return json.loads(txt) if txt else None

def cloud_configured():
    c=cfg();return bool(c.get("supabase_url") and c.get("anon_key") and (c.get("access_token") or c.get("refresh_token")))

def access_token():
    c=cfg();url=str(c.get("supabase_url","")).rstrip("/");key=c.get("anon_key","")
    if not url or not key:raise RuntimeError("Cloud non configurato")
    if c.get("access_token") and time.time()<float(c.get("expires_at",0))-60:return c["access_token"]
    rt=c.get("refresh_token")
    if not rt:raise RuntimeError("Login cloud mancante")
    j=http_json(url+"/auth/v1/token?grant_type=refresh_token","POST",{"refresh_token":rt},{"apikey":key,"Content-Type":"application/json"})
    c["access_token"]=j["access_token"];c["refresh_token"]=j.get("refresh_token",rt);c["expires_at"]=time.time()+float(j.get("expires_in",3600));c["user_email"]=(j.get("user") or {}).get("email",c.get("user_email",""));save_cfg(c);return c["access_token"]

def cloud_headers(prefer=False):
    c=cfg();h={"apikey":c["anon_key"],"Authorization":"Bearer "+access_token(),"Content-Type":"application/json"}
    if prefer:h["Prefer"]="resolution=merge-duplicates,return=minimal"
    return h

def pull_cloud():
    if not cloud_configured():return []
    c=cfg();url=str(c["supabase_url"]).rstrip("/")+f"/rest/v1/{c.get('contacts_table','contacts')}?select=*&deleted=eq.false&order=updated_at.desc"
    rows=http_json(url,headers=cloud_headers()) or []
    return [{"id":r.get("id"),"name":r.get("name",""),"phone":r.get("phone",""),"address":r.get("address",""),"street":r.get("address",""),"source":r.get("source","CRM cloud"),"note":r.get("note",""),"outcome":r.get("outcome",""),"updated_at":r.get("updated_at","")} for r in rows]

def pull_visits():
    if not cloud_configured():return []
    c=cfg();url=str(c["supabase_url"]).rstrip("/")+f"/rest/v1/{c.get('visits_table','field_visits')}?select=*&deleted=eq.false&order=occurred_at.desc"
    rows=http_json(url,headers=cloud_headers()) or []
    VISITS_JSON.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding="utf-8");return rows

def push_cloud(items):
    if not cloud_configured() or not items:return 0
    c=cfg();rows=[{"id":str(x["id"]),"name":x.get("name",""),"phone":x.get("phone",""),"address":x.get("address",""),"source":x.get("source","Import PC"),"note":x.get("note",""),"outcome":x.get("outcome","Da richiamare"),"next_action":"Verifica RPO prima della chiamata","followup_date":None,"updated_at":datetime.now().isoformat(),"device_id":"ollama-bridge","deleted":False} for x in items]
    url=str(c["supabase_url"]).rstrip("/")+f"/rest/v1/{c.get('contacts_table','contacts')}?on_conflict=id";http_json(url,"POST",rows,cloud_headers(True));return len(rows)

def ollama_models():
    try:return [m.get("name") for m in (http_json(str(cfg().get("ollama_url","http://127.0.0.1:11434")).rstrip("/")+"/api/tags") or {}).get("models",[])]
    except Exception:return []

def choose_model():
    models=ollama_models();wanted=cfg().get("ollama_model","")
    if wanted and any(m==wanted or str(m).startswith(wanted+":") for m in models):return wanted
    return models[0] if models else ""

def crossmatch(comune,via,limit=50):
    c0,v0=norm(comune),norm(via);allc=load_json(CONTACTS_JSON)
    candidates=[c for c in allc if (not c0 or c0 in norm(c.get("comune") or c.get("address"))) and v0 and (v0 in norm(c.get("street") or c.get("address")) or norm(c.get("street") or c.get("address")) in v0)][:limit]
    model=choose_model()
    if not model:return candidates
    prompt={"task":"Ordina per pertinenza territoriale. Non inventare dati, telefoni o proprietà. Restituisci JSON con chiave ids e solo id presenti.","comune":comune,"via":via,"contacts":[{"id":x["id"],"address":x.get("address"),"source":x.get("source"),"rpo_status":x.get("rpo_status","DA_VERIFICARE")} for x in candidates]}
    try:
        base=str(cfg().get("ollama_url","http://127.0.0.1:11434")).rstrip("/");res=http_json(base+"/api/chat","POST",{"model":model,"stream":False,"format":"json","messages":[{"role":"user","content":json.dumps(prompt,ensure_ascii=False)}]},{"Content-Type":"application/json"},60);obj=json.loads(res["message"]["content"]);rank={str(x):i for i,x in enumerate(obj.get("ids",[]))};return sorted(candidates,key=lambda x:rank.get(str(x["id"]),9999))
    except Exception as e:log(f"Ollama fallback locale: {e}");return candidates

def import_folder():
    new=[]
    for p in sorted(IMPORT_DIR.iterdir()):
        if p.suffix.lower()==".csv":new+=parse_csv(p)
        elif p.suffix.lower() in (".xlsx",".xlsm"):new+=parse_xlsx(p)
    if new:
        merged=merge_contacts(new);log(f"Import/aggiornamento: {len(new)} righe; archivio {len(merged)}")
        if cloud_configured():log(f"PC → cloud: {push_cloud(new)} contatti")
    return new

def sync_once():
    ensure();import_folder()
    if cloud_configured():
        rows=pull_cloud();merge_contacts(rows);vis=pull_visits();log(f"Cloud → PC: {len(rows)} contatti, {len(vis)} attività territorio")
    else:log("Cloud non autenticato: archivio locale attivo")
    log("Ollama: "+(choose_model() or "NON DISPONIBILE"))

def main():
    ensure()
    if len(sys.argv)>=4 and sys.argv[1]=="match":sync_once();print(json.dumps(crossmatch(sys.argv[2]," ".join(sys.argv[3:])),ensure_ascii=False,indent=2));return
    sync_once()
    if "--watch" in sys.argv:
        log("Bridge attivo — sync ogni 60 secondi")
        while True:
            time.sleep(60)
            try:sync_once()
            except Exception as e:log(f"Errore sync: {e}")
if __name__=="__main__":main()
