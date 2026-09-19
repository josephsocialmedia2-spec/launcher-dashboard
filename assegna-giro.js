(()=>{'use strict';
const state={step:1,me:null,team:[],tours:[],accounts:[],accountsLoaded:false,staffId:'',comune:'',communes:[],busy:false,deleteTarget:null,deleteBusy:false};
const $=id=>document.getElementById(id),txt=v=>String(v??'').trim(),esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const labels=['FUNZIONARIO','COMUNE'];
function setMsg(text,bad=false){const e=$('msg');if(!e)return;e.textContent=text||'';e.className='msg'+(text?' show '+(bad?'bad':'ok'):'')}
function selectedStaff(){return state.team.find(x=>String(x.user_id)===String(state.staffId))||null}
function staffTerritory(s){const t=s?.assigned_territory&&typeof s.assigned_territory==='object'?s.assigned_territory:{};return txt(t.comune)}
function panelHtml(){
  const staff=selectedStaff();
  const communeOptions=['<option value="">SELEZIONA COMUNE</option>'].concat(state.communes.map(c=>`<option value="${esc(c)}" ${c===state.comune?'selected':''}>${esc(c)}</option>`)).join('');
  return [
`<div class="panel ${state.step===1?'on':''}" data-step="1"><h2>A CHI ASSEGNI QUESTO GIRO?</h2><p>Scegli un funzionario attivo.</p><div class="staff-list">${state.team.length?state.team.map(s=>`<label class="staff-card ${String(s.user_id)===String(state.staffId)?'selected':''}"><input type="radio" name="staff" value="${esc(s.user_id)}" ${String(s.user_id)===String(state.staffId)?'checked':''}><div class="staff-copy"><strong>${esc([s.first_name,s.last_name].filter(Boolean).join(' ')||s.role)}</strong><small>${esc(s.role||'FUNZIONARIO')}${staffTerritory(s)?' · '+esc(staffTerritory(s)):''}</small></div></label>`).join(''):'<div class="empty">NESSUN FUNZIONARIO DISPONIBILE</div>'}</div></div>`,
`<div class="panel ${state.step===2?'on':''}" data-step="2"><h2>IN QUALE COMUNE DEVE LAVORARE?</h2><p>Il Comune è l'unico dato territoriale da assegnare.</p><label>COMUNE<select id="comune">${communeOptions}</select></label><div class="summary"><div><span>FUNZIONARIO</span><strong>${esc(staff?[staff.first_name,staff.last_name].filter(Boolean).join(' '):'—')}</strong></div><div><span>COMUNE</span><strong id="summaryComune">${esc(state.comune||'—')}</strong></div></div></div>`
  ].join('');
}
function renderSteps(){$('steps').innerHTML=labels.map((l,i)=>`<div class="step ${state.step===i+1?'on':''}">${i+1}. ${l}</div>`).join('')}
function syncInputs(){
  document.querySelectorAll('input[name="staff"]').forEach(r=>r.addEventListener('change',()=>{state.staffId=r.value;render()}));
  const c=$('comune');if(c)c.addEventListener('change',()=>{state.comune=c.value;const s=$('summaryComune');if(s)s.textContent=state.comune||'—'});
}
function render(){
  renderSteps();
  $('panels').innerHTML=panelHtml()+`<div class="nav"><button class="btn secondary" id="back" type="button" ${state.step===1?'disabled':''}><i class="fa-solid fa-arrow-left"></i> INDIETRO</button>${state.step<2?'<button class="btn primary" id="next" type="button">AVANTI <i class="fa-solid fa-arrow-right"></i></button>':'<button class="btn primary" id="assign" type="button">ASSEGNA GIRO <i class="fa-solid fa-check"></i></button>'}</div>`;
  syncInputs();
  $('back')?.addEventListener('click',()=>{capture();if(state.step>1){state.step--;setMsg('');render()}});
  $('next')?.addEventListener('click',()=>{capture();const err=validateStep(state.step);if(err){setMsg(err,true);return}state.step++;setMsg('');render()});
  $('assign')?.addEventListener('click',assignTour);
}
function capture(){if($('comune'))state.comune=$('comune').value}
function validateStep(step){if(step===1&&!state.staffId)return'SELEZIONA UN FUNZIONARIO';if(step===2&&!txt(state.comune))return'SELEZIONA IL COMUNE';return''}
async function assignTour(){
  capture();const err=validateStep(2);if(err){setMsg(err,true);return}if(state.busy)return;
  state.busy=true;$('assign').disabled=true;setMsg('ASSEGNAZIONE COMUNE IN CORSO…');
  try{
    const r=await F1StaffData.rpc('f1_territory_assign_municipality',{p_user_id:state.staffId,p_comune:txt(state.comune)});
    if(!r?.ok){
      if(r?.code==='ACTIVE_TOUR_EXISTS'){const x=r.existing||{};setMsg(`IL FUNZIONARIO HA GIÀ UN GIRO ATTIVO: ${x.comune||'COMUNE NON DISPONIBILE'}. ELIMINA PRIMA IL GIRO ATTIVO.`,true)}
      else setMsg(r?.message||'GIRO NON ASSEGNATO',true);
      return;
    }
    $('panels').style.display='none';$('steps').style.display='none';document.querySelector('.nav')?.remove();$('msg').className='msg';$('successScreen').classList.add('on');
    const staff=selectedStaff();$('successText').textContent=`${staff?[staff.first_name,staff.last_name].filter(Boolean).join(' '):'Funzionario'} · ${r.comune}. Il Comune è stato assegnato correttamente.`;
    await refreshTeam();await loadTours();
  }catch(e){setMsg('GIRO NON ASSEGNATO. '+String(e?.message||e),true)}
  finally{state.busy=false;if($('assign'))$('assign').disabled=false}
}
function fmtDate(value){if(!value)return'—';const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value);try{return new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',dateStyle:'short',timeStyle:'short'}).format(d)}catch(_){return d.toLocaleString('it-IT')}}
function activeAccountStatus(a){if(a?.banned_until){const d=new Date(a.banned_until);if(!Number.isNaN(d.getTime())&&d>new Date())return'BLOCCATO'}return String(a?.status||'').toUpperCase()||'—'}
async function refreshTeam(){const all=await F1StaffData.rpc('f1_territory_admin_team')||[];state.team=all.filter(x=>String(x.role||'').toUpperCase()==='FUNZIONARIO'&&String(x.status||'').toUpperCase()==='ACTIVE')}
async function loadCommunes(){
  const r=await fetch('config/territory.json?v=20260919-comune-only1',{cache:'no-store'});if(!r.ok)throw new Error('ELENCO COMUNI NON DISPONIBILE');
  const j=await r.json();const seen=new Set(),out=[];
  [j.reference_hub,...(Array.isArray(j.sinistra)?j.sinistra:[]),...(Array.isArray(j.destra)?j.destra:[])].map(txt).filter(Boolean).forEach(c=>{const k=c.toLocaleLowerCase('it-IT');if(!seen.has(k)){seen.add(k);out.push(c)}});
  state.communes=out.sort((a,b)=>a.localeCompare(b,'it',{sensitivity:'base'}));if(!state.communes.length)throw new Error('NESSUN COMUNE CONFIGURATO');
}
async function loadTours(){
  try{
    state.tours=await F1StaffData.rpc('f1_territory_admin_tours')||[];const box=$('tours');
    box.innerHTML=state.tours.length?state.tours.map((t,i)=>{
      const name=esc([t.first_name,t.last_name].filter(Boolean).join(' ')||t.role);
      const municipality=String(t.assignment_type||'')==='MUNICIPALITY';
      if(municipality)return `<div class="tour"><strong>${name}</strong><small>${esc(t.comune||'—')} · GIRO ATTIVO</small><small>ASSEGNATO IL ${esc(fmtDate(t.assigned_at||t.updated_at))}</small><div class="tour-actions"><button class="btn danger" type="button" data-delete-index="${i}"><i class="fa-solid fa-trash"></i> ELIMINA GIRO</button></div></div>`;
      const pct=t.total_count?Math.round((Number(t.completed_count||0)/Number(t.total_count))*100):0;
      return `<div class="tour"><strong>${name}</strong><small>${esc(t.comune||'—')}${t.via?' · '+esc(t.via):''} · GIRO PRECEDENTE</small><div class="bar"><i style="width:${pct}%"></i></div><small>${Number(t.completed_count||0)} / ${Number(t.total_count||0)} civici</small><div class="tour-actions"><button class="btn danger" type="button" data-delete-index="${i}"><i class="fa-solid fa-trash"></i> ELIMINA GIRO</button></div></div>`;
    }).join(''):'<div class="empty">NESSUN GIRO TERRITORIALE ATTIVO</div>';
    box.querySelectorAll('[data-delete-index]').forEach(b=>b.addEventListener('click',()=>{const t=state.tours[Number(b.dataset.deleteIndex)];if(t)openDeleteModal(t)}));
  }catch(e){$('tours').innerHTML=`<div class="empty">${esc(e?.message||e)}</div>`}
}
function openDeleteModal(t){
  state.deleteTarget=t;const name=[t.first_name,t.last_name].filter(Boolean).join(' ')||t.role||'—';const municipality=String(t.assignment_type||'')==='MUNICIPALITY';
  $('deleteSummary').innerHTML=municipality
    ?`<div><span>FUNZIONARIO</span><strong>${esc(name)}</strong></div><div><span>COMUNE</span><strong>${esc(t.comune||'—')}</strong></div><div><span>STATO</span><strong>GIRO ATTIVO</strong></div><div><span>ASSEGNATO IL</span><strong>${esc(fmtDate(t.assigned_at||t.updated_at))}</strong></div>`
    :`<div><span>FUNZIONARIO</span><strong>${esc(name)}</strong></div><div><span>COMUNE</span><strong>${esc(t.comune||'—')}</strong></div><div><span>VIA</span><strong>${esc(t.via||'—')}</strong></div><div><span>PROGRESSO</span><strong>${Number(t.completed_count||0)} / ${Number(t.total_count||0)} civici</strong></div>`;
  $('deleteModal').classList.add('show');$('confirmDelete').disabled=false;$('confirmDelete').focus();
}
function closeDeleteModal(){if(state.deleteBusy)return;state.deleteTarget=null;$('deleteModal').classList.remove('show')}
async function confirmDeleteTour(){
  const t=state.deleteTarget;if(!t||state.deleteBusy)return;state.deleteBusy=true;$('confirmDelete').disabled=true;setMsg('ELIMINAZIONE GIRO IN CORSO…');
  try{
    const municipality=String(t.assignment_type||'')==='MUNICIPALITY';
    const r=municipality
      ?await F1StaffData.rpc('f1_territory_admin_delete_assignment',{p_assignment_id:t.assignment_id})
      :await F1StaffData.rpc('f1_territory_admin_delete_tour',{p_progress_id:t.progress_id});
    if(!r?.ok)throw new Error(r?.message||'CANCELLAZIONE NON CONFERMATA');
    $('deleteModal').classList.remove('show');state.deleteTarget=null;await refreshTeam();await loadTours();state.accountsLoaded=false;if($('accessAccordion')?.open)await loadAccounts(true);setMsg('GIRO ELIMINATO CORRETTAMENTE');render();
  }catch(e){setMsg('IMPOSSIBILE ELIMINARE IL GIRO · '+String(e?.message||e),true)}
  finally{state.deleteBusy=false;if($('confirmDelete'))$('confirmDelete').disabled=false}
}
async function loadAccounts(force=false){if(state.accountsLoaded&&!force){renderAccounts();return}const box=$('accessList');if(box)box.innerHTML='<div class="empty">Caricamento accessi…</div>';try{const r=await F1StaffData.staffAdmin({action:'list'});state.accounts=Array.isArray(r?.accounts)?r.accounts:[];state.accountsLoaded=true;renderAccounts()}catch(e){if(box)box.innerHTML=`<div class="empty">${esc(e?.message||e)}</div>`}}
function renderAccounts(){
  const box=$('accessList');if(!box)return;$('accessCount').textContent=String(state.accounts.length);
  box.innerHTML=state.accounts.length?state.accounts.map(a=>{const name=[a.first_name,a.last_name].filter(Boolean).join(' ')||a.email||'Account F1';const ter=a.assigned_territory&&typeof a.assigned_territory==='object'?a.assigned_territory:{};const territory=[ter.comune,ter.zona,ter.via].filter(Boolean).join(' · ')||'Nessun giro assegnato';const id=String(a.user_id||'');const short=id?esc(id.slice(0,8)+'…'+id.slice(-4)):'—';const email=txt(a.email||a.company_email);return `<details class="staff-access"><summary><span><strong>${esc(name)}</strong><small>${esc(a.role||'—')} · ${esc(activeAccountStatus(a))}</small></span><i class="fa-solid fa-chevron-down"></i></summary><div class="staff-access-body"><div class="access-grid"><span>EMAIL</span><strong>${esc(email||'—')}</strong><span>STATO</span><strong>${esc(activeAccountStatus(a))}</strong><span>CREATO</span><strong>${esc(fmtDate(a.created_at))}</strong><span>ULTIMO LOGIN</span><strong>${esc(fmtDate(a.last_sign_in_at))}</strong><span>ULTIMO ACCESSO</span><strong>${esc(fmtDate(a.last_access))} · ${Number(a.access_count||0)} accessi registrati</strong><span>ID UTENTE</span><strong title="${esc(id)}">${short}</strong><span>TERRITORIO</span><strong>${esc(territory)}</strong><span>PASSWORD</span><strong>PROTETTA · NON VISUALIZZABILE</strong></div><div class="access-actions">${email?`<button class="btn secondary" type="button" data-copy-email="${esc(email)}"><i class="fa-regular fa-copy"></i> COPIA EMAIL</button><button class="btn dark" type="button" data-reset-email="${esc(email)}"><i class="fa-solid fa-key"></i> INVIA RESET PASSWORD</button>`:''}</div></div></details>`}).join(''):'<div class="empty">NESSUN ACCOUNT REGISTRATO</div>';
  box.querySelectorAll('[data-copy-email]').forEach(b=>b.addEventListener('click',()=>copyEmail(b.dataset.copyEmail,b)));box.querySelectorAll('[data-reset-email]').forEach(b=>b.addEventListener('click',()=>sendPasswordReset(b.dataset.resetEmail,b)));
}
async function copyEmail(email,btn){try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(email);else{const ta=document.createElement('textarea');ta.value=email;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}const old=btn.innerHTML;btn.textContent='EMAIL COPIATA';setTimeout(()=>btn.innerHTML=old,1200)}catch(e){setMsg('IMPOSSIBILE COPIARE EMAIL · '+String(e?.message||e),true)}}
async function sendPasswordReset(email,btn){if(!email)return;const old=btn.innerHTML;btn.disabled=true;btn.textContent='INVIO…';try{const u=new URL('setup-cloud.html',location.href);u.searchParams.set('return','assegna-giro.html');await F1Sync.sendRecoveryEmail(email,u.href);btn.textContent='RESET INVIATO';setMsg('EMAIL DI RECUPERO PASSWORD INVIATA A '+email)}catch(e){btn.innerHTML=old;setMsg('IMPOSSIBILE INVIARE IL RESET · '+String(e?.message||e),true)}finally{setTimeout(()=>{btn.disabled=false;if(btn.textContent==='RESET INVIATO')btn.innerHTML=old},1800)}}
function bindAdminUi(){$('accessAccordion')?.addEventListener('toggle',()=>{if($('accessAccordion').open)loadAccounts()});$('cancelDelete')?.addEventListener('click',closeDeleteModal);$('confirmDelete')?.addEventListener('click',confirmDeleteTour);$('deleteModal')?.addEventListener('click',e=>{if(e.target===$('deleteModal'))closeDeleteModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('deleteModal')?.classList.contains('show'))closeDeleteModal()})}
function reset(){Object.assign(state,{step:1,staffId:'',comune:'',busy:false});$('panels').style.display='';$('steps').style.display='grid';$('successScreen').classList.remove('on');setMsg('');if(state.team.length===1)state.staffId=state.team[0].user_id;render()}
async function init(){
  try{
    if(!F1Sync?.configured?.()||!(await F1Sync.ensureSession())){location.replace('setup-cloud.html?return=assegna-giro.html');return}
    state.me=await F1StaffData.me();if(String(state.me.role||'').toUpperCase()!=='TITOLARE'){document.body.innerHTML='<main class="wrap"><section class="card"><h1>ACCESSO RISERVATO AL TITOLARE</h1><a class="btn dark" href="ricerca-territoriale.html">TORNA ALLA DASHBOARD</a></section></main>';return}
    await Promise.all([refreshTeam(),loadCommunes()]);if(state.team.length===1)state.staffId=state.team[0].user_id;await loadTours();render();bindAdminUi();$('assignAnother')?.addEventListener('click',reset);
  }catch(e){console.error(e);setMsg(String(e?.message||e),true)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();