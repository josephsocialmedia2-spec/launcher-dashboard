(()=>{
'use strict';
const LOCAL_DECISIONS='f1ApprovalDecisionsV1';
const LOCAL_CROSS='f1_seller_cross_intelligence_v1';
const LOCAL_PROGRESS='f1_seller_cross_progress_v1';
const MIGRATION_MARK='f1ApprovalCloudMigrationV1';
const POLL_MS=30000;
let cloudMap=new Map(),user=null,pollTimer=0,initializing=null;

const clean=v=>String(v??'').trim();
const validState=s=>['OPEN','PROCESSING','DONE','ERROR','CANCELLED'].includes(String(s||'').toUpperCase())?String(s).toUpperCase():'OPEN';
const json=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch(_){return fallback}};
const dateOrNull=v=>{const d=new Date(v||'');return Number.isFinite(d.getTime())?d.toISOString():null};
const numOrNull=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);

function localDecisionMap(){return json(LOCAL_DECISIONS,{})}
function saveLocalDecision(id,patch){
  const all=localDecisionMap(),k=String(id),old=all[k]||{},next={...old,...patch,updated_at:patch.updated_at||new Date().toISOString()};
  all[k]=next;localStorage.setItem(LOCAL_DECISIONS,JSON.stringify(all));return next;
}
function localOverlay(items){
  const d=localDecisionMap(),cross=json(LOCAL_CROSS,{}),progress=json(LOCAL_PROGRESS,{});
  return items.map(x=>{
    const z=d[String(x.approval_id)]||{},c=cross[String(x.approval_id)]||{},p=progress[String(x.approval_id)]||{};
    return {...x,status:validState(z.status||x.status),outcome:z.outcome||'',updated_at:z.updated_at||x.updated_at||'',
      decision:z.decision||((z.status==='CANCELLED')?'REJECTED':(['PROCESSING','DONE','ERROR'].includes(z.status)?'APPROVED':'PENDING')),
      dossier:Object.keys(c).length?c:{},dossier_version:z.seller_cross_version||c.version||'',processing_state:Object.keys(p).length?p:{},
      error:z.seller_error||p.error||'',execution_kind:x.module==='SELLER_RADAR'?'SELLER_CROSS':''};
  });
}
function cloudReady(){return !!(window.F1StaffData?.ready?.()&&window.F1Sync?.ready?.())}
async function ensureReady(){
  if(!window.F1Sync?.ready?.())return false;
  if(window.F1Sync.ensureSession&&!(await window.F1Sync.ensureSession().catch(()=>false)))return false;
  if(!window.F1StaffData?.ready?.())return false;
  try{user=await window.F1StaffData.me();return !!user?.user_id}catch(_){return false}
}
function sourceRow(x,stamp){
  return {
    approval_id:String(x.approval_id||''),module:clean(x.module),platform:clean(x.platform),comune:clean(x.comune),
    item_type:clean(x.type),subject:clean(x.subject),result:clean(x.result),action_proposed:clean(x.action_proposed),
    score:numOrNull(x.score),source_url:clean(x.source_url),preview_url:clean(x.preview_url),origin:clean(x.origin),
    source_created_at:dateOrNull(x.created_at),source_present:true,source_last_seen_at:stamp,
    metadata:{...(x.metadata&&typeof x.metadata==='object'?x.metadata:{}),task_id:clean(x.task_id),lead_id:clean(x.lead_id),property_id:clean(x.property_id)}
  };
}
async function syncSources(items){
  if(!cloudReady())return;
  const stamp=new Date().toISOString(),rows=(items||[]).filter(x=>x?.approval_id).map(x=>sourceRow(x,stamp));
  for(let i=0;i<rows.length;i+=100){
    await window.F1StaffData.rest('approval_queue?on_conflict=approval_id',{
      method:'POST',body:JSON.stringify(rows.slice(i,i+100)),prefer:'resolution=merge-duplicates,return=minimal'
    });
  }
}
async function loadCloud(){
  if(!cloudReady())return new Map();
  const fields='approval_id,module,status,outcome,decision,decision_at,updated_at,processing_state,dossier,dossier_version,error,execution_kind,completed_at,metadata';
  const rows=await window.F1StaffData.rest(`approval_queue?select=${fields}&limit=5000`);
  cloudMap=new Map((Array.isArray(rows)?rows:[]).map(r=>[String(r.approval_id),r]));
  return cloudMap;
}
function resolve(items){
  if(!cloudMap.size)return localOverlay(items);
  const local=localDecisionMap();
  return (items||[]).map(x=>{
    const z=cloudMap.get(String(x.approval_id));
    if(!z){
      const l=local[String(x.approval_id)]||{};
      return {...x,status:validState(l.status||x.status),outcome:l.outcome||'',decision:l.decision||'PENDING'};
    }
    return {...x,...z,type:x.type,item_type:z.item_type||x.type,created_at:x.created_at,source_url:x.source_url||z.source_url,
      preview_url:x.preview_url||z.preview_url,origin:x.origin||z.origin,metadata:{...(x.metadata||{}),...(z.metadata||{})},
      status:validState(z.status),dossier:z.dossier||{},processing_state:z.processing_state||{}};
  });
}
async function patch(id,values){
  if(!(await ensureReady()))throw new Error('ACCESSO CLOUD F1 RICHIESTO');
  const allowed=['status','outcome','decision','processing_state','dossier','dossier_version','error','execution_kind','metadata'];
  const body={};for(const k of allowed)if(Object.prototype.hasOwnProperty.call(values,k))body[k]=values[k];
  if(body.status)body.status=validState(body.status);
  const rows=await window.F1StaffData.rest('approval_queue?approval_id=eq.'+encodeURIComponent(String(id)),{
    method:'PATCH',body:JSON.stringify(body),prefer:'return=representation'
  });
  const row=Array.isArray(rows)?rows[0]:null;
  if(!row)throw new Error('APPROVAZIONE CLOUD NON CONFERMATA');
  cloudMap.set(String(id),row);
  saveLocalDecision(id,{status:row.status,outcome:row.outcome,decision:row.decision,updated_at:row.updated_at,
    seller_cross_version:row.dossier_version||'',seller_error:row.error||''});
  window.dispatchEvent(new CustomEvent('f1:approval-cloud-row',{detail:row}));
  return row;
}
function localIsNewer(local,cloud){
  const l=new Date(local?.updated_at||0).getTime(),c=new Date(cloud?.updated_at||0).getTime();
  return Number.isFinite(l)&&l>0&&(!Number.isFinite(c)||l>c);
}
async function migrateLocal(items){
  if(localStorage.getItem(MIGRATION_MARK)==='1'||!cloudReady())return 0;
  const decisions=localDecisionMap(),cross=json(LOCAL_CROSS,{}),progress=json(LOCAL_PROGRESS,{}),byId=new Map((items||[]).map(x=>[String(x.approval_id),x]));
  let moved=0;
  for(const [id,d] of Object.entries(decisions)){
    const x=byId.get(id),c=cloudMap.get(id);
    if(!x||!c||!localIsNewer(d,c))continue;
    let status=validState(d.status),decision=status==='CANCELLED'?'REJECTED':(['PROCESSING','DONE','ERROR'].includes(status)?'APPROVED':'PENDING');
    let outcome=d.outcome||'';
    if(x.module!=='SELLER_RADAR'&&status==='DONE'){status='PROCESSING';decision='APPROVED';outcome='APPROVED_PENDING_EXECUTION'}
    if(x.module==='SELLER_RADAR'&&status==='DONE'&&(!cross[id]||cross[id]?.version!=='V4'||!cross[id]?.crm_lead_id)){status='PROCESSING';decision='APPROVED';outcome='MIGRATED_REQUIRES_CRM_SYNC'}
    const payload={status,decision,outcome,error:d.seller_error||progress[id]?.error||'',execution_kind:x.module==='SELLER_RADAR'?'SELLER_CROSS':clean(x.module),
      processing_state:progress[id]||{},dossier:x.module==='SELLER_RADAR'?(cross[id]||{}):{},dossier_version:x.module==='SELLER_RADAR'?(d.seller_cross_version||cross[id]?.version||''):''};
    await patch(id,payload);moved++;
  }
  localStorage.setItem(MIGRATION_MARK,'1');return moved;
}
async function refresh(){
  if(!(await ensureReady()))return false;
  await loadCloud();
  window.dispatchEvent(new CustomEvent('f1:approval-cloud-refresh',{detail:{map:cloudMap}}));return true;
}
async function init(items){
  if(initializing)return initializing;
  initializing=(async()=>{
    const ok=await ensureReady();
    if(!ok)return{ready:false,map:new Map(),user:null,migrated:0};
    await syncSources(items);await loadCloud();const migrated=await migrateLocal(items);if(migrated)await loadCloud();
    clearInterval(pollTimer);pollTimer=setInterval(()=>refresh().catch(()=>{}),POLL_MS);
    return{ready:true,map:cloudMap,user,migrated};
  })().finally(()=>{initializing=null});
  return initializing;
}
function get(id){return cloudMap.get(String(id))||null}
function isReady(){return cloudReady()}
window.F1ApprovalCloud={init,refresh,resolve,patch,get,isReady,ensureReady,syncSources,loadCloud,localOverlay,user:()=>user};
})();