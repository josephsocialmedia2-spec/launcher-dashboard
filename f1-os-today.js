(function(){
'use strict';

let DASH={tasks:[],leads:[],feed:{summary:{}},cfg:null,cloud:false};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const up=v=>String(v||'').trim().toUpperCase();
const clean=v=>String(v||'').trim();
function openTask(t){return !['DONE','CANCELLED'].includes(up(t.status||'OPEN'))}
function taskCore(t){return up(t.core_category||t.metadata?.core_category||'')}
function leadHay(l){return [l.source_type,l.source,l.lead_reason,l.status,l.notes].join(' ').toUpperCase()}
function countStatus(leads,re){return leads.filter(l=>re.test(up(l.status||l.outcome||''))).length}
function setText(id,value){const el=$(id);if(el)el.textContent=value}
function safeUrl(url){try{const u=new URL(String(url||''),location.href);return ['http:','https:'].includes(u.protocol)?u.href:''}catch(_){return''}}
function actionHref(t){const type=up(t.task_type);if(type==='CALL')return'telefonate-oggi.html';if(type==='FIELD')return'ricerca-territoriale.html';if(['FOLLOW_UP','REFERRAL'].includes(type))return'crm.html';if(type==='CAMPAIGN')return'organizer-lunedi.html';return safeUrl(t.source_url)||'seller-radar-unico.html'}
function actionLabel(t){const type=up(t.task_type);return type==='CALL'?'APRI TELEFONATE':type==='FIELD'?'APRI TERRITORIO':type==='FOLLOW_UP'?'APRI CRM':type==='REFERRAL'?'APRI CRM':type==='CAMPAIGN'?'APRI CAMPAGNA':'VERIFICA'}
function dueDateValue(v){return String(v||'').slice(0,10)}
function statusFromOutcome(value){const v=up(value);if(v==='APPUNTAMENTO')return'APPUNTAMENTO';if(v==='NON_INTERESSATO')return'NON_INTERESSATO';return''}
function interactionType(task){const t=up(task?.task_type);if(t==='CALL')return'CALL';if(t==='FIELD')return'FIELD';if(t==='FOLLOW_UP')return'FOLLOW_UP';return'NOTE'}
function taskLead(t){return DASH.leads.find(l=>String(l.lead_id||'')===String(t.lead_id||''))||null}
function isDailySellerTask(t){return up(t.origin||t.metadata?.origin||'')==='DAILY_SELLER_50'}
function dedupeDisplayTasks(rows){
  const map=new Map();
  for(const t of rows){
    const key=isDailySellerTask(t)&&t.lead_id?'DAILY_SELLER_50|'+String(t.lead_id):'TASK|'+String(t.task_id||F1AcquisitionCore.taskIdentity(t));
    const old=map.get(key);
    if(!old){map.set(key,t);continue}
    const a=[Number(t.priority)||0,String(t.due_date||''),String(t.updated_at||t.created_at||'')];
    const b=[Number(old.priority)||0,String(old.due_date||''),String(old.updated_at||old.created_at||'')];
    if(a[0]>b[0]||(a[0]===b[0]&&(a[1]>b[1]||(a[1]===b[1]&&a[2]>b[2]))))map.set(key,t);
  }
  return [...map.values()];
}
function taskTitle(t,lead){
  if(isDailySellerTask(t)){
    const name=[lead?.nome,lead?.cognome].filter(Boolean).join(' ').trim();
    return name?('CHIAMA '+name):'CONTATTO SELLER DA LAVORARE';
  }
  return t.reason||t.lead_reason||lead?.lead_reason||'Task da lavorare';
}
function taskWhy(t,lead){
  if(isDailySellerTask(t))return t.selection_reason||t.lead_reason||lead?.lead_reason||'Segnale immobiliare da approfondire';
  return t.lead_reason||lead?.lead_reason||t.reason||'Segnale da verificare';
}
function taskDetail(t){
  return clean(t.call_reason_detail||t.signal_text||t.trigger_note||'');
}

function renderHeader(){
  const territory=DASH.cfg?.territory||{};
  const communes=window.F1AcquisitionCore?.territoryCommunes?.(territory)||[];
  $('today').textContent=new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date());
  $('statusPills').innerHTML=`<span class="pill">CENTRO: ${esc(territory.reference_hub||'—')}</span><span class="pill">${esc(territory.policy||'TERRITORIO')}</span><span class="pill">${communes.length} COMUNI</span><span class="pill ${DASH.cloud?'blue':'gold'}">${DASH.cloud?'● CLOUD CONNESSO':'● FEED PUBBLICO'}</span>`;
}
function renderStats(){
  const open=DASH.tasks.filter(openTask),leads=DASH.leads;
  setText('sNew',open.filter(t=>t.is_new).length);
  setText('sCall',open.filter(t=>up(t.task_type)==='CALL'&&F1AcquisitionCore.isDue(t)).length);
  setText('sCallback',open.filter(t=>/CALLBACK|RICHIAM/.test(up([t.reason,t.event_type].join(' ')))).length+countStatus(leads,/RICHIAMO|DA_RICONTATTARE/));
  setText('sAppointments',countStatus(leads,/APPUNTAMENTO/));setText('sValuations',countStatus(leads,/VALUTAZIONE/));setText('sListings',countStatus(leads,/INCARICO|ACQUISITO/));
}
function renderCore(){
  const tasks=DASH.tasks.filter(openTask),leads=DASH.leads;
  setText('cPast',tasks.filter(t=>taskCore(t)==='PAST_CLIENT').length+leads.filter(l=>/CLIENTE PASSAT/.test(leadHay(l))).length);
  setText('cCoi',tasks.filter(t=>taskCore(t)==='COI').length+leads.filter(l=>/CENTRO DI INFLUENZA|\bCOI\b/.test(leadHay(l))).length);
  setText('cExpired',tasks.filter(t=>taskCore(t)==='EXPIRED_OR_POSSIBLE_EXPIRED').length+leads.filter(l=>/SCADUT|RITIRAT|NON PIU RILEVAT|CAMBIO AGENZIA/.test(leadHay(l))).length);
  setText('cFsbo',tasks.filter(t=>taskCore(t)==='FSBO').length+leads.filter(l=>/FSBO|PRIVAT|NO AGENZI/.test(leadHay(l))).length);
}
function renderPillars(){
  const engine=DASH.cfg?.engine||{},open=DASH.tasks.filter(openTask);
  $('pillarCards').innerHTML=(engine.pillars||[]).map(p=>{let n;if(Number(p.id)===5)n=open.filter(t=>taskCore(t)).length;else n=open.filter(t=>Number(t.pillar)===Number(p.id)).length+DASH.leads.filter(l=>Number(l.pillar)===Number(p.id)&&!/SCARTATO|PERSO|NON_INTERESSATO/.test(up(l.status))).length;return `<div class="card"><span class="badge">PILASTRO ${esc(p.id)}</span><div class="n">${n}</div><strong>${esc(p.label)}</strong><div class="small">${esc(p.description)}</div></div>`}).join('');
}
function renderCompetitor(){const s=DASH.feed.summary||{};setText('ciSignals',s.signals||0);setText('ciPrice',s.price_changes||0);setText('ciAgency',s.agency_changes||0);setText('ciExit',(s.possible_expired||0)+(s.relisted||0))}
function renderTerritory(){const t=DASH.cfg?.territory||{};setText('territoryTitle',`Centro ${t.reference_hub||'—'}`);setText('territoryMeta',`${t.description||''} · versione ${t.version||'—'} · ${t.policy||''}`);setText('territoryLeft',(t.sinistra||[]).join(' · '));setText('territoryRight',(t.destra||[]).join(' · '))}
function renderFunnel(){const f=F1AcquisitionCore.funnelFromLeads(DASH.leads);for(const [id,k] of [['fLead','LEAD'],['fContact','CONTATTO'],['fAppointment','APPUNTAMENTO'],['fValuation','VALUTAZIONE'],['fListing','INCARICO'],['fSold','VENDUTO']])setText(id,f[k])}

function renderTasks(){
  const filter=$('taskFilter').value;
  const due=DASH.tasks.filter(t=>openTask(t)&&F1AcquisitionCore.isDue(t)&&(!filter||up(t.task_type)===filter));
  const rows=dedupeDisplayTasks(due).sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0)||String(a.due_date||'').localeCompare(String(b.due_date||''))).slice(0,18);
  if(!rows.length){$('taskList').innerHTML='<div class="empty">Nessun task aperto per questo filtro.</div>';return}
  $('taskList').innerHTML=rows.map(t=>{
    const lead=taskLead(t),target=actionHref(t);
    const src=safeUrl(t.source_url||t.contact_source_url||t.linked_property_url||lead?.source_url);
    const where=[t.comune||lead?.comune,t.via||lead?.via,t.civico||lead?.civico].filter(Boolean).join(' — ');
    const source=t.source||lead?.source||t.linked_property_source||'—';
    const confidence=t.confidence||lead?.confidence||'—';
    const detail=taskDetail(t);
    return `<article class="task" data-task="${esc(t.task_id)}"><div class="taskTop"><div><div class="taskReason">${esc(taskTitle(t,lead))}</div><div class="taskMeta">PILASTRO ${esc(t.pillar)} · ${esc(t.task_type)}${taskCore(t)?' · CORE '+esc(taskCore(t)):''}${where?' · '+esc(where):''}</div></div><div class="score">PRIORITÀ ${esc(t.priority||0)}</div></div><div class="taskWhy"><b>PERCHÉ:</b> ${esc(taskWhy(t,lead))}${detail?'<br>'+esc(detail):''}<br><span class="meta">Fonte: ${esc(source)} · confidenza: ${esc(confidence)}</span></div><div class="actions"><a class="btn" href="${esc(target)}"${/^https?:/.test(target)?' target="_blank" rel="noopener"':''}>${actionLabel(t)}</a>${src?`<a class="btn alt" href="${esc(src)}" target="_blank" rel="noopener">FONTE</a>`:''}<button class="btn gold" type="button" data-outcome="${esc(t.task_id)}">REGISTRA ESITO</button></div></article>`;
  }).join('');
  document.querySelectorAll('[data-outcome]').forEach(b=>b.addEventListener('click',()=>openOutcome(b.dataset.outcome)));
}

