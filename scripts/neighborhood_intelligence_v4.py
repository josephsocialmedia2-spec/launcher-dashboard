#!/usr/bin/env python3
from __future__ import annotations
import csv, hashlib, io, json, math, os, time, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path
from territory_config import allowed_set, communes as configured_communes, load_territory, norm as territory_norm, rank_map

ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/'data'; DATA.mkdir(parents=True,exist_ok=True)
OUT=DATA/'neighborhood_intelligence.json'; SEEN=DATA/'neighborhood_seen.json'
GIRO_URL='https://raw.githubusercontent.com/josephsocialmedia2-spec/immobili-in-zona/main/seller_radar_auto/data/giro_acquisizione_oggi.csv'
NOMINATIM='https://nominatim.openstreetmap.org/search'; OVERPASS='https://overpass-api.de/api/interpreter'
UA='F1-Neighborhood-Intelligence/4.0 (public-business-context)'
HALF_SIDE_M=int(os.getenv('F1_NEIGHBORHOOD_HALF_SIDE','1000')); MAX_ENRICH=int(os.getenv('F1_NEIGHBORHOOD_MAX_ENRICH','0'))
ENGINE_VERSION='4'; TERRITORY=load_territory(); ROUTE=configured_communes(TERRITORY); RANK=rank_map(TERRITORY); ALLOWED=allowed_set(TERRITORY); SELLER=TERRITORY.get('seller_radar') or {}

def now_iso(): return datetime.now(timezone.utc).isoformat(timespec='seconds')
def fetch_text(url,data=None,timeout=45):
    req=urllib.request.Request(url,data=data,headers={'User-Agent':UA,'Accept':'*/*'})
    with urllib.request.urlopen(req,timeout=timeout) as r: return r.read().decode('utf-8-sig',errors='replace')
def load_json(path,default):
    try:return json.loads(path.read_text(encoding='utf-8'))
    except Exception:return default
def stable_id(row):
    seed=(row.get('URL') or '').strip() or '|'.join([(row.get('COMUNE') or '').strip(),(row.get('DOVE_ANDRE') or '').strip(),(row.get('COSA_CERCO') or '').strip()])
    return 'SIG-'+hashlib.sha1(seed.encode()).hexdigest()[:14].upper()
def search_url(engine,q):
    q=urllib.parse.quote_plus(q)
    return ('https://www.bing.com/search?q='+q) if engine=='bing' else ('https://duckduckgo.com/?q='+q) if engine=='duckduckgo' else ('https://www.google.com/search?q='+q)
def queries(comune,via):
    exact=f'"{via}" "{comune}"'; target=f'{via}, {comune}, Italia'
    return {'google':search_url('google',target),'bing':search_url('bing',target),'duckduckgo':search_url('duckduckgo',target),'pagine_bianche':search_url('google',f'site:paginebianche.it {exact}'),'pagine_gialle':search_url('google',f'site:paginegialle.it {exact}'),'immobiliare':search_url('google',f'site:immobiliare.it {exact}'),'idealista':search_url('google',f'site:idealista.it {exact}'),'casa':search_url('google',f'site:casa.it {exact}'),'subito':search_url('google',f'site:subito.it {exact}')}
def street_queries(comune,via):
    exact=f'"{via}" "{comune}"'
    return {'google':search_url('google',exact),'bing':search_url('bing',exact),'duckduckgo':search_url('duckduckgo',exact),'pagine_bianche':search_url('google',f'site:paginebianche.it {exact}'),'pagine_gialle':search_url('google',f'site:paginegialle.it {exact}')}
def geocode_place(q):
    p=urllib.parse.urlencode({'q':q,'format':'jsonv2','limit':1,'countrycodes':'it','addressdetails':1}); x=json.loads(fetch_text(NOMINATIM+'?'+p))
    if not x:return None
    x=x[0]; return {'lat':float(x['lat']),'lon':float(x['lon']),'display_name':x.get('display_name',''),'osm_id':x.get('osm_id')}
