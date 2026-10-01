(function(){
'use strict';

const CFG=()=>window.F1_SUPABASE||{};

function ready(){
  return !!(window.F1Sync&&window.F1Sync.ready&&window.F1Sync.ready()&&CFG().url&&CFG().anonKey);
}

async function headers(){
  if(!ready())throw new Error('REGISTRO CONTATTI: accesso cloud richiesto');
  return {
    apikey:CFG().anonKey,
    Authorization:'Bearer '+await window.F1Sync.authToken(),
    'Content-Type':'application/json'
  };
}

async function rpc(name,body){
  const res=await fetch(CFG().url.replace(/\/$/,'')+'/rest/v1/rpc/'+name,{
    method:'POST',
    headers:await headers(),
    body:JSON.stringify(body||{})
  });
  if(res.status===401){
    window.F1Sync?.clearSession?.();
    const e=new Error('REGISTRO CONTATTI: accesso cloud richiesto');
    e.code='AUTH_REQUIRED';
    throw e;
  }
  if(!res.ok)throw new Error('REGISTRO CONTATTI '+res.status+': '+await res.text());
  const text=await res.text();
  return text?JSON.parse(text):null;
}

function normalizeChannel(value){
  const v=String(value||'').toUpperCase();
  if(v==='CALL')return'CALL';
  if(['WHATSAPP','SMS','EMAIL','MESSAGE'].includes(v))return'MESSAGE';
  return'';
}

async function record({
  channel,
  sourceEventId,
  contactRef='',
  source='',
  displayName='',
  occurredAt='',
  metadata={}
}={}){
  const ch=normalizeChannel(channel);
  if(!ch)throw new Error('REGISTRO CONTATTI: canale non valido');
  const id=String(sourceEventId||'').trim();
  if(!id)throw new Error('REGISTRO CONTATTI: identificativo evento mancante');
  const row=await rpc('f1_record_contact_outreach_v1',{
    p_channel:ch,
    p_source_event_id:id,
    p_contact_ref:String(contactRef||''),
    p_source:String(source||''),
    p_display_name:String(displayName||''),
    p_occurred_at:occurredAt||new Date().toISOString(),
    p_metadata:metadata&&typeof metadata==='object'?metadata:{}
  });
  window.dispatchEvent(new CustomEvent('f1-outreach-changed',{detail:row||{}}));
  return row;
}

async function recordInteraction(interaction,source='crm'){
  const row=interaction||{};
  if(String(row.direction||'OUTBOUND').toUpperCase()!=='OUTBOUND')return null;
  const channel=normalizeChannel(row.interaction_type);
  if(!channel)return null;
  const interactionId=String(row.interaction_id||'').trim();
  if(!interactionId)throw new Error('REGISTRO CONTATTI: interaction_id mancante');
  const meta=row.metadata&&typeof row.metadata==='object'?row.metadata:{};
  return record({
    channel,
    sourceEventId:'interaction:'+interactionId,
    contactRef:row.lead_id||row.task_id||'',
    source:meta.origin||source||'crm',
    displayName:meta.display_name||'',
    occurredAt:row.occurred_at||new Date().toISOString(),
    metadata:{
      interaction_id:interactionId,
      task_id:row.task_id||'',
      outcome:row.outcome||'',
      interaction_type:row.interaction_type||'',
      ...meta
    }
  });
}

async function today(day=''){
  return rpc('f1_daily_contact_outreach_v1',{p_day:day||null});
}

window.F1ContactOutreach={ready,record,recordInteraction,today,normalizeChannel};
})();