function openOutcome(taskId){
  const task=DASH.tasks.find(x=>String(x.task_id)===String(taskId));if(!task)return;
  $('outcomeTaskId').value=taskId;$('outcomeValue').value='';$('outcomeNote').value='';$('outcomeNext').value='';$('outcomeDate').value='';$('outcomeError').textContent='';
  const dlg=$('outcomeDialog');if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');
}
function closeOutcome(){const dlg=$('outcomeDialog');if(typeof dlg.close==='function')dlg.close();else dlg.removeAttribute('open')}
async function saveOutcome(ev){
  ev.preventDefault();
  const taskId=$('outcomeTaskId').value,task=DASH.tasks.find(x=>String(x.task_id)===String(taskId));if(!task)return;
  const outcome=up($('outcomeValue').value),note=clean($('outcomeNote').value),nextAction=clean($('outcomeNext').value),date=dueDateValue($('outcomeDate').value),closed=['CHIUSO','NON_INTERESSATO'].includes(outcome);
  const err=$('outcomeError');err.textContent='';
  if(!outcome||!note){err.textContent='Indica esito e che cosa è successo.';return}
  if(!closed&&!nextAction){err.textContent='Indica cosa succede dopo.';return}
  if(nextAction&&!date){err.textContent='Per una prossima azione serve una data.';return}
  if(!DASH.cloud){err.textContent='Accedi al Cloud F1 per registrare un esito operativo.';return}
  const btn=$('outcomeSave');btn.disabled=true;btn.textContent='SALVATAGGIO…';
  try{
    const nextIso=date?date+'T09:00:00Z':'';
    if(task.lead_id){
      await F1AcquisitionData.recordOutcome({leadId:task.lead_id,propertyId:task.property_id||'',taskId:task.task_id,interactionType:interactionType(task),direction:'OUTBOUND',outcome,note,status:statusFromOutcome(outcome),nextAction,nextActionDate:nextIso});
    }else{
      await F1AcquisitionData.setTaskStatus(task.task_id,'DONE',outcome);
      if(nextIso&&nextAction)await F1AcquisitionData.upsertTask({...task,task_id:crypto.randomUUID(),task_type:'FOLLOW_UP',reason:nextAction,due_date:nextIso,status:'OPEN',completed_at:null,outcome:'',metadata:{...(task.metadata||{}),origin:'F1_OS_OUTCOME',previous_task_id:task.task_id}});
    }
    DASH.tasks=DASH.tasks.map(x=>String(x.task_id)===String(task.task_id)?{...x,status:'DONE',outcome}:x);
    closeOutcome();renderTasks();renderStats();
  }catch(e){err.textContent=String(e?.message||e)}finally{btn.disabled=false;btn.textContent='SALVA ESITO'}
}

