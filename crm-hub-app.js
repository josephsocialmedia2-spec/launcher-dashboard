(()=>{
'use strict';
const $=id=>document.getElementById(id);
const Data=()=>window.F1AcquisitionData;
const PAGE_SIZE=50;
const HUB_SECTIONS=new Set(['','contatti','immobili','trattative','attivita']);
const LABELS={contatti:'CONTATTI',immobili:'IMMOBILI',trattative:'TRATTATIVE',attivita:'ATTIVITÀ'};
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
function sectionFromHash(){const h=location.hash.replace('#','').toLowerCase();return ['contatti','immobili','trattative','attivita'].includes(h)?h:'contatti'}
function payloadSection(){return state.section==='attivita'?'ATTIVITA':state.section.toUpperCase()}
function setNav(){
  document.querySelectorAll('#crmHubNav [data-section]').forEach(a=>a.classList.toggle('on',a.dataset.section===state.section));
  $('hubSectionTitle').textContent=LABELS[state.section]||'CRM';
  const q=$('q');
  if(q)q.placeholder=state.section==='contatti'?'Cerca in tutti i contatti...':state.section==='immobili'?'Cerca immobile, Comune, via, tipologia...':state.section==='trattative'?'Cerca trattativa, persona, Comune, stato...':'Cerca attività, persona, esito...';
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
  const fn=state.section==='contatti'?contactCard:state.section==='immobili'?propertyCard:state.section==='trattative'?dealCard:activityCard;
  box.innerHTML=state.rows.map(fn).join('');
  box.querySelectorAll('[data-edit-lead]').forEach(b=>b.onclick=()=>window.F1UnifiedCRM?.editLead?.(b.dataset.editLead));
  box.querySelectorAll('[data-done-task]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await Data().setTaskStatus(b.dataset.doneTask,'DONE','Completata dal CRM centrale');await load()}catch(e){alert(e.message||e)}finally{b.disabled=false}});
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
    const result=await Data().rest('rpc/f1_crm_hub_page_v1',{method:'POST',body:JSON.stringify({
      p_section:payloadSection(),p_offset:state.offset,p_limit:PAGE_SIZE,p_search:clean($('q')?.value),p_filters:activeFilters()
    })})||{};
    if(token!==state.request)return;
    state.rows=Array.isArray(result.rows)?result.rows:[];
    state.filtered=Number(result.filtered)||0;
    state.total=Number(result.total)||0;
    $('hubSectionCount').textContent=`${state.filtered} su ${state.total}`;
    renderRows();renderPager();
  }catch(e){
    if(box)box.innerHTML='<div class="hub-empty">Errore CRM: '+esc(e.message||e)+'</div>';
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
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();