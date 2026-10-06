(function(){
'use strict';

if(!window.__TAURI__?.sql || !window.__TAURI__?.core?.invoke) return;

const CloudData=window.F1AcquisitionData;
const Database=window.__TAURI__.sql;
const invoke=window.__TAURI__.core.invoke;
const Core=()=>window.F1AcquisitionCore;
const DB_URL='sqlite:f1-crm.sqlite';
let dbPromise=null;

window.F1_DESKTOP=true;

function jparse(v,fallback={}){try{return v?JSON.parse(v):fallback}catch(_){return fallback}}
function iso(){return new Date().toISOString()}
function today(){return Core()?.todayRome?.()||new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date())}
function clean(v){return String(v??'').trim()}
function bool(v){return v===true||v===1||v==='1'}
function sqlJson(v){try{return JSON.stringify(v&&typeof v==='object'?v:{})}catch(_){return'{}'}}

async function db(){
  if(!dbPromise){
    dbPromise=Database.load(DB_URL).then(async d=>{
      await d.execute('PRAGMA foreign_keys=ON');
      await d.execute('PRAGMA journal_mode=WAL');
      await d.execute('PRAGMA synchronous=NORMAL');
      return d;
    });
  }
  return dbPromise;
}

async function close(){
  if(!dbPromise)return true;
  const d=await dbPromise;
  try{await d.close()}catch(_){}
  dbPromise=null;
  return true;
}

function normalizeLead(row){
  row=row||{};
  return{
    ...row,
    lead_id:row.id||row.lead_id||'',
    pillar:Number(row.pillar)||1,
    source_type:row.tipo_contatto||row.source_type||'',
    source:row.fonte||row.source||'',
    source_url:row.source_url||'',
    created_at:row.created_at||'',
    first_seen:row.created_at||row.first_seen||'',
    last_seen:row.updated_at||row.last_seen||'',
    nome:row.nome||'',
    cognome:row.cognome||'',
    azienda:row.azienda||'',
    telefono:row.telefono||'',
    email:row.email||'',
    comune:row.comune||'',
    via:row.indirizzo||row.via||'',
    civico:row.civico||'',
    zona:[row.indirizzo||row.via||'',row.civico||''].filter(Boolean).join(' '),
    immobile_id:row.immobile_id||'',
    competitor_agency:row.competitor_agency||'',
    lead_reason:row.lead_reason||'',
    lead_score:Number(row.lead_score)||0,
    confidence:row.confidence||'LOW',
    status:row.stato||row.status||'DA_ANALIZZARE',
    last_contact:row.last_contact||'',
    next_action:row.prossima_azione||row.next_action||'',
    next_action_date:row.data_prossima_azione||row.next_action_date||'',
    assigned_to:row.assigned_to||'',
    notes:row.notes_summary??row.notes??'',
    privacy_basis:row.privacy_basis||'',
    do_not_contact:bool(row.do_not_contact),
    rpo_status:row.rpo_status||'DA_VERIFICARE',
    market_data:typeof row.market_data==='string'?jparse(row.market_data,{}):(row.market_data||{}),
    created_by:row.created_by||'',
    updated_at:row.updated_at||row.created_at||'',
    deleted:!!row.deleted_at||!!row.deleted,
    interaction_count:Number(row.interaction_count)||0
  };
}

function normalizeInteraction(row){
  row=row||{};
  return{
    ...row,
    interaction_id:row.id||row.interaction_id||'',
    lead_id:row.contact_id||row.lead_id||'',
    property_id:row.property_id||'',
    task_id:row.task_id||'',
    interaction_type:row.tipo||row.interaction_type||'NOTE',
    direction:row.direction||'OUTBOUND',
    occurred_at:row.data_evento||row.occurred_at||row.created_at||iso(),
    outcome:row.outcome||'',
    note:row.contenuto??row.note??'',
    next_action:row.prossima_azione||row.next_action||'',
    next_action_date:row.data_prossima_azione||row.next_action_date||'',
    metadata:typeof row.metadata==='string'?jparse(row.metadata,{}):(row.metadata||{}),
    created_at:row.created_at||iso()
  };
}

function normalizeTask(row){
  row=row||{};
  return{
    ...row,
    task_id:row.id||row.task_id||'',
    lead_id:row.contact_id||row.lead_id||'',
    property_id:row.property_id||'',
    event_id:row.event_id||'',
    pillar:Number(row.pillar)||1,
    task_type:row.task_type||'REVIEW',
    reason:row.reason||'',
    priority:Number(row.priority)||0,
    due_date:row.due_date||'',
    assigned_to:row.assigned_to||'',
    status:row.status||'OPEN',
    created_at:row.created_at||iso(),
    completed_at:row.completed_at||'',
    outcome:row.outcome||'',
    metadata:typeof row.metadata==='string'?jparse(row.metadata,{}):(row.metadata||{}),
    updated_at:row.updated_at||row.created_at||iso()
  };
}

function leadValues(lead){
  const r=normalizeLead({...lead,id:lead.id||lead.lead_id||crypto.randomUUID()});
  return[
    r.lead_id,r.nome,r.cognome,r.azienda,r.telefono,r.email,r.comune,r.via,r.civico,
    r.source_type||'OTHER',r.status||'DA_ANALIZZARE',r.source||'',r.source_url||'',
    r.pillar,r.lead_score,r.confidence,r.lead_reason,r.immobile_id,r.competitor_agency,
    r.next_action,r.next_action_date||null,r.last_contact||null,r.assigned_to,r.privacy_basis,
    r.do_not_contact?1:0,r.rpo_status,sqlJson(r.market_data),r.notes||'',r.created_by,
    r.created_at||iso(),r.updated_at||iso(),r.deleted?iso():null
  ];
}

async function upsertLeadInternal(lead){
  const d=await db(),v=leadValues(lead);
  await d.execute(`INSERT INTO contacts(
    id,nome,cognome,azienda,telefono,email,comune,indirizzo,civico,tipo_contatto,stato,fonte,source_url,
    pillar,lead_score,confidence,lead_reason,immobile_id,competitor_agency,prossima_azione,data_prossima_azione,
    last_contact,assigned_to,privacy_basis,do_not_contact,rpo_status,market_data,notes_summary,created_by,
    created_at,updated_at,deleted_at
  ) VALUES(
    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
  ) ON CONFLICT(id) DO UPDATE SET
    nome=excluded.nome,cognome=excluded.cognome,azienda=excluded.azienda,telefono=excluded.telefono,email=excluded.email,
    comune=excluded.comune,indirizzo=excluded.indirizzo,civico=excluded.civico,tipo_contatto=excluded.tipo_contatto,
    stato=excluded.stato,fonte=excluded.fonte,source_url=excluded.source_url,pillar=excluded.pillar,lead_score=excluded.lead_score,
    confidence=excluded.confidence,lead_reason=excluded.lead_reason,immobile_id=excluded.immobile_id,
    competitor_agency=excluded.competitor_agency,prossima_azione=excluded.prossima_azione,
    data_prossima_azione=excluded.data_prossima_azione,last_contact=excluded.last_contact,assigned_to=excluded.assigned_to,
    privacy_basis=excluded.privacy_basis,do_not_contact=excluded.do_not_contact,rpo_status=excluded.rpo_status,
    market_data=excluded.market_data,notes_summary=excluded.notes_summary,created_by=excluded.created_by,
    updated_at=excluded.updated_at,deleted_at=excluded.deleted_at`,v);
  return pullLead(v[0],true);
}

async function pullLead(leadId,includeDeleted=false){
  const d=await db();
  const rows=await d.select('SELECT c.*,(SELECT COUNT(*) FROM notes n WHERE n.contact_id=c.id AND n.deleted_at IS NULL) interaction_count FROM contacts c WHERE c.id=$1 '+(includeDeleted?'':'AND c.deleted_at IS NULL ')+'LIMIT 1',[leadId]);
  return rows[0]?normalizeLead(rows[0]):null;
}

async function upsertLead(lead){return upsertLeadInternal({...lead,lead_id:lead.lead_id||crypto.randomUUID(),updated_at:iso()})}

async function updateLead(leadId,patch){
  const current=await pullLead(leadId,true);
  if(!current)throw new Error('CONTATTO NON TROVATO');
  return upsertLeadInternal({...current,...patch,lead_id:leadId,updated_at:iso(),deleted:patch.deleted===true?true:(patch.deleted===false?false:current.deleted)});
}

function filterSql(filter,params){
  if(filter==='CORE4')return " AND tipo_contatto IN ('PAST_CLIENT','COI','FSBO','EXPIRED_CANDIDATE','EXPIRED_VERIFIED')";
  if(filter==='DUE')return " AND EXISTS(SELECT 1 FROM tasks t WHERE t.contact_id=contacts.id AND t.status='OPEN' AND (t.due_date IS NULL OR substr(t.due_date,1,10)<=date('now','localtime')))";
  if(filter==='RPO')return " AND telefono<>'' AND rpo_status='DA_VERIFICARE'";
  if(filter==='MARKET_LISTING')return " AND tipo_contatto IN ('MARKET_LISTING','MARKET_SIGNAL','COMPETITOR_LISTING','FSBO_CANDIDATE','EXPIRED_CANDIDATE','EXPIRED_VERIFIED')";
  return'';
}

async function pullLeadPage({offset=0,limit=50,search='',status='',filter=''}={}){
  const d=await db(),params=[],where=['deleted_at IS NULL'];
  if(status){params.push(status);where.push('stato=$'+params.length)}
  if(search){
    params.push('%'+String(search).toLowerCase()+'%');
    const p='$'+params.length;
    where.push(`(lower(nome||' '||cognome||' '||azienda||' '||telefono||' '||email||' '||comune||' '||indirizzo||' '||civico||' '||tipo_contatto||' '||stato||' '||notes_summary) LIKE ${p} OR EXISTS(SELECT 1 FROM notes n WHERE n.contact_id=contacts.id AND n.deleted_at IS NULL AND lower(n.contenuto) LIKE ${p}))`);
  }
  let clause=' WHERE '+where.join(' AND ')+filterSql(filter,params);
  const count=(await d.select('SELECT COUNT(*) n FROM contacts'+clause,params))[0]?.n||0;
  params.push(Math.max(1,Math.min(100,Number(limit)||50)));const lp='$'+params.length;
  params.push(Math.max(0,Number(offset)||0));const op='$'+params.length;
  const rows=await d.select(`SELECT contacts.*,(SELECT COUNT(*) FROM notes n WHERE n.contact_id=contacts.id AND n.deleted_at IS NULL) interaction_count FROM contacts${clause} ORDER BY lead_score DESC,updated_at DESC LIMIT ${lp} OFFSET ${op}`,params);
  return{rows:rows.map(normalizeLead),offset:Number(offset)||0,limit:Number(limit)||50,filtered:Number(count)||0};
}

async function pullLeads(){
  const d=await db();
  return(await d.select("SELECT contacts.*,(SELECT COUNT(*) FROM notes n WHERE n.contact_id=contacts.id AND n.deleted_at IS NULL) interaction_count FROM contacts WHERE deleted_at IS NULL ORDER BY lead_score DESC,updated_at DESC LIMIT 5000")).map(normalizeLead);
}

async function pullKpis(){
  const d=await db(),r=(await d.select(`SELECT
    (SELECT COUNT(*) FROM contacts WHERE deleted_at IS NULL) leads,
    (SELECT COUNT(*) FROM contacts WHERE deleted_at IS NULL AND tipo_contatto IN ('PAST_CLIENT','COI','FSBO','EXPIRED_CANDIDATE','EXPIRED_VERIFIED')) core4,
    (SELECT COUNT(*) FROM tasks WHERE status='OPEN' AND (due_date IS NULL OR substr(due_date,1,10)<=date('now','localtime'))) tasks_due,
    (SELECT COUNT(*) FROM notes WHERE deleted_at IS NULL) interactions,
    (SELECT COUNT(*) FROM contacts WHERE deleted_at IS NULL AND stato IN ('INCARICO','ACQUISITO')) assignments,
    (SELECT COUNT(*) FROM contacts WHERE deleted_at IS NULL AND (do_not_contact=1 OR stato='NON_CONTATTARE')) do_not_contact`))[0]||{};
  return Object.fromEntries(Object.entries(r).map(([k,v])=>[k,Number(v)||0]));
}

async function pullTasks(){
  const d=await db();
  return(await d.select("SELECT * FROM tasks WHERE status NOT IN ('DONE','CANCELLED') ORDER BY priority DESC,due_date ASC LIMIT 3000")).map(normalizeTask);
}

async function pullVisibleTasks(leadIds=[]){
  const ids=[...new Set((leadIds||[]).map(String).filter(Boolean))];if(!ids.length)return[];
  const ps=ids.map((_,i)=>'$'+(i+1)).join(',');
  const d=await db();
  return(await d.select(`SELECT * FROM tasks WHERE contact_id IN (${ps}) AND status NOT IN ('DONE','CANCELLED') ORDER BY priority DESC,due_date ASC`,ids)).map(normalizeTask);
}

async function upsertTask(task){
  const d=await db(),r=normalizeTask({...task,task_id:task.task_id||crypto.randomUUID(),updated_at:iso()});
  const v=[r.task_id,r.lead_id,r.property_id,r.event_id,r.pillar,r.task_type,r.reason,r.priority,r.due_date||null,r.assigned_to,r.status,r.completed_at||null,r.outcome,sqlJson(r.metadata),r.created_at||iso(),r.updated_at||iso()];
  await d.execute(`INSERT INTO tasks(id,contact_id,property_id,event_id,pillar,task_type,reason,priority,due_date,assigned_to,status,completed_at,outcome,metadata,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    ON CONFLICT(id) DO UPDATE SET contact_id=excluded.contact_id,property_id=excluded.property_id,event_id=excluded.event_id,pillar=excluded.pillar,task_type=excluded.task_type,reason=excluded.reason,priority=excluded.priority,due_date=excluded.due_date,assigned_to=excluded.assigned_to,status=excluded.status,completed_at=excluded.completed_at,outcome=excluded.outcome,metadata=excluded.metadata,updated_at=excluded.updated_at`,v);
  return r;
}

async function setTaskStatus(taskId,status,outcome=''){
  const d=await db(),now=iso();
  await d.execute("UPDATE tasks SET status=$1,outcome=$2,completed_at=$3,updated_at=$4 WHERE id=$5",[status,outcome,status==='DONE'?now:null,now,taskId]);
  const rows=await d.select('SELECT * FROM tasks WHERE id=$1 LIMIT 1',[taskId]);
  return rows[0]?normalizeTask(rows[0]):normalizeTask({task_id:taskId,status,outcome,updated_at:now});
}

async function addInteraction(item){
  const d=await db(),r=normalizeInteraction({...item,interaction_id:item.interaction_id||crypto.randomUUID(),created_at:item.created_at||iso()});
  const v=[r.interaction_id,r.lead_id,r.property_id,r.task_id||null,r.interaction_type,r.direction,r.note,r.outcome,r.next_action,r.next_action_date||null,r.occurred_at,sqlJson(r.metadata),r.created_at,r.created_at,null];
  await d.execute(`INSERT INTO notes(id,contact_id,property_id,task_id,tipo,direction,contenuto,outcome,prossima_azione,data_prossima_azione,data_evento,metadata,created_at,updated_at,deleted_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    ON CONFLICT(id) DO UPDATE SET tipo=excluded.tipo,direction=excluded.direction,contenuto=excluded.contenuto,outcome=excluded.outcome,prossima_azione=excluded.prossima_azione,data_prossima_azione=excluded.data_prossima_azione,data_evento=excluded.data_evento,metadata=excluded.metadata,updated_at=excluded.updated_at,deleted_at=excluded.deleted_at`,v);
  return r;
}

async function pullInteractions(){
  const d=await db();
  return(await d.select("SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY data_evento DESC LIMIT 500")).map(normalizeInteraction);
}

async function pullInteractionsForLead(leadId,limit=100){
  const d=await db();
  return(await d.select("SELECT * FROM notes WHERE contact_id=$1 AND deleted_at IS NULL ORDER BY data_evento DESC LIMIT $2",[leadId,Math.max(1,Math.min(200,Number(limit)||100))])).map(normalizeInteraction);
}

async function recordOutcome({leadId='',propertyId='',taskId='',interactionType='NOTE',direction='OUTBOUND',outcome='',note='',status='',nextAction='',nextActionDate=''}){
  const now=iso();
  const interaction=await addInteraction({lead_id:leadId,property_id:propertyId,task_id:taskId,interaction_type:interactionType,direction,occurred_at:now,outcome,note,next_action:nextAction,next_action_date:nextActionDate||null});
  let lead=null,closedTask=null,followupTask=null;
  if(leadId){
    const patch={last_contact:now,next_action:nextAction,next_action_date:nextActionDate||null};
    if(status)patch.status=status;
    lead=await updateLead(leadId,patch);
  }
  if(taskId)closedTask=await setTaskStatus(taskId,'DONE',outcome);
  if(leadId&&nextActionDate){
    const existing=(await pullVisibleTasks([leadId])).find(t=>t.task_type==='FOLLOW_UP'&&String(t.due_date||'').slice(0,10)===String(nextActionDate).slice(0,10));
    if(!existing)followupTask=await upsertTask({lead_id:leadId,property_id:propertyId,pillar:lead?.pillar||1,task_type:'FOLLOW_UP',reason:nextAction||'Ricontatto programmato',priority:lead?.lead_score||50,due_date:nextActionDate,status:'OPEN',metadata:{origin:'CRM_DESKTOP'}});
  }
  return{interaction,lead,closedTask,followupTask};
}

async function ensureCore4DueTasks(leads,existingTasks=[]){
  const open=[...(existingTasks||[])].filter(t=>!['DONE','CANCELLED'].includes(String(t.status||'OPEN').toUpperCase())),created=[],td=today();
  for(const lead of leads||[]){
    const category=Core()?.coreCategory?.(lead)||'';
    const due=String(lead.next_action_date||'').slice(0,10);
    if(!['PAST_CLIENT','COI','FSBO','EXPIRED_OR_POSSIBLE_EXPIRED'].includes(category)||!due||due>td||lead.deleted||lead.do_not_contact)continue;
    if(open.some(t=>String(t.lead_id)===String(lead.lead_id)))continue;
    const eligible=Core()?.contactEligible?.(lead);
    const task=await upsertTask({lead_id:lead.lead_id,property_id:lead.immobile_id||'',pillar:Number(lead.pillar)||1,task_type:eligible?'CALL':'VERIFY',reason:`${category} · ${lead.next_action||'prossima azione dovuta'}`,priority:Number(lead.lead_score)||50,due_date:lead.next_action_date,status:'OPEN',metadata:{origin:'CORE4_DUE_DESKTOP'}});
    created.push(task);open.push(task);
  }
  return created;
}

async function dailySellerCalls(body){
  const target=Math.max(1,Math.min(200,Number(body?.p_target_count)||50)),d=await db(),td=today();
  const rows=await d.select(`SELECT t.*,c.nome,c.cognome,c.azienda,c.telefono,c.email,c.comune,c.indirizzo via,c.civico,c.stato lead_status,c.tipo_contatto source_type,c.source_url,c.notes_summary notes,c.rpo_status,c.do_not_contact,c.lead_score,
    c.immobile_id linked_property_id,'' linked_property_title,(c.indirizzo||' '||c.civico) linked_property_address
    FROM tasks t JOIN contacts c ON c.id=t.contact_id
    WHERE t.status='OPEN' AND t.task_type='CALL' AND c.deleted_at IS NULL AND (t.due_date IS NULL OR substr(t.due_date,1,10)<=$1)
    ORDER BY t.priority DESC,t.due_date ASC LIMIT $2`,[td,target]);
  const mapped=rows.map(r=>({...normalizeTask(r),...r,lead_id:r.contact_id||r.lead_id,task_id:r.id||r.task_id,via:r.via||'',status:r.status||'OPEN'}));
  const total=(await d.select("SELECT COUNT(*) n FROM tasks WHERE task_type='CALL' AND status='OPEN'"))[0]?.n||mapped.length;
  const done=(await d.select("SELECT COUNT(*) n FROM tasks WHERE task_type='CALL' AND status='DONE' AND substr(completed_at,1,10)=$1",[td]))[0]?.n||0;
  return{rows:mapped,total:Number(total)||0,done:Number(done)||0,remaining:Number(total)||0};
}

async function rest(path,opt={}){
  path=String(path||'');
  if(path.startsWith('rpc/f1_daily_seller_calls_v1'))return dailySellerCalls(jparse(opt.body||'{}',{}));
  const taskMatch=path.match(/^tasks\?task_id=eq\.([^&]+)/);
  if(taskMatch&&String(opt.method||'GET').toUpperCase()==='PATCH'){
    const patch=jparse(opt.body||'{}',{}),id=decodeURIComponent(taskMatch[1]),d=await db(),sets=[],vals=[];
    for(const key of ['status','outcome','completed_at','updated_at','assigned_to','reason','due_date']){
      if(Object.prototype.hasOwnProperty.call(patch,key)){vals.push(patch[key]);sets.push(key+'=$'+vals.length)}
    }
    if(sets.length){vals.push(id);await d.execute('UPDATE tasks SET '+sets.join(',')+' WHERE id=$'+vals.length,vals)}
    const rows=await d.select('SELECT * FROM tasks WHERE id=$1',[id]);
    return rows.map(normalizeTask);
  }
  throw new Error('Funzione online non disponibile in modalità desktop: '+path);
}

async function setting(key){
  const d=await db(),r=(await d.select('SELECT value FROM app_settings WHERE key=$1 LIMIT 1',[key]))[0];
  return r?.value||'';
}
async function setSetting(key,value){
  const d=await db();await d.execute("INSERT INTO app_settings(key,value,updated_at) VALUES($1,$2,$3) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",[key,String(value),iso()]);
}

function readArray(key){try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch(_){return[]}}

async function migrateLocalStorage(){
  if(await setting('local_storage_migration_v1'))return;
  const leadKeys=['f1AcquisitionLeadsV1','f1_territory_contacts_v1'];
  for(const key of leadKeys){
    for(const raw of readArray(key)){
      const lead=raw.lead_id||raw.id?raw:{...raw,lead_id:raw.id||crypto.randomUUID(),source_type:raw.source_type||'TERRITORY'};
      try{await upsertLeadInternal(lead)}catch(e){console.warn('F1 desktop local migration lead',key,e)}
    }
  }
  for(const raw of readArray('f1AcquisitionInteractionsV1')){
    try{
      if(raw.lead_id&&await pullLead(raw.lead_id,true))await addInteraction(raw);
    }catch(e){console.warn('F1 desktop local migration note',e)}
  }
  await setSetting('local_storage_migration_v1','done');
}

async function migrateTerritoryLocalStorage(){
  if(await setting('territory_local_storage_migration_v1'))return;
  for(const raw of readArray('f1TerritoryLocalPeopleV1')){
    const now=raw.updated_at||iso(),id=String(raw.id||'').replace(/^local_/,'')||crypto.randomUUID();
    const lead={
      lead_id:id,pillar:2,source_type:'TERRITORY',source:'RICERCA_TERRITORIALE_LOCALE',source_url:'',
      created_at:now,first_seen:now,last_seen:now,nome:raw.nome||'',cognome:raw.cognome||'',azienda:'',
      telefono:raw.telefono||'',email:raw.email||'',comune:raw.comune||'',via:raw.via||'',civico:raw.civico||'',
      zona:[raw.via||'',raw.civico||''].filter(Boolean).join(' '),immobile_id:'',competitor_agency:'',
      lead_reason:raw.relazione||'TERRITORY',lead_score:50,confidence:'MEDIUM',status:raw.stage||'DA_ANALIZZARE',
      last_contact:now,next_action:raw.next_action||'',next_action_date:raw.next_date||'',assigned_to:'desktop-local',
      notes:raw.story||raw.notes||'',privacy_basis:'TERRITORY_LOCAL_ENTRY',do_not_contact:false,rpo_status:'DA_VERIFICARE',
      market_data:{relazione:raw.relazione||'',fonte:raw.fonte||'',stage:raw.stage||'',abs:raw.abs||'',story:raw.story||'',followup:raw.followup||'',channel:raw.channel||'',notes:raw.notes||''},
      created_by:'territory_local_migration',updated_at:now,deleted:false
    };
    try{
      const saved=await upsertLeadInternal(lead);
      if(raw.story||raw.notes)await addInteraction({
        lead_id:saved.lead_id,interaction_type:'NOTE',direction:'INBOUND',occurred_at:now,
        outcome:'TERRITORY_LEGACY_MIGRATION',note:[raw.story,raw.notes].filter(Boolean).join(' · '),
        next_action:raw.next_action||'',next_action_date:raw.next_date||'',
        metadata:{origin:'f1TerritoryLocalPeopleV1'}
      });
    }catch(e){console.warn('F1 desktop territory local migration',e)}
  }
  await setSetting('territory_local_storage_migration_v1','done');
}

async function migrateCloudIfAvailable(){
  if(await setting('cloud_migration_v1'))return;
  if(!CloudData?.cloudReady?.())return;
  try{
    const [leads,tasks,notes]=await Promise.all([CloudData.pullLeads(),CloudData.pullTasks(),CloudData.pullInteractions()]);
    for(const x of leads||[])await upsertLeadInternal(x);
    for(const x of tasks||[])await upsertTask(x);
    for(const x of notes||[])if(x.lead_id&&await pullLead(x.lead_id,true))await addInteraction(x);
    await setSetting('cloud_migration_v1','done');
  }catch(e){
    console.warn('Migrazione Supabase rinviata; il desktop resta operativo offline.',e);
  }
}

async function pullDeletedLeads(){
  const d=await db();
  return(await d.select("SELECT contacts.*,(SELECT COUNT(*) FROM notes n WHERE n.contact_id=contacts.id AND n.deleted_at IS NULL) interaction_count FROM contacts WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")).map(normalizeLead);
}

async function deleteLead(leadId){
  const d=await db();
  await d.execute("UPDATE contacts SET deleted_at=$1,updated_at=$1 WHERE id=$2",[iso(),leadId]);
  return true;
}

async function restoreLead(leadId){
  const d=await db();
  await d.execute("UPDATE contacts SET deleted_at=NULL,updated_at=$1 WHERE id=$2",[iso(),leadId]);
  return pullLead(leadId,true);
}

async function purgeLead(leadId){
  const d=await db();
  await d.execute("DELETE FROM contacts WHERE id=$1",[leadId]);
  return true;
}

async function initialize(){
  await db();
  await migrateLocalStorage();
  await migrateTerritoryLocalStorage();
  await migrateCloudIfAvailable();
  try{await invoke('ensure_backup_task')}catch(_){}
  document.documentElement.dataset.f1Desktop='true';
  window.dispatchEvent(new CustomEvent('f1-desktop-ready'));
  return true;
}

async function loadDashboardData(){
  const cfg=await Core().loadConfig();
  const [tasks,leads]=await Promise.all([pullTasks(),pullLeads()]);
  let feed={generated_at:null,tasks:[],events:[],summary:{}};
  try{feed=await Core().loadPublicFeed()}catch(_){}
  return{cfg,feed,tasks:Core().mergeTasks(feed.tasks||[],tasks),leads,cloud:false,local:true,dataErrors:[]};
}

function requireCloud(){return true}
function cloudReady(){return true}
async function syncTerritorySnapshot(){return true}

const api={
  cloudReady,requireCloud,rest,pullKpis,pullTasks,pullVisibleTasks,upsertTask,setTaskStatus,pullLeads,pullLeadPage,pullLead,upsertLead,updateLead,
  pullInteractions,pullInteractionsForLead,addInteraction,recordOutcome,ensureCore4DueTasks,syncTerritorySnapshot,loadDashboardData,
  normalizeTask,normalizeLead,normalizeInteraction,pullDeletedLeads,deleteLead,restoreLead,purgeLead,
  localInteractions:()=>[],saveLocalInteractions:()=>true
};

window.F1AcquisitionData=api;
window.F1DesktopData={ready:initialize,db,close,invoke,api};
initialize().catch(e=>{
  console.error('F1 DESKTOP DATABASE ERROR',e);
  window.dispatchEvent(new CustomEvent('f1-desktop-error',{detail:{message:String(e?.message||e)}}));
});
})();