def haversine(a,b):
    r=6371.0088;p1=math.radians(a['lat']);p2=math.radians(b['lat']);dp=math.radians(b['lat']-a['lat']);dl=math.radians(b['lon']-a['lon']);h=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2;return 2*r*math.asin(math.sqrt(h))
def bbox(lat,lon):
    dlat=HALF_SIDE_M/111320.0; dlon=HALF_SIDE_M/(111320.0*max(.2,math.cos(math.radians(lat))))
    return {'south':lat-dlat,'west':lon-dlon,'north':lat+dlat,'east':lon+dlon,'half_side_m':HALF_SIDE_M,'width_m':HALF_SIDE_M*2,'height_m':HALF_SIDE_M*2}
def overpass(box):
    s,w,n,e=box['south'],box['west'],box['north'],box['east']; q=f'''[out:json][timeout:45];(way({s},{w},{n},{e})["highway"]["name"];nwr({s},{w},{n},{e})["amenity"];nwr({s},{w},{n},{e})["shop"];nwr({s},{w},{n},{e})["office"];nwr({s},{w},{n},{e})["craft"];nwr({s},{w},{n},{e})["tourism"];nwr({s},{w},{n},{e})["healthcare"];nwr({s},{w},{n},{e})["building"~"^(house|residential|apartments|detached|semidetached_house)$"];);out tags center;'''
    return json.loads(fetch_text(OVERPASS,urllib.parse.urlencode({'data':q}).encode(),65)).get('elements',[])
def first(tags,*keys):
    for k in keys:
        v=str(tags.get(k,'') or '').strip()
        if v:return v
    return ''
def public_entity(el):
    t=el.get('tags') or {}
    if el.get('type')=='way' and t.get('highway'):return None
    if t.get('building') in {'house','residential','apartments','detached','semidetached_house'} and not any(k in t for k in ('amenity','shop','office','craft','tourism','healthcare')):return None
    name=first(t,'name','operator','brand'); phone=first(t,'contact:phone','phone'); email=first(t,'contact:email','email'); website=first(t,'contact:website','website','url')
    if not any((name,phone,email,website)):return None
    return {'name':name or 'Attività/ente pubblico OSM','phone_public':phone,'email_public':email,'website':website,'source':'OpenStreetMap'}
def enrich(s):
    if not s['indirizzo'] or 'DA VERIFICARE' in s['indirizzo'].upper():s['enrichment_status']='SKIPPED_NO_ADDRESS';return
    geo=geocode_place(f"{s['indirizzo']}, {s['comune']}, Italia")
    if not geo:s['enrichment_status']='GEOCODE_NOT_FOUND';return
    time.sleep(1.05); box=bbox(geo['lat'],geo['lon']); els=overpass(box); streets=set(); residential=0; entities=[]; keys=set()
    for el in els:
        t=el.get('tags') or {}
        if t.get('highway') and t.get('name'):streets.add(str(t['name']).strip())
        if t.get('building') in {'house','residential','apartments','detached','semidetached_house'}:residential+=1
        ent=public_entity(el)
        if ent:
            key=(ent['name'].lower(),ent['phone_public'],ent['email_public'],ent['website'])
            if key not in keys:keys.add(key);entities.append(ent)
    s['geocode']=geo;s['microzone_square']=box;s['streets']=[{'street':v,'queries':street_queries(s['comune'],v)} for v in sorted(streets,key=str.lower)][:250];s['public_entities']=entities[:200]
    s['context']={'residential_buildings_osm':residential,'street_count':len(streets),'public_entities_count':len(entities),'density_note':'Proxy edilizio, non stima ufficiale della popolazione.','directory_note':'Pagine Bianche/Gialle restano intelligence separata dal CRM.'};s['enrichment_status']='ENRICHED';s['enriched_at']=now_iso()
