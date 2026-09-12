(function(){
'use strict';

const Core=()=>window.F1AcquisitionCore;
const CFG=()=>window.F1_SUPABASE||{};

function cloudReady(){
  return !!(window.F1Sync&&window.F1Sync.ready&&window.F1Sync.ready()&&CFG().url&&CFG().anonKey);
}

async function headers(prefer='return=representation'){
  if(!cloudReady())throw new Error('Supabase Acquisition non autenticato');
  return {
    apikey:CFG().anonKey,
    Authorization:'Bearer '+await window.F1Sync.authToken(),
    'Content-Type':'application/json',
    Prefer:prefer
  };
}

async function rest(path,opt={}){
  const url=CFG().url.replace(/\/$/,'')+'/rest/v1/'+path;
  const res=await fetch(url,{...opt,headers:{...(await headers(opt.prefer)),...(opt.headers||{})}});
  if(!res.ok)throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const text=await res.text();
  return text?JSON.parse(text):null;
}

function normalizeTask(row){
  row=row||{};
  const meta=row.metadata&&typeof row.metadata==='object'?row.metadata:{};
  return {
    ...meta,
    ...row,
    task_id:row.task_id||row.id||'',
    lead_id:row.lead_id||'',
    property_id:row.property_id||'',
    event_id:row.event_id||'',
    pillar:Number(row.pillar)||1,
    task_type:row.task_type||'REVIEW',
    reason:row.reason||'',
    priority:Number(row.priority)||0,
    due_date:row.due_date||'',
    assigned_to:row.assigned_to||'',
    status:row.status||'OPEN',
    created_at:row.created_at||new Date().toISOString(),
    completed_at:row.completed_at||'',
    outcome:row.outcome||'',
    metadata:meta,
    updated_at:row.updated_at||row.created_at||new Date().toISOString()
  };
}

function taskCloudRow(task){
  const row=normalizeTask(task);
  const metadata={...(row.metadata||{})};
  for(const key of ['source','source_url','comune','via','civico','zona','lead_reason','confidence','core_category','seller_signal','is_new','territory_hub']){
    if(row[key]!==undefined&&row[key]!==null&&row[key]!=='')metadata[key]=row[key];
  }
  return {
    task_id:row.task_id||crypto.randomUUID(),lead_id:row.lead_id||'',property_id:row.property_id||'',
    event_id:row.event_id||null,pillar:Number(row.pillar)||1,task_type:row.task_type||'REVIEW',reason:row.reason||'',
    priority:Number(row.priority)||0,due_date:row.due_date||null,assigned_to:row.assigned_to||'',status:row.status||'OPEN',
    created_at:row.created_at||new Date().toISOString(),completed_at:row.completed_at||null,outcome:row.outcome||'',
    metadata,updated_at:row.updated_at||new Date().toISOString()
  };
}

function normalizeLead(row){
  row=row||{};
  return {
    ...row,
    lead_id:row.lead_id||row.id||'', pillar:Number(row.pillar)||1,
    source_type:row.source_type||'',source:row.source||'',source_url:row.source_url||'',
    created_at:row.created_at||'',first_seen:row.first_seen||'',last_seen:row.last_seen||'',
    nome:row.nome||'',cognome:row.cognome||'',azienda:row.azienda||'',telefono:row.telefono||'',email:row.email||'',
    comune:row.comune||'',via:row.via||'',civico:row.civico||'',zona:row.zona||'',
    immobile_id:row.immobile_id||'',competitor_agency:row.competitor_agency||'',lead_reason:row.lead_reason||'',
    lead_score:Number(row.lead_score)||0,confidence:row.confidence||'LOW',status:row.status||'DA_ANALIZZARE',
    last_contact:row.last_contact||'',next_action:row.next_action||'',next_action_date:row.next_action_date||'',
    assigned_to:row.assigned_to||'',notes:row.notes||'',privacy_basis:row.privacy_basis||'',
    do_not_contact:!!row.do_not_contact,rpo_status:row.rpo_status||'DA_VERIFICARE',updated_at:row.updated_at||row.created_at||''
  };
}

function leadCloudRow(lead){
  const r=normalizeLead(lead);
  return {
    lead_id:r.lead_id||crypto.randomUUID(),pillar:r.pillar,source_type:r.source_type,source:r.source,source_url:r.source_url,
    created_at:r.created_at||new Date().toISOString(),first_seen:r.first_seen||null,last_seen:r.last_seen||null,
    nome:r.nome,cognome:r.cognome,azienda:r.azienda,telefono:r.telefono,email:r.email,comune:r.comune,via:r.via,civico:r.civico,zona:r.zona,
    immobile_id:r.immobile_id,competitor_agency:r.competitor_agency,lead_reason:r.lead_reason,lead_score:r.lead_score,confidence:r.confidence,
    status:r.status,last_contact:r.last_contact||null,next_action:r.next_action,next_action_date:r.next_action_date||null,assigned_to:r.assigned_to,
    notes:r.notes,privacy_basis:r.privacy_basis,do_not_contact:r.do_not_contact,rpo_status:r.rpo_status,created_by:r.created_by||'',
    updated_at:r.updated_at||new Date().toISOString(),deleted:!!r.deleted
  };
}

async function pullTasks(){
  if(!cloudReady())return Core().localTasks();
  const rows=await rest('tasks?select=*&order=priority.desc,due_date.asc');
  const merged=Core().mergeTasks(Core().localTasks(),(rows||[]).map(normalizeTask));
  Core().saveLocalTasks(merged);
  return merged;
}

async function upsertTask(task){
  const row=normalizeTask({...task,task_id:task.task_id||crypto.randomUUID(),updated_at:new Date().toISOString()});
  const local=Core().mergeTasks(Core().localTasks(),[row]);
  Core().saveLocalTasks(local);
  if(cloudReady()) await rest('tasks?on_conflict=task_id',{method:'POST',body:JSON.stringify([taskCloudRow(row)]),prefer:'resolution=merge-duplicates,return=representation'});
  return row;
}

async function setTaskStatus(taskId,status,outcome=''){
  const now=new Date().toISOString();
  const rows=Core().localTasks().map(t=>String(t.task_id)===String(taskId)?{...t,status,outcome:outcome||t.outcome||'',completed_at:status==='DONE'?now:t.completed_at||'',updated_at:now}:t);
  Core().saveLocalTasks(rows);
  if(cloudReady()) await rest('tasks?task_id=eq.'+encodeURIComponent(taskId),{method:'PATCH',body:JSON.stringify({status,outcome,completed_at:status==='DONE'?now:null,updated_at:now})});
  return rows.find(t=>String(t.task_id)===String(taskId));
}

async function pullLeads(){
  if(!cloudReady())return Core().localLeads();
  const rows=await rest('leads?deleted=eq.false&select=*&order=lead_score.desc,updated_at.desc');
  const map=new Map();
  [...Core().localLeads(),...(rows||[]).map(normalizeLead)].forEach(l=>{
    const key=String(l.lead_id||''); if(!key)return;
    const old=map.get(key); if(!old||String(l.updated_at||'')>=String(old.updated_at||''))map.set(key,l);
  });
  const merged=[...map.values()];
  Core().saveLocalLeads(merged);
  return merged;
}

async function upsertLead(lead){
  const row=normalizeLead({...lead,lead_id:lead.lead_id||crypto.randomUUID(),updated_at:new Date().toISOString()});
  const map=new Map(Core().localLeads().map(x=>[String(x.lead_id),x]));map.set(String(row.lead_id),row);
  Core().saveLocalLeads([...map.values()]);
  if(cloudReady())await rest('leads?on_conflict=lead_id',{method:'POST',body:JSON.stringify([leadCloudRow(row)]),prefer:'resolution=merge-duplicates,return=representation'});
  return row;
}

async function loadDashboardData(){
  const [cfg,feed,tasks,leads]=await Promise.all([
    Core().loadConfig(),Core().loadPublicFeed(),pullTasks().catch(()=>Core().localTasks()),pullLeads().catch(()=>Core().localLeads())
  ]);
  const publicTasks=(feed.tasks||[]).map(normalizeTask);
  const mergedTasks=Core().mergeTasks(publicTasks,tasks);
  return {cfg,feed,tasks:mergedTasks,leads,cloud:cloudReady()};
}

window.F1AcquisitionData={cloudReady,rest,pullTasks,upsertTask,setTaskStatus,pullLeads,upsertLead,loadDashboardData,normalizeTask,normalizeLead,taskCloudRow,leadCloudRow};
})();
