#!/usr/bin/env python3
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
R=Path(__file__).resolve().parents[1]
def load(p,d):
    try:return json.loads((R/p).read_text(encoding='utf-8'))
    except:return d
def score_band(n):
    n=max(0,min(100,int(float(n or 0))))
    return 'HOT' if n>=70 else 'WARM' if n>=45 else 'NURTURE' if n>=20 else 'INFORMATION_ONLY'
def campaign(t):
    e=str(t.get('event_type') or '').upper(); m=str(t.get('market_category') or '').upper()
    if e in {'JUST_LISTED','F1_JUST_LISTED_CONFIRMED'}: return 'APPENA_MESSO_IN_VENDITA'
    if e in {'JUST_SOLD','F1_JUST_SOLD_CONFIRMED'}: return 'JUST_SOLD'
    if 'FSBO' in m:return 'VALUTAZIONE_PROFESSIONALE_GRATUITA'
    if 'EXPIRED' in m:return 'AGGIORNAMENTO_MERCATO_IMMOBILIARE'
    return 'NOVITA_IMMOBILIARE_NELLA_ZONA'
def build(cfg,acq,neigh):
    now=datetime.now(tz=ZoneInfo('Europe/Rome')).isoformat(); rows=[]
    for t in acq.get('tasks') or []:
        s=max(0,min(100,int(float(t.get('priority') or t.get('lead_score') or 0))))
        rows.append({'id':str(t.get('task_id') or t.get('event_id') or t.get('property_id') or ''),'source':str(t.get('source') or 'Seller Radar F1'),'source_url':str(t.get('source_url') or ''),'event_type':str(t.get('event_type') or t.get('task_type') or 'MARKET_SIGNAL'),'discovered_at':str(t.get('created_at') or now),'updated_at':str(t.get('updated_at') or now),'comune':str(t.get('comune') or ''),'zona':str(t.get('zona') or ''),'via':str(t.get('via') or ''),'civico':str(t.get('civico') or ''),'radius_m':int(cfg.get('microzone_radius_m',1000)),'property_type':str(t.get('immobile') or ''),'asking_price':str(t.get('prezzo') or ''),'signals':[x for x in [t.get('seller_signal'),t.get('lead_reason'),t.get('reason')] if x],'lead_score':s,'lead_status':score_band(s),'contact_type':'PUBLIC_INFORMATION','email_status':'EMAIL_MANUAL_REQUIRED','whatsapp_status':'WHATSAPP_MANUAL_REQUIRED','consent_status':'UNKNOWN','marketing_status':'MANUAL_REVIEW','next_action':str(t.get('next_action') or t.get('reason') or 'Verifica nel CRM'),'campaign_type':campaign(t),'postiz_status':'PENDING_INTEGRATION','crm_status':'REQUIRED'})
    rows.sort(key=lambda x:(-x['lead_score'],x['comune'],x['via']))
    bands={k:sum(r['lead_status']==k for r in rows) for k in ['HOT','WARM','NURTURE','INFORMATION_ONLY']}
    payload={'version':1,'generated_at':now,'engine':cfg.get('name'),'valuation':{'label':cfg.get('valuation_label'),'url':cfg.get('agentpricing_url')},'territory':{'reference_hub':acq.get('reference_hub'),'microzone_radius_m':cfg.get('microzone_radius_m',1000),'neighborhood_signals_count':neigh.get('signals_count',0)},'integrations':{'crm':'CONNECTED_EXISTING','seller_radar':'CONNECTED_EXISTING','microzones':'CONNECTED_EXISTING','postiz':cfg.get('postiz',{}).get('repository_status','NOT_FOUND'),'email_channel':'ELIGIBILITY_GATE_REQUIRED','whatsapp_channel':'ELIGIBILITY_GATE_REQUIRED'},'summary':{'total':len(rows),**{k.lower():v for k,v in bands.items()}},'communication_policy':cfg.get('communication_policy',{}),'daily_windows':cfg.get('daily_windows',[]),'opportunities':rows}
    drafts=[{'id':r['id'],'status':'PENDING_INTEGRATION','campaign_type':r['campaign_type'],'comune':r['comune'],'title':('Appena messo in vendita a ' if r['campaign_type']=='APPENA_MESSO_IN_VENDITA' else 'Novita immobiliare a ')+(r['comune'] or 'Valle di Susa'),'text':'F1 Immobiliare opera in tutta la Valle di Susa. Richiedi una Valutazione Professionale Gratuita; il link e condivisibile con amici, conoscenti o parenti interessati a vendere o acquistare.','cta_label':cfg.get('valuation_label'),'cta_url':cfg.get('agentpricing_url')} for r in rows[:20]]
    return payload,{'version':1,'generated_at':now,'status':cfg.get('postiz',{}).get('repository_status','NOT_FOUND'),'rule':cfg.get('postiz',{}).get('rule',''),'drafts':drafts}
def main():
    cfg=load('config/seller-lead-engine.json',{}); acq=load('data/acquisition-public.json',{'tasks':[]}); neigh=load('data/neighborhood_intelligence.json',{})
    payload,outbox=build(cfg,acq,neigh)
    (R/'data/seller-lead-engine-public.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
    (R/'data/postiz-outbox.json').write_text(json.dumps(outbox,ensure_ascii=False,indent=2),encoding='utf-8')
    print('F1 Seller Lead Engine',payload['summary'])
if __name__=='__main__':main()