async function renderRelationsDue(){
  if(!DASH.cloud){$('relationsDue').innerHTML='<div class="empty">Accedi al Cloud F1 per visualizzare i follow-up relazionali.</div>';return}
  try{
    const today=F1AcquisitionCore.todayRome();
    const q='network_contacts?deleted=eq.false&app_scope=eq.albero_fonti_notizie&data_prossimo_contatto=lte.'+encodeURIComponent(today)+'&select=contact_id,legacy_id,nome,cognome,comune,stato_contatto,azione_successiva,data_prossimo_contatto,tipo_rapporto,tree_meta&order=data_prossimo_contatto.asc&limit=30';
    const rows=await F1AcquisitionData.rest(q)||[];
    if(!rows.length){$('relationsDue').innerHTML='<div class="empty">Nessun follow-up relazionale scaduto o previsto oggi.</div>';return}
    $('relationsDue').innerHTML=rows.map(r=>{
      const tm=r.tree_meta&&typeof r.tree_meta==='object'?r.tree_meta:{},name=[r.nome,r.cognome].filter(Boolean).join(' ')||'Persona',rel=(r.tipo_rapporto||[]).join(', '),channel=tm.authorized_channel||'',after=r.azione_successiva||'Definire prossimo passo';
      return `<div class="relation-due"><div><strong>${esc(name)}</strong><small>${esc([r.comune,rel,r.stato_contatto].filter(Boolean).join(' · '))}</small><small><b>DOPO:</b> ${esc(after)} · ${esc(r.data_prossimo_contatto||'')}</small>${channel?`<span class="badge">${esc(channel)}</span>`:''}</div><a class="btn alt" href="albero-fonti-notizie.html">APRI RELAZIONE</a></div>`;
    }).join('');
  }catch(e){$('relationsDue').innerHTML=`<div class="empty">Rete relazionale non disponibile: ${esc(e?.message||e)}</div>`}
}

function renderAll(){renderHeader();renderStats();renderCore();renderPillars();renderCompetitor();renderTerritory();renderFunnel();renderTasks()}
async function load(){
  try{
    const data=await F1AcquisitionData.loadDashboardData();
    DASH={...data};renderAll();await renderRelationsDue();
  }catch(e){$('taskList').innerHTML=`<div class="empty">Command Center non inizializzato: ${esc(e?.message||e)}</div>`}
}

function bind(){
  $('taskFilter')?.addEventListener('change',renderTasks);$('refreshBtn')?.addEventListener('click',load);$('outcomeForm')?.addEventListener('submit',saveOutcome);$('outcomeCancel')?.addEventListener('click',closeOutcome);
  let installPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installBtn').hidden=false});$('installBtn')?.addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installBtn').hidden=true});
  window.addEventListener('focus',()=>{if(document.visibilityState==='visible')load()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{bind();load()},{once:true});else{bind();load()}
})();
