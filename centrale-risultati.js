(()=>{
'use strict';
const PAGE_SIZE=50,STALE_HOURS=36,QUEUE_STALE_HOURS=2;
const $=id=>document.getElementById(id);
let rawQueue=[],queue=[],queuePayload={},sellerPayload={},neighborhoodPayload={},page=1,locked=new Set(),cloud=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const stateOf=x=>['OPEN','PROCESSING','DONE','ERROR','CANCELLED'].includes(String(x?.status||'').toUpperCase())?String(x.status).toUpperCase():'OPEN';
const withBust=u=>u+(u.includes('?')?'&':'?')+'v='+Date.now();
const ageHours=v=>{const n=new Date(v||'').getTime();return Number.isFinite(n)?(Date.now()-n)/36e5:Infinity};
const dateText=v=>{if(!v)return'—';const d=new Date(v);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('it-IT',{dateStyle:'short',timeStyle:'short'}).format(d):String(v)};
const hasDossier=x=>x?.module==='SELLER_RADAR'&&x?.dossier&&typeof x.dossier==='object'&&Object.keys(x.dossier).length>0;

async function fetchJson(path){const r=await fetch(withBust(path),{cache:'no-store'});if(!r.ok)throw new Error(`${path}: HTTP ${r.status}`);return r.json()}
function setHealth(id,label,status,detail){
  const el=$(id);if(!el)return;el.className='health '+status;el.innerHTML=`<b>${status==='ok'?'🟢':status==='warn'?'🟡':'🔴'} ${esc(label)}</b><span>${esc(detail)}</span>`;
}
function renderHealth(){
  const qDate=queuePayload.generated_at,qAge=ageHours(qDate);
  setHealth('hQueue','CODA',qAge<=QUEUE_STALE_HOURS?'ok':'warn',`${dateText(qDate)} · ${queuePayload.summary?.total??rawQueue.length} record`);
  const sDate=sellerPayload.generated_at,sAge=ageHours(sDate);
  setHealth('hSeller','SELLER RADAR',sAge<=STALE_HOURS?'ok':'warn',`${dateText(sDate)} · V${sellerPayload.version??'—'} · ${sellerPayload.summary?.tasks??sellerPayload.tasks?.length??0} task${sAge>STALE_HOURS?' · DATI VECCHI':''}`);
  const nDate=neighborhoodPayload.generated_at,nAge=ageHours(nDate),engine=neighborhoodPayload.engine_version||'—';
  const vOk=String(engine)==='4';
  setHealth('hNeighborhood','NEIGHBORHOOD',nAge<=STALE_HOURS&&vOk?'ok':'warn',`${dateText(nDate)} · ENGINE V${engine}${!vOk?' · VERSIONE NON CORRENTE':''}`);
  setHealth('hCloud','CLOUD',cloud?'ok':'warn',cloud?'Supabase connesso · decisioni condivise':'Accesso F1 richiesto per APPROVA / ELIMINA');
  $('mode').textContent=cloud?'CLOUD F1 CONNESSO · DECISIONI CONDIVISE':'LETTURA PUBBLICA · MODIFICHE CON ACCESSO CLOUD F1';
  $('cloudLogin').hidden=cloud;
}
function modules(){
  const current=$('module').value,mods=[...new Set(queue.map(x=>x.module).filter(Boolean))].sort();
  $('module').innerHTML='<option value="">Tutti i moduli</option>'+mods.map(x=>`<option>${esc(x)}</option>`).join('');
  if(mods.includes(current))$('module').value=current;
}
function filtered(){
  const q=$('q').value.toLowerCase().trim(),mod=$('module').value,st=$('state').value;
  return queue.filter(x=>{
    const s=stateOf(x);if(st!=='ALL'&&s!==st)return false;if(mod&&x.module!==mod)return false;if(!q)return true;
    return [x.module,x.platform,x.comune,x.type,x.subject,x.result,x.action_proposed,x.origin].join(' ').toLowerCase().includes(q);
  });
}
function updateStats(){
  const states=queue.map(stateOf);
  $('sOpen').textContent=states.filter(x=>x==='OPEN').length;$('sWork').textContent=states.filter(x=>x==='PROCESSING').length;
  $('sDone').textContent=states.filter(x=>x==='DONE').length;$('sErr').textContent=states.filter(x=>x==='ERROR').length;
  $('sDel').textContent=states.filter(x=>x==='CANCELLED').length;$('sTotal').textContent=queue.length;
}
function actionHtml(x){
  const s=stateOf(x),id=esc(x.approval_id),busy=locked.has(String(x.approval_id)),disabled=busy?' disabled':'';
  if(!cloud&&['OPEN','ERROR'].includes(s))return `<a class="btn work" href="setup-cloud.html?return=centrale-risultati.html">ACCESSO CLOUD PER OPERARE</a>`;
  if(s==='OPEN')return `<button class="btn ok" onclick="decide('${id}','APPROVE')"${disabled}>APPROVA</button><button class="btn red" onclick="decide('${id}','CANCEL')"${disabled}>ELIMINA</button>`;
  if(s==='PROCESSING'){
    if(x.module==='SELLER_RADAR')return `<button class="btn work" onclick="openWork('${id}')"><span class="dot"></span> IN LAVORAZIONE · CONTROLLA</button>`;
    return `<span class="badge gold">APPROVATO · IN ATTESA ESECUZIONE</span>`;
  }
  if(s==='ERROR'){
    if(x.module==='SELLER_RADAR')return `<button class="btn red" onclick="decide('${id}','RETRY')"${disabled}><span class="dot red"></span> ERRORE · RIPROVA</button>`;
    return `<span class="badge red">ERRORE · ${esc(x.error||'controllo richiesto')}</span>`;
  }
  if(s==='DONE'){
    if(hasDossier(x))return `<button class="btn" onclick="openWork('${id}')"><span class="dot green"></span> COMPLETATO · DOSSIER</button>`;
    return `<span class="badge">COMPLETATO</span>`;
  }
  return '<span class="badge blue">ELIMINATO</span>';
}
function card(x){
  const s=stateOf(x),cls=s==='DONE'?'done':s==='CANCELLED'?'cancelled':s==='PROCESSING'?'processing':s==='ERROR'?'error':'';
  const score=x.score!==null&&x.score!==undefined&&x.score!==''?`<span class="badge gold">SCORE ${esc(x.score)}</span>`:'';
  const source=x.source_url?`<a class="btn alt" target="_blank" rel="noopener" href="${esc(x.source_url)}">APRI FONTE</a>`:'';
  const preview=x.preview_url?`<img class="preview" loading="lazy" src="${esc(x.preview_url)}" alt="Anteprima">`:'';
  const origin=x.origin?`<span class="origin">${esc(x.origin)}</span>`:'';
  return `<article class="item ${cls}">
    <div class="top"><div><div class="title">${esc(x.subject||'Risultato')}</div><div class="meta">${esc(x.comune||'')} · ${esc(dateText(x.created_at||x.source_created_at))} · ${esc(x.action_proposed||'')}</div>${origin}</div>
    <div class="badges"><span class="badge">${esc(x.module||'AUTOMAZIONE')}</span><span class="badge blue">${esc(x.platform||'')}</span>${score}<span class="badge ${s==='ERROR'?'red':s==='PROCESSING'?'gold':''}">${esc(s)}</span></div></div>
    <div class="result">${esc(x.result||'')}</div>${preview}<div class="actions">${actionHtml(x)}${source}</div></article>`;
}
function render(){
  updateStats();const rows=filtered(),pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));if(page>pages)page=pages;
  const start=(page-1)*PAGE_SIZE,shown=rows.slice(start,start+PAGE_SIZE);
  $('list').innerHTML=shown.length?shown.map(card).join(''):'<div class="empty">Nessun risultato in questo filtro.</div>';
  $('pageInfo').textContent=`Pagina ${page} di ${pages} · ${rows.length} risultati · ${PAGE_SIZE} per pagina`;
  $('prevPage').disabled=page<=1;$('nextPage').disabled=page>=pages;
}
function applyCloudRow(row){
  const id=String(row?.approval_id||'');if(!id)return;
  queue=queue.map(x=>String(x.approval_id)===id?{...x,...row,type:x.type,created_at:x.created_at,metadata:{...(x.metadata||{}),...(row.metadata||{})}}:x);render();
}
function openWork(id){window.F1SellerBridge?.openWork?.(id)}
async function decide(id,action){
  id=String(id);if(locked.has(id))return;
  const x=queue.find(r=>String(r.approval_id)===id);if(!x)return;
  if(!cloud){location.href='setup-cloud.html?return=centrale-risultati.html';return}
  locked.add(id);render();
  try{
    if(action==='CANCEL'){
      const row=await F1ApprovalCloud.patch(id,{decision:'REJECTED',status:'CANCELLED',outcome:'ELIMINATO',error:'',execution_kind:x.module||''});applyCloudRow(row);
    }else if(action==='APPROVE'||action==='RETRY'){
      const row=await F1ApprovalCloud.patch(id,{decision:'APPROVED',status:'PROCESSING',outcome:'APPROVED_PENDING_EXECUTION',error:'',execution_kind:x.module||''});applyCloudRow(row);
    }
  }catch(e){$('globalMsg').textContent='ERRORE: '+String(e?.message||e)}
  finally{locked.delete(id);render()}
}
async function loadAll(manual=false){
  $('list').innerHTML=`<div class="empty">${manual?'Aggiornamento…':'Caricamento…'}</div>`;$('globalMsg').textContent='';
  try{
    const results=await Promise.allSettled([fetchJson('data/approval-queue.json'),fetchJson('data/acquisition-public.json'),fetchJson('data/neighborhood_intelligence.json')]);
    if(results[0].status!=='fulfilled')throw results[0].reason;
    queuePayload=results[0].value||{};sellerPayload=results[1].status==='fulfilled'?results[1].value:{};neighborhoodPayload=results[2].status==='fulfilled'?results[2].value:{};
    rawQueue=Array.isArray(queuePayload.items)?queuePayload.items:[];
    const init=await F1ApprovalCloud.init(rawQueue).catch(()=>({ready:false}));
    cloud=!!init?.ready;queue=F1ApprovalCloud.resolve(rawQueue);modules();page=1;renderHealth();render();
  }catch(e){$('list').innerHTML='<div class="empty">ERRORE: '+esc(e.message||e)+'</div>';renderHealth()}
}
window.addEventListener('f1:approval-cloud-row',e=>applyCloudRow(e.detail));
window.addEventListener('f1:approval-cloud-refresh',()=>{queue=F1ApprovalCloud.resolve(rawQueue);renderHealth();render()});
$('q').addEventListener('input',()=>{page=1;render()});$('module').addEventListener('change',()=>{page=1;render()});$('state').addEventListener('change',()=>{page=1;render()});
$('prevPage').addEventListener('click',()=>{if(page>1){page--;render();scrollTo({top:0,behavior:'smooth'})}});
$('nextPage').addEventListener('click',()=>{const pages=Math.max(1,Math.ceil(filtered().length/PAGE_SIZE));if(page<pages){page++;render();scrollTo({top:0,behavior:'smooth'})}});
$('refreshBtn').addEventListener('click',()=>loadAll(true));
window.decide=decide;window.openWork=openWork;window.render=render;window.loadAll=loadAll;window.applyCloudRow=applyCloudRow;
window.F1Central={get queue(){return queue},get rawQueue(){return rawQueue},applyCloudRow,render,loadAll,PAGE_SIZE,STALE_HOURS};
})();