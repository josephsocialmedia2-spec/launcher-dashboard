(function(){
'use strict';

const SCOPE='albero_fonti_notizie';
const CACHE_KEY='alberoFontiNotizie';
const MIGRATION_FLAG='alberoFontiNotizieMigratedToSupabase';
const DELETE_QUEUE='f1TreeCloudDeleteQueue';
const NEWS_QUEUE='f1TreeCloudNewsQueue';
const LOGIN_URL='setup-cloud.html?return=albero-fonti-notizie.html';
const CFG=window.F1_SUPABASE||{};
let user=null;
let contactMap=new Map();
let pushTimer=null;
let pushing=false;
let booted=false;
let suspendPush=false;

function stateEl(){return document.getElementById('cloudSyncState')}
function setState(kind,label){
  const el=stateEl();if(!el)return;
  el.className='cloud-sync-state '+kind;
  el.textContent=label;
}
function isNetworkError(err){return /fetch|network|offline|connessione|timeout|tempo massimo/i.test(String(err&&err.message||err||''))}
function readJson(key,fallback){try{const x=JSON.parse(localStorage.getItem(key)||'null');return x==null?fallback:x}catch(_){return fallback}}
function writeJson(key,val){localStorage.setItem(key,JSON.stringify(val))}
function saveCache(){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify(db))}catch(_){}
}
function nowIso(){return new Date().toISOString()}
function localDate(v){
  if(!v)return '';
  const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v).slice(0,10);
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+day;
}
function newer(a,b){
  const ta=Date.parse(a||'')||0,tb=Date.parse(b||'')||0;
  return ta>=tb;
}
function personStamp(p){return p.updatedAt||p.createdAt||''}
function touchLocal(p){if(p){p.updatedAt=nowIso()}}
function apiBase(){return String(CFG.url||'').replace(/\/$/,'')+'/rest/v1/'}
async function authContext(){
  if(!window.F1Sync||!F1Sync.configured||!F1Sync.configured())throw new Error('Supabase non configurato');
  const session=F1Sync.session&&F1Sync.session();
  if(!session)throw Object.assign(new Error('AUTH_REQUIRED'),{code:'AUTH_REQUIRED'});
  const ok=await F1Sync.ensureSession();
  if(!ok)throw Object.assign(new Error('AUTH_REQUIRED'),{code:'AUTH_REQUIRED'});
  const token=await F1Sync.authToken(false);
  const check=await F1Sync.currentUser(token);
  if(!check.ok||!check.user||!check.user.id)throw Object.assign(new Error('AUTH_REQUIRED'),{code:'AUTH_REQUIRED'});
  user=check.user;
  return {token,user};
}
async function rest(table,query,opt){
  opt=opt||{};
  const token=await F1Sync.authToken(false);
  const headers={
    apikey:CFG.anonKey,
    Authorization:'Bearer '+token,
    Accept:'application/json',
    ...(opt.headers||{})
  };
  if(opt.body!==undefined)headers['Content-Type']='application/json';
  const res=await fetch(apiBase()+table+(query?('?'+query):''),{
    method:opt.method||'GET',
    headers,
    body:opt.body===undefined?undefined:JSON.stringify(opt.body)
  });
  const text=await res.text();
  let body=null;try{body=text?JSON.parse(text):null}catch(_){body=text}
  if(!res.ok){
    const e=new Error((body&&body.message)||('Supabase '+res.status));
    e.status=res.status;e.body=body;throw e;
  }
  return body;
}
async function upsert(table,onConflict,rows){
  if(!rows||!rows.length)return [];
  const q='on_conflict='+encodeURIComponent(onConflict);
  const body=await rest(table,q,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:rows});
  return Array.isArray(body)?body:[];
}
async function patchRows(table,filter,body){
  return rest(table,filter,{method:'PATCH',headers:{Prefer:'return=representation'},body});
}
async function fetchOwn(table,query){
  const q=query?query+'&select=*':'select=*';
  const out=await rest(table,q,{method:'GET'});
  return Array.isArray(out)?out:[];
}
async function rpc(name,body){
  return rest('rpc/'+name,'',{method:'POST',headers:{Prefer:'return=representation'},body:body||{}});
}
function safeIso(v){
  if(!v)return null;
  const d=new Date(v);
  if(!Number.isNaN(d.getTime()))return d.toISOString();
  const m=String(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if(m){
    const d2=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]||12),Number(m[5]||0),Number(m[6]||0));
    if(!Number.isNaN(d2.getTime()))return d2.toISOString();
  }
  return null;
}
function triggerDef(id){try{return LIFE_TRIGGERS.find(x=>x.id===id)||null}catch(_){return null}}
function socialQuery(p,network){
  try{return socialQueryFor(p,network)}catch(_){
    return [p&&p.name,p&&p.surname,p&&p.town,network].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
  }
}
function splitOfficialName(full){
  const parts=String(full||'').trim().split(/\s+/).filter(Boolean);
  return {first_name:parts.shift()||'',last_name:parts.join(' ')};
}
function cloudContactToLocal(c,idByContact,triggers,touchpoints,socials){
  const meta=c.tree_meta&&typeof c.tree_meta==='object'?c.tree_meta:{};
  const p={
    id:c.legacy_id||('cloud_'+c.contact_id),
    cloudId:c.contact_id,
    parentId:c.parent_contact_id?(idByContact.get(c.parent_contact_id)||'root'):'root',
    name:String(c.nome||'').toLocaleUpperCase('it-IT'),
    surname:String(c.cognome||'').toLocaleUpperCase('it-IT'),
    phone:c.telefono||'',
    email:c.email||'',
    category:(Array.isArray(c.tipo_rapporto)&&c.tipo_rapporto[0])||meta.category||'',
    source:c.tree_source||meta.source||'',
    stage:c.stato_contatto||meta.stage||'Nome',
    town:c.comune||'',
    notes:c.note||'',
    influence:!!c.centro_influenza,
    firstContact:c.data_primo_contatto||'',
    lastContact:c.ultima_interazione?localDate(c.ultima_interazione):'',
    nextContact:c.data_prossimo_contatto||'',
    touchpointHistory:{},
    socialSearchHistory:{},
    lifeTriggers:[],
    lifeTriggerHistory:[],
    lifeTriggerStatus:{},
    lifeTriggerNews:{},
    periodContexts:Array.isArray(meta.periodContexts)?meta.periodContexts:[],
    places:Array.isArray(meta.places)?meta.places:[],
    memories:Array.isArray(meta.memories)?meta.memories:[],
    schools:Array.isArray(meta.schools)?meta.schools:[],
    companies:Array.isArray(meta.companies)?meta.companies:[],
    contextTags:Array.isArray(meta.contextTags)?meta.contextTags:[],
    createdAt:c.created_at||nowIso(),
    updatedAt:c.updated_at||c.created_at||nowIso(),
    contactDates:Array.isArray(c.contact_dates)?c.contact_dates:[]
  };
  const myTriggers=triggers.filter(x=>x.contact_id===c.contact_id);
  myTriggers.forEach(t=>{
    if(t.active)p.lifeTriggers.push(t.trigger_type);
    const hist=Array.isArray(t.history)?t.history:[];
    if(hist.length)p.lifeTriggerHistory.push(...hist.map(h=>({id:t.trigger_type,date:h.date||localDate(t.data_rilevazione)})));
    else if(t.data_rilevazione)p.lifeTriggerHistory.push({id:t.trigger_type,date:localDate(t.data_rilevazione)});
    p.lifeTriggerStatus[t.trigger_type]=t.status||'RILEVATO';
    if(t.news_id)p.lifeTriggerNews[t.trigger_type]=t.news_id;
  });
  touchpoints.filter(x=>x.contact_id===c.contact_id).forEach(t=>{
    const h={done:t.stato==='INVIATO',sentAt:t.data_effettiva||'',note:'',socialSearches:t.social_searches||{}};
    p.touchpointHistory[t.touchpoint_key]=h;
  });
  socials.filter(x=>x.contact_id===c.contact_id).forEach(s=>{
    if(!s.touchpoint_key)p.socialSearchHistory[s.platform]=s.data_ricerca;
    else{
      const h=p.touchpointHistory[s.touchpoint_key]||{done:false,sentAt:'',note:'',socialSearches:{}};
      h.socialSearches=h.socialSearches||{};
      h.socialSearches[s.platform]=s.data_ricerca;
      p.touchpointHistory[s.touchpoint_key]=h;
    }
  });
  try{syncNextContact(p)}catch(_){}
  return p;
}
async function pullBundle(){
  const [contacts,triggers,touchpoints,socials,settings,profiles]=await Promise.all([
    fetchOwn('network_contacts','app_scope=eq.'+encodeURIComponent(SCOPE)+'&deleted=eq.false&order=updated_at.asc'),
    fetchOwn('f1_network_life_triggers','order=updated_at.asc'),
    fetchOwn('f1_network_touchpoints','order=data_prevista.asc'),
    fetchOwn('f1_network_social_searches','order=data_ricerca.asc'),
    fetchOwn('f1_tree_settings',''),
    fetchOwn('f1_staff_profiles','user_id=eq.'+encodeURIComponent(user.id))
  ]);
  const idByContact=new Map(contacts.map(c=>[c.contact_id,c.legacy_id||('cloud_'+c.contact_id)]));
  const people=contacts.map(c=>cloudContactToLocal(c,idByContact,triggers,touchpoints,socials));
  const st=settings[0]||{};
  const profile=profiles[0]||{};
  return {contacts,people,triggers,touchpoints,socials,settings:st,profile};
}
function mergeCloudIntoLocal(bundle){
  const root=(db.people||[]).find(p=>p.id==='root')||{
    id:'root',parentId:null,name:'IO',surname:'',phone:'',email:'',category:'',source:'',stage:'Nome',town:'',
    notes:'Punto di partenza della rete personale',influence:false,firstContact:'',lastContact:'',nextContact:'',
    touchpointHistory:{},socialSearchHistory:{},lifeTriggers:[],lifeTriggerHistory:[],periodContexts:[],places:[],memories:[],schools:[],companies:[],contextTags:[],createdAt:nowIso(),updatedAt:nowIso(),contactDates:[]
  };
  const localMap=new Map((db.people||[]).filter(p=>p.id!=='root').map(p=>[p.id,p]));
  bundle.people.forEach(cp=>{
    const lp=localMap.get(cp.id);
    if(!lp||newer(cp.updatedAt,personStamp(lp)))localMap.set(cp.id,cp);
    else if(lp)lp.cloudId=cp.cloudId;
  });
  db.people=[root,...localMap.values()];
  db.settings=db.settings||{};
  if(bundle.settings&&bundle.settings.daily_target)db.dailyTarget=Number(bundle.settings.daily_target)||db.dailyTarget||40;
  if(bundle.settings&&bundle.settings.automation_webhook!==undefined)db.settings.automationWebhook=bundle.settings.automation_webhook||'';
  if(bundle.settings&&bundle.settings.graph_meta&&typeof bundle.settings.graph_meta==='object'){
    const g=bundle.settings.graph_meta;
    db.dataVersion=Number(bundle.settings.data_version||g.dataVersion||db.dataVersion||1);
    db.relations=Array.isArray(g.relations)?g.relations:(db.relations||[]);
    db.places=Array.isArray(g.places)?g.places:(db.places||[]);
    db.memories=Array.isArray(g.memories)?g.memories:(db.memories||[]);
    db.automationLog=Array.isArray(g.automationLog)?g.automationLog:(db.automationLog||[]);
    db.mnemonic=g.mnemonic&&typeof g.mnemonic==='object'?g.mnemonic:(db.mnemonic||{});
  }
  if(bundle.profile){
    const name=[bundle.profile.first_name,bundle.profile.last_name].filter(Boolean).join(' ');
    if(name)db.settings.officialName=name.toLocaleUpperCase('it-IT');
    if(bundle.profile.phone)db.settings.officialPhone=bundle.profile.phone;
    if(bundle.profile.company_email)db.settings.officialEmail=bundle.profile.company_email;
  }
  db.people.forEach(p=>{if(!p.updatedAt)p.updatedAt=p.createdAt||nowIso();try{syncNextContact(p)}catch(_){}});
  saveCache();
  try{window.F1NetworkEngine?.afterMutation?.()}catch(_){}
  try{localStorage.setItem('f1NotizieOfficial',JSON.stringify(db.settings||{}))}catch(_){}
  try{renderAll();loadOfficialSettingsIntoForm();checkDueTouchpoints()}catch(_){}
}
function contactPayload(p,parentCloudId){
  const stamp=personStamp(p)||nowIso();
  return {
    user_id:user.id,
    app_scope:SCOPE,
    legacy_id:p.id,
    parent_contact_id:parentCloudId||null,
    nome:String(p.name||'').toLocaleUpperCase('it-IT'),
    cognome:String(p.surname||'').toLocaleUpperCase('it-IT'),
    telefono:p.phone||'',
    email:p.email||'',
    comune:p.town||'',
    come_lo_conosco:'',
    tipo_rapporto:p.category?[p.category]:[],
    ultima_interazione:p.lastContact?(p.lastContact+'T12:00:00Z'):null,
    stato_contatto:p.stage||'Nome',
    potenziale_relazionale:'',
    azione_successiva:p.nextContact?('Ricontatto '+p.nextContact):'',
    note:p.notes||'',
    tree_source:p.source||'',
    data_primo_contatto:p.firstContact||null,
    data_prossimo_contatto:p.nextContact||null,
    centro_influenza:!!p.influence,
    contact_dates:Array.isArray(p.contactDates)?p.contactDates:[],
    tree_meta:{
      category:p.category||'',source:p.source||'',stage:p.stage||'Nome',
      lifeTriggerStatus:p.lifeTriggerStatus||{},lifeTriggerNews:p.lifeTriggerNews||{},
      periodContexts:p.periodContexts||[],places:p.places||[],memories:p.memories||[],schools:p.schools||[],companies:p.companies||[],contextTags:p.contextTags||[],
      createdAt:p.createdAt||stamp,updatedAt:stamp
    },
    updated_at:stamp,
    deleted:false
  };
}
function allTouchpointsFor(p){
  const out=new Map();
  try{buildTouchpointsForPerson(p).forEach(tp=>out.set(tp.id,tp))}catch(_){}
  const hist=p.touchpointHistory||{};
  Object.keys(hist).forEach(key=>{
    if(out.has(key))return;
    const m=String(key).match(/^(\d{4})-(\d{1,2})$/);if(!m)return;
    const year=Number(m[1]),idx=Number(m[2]);if(idx<1||idx>20||!p.firstContact)return;
    const first=new Date(p.firstContact+'T12:00:00');if(Number.isNaN(first.getTime()))return;
    first.setFullYear(year);
    const d=new Date(first);d.setDate(d.getDate()+Math.round((365/20)*idx));
    const def=TOUCHPOINTS[idx-1]||{};
    out.set(key,{...def,index:idx,id:key,date:localDate(d),done:!!hist[key].done,sentAt:hist[key].sentAt||'',socialSearches:hist[key].socialSearches||{}});
  });
  return [...out.values()];
}
function buildTriggerRows(p,contactId){
  const active=new Set(p.lifeTriggers||[]);
  const all=new Set(active);
  (p.lifeTriggerHistory||[]).forEach(h=>h&&h.id&&all.add(h.id));
  return [...all].map(id=>{
    const def=triggerDef(id)||{label:id};
    const history=(p.lifeTriggerHistory||[]).filter(h=>h&&h.id===id);
    const last=history[history.length-1];
    const status=(p.lifeTriggerStatus&&p.lifeTriggerStatus[id])||(active.has(id)?'RILEVATO':'ARCHIVIATO');
    return {
      user_id:user.id,contact_id:contactId,trigger_type:id,trigger_label:def.label||id,
      data_rilevazione:(last&&last.date)?(String(last.date).slice(0,10)+'T12:00:00Z'):nowIso(),
      note:'',status,active:active.has(id),history:history,
      news_id:(p.lifeTriggerNews&&p.lifeTriggerNews[id])||null
    };
  });
}
function buildTouchRows(p,contactId){
  const today=localDate(new Date());
  return allTouchpointsFor(p).map(tp=>{
    const h=(p.touchpointHistory||{})[tp.id]||{};
    const cycle=Number(String(tp.id).split('-')[0])||new Date().getFullYear();
    return {
      user_id:user.id,contact_id:contactId,touchpoint_key:tp.id,cycle_year:cycle,numero_touchpoint:tp.index,
      data_prevista:tp.date,data_effettiva:h.done?(safeIso(h.sentAt)||nowIso()):null,
      titolo:tp.title||'',categoria:tp.cat||'',contenuto:tp.desc||'',fonte:tp.source||'',url_fonte:tp.url||'',
      stato:h.done?'INVIATO':(tp.date<=today?'IN_SCADENZA':'DA_FARE'),canale:'',pdf_url:'',social_searches:h.socialSearches||{}
    };
  });
}
function buildSocialRows(p,contactId){
  const rows=[];
  Object.entries(p.socialSearchHistory||{}).forEach(([platform,ts])=>{
    if(!ts)return;
    rows.push({user_id:user.id,contact_id:contactId,touchpoint_key:'',platform,query:socialQuery(p,platform),data_ricerca:ts,eseguita_da:user.id});
  });
  Object.entries(p.touchpointHistory||{}).forEach(([key,h])=>{
    Object.entries((h&&h.socialSearches)||{}).forEach(([platform,ts])=>{
      if(!ts)return;
      rows.push({user_id:user.id,contact_id:contactId,touchpoint_key:key,platform,query:socialQuery(p,platform),data_ricerca:ts,eseguita_da:user.id});
    });
  });
  return rows;
}
async function pushSettings(){
  const settings=db.settings||{};
  await upsert('f1_tree_settings','owner_id',[{
    owner_id:user.id,daily_target:Number(db.dailyTarget||40),automation_webhook:settings.automationWebhook||'',data_version:Number(db.dataVersion||1),graph_meta:{dataVersion:Number(db.dataVersion||1),relations:db.relations||[],places:db.places||[],memories:db.memories||[],automationLog:(db.automationLog||[]).slice(0,60),mnemonic:db.mnemonic||{}}
  }]);
  const profilePatch={};
  if(settings.officialName){Object.assign(profilePatch,splitOfficialName(settings.officialName))}
  if(settings.officialPhone)profilePatch.phone=settings.officialPhone;
  if(settings.officialEmail)profilePatch.company_email=settings.officialEmail;
  if(Object.keys(profilePatch).length){
    try{await patchRows('f1_staff_profiles','user_id=eq.'+encodeURIComponent(user.id),profilePatch)}catch(_){}
  }
}
async function processDeleteQueue(){
  const queue=readJson(DELETE_QUEUE,[]);
  if(!Array.isArray(queue)||!queue.length)return;
  if(queue.includes('*')){
    await rpc('f1_tree_reset_v1',{});
    writeJson(DELETE_QUEUE,[]);return;
  }
  for(const legacy of [...new Set(queue)]){
    await rpc('f1_tree_delete_branch_v1',{p_legacy_id:legacy});
  }
  writeJson(DELETE_QUEUE,[]);
}
async function pushSnapshot(){
  if(suspendPush||pushing||!booted)return;
  pushing=true;setState('syncing','● SINCRONIZZAZIONE...');
  try{
    await authContext();
    await processDeleteQueue();
    const remote=await fetchOwn('network_contacts','app_scope=eq.'+encodeURIComponent(SCOPE)+'&deleted=eq.false');
    const remoteByLegacy=new Map(remote.map(r=>[r.legacy_id,r]));
    const localPeople=(db.people||[]).filter(p=>p.id!=='root');
    let localChangedFromCloud=false;
    localPeople.forEach(p=>{
      const r=remoteByLegacy.get(p.id);
      if(r&&newer(r.updated_at,personStamp(p))){
        const idMap=new Map(remote.map(x=>[x.contact_id,x.legacy_id]));
        const cp=cloudContactToLocal(r,idMap,[],[],[]);
        Object.assign(p,{...p,...cp,touchpointHistory:p.touchpointHistory||{},socialSearchHistory:p.socialSearchHistory||{},lifeTriggers:p.lifeTriggers||[],lifeTriggerHistory:p.lifeTriggerHistory||[],lifeTriggerStatus:p.lifeTriggerStatus||{},lifeTriggerNews:p.lifeTriggerNews||{},periodContexts:cp.periodContexts||p.periodContexts||[],places:cp.places||p.places||[],memories:cp.memories||p.memories||[],schools:cp.schools||p.schools||[],companies:cp.companies||p.companies||[],contextTags:cp.contextTags||p.contextTags||[]});
        localChangedFromCloud=true;
      }
    });
    if(localChangedFromCloud){saveCache();try{renderAll()}catch(_){}}
    const firstPass=localPeople.filter(p=>{
      const r=remoteByLegacy.get(p.id);
      return !r||newer(personStamp(p),r.updated_at);
    }).map(p=>contactPayload(p,null));
    if(firstPass.length)await upsert('network_contacts','user_id,app_scope,legacy_id',firstPass);
    const after=await fetchOwn('network_contacts','app_scope=eq.'+encodeURIComponent(SCOPE)+'&deleted=eq.false');
    contactMap=new Map(after.map(r=>[r.legacy_id,r.contact_id]));
    const secondPass=localPeople.map(p=>contactPayload(p,p.parentId&&p.parentId!=='root'?contactMap.get(p.parentId)||null:null));
    if(secondPass.length)await upsert('network_contacts','user_id,app_scope,legacy_id',secondPass);
    contactMap=new Map((await fetchOwn('network_contacts','app_scope=eq.'+encodeURIComponent(SCOPE)+'&deleted=eq.false')).map(r=>[r.legacy_id,r.contact_id]));
    const triggerRows=[],touchRows=[],socialRows=[];
    localPeople.forEach(p=>{
      const cid=contactMap.get(p.id);if(!cid)return;
      triggerRows.push(...buildTriggerRows(p,cid));
      touchRows.push(...buildTouchRows(p,cid));
      socialRows.push(...buildSocialRows(p,cid));
    });
    if(triggerRows.length)await upsert('f1_network_life_triggers','user_id,contact_id,trigger_type',triggerRows);
    if(touchRows.length)await upsert('f1_network_touchpoints','user_id,contact_id,touchpoint_key',touchRows);
    if(socialRows.length)await upsert('f1_network_social_searches','user_id,contact_id,touchpoint_key,platform',socialRows);
    await pushSettings();
    localStorage.setItem(MIGRATION_FLAG,'true');
    await processNewsQueue();
    setState('ok','● CLOUD OK');
  }catch(err){
    console.error('F1 tree cloud push',err);
    setState('offline','● OFFLINE — DATI SALVATI LOCALMENTE');
  }finally{pushing=false}
}
function schedulePush(){
  if(suspendPush||!booted)return;
  clearTimeout(pushTimer);
  pushTimer=setTimeout(pushSnapshot,700);
}
async function pullAndMerge(){
  if(!booted)return;
  try{
    setState('syncing','● SINCRONIZZAZIONE...');
    await authContext();
    const bundle=await pullBundle();
    suspendPush=true;
    mergeCloudIntoLocal(bundle);
    suspendPush=false;
    setState('ok','● CLOUD OK');
  }catch(err){
    suspendPush=false;
    if(err&&err.code==='AUTH_REQUIRED')location.replace(LOGIN_URL);
    else setState('offline','● OFFLINE — DATI SALVATI LOCALMENTE');
  }
}
function queueDeleteLegacyIds(ids){
  const q=readJson(DELETE_QUEUE,[]);
  writeJson(DELETE_QUEUE,[...new Set([...(Array.isArray(q)?q:[]),...(ids||[])])]);
  schedulePush();
}
function queueReset(){
  writeJson(DELETE_QUEUE,['*']);
  schedulePush();
}
function queueNewsConversion(legacyId,triggerType){
  const q=readJson(NEWS_QUEUE,[]);
  q.push({legacyId,triggerType,queuedAt:nowIso()});
  writeJson(NEWS_QUEUE,q);
}
async function processNewsQueue(){
  const q=readJson(NEWS_QUEUE,[]);
  if(!Array.isArray(q)||!q.length)return;
  const remaining=[];
  for(const item of q){
    try{await convertTriggerToNews(item.legacyId,item.triggerType,true)}catch(_){remaining.push(item)}
  }
  writeJson(NEWS_QUEUE,remaining);
}
async function convertTriggerToNews(legacyId,triggerType,fromQueue){
  const p=(db.people||[]).find(x=>x.id===legacyId);
  if(!p)throw new Error('Contatto non trovato');
  if(!navigator.onLine){
    if(!fromQueue)queueNewsConversion(legacyId,triggerType);
    p.lifeTriggerStatus=p.lifeTriggerStatus||{};p.lifeTriggerStatus[triggerType]='VERIFICATO';touchLocal(p);saveCache();
    try{renderLifeTriggerPanel(p);renderAll()}catch(_){}
    if(!fromQueue&&typeof toast==='function')toast('Offline: conversione accodata, verrà sincronizzata appena torni online');
    return null;
  }
  await authContext();
  if(!contactMap.get(legacyId))await pushSnapshot();
  const out=await rpc('f1_tree_convert_trigger_news_v1',{p_legacy_id:legacyId,p_trigger_type:triggerType});
  const newsId=out&&out.news_id?out.news_id:null;
  p.lifeTriggerStatus=p.lifeTriggerStatus||{};p.lifeTriggerStatus[triggerType]='TRASFORMATO_IN_NOTIZIA';
  p.lifeTriggerNews=p.lifeTriggerNews||{};if(newsId)p.lifeTriggerNews[triggerType]=newsId;
  const si=typeof STAGES!=='undefined'?STAGES.indexOf(p.stage):-1;
  if(si>=0&&si<STAGES.indexOf('Notizia'))p.stage='Notizia';
  touchLocal(p);saveCache();try{renderAll();openPerson(p.id)}catch(_){}
  if(!fromQueue&&typeof toast==='function')toast('Trigger trasformato in notizia e salvato nel CRM cloud');
  return out;
}
async function boot(){
  if(booted)return;
  setState('syncing','● SINCRONIZZAZIONE...');
  try{
    if(!window.F1Sync||!F1Sync.configured||!F1Sync.configured()){setState('offline','● CLOUD NON CONFIGURATO');return}
    const s=F1Sync.session&&F1Sync.session();
    if(!s){location.replace(LOGIN_URL);return}
    try{await authContext()}catch(err){
      if(isNetworkError(err)){setState('offline','● OFFLINE — DATI SALVATI LOCALMENTE');booted=true;return}
      throw err;
    }
    booted=true;
    const bundle=await pullBundle();
    suspendPush=true;
    mergeCloudIntoLocal(bundle);
    suspendPush=false;
    await pushSnapshot();
    localStorage.setItem(MIGRATION_FLAG,'true');
    setState('ok','● CLOUD OK');
    window.addEventListener('online',()=>{setState('syncing','● SINCRONIZZAZIONE...');pushSnapshot().then(pullAndMerge)});
    window.addEventListener('offline',()=>setState('offline','● OFFLINE — DATI SALVATI LOCALMENTE'));
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&navigator.onLine)pullAndMerge()});
  }catch(err){
    console.error('F1 tree cloud boot',err);
    if(err&&err.code==='AUTH_REQUIRED')location.replace(LOGIN_URL);
    else{booted=true;setState('offline','● OFFLINE — DATI SALVATI LOCALMENTE')}
  }
}
window.F1TreeCloud={
  boot,schedulePush,pushNow:pushSnapshot,pullNow:pullAndMerge,
  queueDeleteLegacyIds,queueReset,convertTriggerToNews,touchLocal
};
})();