def reference_span():
    cfg=SELLER.get('reference_span') or {}; a_name=cfg.get('endpoint_a','Condove, TO, Italia'); b_name=cfg.get('endpoint_b','Rivera, Almese, TO, Italia'); a=geocode_place(a_name);time.sleep(1.05);b=geocode_place(b_name)
    return {'endpoint_a':a_name,'endpoint_b':b_name,'distance_km':round(haversine(a,b),3) if a and b else None,'status':'READY' if a and b else 'GEOCODE_INCOMPLETE'}
def commune_cache():
    out=[]
    for c in ROUTE:
        try:g=geocode_place(f'{c}, Torino, Piemonte, Italia');out.append({'comune':c,'geocode':g,'territorial_rank':RANK.get(territory_norm(c),9999)})
        except Exception as exc:out.append({'comune':c,'error':str(exc)[:150]})
        time.sleep(1.05)
    return out
def main():
    rows=list(csv.DictReader(io.StringIO(fetch_text(GIRO_URL))));old=load_json(OUT,{'signals':[]});oldmap={x.get('signal_id'):x for x in old.get('signals',[]) if x.get('signal_id')};seen=load_json(SEEN,{'seen':{}}).setdefault('seen',{});stamp=now_iso();signals=[]
    for row in rows:
        comune=(row.get('COMUNE') or '').strip();via=(row.get('DOVE_ANDRE') or '').strip()
        if not comune or not via or territory_norm(comune) not in ALLOWED:continue
        sid=stable_id(row);first_seen=seen.get(sid) or stamp;seen[sid]=first_seen;prev=oldmap.get(sid,{});valid=prev.get('engine_version')==ENGINE_VERSION
        signals.append({'signal_id':sid,'first_seen':first_seen,'is_new':first_seen==stamp,'territorial_rank':RANK.get(territory_norm(comune),9999),'comune':comune,'indirizzo':via,'immobile':(row.get('COSA_CERCO') or '').strip(),'prezzo':(row.get('PREZZO') or '').strip(),'fonte':(row.get('FONTE') or '').strip(),'seller_signal':(row.get('SELLER_SIGNAL') or '').strip(),'priorita':(row.get('PRIORITA') or '').strip(),'score':(row.get('SCORE') or '').strip(),'url_annuncio':(row.get('URL') or '').strip(),'queries':queries(comune,via),'engine_version':ENGINE_VERSION,'enrichment_status':prev.get('enrichment_status','PENDING') if valid else 'PENDING','geocode':prev.get('geocode') if valid else None,'microzone_square':prev.get('microzone_square') if valid else None,'streets':prev.get('streets',[]) if valid else [],'public_entities':prev.get('public_entities',[]) if valid else [],'context':prev.get('context',{}) if valid else {}})
    todo=[s for s in signals if s['enrichment_status'] in {'PENDING','ERROR'}];todo.sort(key=lambda s:(s['territorial_rank'],-int(float(s['score'] or 0))))
    if MAX_ENRICH>0:todo=todo[:MAX_ENRICH]
    for s in todo:
        try:enrich(s)
        except Exception as exc:s['enrichment_status']='ERROR';s['enrichment_error']=str(exc)[:300]
        time.sleep(.4)
    payload={'engine_version':ENGINE_VERSION,'territory_version':TERRITORY.get('version'),'reference_hub':TERRITORY.get('reference_hub'),'seller_radar_mode':SELLER.get('mode','DYNAMIC_WORK_COMMUNE'),'reference_span':reference_span(),'microzone_shape':'SQUARE','microzone_half_side_m':HALF_SIDE_M,'commune_cache':commune_cache(),'generated_at':stamp,'source':GIRO_URL,'privacy':'CRM=immobili/annunci e lead leciti. Vie/directory=intelligence separata. Nessun profilo residenti privati.','signals_count':len(signals),'signals':signals}
    OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8');SEEN.write_text(json.dumps({'updated_at':stamp,'seen':seen},ensure_ascii=False,indent=2),encoding='utf-8');print('Seller Radar neighborhood v4',len(signals))
if __name__=='__main__':main()
