#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""F1 DIRECTORY RADAR — PC

Lavora esclusivamente sul PC. Legge gli annunci F1, ricava Comune/Via/Civico,
importa gli elenchi locali CSV/XLSX e prova ad aggiornare i contatti pubblici
PagineBianche/PagineGialle con Chrome visibile. Non aggira CAPTCHA: registra il
blocco e continua con altre fonti. Non deduce mai chi sia proprietario.

Output: Documenti/F1_Directory_Radar/RISULTATI/
- REPORT_MATTINO_ULTIMO.html
- LISTA_TELEFONATE_YYYY-MM-DD.csv
- BLOCCHI_CAPTCHA_YYYY-MM-DD.csv
- contatti_master.csv
"""
from __future__ import annotations
import argparse,csv,html,json,os,re,shutil,subprocess,time,unicodedata,urllib.parse,urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path
try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo=None

BASE=Path.home()/"Documents"/"F1_Directory_Radar"
INP=BASE/"IMPORTA_CONTATTI"; OUT=BASE/"RISULTATI"; ARC=BASE/"ARCHIVIO"; PROFILE=BASE/"chrome_profile"
MASTER=BASE/"contatti_master.csv"; LOG=BASE/"f1_directory_radar.log"; CFG=BASE/"config.json"; CHECK=BASE/"checkpoint.json"
SNAP="https://josephsocialmedia2-spec.github.io/immobili-in-zona/seller_radar_auto/data/intelligence/immobili_snapshot.csv"
AREA="https://josephsocialmedia2-spec.github.io/immobili-in-zona/seller_radar_auto/data/area_radar.csv"
GIRO="https://josephsocialmedia2-spec.github.io/immobili-in-zona/seller_radar_auto/data/giro_acquisizione.csv"
DEFAULT={"max_target_streets":35,"max_links_per_street":12,"wait":2.0,"between":1.2,"providers":["paginebianche","paginegialle"],"engines":["google","bing","duckduckgo"],"excluded_comuni":["Sant'Ambrogio di Torino"],"focus_comuni":[],"browser_enabled":True}
CH=["Nome","Telefono","Via","Civico","CAP","Comune","Provincia","Tipo","Fonte","Link","Stato","Acquisito il"]
RH=["Priorita","Comune","Via annuncio","Civico annuncio","Immobile","Prezzo","Fonte annuncio","URL annuncio","Contatto pubblico","Telefono","Via contatto","Civico contatto","Distanza civici","Fonte contatto","URL contatto","Match","RPO","Call allowed","Nota"]
CAPTCHA=("captcha","recaptcha","verify you are human","verifica di essere umano","unusual traffic","traffico insolito","access denied","controllo di sicurezza")
PHONE=re.compile(r"(?<!\d)(?:\+39[\s.-]?)?(?:0\d{1,3}[\s.-]?\d{5,8}|3\d{2}[\s.-]?\d{6,7})(?!\d)")

def now():
    return datetime.now(ZoneInfo("Europe/Rome")) if ZoneInfo else datetime.now()
def ts(): return now().strftime("%Y-%m-%d %H:%M:%S")
def log(x):
    BASE.mkdir(parents=True,exist_ok=True); s=f"{ts()} | {x}"; print(s,flush=True)
    with LOG.open("a",encoding="utf-8") as f:f.write(s+"\n")
def ensure():
    for p in (BASE,INP,OUT,ARC,PROFILE):p.mkdir(parents=True,exist_ok=True)
    if not CFG.exists():CFG.write_text(json.dumps(DEFAULT,ensure_ascii=False,indent=2),encoding="utf-8")
def cfg():
    ensure(); d=DEFAULT.copy()
    try:d.update(json.loads(CFG.read_text(encoding="utf-8")))
    except Exception:pass
    return d
def norm(x):
    s=str(x or "").strip().lower(); s="".join(c for c in unicodedata.normalize("NFD",s) if unicodedata.category(c)!="Mn")
    return re.sub(r"\s+"," ",re.sub(r"[^a-z0-9/' ]+"," ",s.replace("’","'").replace("`","'"))).strip()
def street(x):
    s=norm(x); s=re.sub(r"\b100\d{2}\b|\b(to|torino|piemonte|italia)\b"," ",s); s=re.sub(r"\s+\d+[a-z]?(?:/\d+[a-z]?)?\s*$","",s)
    return re.sub(r"\s+"," ",s).strip()
def skey(x):return re.sub(r"\s+","",street(x))
def civic(x):
    m=re.search(r"(?:^|\s|,)(\d+[a-z]?(?:/\d+[a-z]?)?)\s*$",norm(x)); return m.group(1) if m else ""
def cnum(x):
    m=re.match(r"\d+",str(x or "")); return int(m.group()) if m else None
def pd(x):return re.sub(r"\D+","",str(x or ""))
def phone(x):
    s=re.sub(r"[^\d+]","",str(x or "")); return "+39"+s[4:] if s.startswith("0039") else s
def first(r,*names):
    d={norm(k):str(v or "").strip() for k,v in r.items()}
    for n in names:
        if d.get(norm(n)):return d[norm(n)]
    return ""
def boolish(x):return norm(x) in {"true","1","yes","si","vero"}
def get(url):
    q=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 F1DirectoryRadar/1.0","Cache-Control":"no-cache"})
    with urllib.request.urlopen(q,timeout=30) as r:b=r.read()
    for enc in ("utf-8-sig","utf-8","cp1252"):
        try:return b.decode(enc)
        except UnicodeDecodeError:pass
    return b.decode("utf-8",errors="replace")
def csvtext(t):
    t=t.lstrip("\ufeff")
    try:d=csv.Sniffer().sniff(t[:5000],delimiters=",;\t").delimiter
    except Exception:d="," 
    return list(csv.DictReader(t.splitlines(),delimiter=d))
def checkpoint(**kw):
    kw["updated_at"]=ts(); CHECK.write_text(json.dumps(kw,ensure_ascii=False,indent=2),encoding="utf-8")

def targets(C):
    out=[]; seen=set(); excl={norm(x) for x in C.get("excluded_comuni",[])}; focus={norm(x) for x in C.get("focus_comuni",[]) if str(x).strip()}
    try:
        for r in csvtext(get(SNAP)):
            comune=first(r,"comune"); via=first(r,"via") or first(r,"strada"); active=first(r,"attivo")
            if not comune or not via or norm(comune) in excl or (focus and norm(comune) not in focus) or (active and not boolish(active)):continue
            title=first(r,"titolo")
            if norm(comune)=="almese" and re.search(r"\bviu\b",norm(title)):continue
            st=street(first(r,"strada") or via)
            if not st:continue
            o={"id":first(r,"id"),"comune":comune,"address":via,"street":st,"civic":civic(via),"property":title or first(r,"tipologia"),"price":first(r,"prezzo"),"listing_source":first(r,"fonte"),"listing_url":first(r,"url"),"signal":""}
            k=(norm(comune),skey(st),o["listing_url"])
            if k not in seen:seen.add(k);out.append(o)
    except Exception as e:log(f"Snapshot non disponibile: {e}")
    try:
        for r in csvtext(get(AREA)):
            comune=first(r,"COMUNE"); addr=first(r,"TARGET") or first(r,"VIA_RADAR"); st=street(first(r,"VIA_RADAR") or addr)
            if not comune or not st or norm(comune) in excl or (focus and norm(comune) not in focus):continue
            u=first(r,"FONTE"); k=(norm(comune),skey(st),u)
            if k in seen:continue
            seen.add(k);out.append({"id":first(r,"ITEM_ID"),"comune":comune,"address":addr,"street":st,"civic":civic(addr),"property":first(r,"TIPO_ANNUNCIO"),"price":"","listing_source":"Area Radar F1","listing_url":u,"signal":first(r,"TIPO_ANNUNCIO")})
    except Exception as e:log(f"Area radar non disponibile: {e}")
    try:
        gm=defaultdict(list)
        for g in csvtext(get(GIRO)):gm[(norm(first(g,"COMUNE")),skey(first(g,"DOVE_ANDRE")))].append(g)
        for o in out:
            a=gm.get((norm(o["comune"]),skey(o["street"])),[])
            if a:
                g=a[0]; o["property"]=first(g,"COSA_CERCO") or o["property"]; o["price"]=o["price"] or first(g,"PREZZO"); o["signal"]=o["signal"] or first(g,"SELLER_SIGNAL")
    except Exception as e:log(f"Giro non disponibile: {e}")
    def score(o):return (30 if o.get("civic") else 0)+(50 if "privat" in norm(o.get("signal")) else 0)+(10 if o.get("price") else 0)
    out.sort(key=score,reverse=True); return out

def headers(rows):
    for i,v in enumerate(rows[:40]):
        n=[norm(x) for x in v]; pi=next((j for j,x in enumerate(n) if x in {"telefono","phone","tel"}),-1); vi=next((j for j,x in enumerate(n) if x in {"via","indirizzo","address"}),-1)
        if pi<0 or vi<0:continue
        mp={"phone":pi,"street":vi,"name":next((j for j,x in enumerate(n) if x in {"nome","nominativo","name","soggetto"}),-1)}
        for k,a in {"civic":{"civico","numero civico"},"cap":{"cap"},"city":{"comune","citta","localita"},"prov":{"provincia"},"type":{"tipo"},"source":{"fonte","source"},"url":{"link","url","url fonte"},"status":{"stato","status"}}.items():mp[k]=next((j for j,x in enumerate(n) if x in a),-1)
        return i,mp
    return None
def cv(v,mp,k):
    i=mp.get(k,-1); return str(v[i] or "").strip() if i>=0 and i<len(v) else ""
def contact(v,mp,fn):
    p=phone(cv(v,mp,"phone")); vr=cv(v,mp,"street")
    if not pd(p) or not vr:return None
    ci=cv(v,mp,"civic") or civic(vr); vv=re.sub(r"[,\s]+\d+[A-Za-z]?(?:/\d+[A-Za-z]?)?\s*$","",vr).strip(); src=cv(v,mp,"source")
    if not src:src="PagineBianche" if "bianch" in fn.lower() else ("PagineGialle" if "giall" in fn.lower() else "Archivio locale")
    return {"Nome":cv(v,mp,"name"),"Telefono":p,"Via":vv,"Civico":ci,"CAP":cv(v,mp,"cap"),"Comune":cv(v,mp,"city"),"Provincia":cv(v,mp,"prov") or "Torino","Tipo":cv(v,mp,"type") or "CONTATTO_PUBBLICO","Fonte":src,"Link":cv(v,mp,"url"),"Stato":cv(v,mp,"status") or "IMPORTATO","Acquisito il":ts()}
def parse_csv_file(p):
    t=p.read_text(encoding="utf-8-sig",errors="replace")
    try:d=csv.Sniffer().sniff(t[:5000],delimiters=",;\t").delimiter
    except Exception:d="," 
    rows=list(csv.reader(t.splitlines(),delimiter=d)); h=headers(rows)
    return [x for v in rows[h[0]+1:] if (x:=contact(v,h[1],p.name))] if h else []
def parse_xlsx(p):
    try:from openpyxl import load_workbook
    except Exception:return []
    out=[]; wb=load_workbook(p,read_only=True,data_only=True)
    for ws in wb.worksheets:
        rows=[["" if x is None else x for x in r] for r in ws.iter_rows(values_only=True)]; h=headers(rows)
        if h:
            for v in rows[h[0]+1:]:
                x=contact(v,h[1],p.name)
                if x:out.append(x)
    return out
def dedupe(a):
    d={}
    for x in a:
        k=pd(x.get("Telefono"))+"|"+skey(x.get("Via"))+"|"+norm(x.get("Civico"))
        if not pd(x.get("Telefono")):continue
        if k not in d or sum(bool(v) for v in x.values())>sum(bool(v) for v in d[k].values()):d[k]=x
    return list(d.values())
def seed():
    pats=("*ALMESE_vie_incrocate_contatti*.xlsx","*CRM_PagineBianche*.xlsx","*PagineBianche*.csv","*PagineGialle*.csv","*contatti*vie*.xlsx","*contatti*vie*.csv")
    for root in (Path.home()/"Downloads",Path.home()/"Desktop",Path.home()/"Documents"):
        if not root.exists():continue
        for pat in pats:
            for p in root.glob(pat):
                if p.is_file() and BASE not in p.parents:
                    q=INP/p.name
                    try:
                        if not q.exists() or p.stat().st_mtime>q.stat().st_mtime:shutil.copy2(p,q)
                    except Exception:pass
def local_contacts():
    seed(); out=[]
    if MASTER.exists():
        try:out+=parse_csv_file(MASTER)
        except Exception:pass
    for p in INP.iterdir():
        try:
            if p.suffix.lower()==".csv":out+=parse_csv_file(p)
            elif p.suffix.lower() in {".xlsx",".xlsm"}:out+=parse_xlsx(p)
        except Exception as e:log(f"Import {p.name} fallito: {e}")
    return dedupe(out)
def write_master(a):
    with MASTER.open("w",newline="",encoding="utf-8-sig") as f:
        w=csv.DictWriter(f,fieldnames=CH,extrasaction="ignore");w.writeheader();w.writerows(sorted(a,key=lambda x:(norm(x.get("Comune")),skey(x.get("Via")),cnum(x.get("Civico")) or 999999)))

# Browser visibile: niente headless, niente evasione CAPTCHA.
def driver():
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    o=Options();o.add_argument("--start-maximized");o.add_argument("--lang=it-IT");o.add_argument("--disable-notifications");o.add_argument(f"--user-data-dir={PROFILE.resolve()}")
    d=webdriver.Chrome(options=o);d.set_page_load_timeout(60);return d
def wait(d,C):
    try:
        from selenium.webdriver.support.ui import WebDriverWait
        WebDriverWait(d,25).until(lambda x:x.execute_script("return document.readyState") in ("interactive","complete"))
    except Exception:pass
    time.sleep(float(C.get("wait",2)))
def blocked(d):
    try:t=((d.title or "")+"\n"+(d.page_source or "")[:220000]).lower()
    except Exception:return False
    return any(x in t for x in CAPTCHA)
def surl(e,q):
    q=urllib.parse.quote_plus(q)
    return "https://www.google.com/search?q="+q if e=="google" else ("https://www.bing.com/search?q="+q if e=="bing" else "https://html.duckduckgo.com/html/?q="+q)
def links(d,domain,limit):
    from selenium.webdriver.common.by import By
    out=[];seen=set()
    for a in d.find_elements(By.CSS_SELECTOR,"a[href]"):
        try:u=a.get_attribute("href") or ""
        except Exception:continue
        if "google." in urllib.parse.urlparse(u).netloc and "/url?" in u:
            z=urllib.parse.parse_qs(urllib.parse.urlparse(u).query);u=(z.get("q") or z.get("url") or [u])[0]
        if domain not in urllib.parse.urlparse(u).netloc.lower():continue
        u=u.split("#")[0]
        if u not in seen:seen.add(u);out.append(u)
        if len(out)>=limit:break
    return out
def search_links(d,provider,comune,via,C,B):
    dom="paginebianche.it" if provider=="paginebianche" else "paginegialle.it"; q=f'site:{dom}/scheda "{via}" "{comune}"' if provider=="paginebianche" else f'site:{dom} "{via}" "{comune}"'
    for e in C.get("engines",[]):
        try:
            d.get(surl(e,q));wait(d,C)
            if blocked(d):B.append({"DATA_ORA":ts(),"FASE":"SEARCH","PROVIDER":provider,"MOTORE":e,"COMUNE":comune,"VIA":via,"URL":d.current_url,"STATO":"CAPTCHA/BLOCCO"});continue
            a=links(d,dom,int(C.get("max_links_per_street",12)))
            if a:return a
        except Exception as x:log(f"Ricerca {e} fallita: {x}")
    return []
def page_contacts(d,provider,comune,via):
    from selenium.webdriver.common.by import By
    url=d.current_url
    try:body=d.find_element(By.TAG_NAME,"body").text or ""
    except Exception:body=""
    ps=set()
    for a in d.find_elements(By.CSS_SELECTOR,'a[href^="tel:"]'):
        p=phone((a.get_attribute("href") or "")[4:])
        if len(pd(p))>=8:ps.add(p)
    for m in PHONE.finditer(body[:180000]):
        p=phone(m.group())
        if 8<=len(pd(p))<=13:ps.add(p)
    if not ps:return []
    if skey(via) not in skey(body) and norm(via) not in norm(body):return []
    try:name=next((h.text.strip() for h in d.find_elements(By.CSS_SELECTOR,"h1") if h.text.strip()),"")
    except Exception:name=""
    if not name:name=re.sub(r"\s*[-|].*$","",d.title or "").strip()
    m=re.search(re.escape(via)+r"\s*,?\s*(\d+[A-Za-z]?(?:/\d+[A-Za-z]?)?)",body,re.I);ci=m.group(1) if m else ""
    return [{"Nome":name,"Telefono":p,"Via":via,"Civico":ci,"CAP":"","Comune":comune,"Provincia":"Torino","Tipo":"CONTATTO_PUBBLICO" if provider=="paginebianche" else "ATTIVITA_PUBBLICA","Fonte":"PagineBianche" if provider=="paginebianche" else "PagineGialle","Link":url,"Stato":"VERIFICATO_PAGINA_PUBBLICA","Acquisito il":ts()} for p in ps]
def collect(T,C):
    if not C.get("browser_enabled",True):return [],[]
    try:import selenium
    except Exception:return [],[]
    u={}
    for t in T:
        k=(norm(t["comune"]),skey(t["street"]));u.setdefault(k,t)
    S=list(u.values())[:int(C.get("max_target_streets",35))]; fresh=[];B=[];d=None
    try:
        d=driver()
        for i,t in enumerate(S,1):
            checkpoint(status="RUNNING",street_index=i,street_total=len(S),comune=t["comune"],street=t["street"])
            for p in C.get("providers",[]):
                for l in search_links(d,p,t["comune"],t["street"],C,B):
                    try:
                        d.get(l);wait(d,C)
                        if blocked(d):B.append({"DATA_ORA":ts(),"FASE":"CARD","PROVIDER":p,"MOTORE":"","COMUNE":t["comune"],"VIA":t["street"],"URL":d.current_url,"STATO":"CAPTCHA/BLOCCO"});continue
                        fresh+=page_contacts(d,p,t["comune"],t["street"]);time.sleep(float(C.get("between",1.2)))
                    except Exception as e:log(f"Pagina directory fallita {l}: {e}")
    finally:
        if d:
            try:d.quit()
            except Exception:pass
    return dedupe(fresh),B

def samecity(c,t):return bool(norm(c.get("Comune"))) and norm(c.get("Comune"))==norm(t.get("comune"))
def match(c,t):
    if not samecity(c,t) or not skey(c.get("Via")) or not skey(t.get("street")):return False,"",None
    if skey(c.get("Via"))!=skey(t.get("street")) and skey(c.get("Via")) not in skey(t.get("street")) and skey(t.get("street")) not in skey(c.get("Via")):return False,"",None
    if t.get("civic") and norm(c.get("Civico"))==norm(t.get("civic")):return True,"CIVICO_ESATTO",0
    a,b=cnum(t.get("civic")),cnum(c.get("Civico"));return True,"STESSA_VIA",abs(a-b) if a is not None and b is not None else None
def cross(T,C):
    out=[]
    for t in T:
        mm=[]
        for c in C:
            ok,k,d=match(c,t)
            if ok:mm.append((c,k,d))
        mm.sort(key=lambda x:(0 if x[1]=="CIVICO_ESATTO" else 1,999999 if x[2] is None else x[2],0 if "bianch" in norm(x[0].get("Fonte")) else 1,norm(x[0].get("Nome"))))
        pri="ALTA" if (t.get("civic") and "privat" in norm(t.get("signal"))) else ("MEDIA" if t.get("civic") else "BASSA")
        if not mm:mm=[({},"NESSUN_CONTATTO_LOCALE",None)]
        for c,k,d in mm:out.append({"Priorita":pri,"Comune":t["comune"],"Via annuncio":t["street"],"Civico annuncio":t.get("civic",""),"Immobile":t.get("property",""),"Prezzo":t.get("price",""),"Fonte annuncio":t.get("listing_source",""),"URL annuncio":t.get("listing_url",""),"Contatto pubblico":c.get("Nome",""),"Telefono":c.get("Telefono",""),"Via contatto":c.get("Via",""),"Civico contatto":c.get("Civico",""),"Distanza civici":"" if d is None else d,"Fonte contatto":c.get("Fonte",""),"URL contatto":c.get("Link",""),"Match":k,"RPO":"DA_VERIFICARE","Call allowed":"NO","Nota":"Contatto pubblico territoriale; NON prova la proprietà dell'immobile."})
    return out
def csv_report(R,day):
    p=OUT/f"LISTA_TELEFONATE_{day}.csv"
    with p.open("w",newline="",encoding="utf-8-sig") as f:w=csv.DictWriter(f,fieldnames=RH,extrasaction="ignore");w.writeheader();w.writerows(R)
    return p
def blocked_report(B,day):
    p=OUT/f"BLOCCHI_CAPTCHA_{day}.csv"; h=["DATA_ORA","FASE","PROVIDER","MOTORE","COMUNE","VIA","URL","STATO"]
    with p.open("w",newline="",encoding="utf-8-sig") as f:w=csv.DictWriter(f,fieldnames=h);w.writeheader();w.writerows(B)
    return p
def html_report(R,B,day):
    p=OUT/f"REPORT_MATTINO_{day}.html";g=defaultdict(list)
    for r in R:g[(r["Comune"],r["Via annuncio"],str(r["Civico annuncio"]),r["URL annuncio"])].append(r)
    e=lambda x:html.escape(str(x or ""),quote=True); cards=[]
    for (co,vi,ci,u),rr in sorted(g.items(),key=lambda z:({"ALTA":0,"MEDIA":1,"BASSA":2}.get(z[1][0]["Priorita"],9),norm(z[0][0]),norm(z[0][1]))):
        b=rr[0]; pp=[x for x in rr if x.get("Telefono")][:30]; ph=""
        if not pp:ph='<div class="empty">Nessun numero pubblico trovato per questa via.</div>'
        for x in pp:
            badge="CIVICO ESATTO" if x["Match"]=="CIVICO_ESATTO" else "STESSA VIA";ds=f" · distanza civici {e(x['Distanza civici'])}" if x["Distanza civici"]!="" else ""
            ph+=f'<div class="person"><b>{e(x["Contatto pubblico"])}</b><span class="badge">{badge}</span><div class="phone">{e(x["Telefono"])}</div><div class="mut">{e(x["Via contatto"])} {e(x["Civico contatto"])}{ds} · {e(x["Fonte contatto"])}</div><div class="gate">RPO DA VERIFICARE · CALL ALLOWED NO</div></div>'
        mp="https://www.google.com/maps/search/?api=1&query="+urllib.parse.quote_plus(f"{vi} {ci}, {co}, TO")
        cards.append(f'<article class="card"><div class="town">{e(co)} · {e(b["Priorita"])}</div><h2>{e(vi)} {e(ci)}</h2><p>{e(b["Immobile"])}</p><div class="mut">{e(b["Prezzo"])} · {e(b["Fonte annuncio"])}</div><div class="buttons"><a target="_blank" href="{e(u)}">ANNUNCIO</a><a target="_blank" href="{e(mp)}">MAPPA</a></div><h3>Numeri sulla stessa via</h3>{ph}</article>')
    nann=len(g);nv=len({(x["Comune"],x["Via annuncio"]) for x in R});nn=len({pd(x["Telefono"]) for x in R if pd(x["Telefono"])});ne=sum(1 for x in R if x["Match"]=="CIVICO_ESATTO")
    warn=f'<div class="warn"><b>CAPTCHA/BLOCCHI: {len(B)}</b> — non aggirati; il programma ha continuato sulle altre fonti.</div>' if B else ""
    doc=f'''<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>F1 Lavoro mattino</title><style>:root{{--g:#39f28a;--bg:#070907;--p:#101510;--line:#2a342c;--mut:#aeb7b0}}*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:#fff;font-family:Arial}}main{{max-width:1050px;margin:auto;padding:24px 14px}}h1{{font-size:42px;margin:5px 0}}.ey,.town,.phone{{color:var(--g)}}.ey,.town{{font-size:10px;font-weight:900;letter-spacing:.12em}}.stats{{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0}}.stat,.card{{background:var(--p);border:1px solid var(--line);border-radius:14px;padding:14px}}.stat{{text-align:center}}.stat b{{display:block;color:var(--g);font-size:26px}}.card{{margin:13px 0}}.mut{{color:var(--mut);font-size:12px}}.person{{border-top:1px solid var(--line);padding:9px 0}}.phone{{font-size:18px;font-weight:900}}.badge{{margin-left:7px;font-size:8px;background:#263028;padding:4px 6px;border-radius:999px}}.gate{{color:#f4c95d;font-size:9px}}.buttons{{display:flex;gap:8px;margin:10px 0}}.buttons a{{background:var(--g);color:#07100a;text-decoration:none;padding:9px;border-radius:8px;font-weight:900;font-size:10px}}.rule,.warn{{border:1px solid #66552a;background:#17140d;padding:13px;border-radius:12px;margin:14px 0}}.empty{{color:var(--mut)}}@media(max-width:650px){{.stats{{grid-template-columns:1fr 1fr}}}}</style></head><body><main><div class="ey">F1 IMMOBILIARE · SCRIVANIA ACQUISIZIONE</div><h1>LAVORO DI OGGI</h1><div class="stats"><div class="stat"><b>{nann}</b>annunci</div><div class="stat"><b>{nv}</b>vie</div><div class="stat"><b>{nn}</b>numeri</div><div class="stat"><b>{ne}</b>civici esatti</div></div><div class="rule"><b>REGOLA:</b> stessa via ≠ proprietario. Prima di telefonate commerciali verifica RPO. Il report non autorizza automaticamente la chiamata.</div>{warn}{''.join(cards)}</main></body></html>'''
    p.write_text(doc,encoding="utf-8");shutil.copy2(p,OUT/"REPORT_MATTINO_ULTIMO.html");return p
def open_report():
    p=OUT/"REPORT_MATTINO_ULTIMO.html"
    if p.exists():
        try:os.startfile(str(p))
        except Exception:subprocess.Popen(["cmd","/c","start","",str(p)])
def run(nobrowser=False,manual=False):
    ensure();C=cfg();C["browser_enabled"]=C.get("browser_enabled",True) and not nobrowser;log("Avvio F1 Directory Radar")
    T=targets(C);log(f"Target annunci/vie: {len(T)}");checkpoint(status="TARGETS",count=len(T))
    if not T:return 3
    L=local_contacts();log(f"Contatti locali: {len(L)}");F,B=collect(T,C) if C["browser_enabled"] else ([],[]);log(f"Nuovi directory: {len(F)}")
    L=dedupe(L+F);write_master(L);R=cross(T,L);day=now().strftime("%Y-%m-%d");cp=csv_report(R,day);hp=html_report(R,B,day);blocked_report(B,day)
    ad=ARC/day;ad.mkdir(parents=True,exist_ok=True)
    for p in OUT.glob(f"*{day}*"):
        try:shutil.copy2(p,ad/p.name)
        except Exception:pass
    checkpoint(status="COMPLETED",targets=len(T),contacts=len(L),rows=len(R),blocked=len(B),html=str(hp),csv=str(cp));log(f"Completato: {hp}")
    if manual:open_report()
    return 0
def main():
    a=argparse.ArgumentParser();a.add_argument("--night",action="store_true");a.add_argument("--manual",action="store_true");a.add_argument("--no-browser",action="store_true");a.add_argument("--open-report",action="store_true");x=a.parse_args();ensure()
    if x.open_report:open_report();return 0
    return run(x.no_browser,x.manual)
if __name__=="__main__":raise SystemExit(main())
