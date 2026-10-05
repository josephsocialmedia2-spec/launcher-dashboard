(()=>{
'use strict';
const $=id=>document.getElementById(id);
const Data=()=>window.F1AcquisitionData;
const PAGE_SIZE=50;
const HUB_SECTIONS=new Set(['','contatti','aziende','immobili','trattative','attivita']);
const LABELS={contatti:'CONTATTI',aziende:'AZIENDE',immobili:'IMMOBILI',trattative:'TRATTATIVE',attivita:'ATTIVITÀ'};
let state={section:'contatti',offset:0,filtered:0,total:0,rows:[],filters:{},timer:0,request:0};

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clean=v=>String(v??'').trim();
const phone=v=>{let d=String(v||'').replace(/\D/g,'');if(d.startsWith('39')&&d.length>10)d=d.slice(2);return d};
const date=v=>{if(!v)return'—';const d=new Date(v);return isNaN(d)?String(v).slice(0,10):d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'})};
const money=v=>v==null||v===''?'':Number(v).toLocaleString('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0});
function hubEnabled(){
  const q=new URLSearchParams(location.search),h=location.hash.replace('#','').toLowerCase();
  if(q.has('mode')||q.has('download')||h==='territory-news')return false;
  return HUB_SECTIONS.has(h);
}
function sectionFromHash(){const h=location.hash.replace('#','').toLowerCase();return ['contatti','aziende','immobili','trattative','attivita'].includes(h)?h:'contatti'}
function payloadSection(){return state.section==='attivita'?'ATTIVITA':state.section.toUpperCase()}
function setNav(){
  document.querySelectorAll('#crmHubNav [data-section]').forEach(a=>a.classList.toggle('on',a.dataset.section===state.section));
  $('hubSectionTitle').textContent=LABELS[state.section]||'CRM';
  const q=$('q');
  if(q)q.placeholder=state.section==='contatti'?'Cerca in tutti i contatti...':state.section==='aziende'?'Cerca azienda, P.IVA, settore, referente, Comune...':state.section==='immobili'?'Cerca immobile, Comune, via, tipologia...':state.section==='trattative'?'Cerca trattativa, persona, Comune, stato...':'Cerca attività, persona, esito...';
  const contacts=state.section==='contatti';
  if($('excelImportBtn'))$('excelImportBtn').style.display=contacts?'':'none';
  if($('newBtn'))$('newBtn').style.display=contacts?'':'none';
}
function activeFilters(){
  if(state.section==='contatti')return{
    telefono:clean($('hubTelefono')?.value),
    nome:clean($('hubNome')?.value),
    cognome:clean($('hubCognome')?.value),
    comune:clean($('hubComune')?.value),
    tipologia:clean($('hubTipologia')?.value),
    ricerca:!!$('hubRicerca')?.classList.contains('on'),
    vendita:!!$('hubVendita')?.classList.contains('on'),
    privato:!!$('hubPrivato')?.classList.contains('on')
  };
  if(state.section==='aziende')return{comune:clean($('hubComune')?.value),settore:clean($('hubSettore')?.value),stato:clean($('hubStato')?.value)};
  if(state.section==='immobili')return{
    comune:clean($('hubComune')?.value),
    tipologia:clean($('hubTipologia')?.value)
  };
  if(state.section==='attivita')return{stato:clean($('hubStato')?.value)};
  return{};
}
function renderFilters(){
  const box=$('hubFilters');if(!box)return;
  if(state.section==='contatti'){
    box.innerHTML=`
      <input id="hubTelefono" inputmode="tel" placeholder="Telefono">
      <input id="hubNome" placeholder="Nome">
      <input id="hubCognome" placeholder="Cognome">
      <input id="hubComune" placeholder="Paese / Comune">
      <input id="hubTipologia" placeholder="Tipologia">
      <div class="hub-toggles">
        <button type="button" id="hubRicerca" class="hub-toggle">RICERCA</button>
        <button type="button" id="hubVendita" class="hub-toggle">VENDITA</button>
        <button type="button" id="hubPrivato" class="hub-toggle">PRIVATO</button>
        <button type="button" id="hubReset" class="hub-toggle">AZZERA FILTRI</button>
      </div>`;
  }else if(state.section==='aziende'){
    box.innerHTML=`<div id="companyStats" class="company-stats"></div><input id="hubComune" placeholder="Paese / Comune"><input id="hubSettore" placeholder="Settore"><select id="hubStato"><option value="">Tutti gli stati</option><option value="DA_CONTATTARE">DA CONTATTARE</option><option value="CONTATTATA">CONTATTATA</option><option value="DA_RICONTATTARE">DA RICONTATTARE</option><option value="INTERESSATA">INTERESSATA</option><option value="APPUNTAMENTO">APPUNTAMENTO</option><option value="CLIENTE">CLIENTE</option><option value="NON_INTERESSATA">NON INTERESSATA</option><option value="NON_CONTATTARE">NON CONTATTARE</option></select>`;
  }else if(state.section==='immobili'){
    box.innerHTML=`<input id="hubComune" placeholder="Paese / Comune"><input id="hubTipologia" placeholder="Tipologia immobile">`;
  }else if(state.section==='attivita'){
    box.innerHTML=`<select id="hubStato"><option value="">Tutte le attività</option><option value="OPEN">Aperte</option><option value="DONE">Completate</option><option value="CANCELLED">Annullate</option></select>`;
  }else box.innerHTML='';
  box.querySelectorAll('input,select').forEach(el=>{el.addEventListener('input',schedule);el.addEventListener('change',schedule)});
  ['hubRicerca','hubVendita','hubPrivato'].forEach(id=>{const b=$(id);if(b)b.onclick=()=>{b.classList.toggle('on');state.offset=0;load()}});
  const reset=$('hubReset');if(reset)reset.onclick=()=>{renderFilters();state.offset=0;load()};
}
function contactName(r){return clean([r.nome,r.cognome].filter(Boolean).join(' '))||clean(r.azienda)||'Contatto senza nome'}
function typeName(r){return clean(r.tipologia_filtro)||clean(r.market_data?.property_type_normalized)||clean(r.market_data?.raccoglitore_payload?.tipologia)||clean(r.source_type)||'—'}
function contactCard(r){
  const p=phone(r.telefono),addr=[r.comune,r.via,r.civico].filter(Boolean).join(' · ');
  return `<article class="hub-card">
    <div class="hub-card-head"><div><div class="hub-card-title">${esc(contactName(r))}</div><div class="hub-card-meta">${esc(addr||'Località non indicata')}${r.email?'<br>'+esc(r.email):''}<br>Tipologia: ${esc(typeName(r))}</div></div><span class="hub-badge">${esc(r.status||'—')}</span></div>
    <div class="hub-card-actions">
      ${r.telefono?`<a class="btn primary" href="tel:${esc(r.telefono)}">CHIAMA · ${esc(r.telefono)}</a>`:''}
      ${p?`<a class="btn" target="_blank" rel="noopener" href="https://wa.me/39${p}">WHATSAPP</a>`:''}
      <button class="btn" data-edit-lead="${esc(r.lead_id)}">APRI / MODIFICA</button>
    </div>
    <div class="hub-card-meta">Origine: ${esc(r.source||r.source_type||'CRM')} ${r.lead_reason?'· '+esc(r.lead_reason):''}</div>
  </article>`;
}
function companyCard(r){
  const ref=[r.referente_nome,r.referente_cognome].filter(Boolean).join(' '),addr=[r.indirizzo,r.comune,r.cap,r.provincia].filter(Boolean).join(' · ');
  const tel=r.cellulare||r.telefono_fisso||r.telefono||'';
  return `<article class="hub-card"><div class="hub-card-head"><div><div class="hub-card-title">${esc(r.ragione_sociale||'Azienda')}</div><div class="hub-card-meta">${esc(r.settore||'Settore da arricchire')}${addr?'<br>'+esc(addr):''}${r.partita_iva?'<br>P.IVA: '+esc(r.partita_iva):''}${ref?'<br>Referente: '+esc(ref)+(r.referente_ruolo?' · '+esc(r.referente_ruolo):''):''}<br><span class="processing">${esc(r.processing_status||'IMPORTATA')}</span></div></div><span class="hub-badge">${esc(r.stato||'—')}</span></div><div class="hub-card-actions">${tel?`<a class="btn primary" href="tel:${esc(tel)}">CHIAMA</a>`:''}${r.email?`<a class="btn" href="mailto:${esc(r.email)}">EMAIL</a>`:''}${r.sito_web?`<a class="btn" target="_blank" rel="noopener" href="${esc(r.sito_web)}">SITO</a>`:''}<button class="btn" data-company-outcome="${esc(r.id)}">REGISTRA ESITO</button><button class="btn" data-edit-company="${esc(r.id)}">APRI / MODIFICA</button></div><div class="hub-card-meta">${r.prossima_azione?'Prossima azione: '+esc(r.prossima_azione)+(r.data_prossima_azione?' · '+esc(date(r.data_prossima_azione)):''):'Nessuna prossima azione'}${r.interesse?'<br>Interesse: '+esc(r.interesse):''}${r.budget_stimato?'<br>Budget stimato: '+esc(money(r.budget_stimato)):''}</div></article>`;
}
function propertyCard(r){
  const addr=[r.comune,r.via,r.civico].filter(Boolean).join(' · ');
  const chars=r.caratteristiche&&typeof r.caratteristiche==='object'?Object.entries(r.caratteristiche).slice(0,5).map(([k,v])=>k+': '+String(v)).join(' · '):'';
  return `<article class="hub-card"><div class="hub-card-head"><div><div class="hub-card-title">${esc(r.tipologia||'Immobile')}</div><div class="hub-card-meta">${esc(addr||r.zona||'Indirizzo non indicato')}${r.frazione?'<br>Frazione: '+esc(r.frazione):''}</div></div><span class="hub-badge">${esc(r.status||'—')}</span></div>${chars?'<div class="hub-card-meta">'+esc(chars)+'</div>':''}<div class="hub-card-meta">ID immobile: ${esc(r.property_id)}</div></article>`;
}
function dealCard(r){
  const p=phone(r.telefono),addr=[r.comune,r.via,r.civico].filter(Boolean).join(' · ');
  return `<article class="hub-card"><div class="hub-card-head"><div><div class="hub-card-title">${esc(contactName(r))}</div><div class="hub-card-meta">${esc(addr||'Località non indicata')}${r.next_action?'<br>Prossima azione: '+esc(r.next_action):''}${r.next_action_date?' · '+esc(date(r.next_action_date)):''}</div></div><span class="hub-badge">${esc(r.status||'—')}</span></div><div class="hub-card-actions">${r.telefono?`<a class="btn primary" href="tel:${esc(r.telefono)}">CHIAMA</a>`:''}${p?`<a class="btn" target="_blank" rel="noopener" href="https://wa.me/39${p}">WHATSAPP</a>`:''}<button class="btn" data-edit-lead="${esc(r.lead_id)}">APRI / MODIFICA</button></div></article>`;
}
function activityCard(r){
  const who=clean([r.lead_nome,r.lead_cognome].filter(Boolean).join(' '))||'Attività CRM',open=!['DONE','CANCELLED'].includes(String(r.status||'OPEN').toUpperCase());
  return `<article class="hub-card"><div class="hub-card-head"><div><div class="hub-card-title">${esc(r.task_type||'ATTIVITÀ')} · ${esc(who)}</div><div class="hub-card-meta">${esc(r.reason||'')}${r.lead_comune?'<br>'+esc(r.lead_comune):''}${r.due_date?'<br>Scadenza: '+esc(date(r.due_date)):''}</div></div><span class="hub-badge">${esc(r.status||'OPEN')}</span></div><div class="hub-card-actions">${r.lead_telefono?`<a class="btn" href="tel:${esc(r.lead_telefono)}">CHIAMA</a>`:''}${open?`<button class="btn primary" data-done-task="${esc(r.task_id)}">COMPLETA</button>`:''}</div></article>`;
}
function renderRows(){
  const box=$('list');if(!box)return;
  if(!state.rows.length){box.innerHTML='<div class="hub-empty">Nessun dato con questi filtri.</div>';return}
  const fn=state.section==='contatti'?contactCard:state.section==='aziende'?companyCard:state.section==='immobili'?propertyCard:state.section==='trattative'?dealCard:activityCard;
  box.innerHTML=state.rows.map(fn).join('');
  box.querySelectorAll('[data-edit-lead]').forEach(b=>b.onclick=()=>window.F1UnifiedCRM?.editLead?.(b.dataset.editLead));
  box.querySelectorAll('[data-edit-company]').forEach(b=>b.onclick=()=>editCompany(b.dataset.editCompany));
  box.querySelectorAll('[data-company-outcome]').forEach(b=>b.onclick=()=>openCompanyOutcome(b.dataset.companyOutcome));
  box.querySelectorAll('[data-done-task]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await Data().setTaskStatus(b.dataset.doneTask,'DONE','Completata dal CRM centrale');await load()}catch(e){alert(e.message||e)}finally{b.disabled=false}});
}

async function renderCompanyStats(){
  const box=$('companyStats');if(!box)return;
  try{
    const [s,jobs]=await Promise.all([
      Data().rest('rpc/f1_company_import_stats_v1',{method:'POST',body:'{}'}),
      Data().rest('azienda_import_jobs?select=*&order=started_at.desc&limit=1')
    ]);
    const job=Array.isArray(jobs)?jobs[0]:null, x=s||{};
    box.innerHTML=[
      ['FILE',job?((job.imported_rows||0)+(job.updated_rows||0))+'/'+job.total_rows:(x.aziende||0)],
      ['DA ARRICCHIRE',x.da_arricchire||0],['ARRICCHITE',x.arricchite||0],['CON TELEFONO',x.con_telefono||0],
      ['CON EMAIL',x.con_email||0],['CON PEC',x.con_pec||0],['CON SITO',x.con_sito||0],['CON REFERENTE',x.con_referente||0],
      ['DA CHIAMARE',x.da_chiamare||0],['EMAIL DA INVIARE',x.email_da_inviare||0],['RICHIAMI',x.richiami||0],['ERRORI',x.errori||0]
    ].map(([k,v])=>'<div class="company-stat"><b>'+esc(v)+'</b>'+esc(k)+'</div>').join('');
  }catch(e){box.innerHTML='<div class="meta">Statistiche aziende non disponibili.</div>'}
}
async function editCompany(id){
  try{
    const rows=await Data().rest('aziende?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1'),r=rows?.[0];if(!r)return;
    const set=(id,v)=>{const el=$(id);if(el)el.value=v??''};
    set('cId',r.id);set('cRagione',r.ragione_sociale);set('cSettore',r.settore);set('cPiva',r.partita_iva);set('cCf',r.codice_fiscale);
    set('cIndirizzo',r.indirizzo);set('cComune',r.comune);set('cCap',r.cap);set('cProvincia',r.provincia);set('cCell',r.cellulare);
    set('cFisso',r.telefono_fisso||r.telefono);set('cEmail',r.email);set('cPec',r.pec);set('cSito',r.sito_web);set('cRefNome',r.referente_nome);
    set('cRefCognome',r.referente_cognome);set('cRefRuolo',r.referente_ruolo);set('cRefTel',r.referente_telefono);set('cRefEmail',r.referente_email);
    set('cStato',r.stato||'DA_CONTATTARE');set('cInteresse',r.interesse);set('cBudget',r.budget_stimato);set('cProcessing',r.processing_status);
    set('cNote',r.note);set('cNext',r.prossima_azione);set('cNextDate',String(r.data_prossima_azione||'').slice(0,10));$('cDnc').checked=!!r.do_not_contact;
    $('companyStatus').textContent='';$('companyDlg').showModal();
  }catch(e){alert(e.message||e)}
}
async function saveCompany(){
  const id=$('cId').value;if(!id)return;
  const patch={ragione_sociale:clean($('cRagione').value),settore:clean($('cSettore').value),partita_iva:clean($('cPiva').value),codice_fiscale:clean($('cCf').value),
    indirizzo:clean($('cIndirizzo').value),comune:clean($('cComune').value),cap:clean($('cCap').value),provincia:clean($('cProvincia').value),
    cellulare:clean($('cCell').value),telefono_fisso:clean($('cFisso').value),telefono:clean($('cCell').value)||clean($('cFisso').value),
    email:clean($('cEmail').value),pec:clean($('cPec').value),sito_web:clean($('cSito').value),referente_nome:clean($('cRefNome').value),
    referente_cognome:clean($('cRefCognome').value),referente_ruolo:clean($('cRefRuolo').value),referente_telefono:clean($('cRefTel').value),referente_email:clean($('cRefEmail').value),
    stato:$('cDnc').checked?'NON_CONTATTARE':$('cStato').value,interesse:clean($('cInteresse').value),budget_stimato:$('cBudget').value?Number($('cBudget').value):null,
    note:$('cNote').value,prossima_azione:clean($('cNext').value),data_prossima_azione:$('cNextDate').value||null,do_not_contact:$('cDnc').checked,updated_at:new Date().toISOString()};
  $('companyStatus').textContent='Salvataggio…';
  try{await Data().rest('aziende?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify(patch)});$('companyStatus').textContent='Salvata.';$('companyDlg').close();await load()}catch(e){$('companyStatus').textContent=e.message||e}
}
async function openCompanyOutcome(id){
  $('coAziendaId').value=id;$('coType').value='CALL';$('coOutcome').value='';$('coStato').value='CONTATTATA';$('coNote').value='';$('coNext').value='';$('coNextDate').value='';$('companyOutcomeStatus').textContent='';$('companyOutcomeDlg').showModal();
}
async function saveCompanyOutcome(){
  const id=$('coAziendaId').value,type=$('coType').value,outcome=clean($('coOutcome').value),next=clean($('coNext').value),nextDate=$('coNextDate').value||null;
  $('companyOutcomeStatus').textContent='Salvataggio…';
  try{
    const rows=await Data().rest('aziende?id=eq.'+encodeURIComponent(id)+'&select=id,user_id,do_not_contact&limit=1'),a=rows?.[0];if(!a)throw new Error('Azienda non trovata');
    await Data().rest('azienda_interactions',{method:'POST',body:JSON.stringify({user_id:a.user_id,azienda_id:Number(id),interaction_type:type,direction:'OUTBOUND',occurred_at:new Date().toISOString(),outcome,note:$('coNote').value,next_action:next,next_action_date:nextDate})});
    const state=$('coStato').value;
    await Data().rest('aziende?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({ultima_interazione:new Date().toISOString().slice(0,10),stato:state,do_not_contact:state==='NON_CONTATTARE',prossima_azione:next,data_prossima_azione:nextDate,updated_at:new Date().toISOString()})});
    await Data().rest('azienda_tasks?azienda_id=eq.'+encodeURIComponent(id)+'&task_type=eq.'+encodeURIComponent(type)+'&status=in.(OPEN,IN_PROGRESS)',{method:'PATCH',body:JSON.stringify({status:'DONE',completed_at:new Date().toISOString(),outcome,updated_at:new Date().toISOString()})}).catch(()=>{});
    if(next&&nextDate&& !['CLIENTE','NON_INTERESSATA','NON_CONTATTARE'].includes(state)){
      await Data().rest('azienda_tasks',{method:'POST',body:JSON.stringify({user_id:a.user_id,azienda_id:Number(id),task_type:next.toUpperCase().includes('APPUNT')?'APPUNTAMENTO':'FOLLOW_UP',status:'OPEN',reason:next,priority:70,due_at:nextDate+'T09:00:00',metadata:{origin:'COMPANY_OUTCOME'}})});
    }
    $('companyOutcomeStatus').textContent='Interazione registrata.';$('companyOutcomeDlg').close();await load();
  }catch(e){$('companyOutcomeStatus').textContent=e.message||e}
}
function ensurePager(){
  let p=$('hubPager');if(p)return p;
  p=document.createElement('div');p.id='hubPager';p.className='hub-pager';$('list').insertAdjacentElement('afterend',p);return p;
}
function renderPager(){
  const p=ensurePager(),pages=Math.max(1,Math.ceil(state.filtered/PAGE_SIZE)),current=Math.min(pages,Math.floor(state.offset/PAGE_SIZE)+1);
  p.innerHTML=`<button class="btn" id="hubPrev" ${state.offset<=0?'disabled':''}>← PRECEDENTE</button><span class="meta">Pagina ${current} / ${pages} · ${state.filtered} risultati</span><button class="btn" id="hubNext" ${state.offset+PAGE_SIZE>=state.filtered?'disabled':''}>SUCCESSIVA →</button>`;
  $('hubPrev').onclick=()=>{state.offset=Math.max(0,state.offset-PAGE_SIZE);load()};
  $('hubNext').onclick=()=>{state.offset+=PAGE_SIZE;load()};
}
async function load(){
  const token=++state.request;
  const box=$('list');if(box)box.innerHTML='<div class="hub-empty">Caricamento…</div>';
  try{
    await window.F1CRMAuthGuard?.ensure?.();
    const endpoint=state.section==='aziende'?'rpc/f1_crm_companies_page_v1':'rpc/f1_crm_hub_page_v1';
    const payload=state.section==='aziende'?{p_offset:state.offset,p_limit:PAGE_SIZE,p_search:clean($('q')?.value),p_filters:activeFilters()}:{p_section:payloadSection(),p_offset:state.offset,p_limit:PAGE_SIZE,p_search:clean($('q')?.value),p_filters:activeFilters()};
    const result=await Data().rest(endpoint,{method:'POST',body:JSON.stringify(payload)})||{};
    if(token!==state.request)return;
    state.rows=Array.isArray(result.rows)?result.rows:[];
    if(state.section==='aziende')renderCompanyStats();
    state.filtered=Number(result.filtered)||0;
    state.total=Number(result.total)||0;
    $('hubSectionCount').textContent=`${state.filtered} su ${state.total}`;
    renderRows();renderPager();
  }catch(e){
    const message=String(e?.message||e);
    if(message.includes('ACCESSO CRM RICHIESTO')){
      window.F1CRMAuthGuard?.show?.();
      return;
    }
    if(box)box.innerHTML='<div class="hub-empty">Non sono riuscito a caricare il CRM. Riprova o controlla la connessione.</div>';
    console.error('CRM Hub load:',e);
  }
}
function schedule(){clearTimeout(state.timer);state.offset=0;state.timer=setTimeout(load,250)}
function applySection(){
  state.section=sectionFromHash();state.offset=0;state.filters={};
  setNav();renderFilters();if($('q'))$('q').value='';
  load();
}
function init(){
  if(!hubEnabled())return;
  if(!location.hash)history.replaceState(null,'','#contatti');
  setNav();renderFilters();
  if($('q'))$('q').addEventListener('input',schedule);
  window.addEventListener('hashchange',()=>{if(hubEnabled())applySection()});
  window.addEventListener('f1-crm-data-changed',()=>load());
  if(window.F1UnifiedCRM)window.F1UnifiedCRM.reload=load;
  load();
}
document.addEventListener('click',e=>{const c=e.target.closest('[data-hub-close]');if(c){const d=$(c.dataset.hubClose);if(d?.open)d.close()}});
document.addEventListener('DOMContentLoaded',()=>{if($('saveCompanyBtn'))$('saveCompanyBtn').onclick=saveCompany;if($('saveCompanyOutcomeBtn'))$('saveCompanyOutcomeBtn').onclick=saveCompanyOutcome},{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();