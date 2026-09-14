(function(){
'use strict';
const CFG=()=>window.F1_SUPABASE||{};
function ready(){return !!(window.F1Sync?.ready?.()&&CFG().url&&CFG().anonKey)}
function requireCloud(){if(!ready())throw new Error('ACCESSO CLOUD RICHIESTO')}
async function headers(prefer='return=representation'){requireCloud();return{apikey:CFG().anonKey,Authorization:'Bearer '+await F1Sync.authToken(),'Content-Type':'application/json',Prefer:prefer}}
async function rest(path,opt={}){const r=await fetch(CFG().url.replace(/\/$/,'')+'/rest/v1/'+path,{...opt,headers:{...(await headers(opt.prefer)),...(opt.headers||{})}});const tx=await r.text();let body=null;try{body=tx?JSON.parse(tx):null}catch(_){body=tx}if(r.status===401){F1Sync.clearSession();throw new Error('ACCESSO CRM RICHIESTO')}if(!r.ok)throw new Error(typeof body==='string'?body:(body?.message||body?.hint||('Supabase '+r.status)));return body}
async function rpc(name,payload={}){return rest('rpc/'+encodeURIComponent(name),{method:'POST',body:JSON.stringify(payload),prefer:'return=representation'})}
async function me(){const rows=await rpc('f1_staff_me');if(!rows?.[0])throw new Error('PROFILO F1 NON AUTORIZZATO');return rows[0]}
async function setting(key){const r=await rest('f1_system_settings?setting_key=eq.'+encodeURIComponent(key)+'&select=setting_key,setting_value&limit=1');return r?.[0]?.setting_value||null}
async function acknowledgement(version,userId){const r=await rest('f1_staff_acknowledgements?user_id=eq.'+encodeURIComponent(userId)+'&policy_version=eq.'+encodeURIComponent(version)+'&select=*&limit=1');return r?.[0]||null}
async function acceptPolicy(version,userId){const r=await rest('f1_staff_acknowledgements',{method:'POST',body:JSON.stringify([{user_id:userId,policy_version:version,accepted:true}]),prefer:'return=representation'});return r?.[0]||null}
async function tasks(userId){return rest('tasks?user_id=eq.'+encodeURIComponent(userId)+'&select=*&order=priority.desc,due_date.asc&limit=200')}
async function interactions(userId,limit=200){return rest('interactions?user_id=eq.'+encodeURIComponent(userId)+'&select=*&order=occurred_at.desc&limit='+Number(limit||200))}
async function ownLeads(userId,limit=300){return rest('leads?created_by_user_id=eq.'+encodeURIComponent(userId)+'&deleted=eq.false&select=*&order=updated_at.desc&limit='+Number(limit||300))}
async function createOrLinkLead(payload){return rpc('f1_create_or_link_lead',{p_payload:payload})}
async function news(userId,limit=100){return rest('f1_real_estate_news?user_id=eq.'+encodeURIComponent(userId)+'&select=*&order=updated_at.desc&limit='+Number(limit||100))}
async function addNews(userId,payload){
  if(!userId)throw new Error('UTENTE NOTIZIA MANCANTE');
  if(!payload||typeof payload!=='object')throw new Error('RECORD NOTIZIA MANCANTE');
  const clean=v=>String(v??'').trim();
  const level=clean(payload.level||'N0').toUpperCase();
  if(!/^N[0-6]$/.test(level))throw new Error('LIVELLO NOTIZIA NON VALIDO');
  const required=[['title','TITOLO'],['comune','COMUNE'],['detail','INFORMAZIONE CONCRETA'],['justification','GIUSTIFICAZIONE']];
  for(const [key,label] of required)if(!clean(payload[key]))throw new Error('CAMPO NOTIZIA OBBLIGATORIO MANCANTE: '+label);
  const row={user_id:userId,level,title:clean(payload.title),detail:clean(payload.detail),source:clean(payload.source),source_reference:clean(payload.source_reference),regione:clean(payload.regione)||'Piemonte',provincia:clean(payload.provincia)||'TO',comune:clean(payload.comune),zona:clean(payload.zona),quartiere:clean(payload.quartiere),via:clean(payload.via),microzona:clean(payload.microzona),justification:clean(payload.justification),usable:!!payload.usable,status:clean(payload.status)||'ACTIVE',lead_id:clean(payload.lead_id),property_id:clean(payload.property_id),updated_at:new Date().toISOString()};
  const r=await rest('f1_real_estate_news',{method:'POST',body:JSON.stringify([row]),prefer:'return=representation'});
  const saved=Array.isArray(r)?r[0]:null;
  if(!saved?.news_id)throw new Error('SALVATAGGIO NOTIZIA NON CONFERMATO');
  if(String(saved.user_id||'')!==String(userId))throw new Error('SALVATAGGIO NOTIZIA NON COERENTE CON UTENTE');
  return saved;
}
async function quality(userId,limit=30){return rest('f1_quality_snapshots?user_id=eq.'+encodeURIComponent(userId)+'&select=*&order=report_date.desc&limit='+Number(limit||30))}
async function reports(userId,limit=30){return rest('f1_daily_reports?user_id=eq.'+encodeURIComponent(userId)+'&select=*&order=report_date.desc&limit='+Number(limit||30))}
async function duplicateEvents(userId,limit=50){return rest('f1_duplicate_events?user_id=eq.'+encodeURIComponent(userId)+'&select=*&order=created_at.desc&limit='+Number(limit||50))}
async function team(){return rest('f1_staff_profiles?select=*&order=role.asc,last_name.asc,first_name.asc')}
async function teamQuality(){return rest('f1_quality_snapshots?select=*&order=report_date.desc,quality_score.desc&limit=500')}
async function teamReports(){return rest('f1_daily_reports?select=*&order=report_date.desc&limit=500')}
async function alerts(){return rest('f1_alerts?select=*&order=created_at.desc&limit=200')}
async function backups(){return rest('f1_backup_runs?select=*&order=backup_date.desc&limit=100')}
async function audit(limit=300){return rest('f1_audit_log?select=*&order=created_at.desc&limit='+Number(limit||300))}
async function restoreRequests(){return rest('f1_restore_requests?select=*&order=created_at.desc&limit=100')}
async function requestRestore(userId,payload){const r=await rest('f1_restore_requests',{method:'POST',body:JSON.stringify([{user_id:userId,restore_scope:payload.restore_scope||'PERSONAL_RECORD',table_name:payload.table_name||'',record_key:payload.record_key||'',audit_id:payload.audit_id||null,backup_run_id:payload.backup_run_id||null,reason:payload.reason||'',metadata:payload.metadata||{}}]),prefer:'return=representation'});return r?.[0]||null}
async function staffAdmin(payload){requireCloud();const r=await fetch(CFG().url.replace(/\/$/,'')+'/functions/v1/f1-staff-admin',{method:'POST',headers:{apikey:CFG().anonKey,Authorization:'Bearer '+await F1Sync.authToken(),'Content-Type':'application/json'},body:JSON.stringify(payload)});const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw new Error(j.message||j.error||('Staff admin '+r.status));return j}
function todayRome(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
window.F1StaffData={ready,requireCloud,rest,rpc,me,setting,acknowledgement,acceptPolicy,tasks,interactions,ownLeads,createOrLinkLead,news,addNews,quality,reports,duplicateEvents,team,teamQuality,teamReports,alerts,backups,audit,restoreRequests,requestRestore,staffAdmin,todayRome};
})();