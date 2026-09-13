window.F1_SUPABASE = {
  url: localStorage.getItem('f1SupabaseUrl') || 'https://nqnmlsmeiynxbdojeyjt.supabase.co',
  anonKey: localStorage.getItem('f1SupabaseAnonKey') || 'sb_publishable_Clz5qPTkTtvwV0rqWTcfMQ_sCDSRgnu',
  table: 'contacts',
  visitsTable: 'field_visits'
};

// Unica source of truth territoriale: config/territory.json.
// Questo file configura esclusivamente l'accesso Supabase; non contiene liste di comuni.
window.F1_TERRITORY_CONFIG_URL = './config/territory.json';

(function(){
  'use strict';
  if(!/\/crm\.html$/i.test(location.pathname)) return;

  const DEFAULT_PROVINCE='TO';

  function crmState(){
    try{return state}catch(_){return null}
  }

  function leadIdFromCard(card){
    const edit=card.querySelector('[onclick*="editLead("]');
    if(!edit)return'';
    const m=String(edit.getAttribute('onclick')||'').match(/editLead\('([^']+)'\)/);
    return m?m[1]:'';
  }

  function leadFromCard(card){
    const id=leadIdFromCard(card),s=crmState();
    return id&&s&&Array.isArray(s.leads)?s.leads.find(x=>String(x.lead_id)===String(id))||null:null;
  }

  function fullStreet(lead){
    let via=String(lead.via||lead.zona||'').trim();
    const civico=String(lead.civico||'').trim();
    if(civico&&via&&!new RegExp('(?:^|\\s)'+civico.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$','i').test(via))via+=' '+civico;
    return via.trim();
  }

  function directoryQuery(lead){
    const comune=String(lead.comune||'').trim();
    const provincia=String(lead.provincia||DEFAULT_PROVINCE).trim()||DEFAULT_PROVINCE;
    const via=fullStreet(lead);
    return [comune?`${comune} (${provincia})`:'',via].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
  }

  function pagineBiancheUrl(lead){
    const p=new URLSearchParams();
    p.set('dv',directoryQuery(lead));
    return 'https://www.paginebianche.it/cerca-da-indirizzo?'+p.toString();
  }

  function pagineGialleUrl(lead){
    const p=new URLSearchParams();
    p.set('qs','');
    p.set('dv',directoryQuery(lead));
    return 'https://www.paginegialle.it/ricerca?'+p.toString();
  }

  function controllaUrl(lead){
    const q=[fullStreet(lead),String(lead.comune||'').trim(),'annuncio immobiliare'].filter(Boolean).join(' ');
    return 'https://www.google.com/search?q='+encodeURIComponent(q);
  }

  function addStyles(){
    if(document.getElementById('crmIntelToolsStyle'))return;
    const s=document.createElement('style');
    s.id='crmIntelToolsStyle';
    s.textContent='.crm-intel-tools{display:inline-flex;gap:6px;align-items:center}.crm-tool-icon{display:inline-flex;width:36px;height:36px;align-items:center;justify-content:center;border:1px solid var(--line,#2a342c);border-radius:9px;background:#0d120e;color:#fff;text-decoration:none;font-size:10px;font-weight:900;letter-spacing:.02em}.crm-tool-icon:hover,.crm-tool-icon:focus{border-color:var(--g,#39f28a);color:var(--g,#39f28a);outline:none}.crm-tool-icon.search{font-size:17px}.crm-tool-icon[aria-disabled="true"]{opacity:.35;pointer-events:none}';
    document.head.appendChild(s);
  }

  function icon(href,label,text,cls=''){
    const a=document.createElement('a');
    a.className='crm-tool-icon '+cls;
    a.href=href||'#';
    a.target='_blank';
    a.rel='noopener';
    a.title=label;
    a.setAttribute('aria-label',label);
    a.textContent=text;
    if(!href)a.setAttribute('aria-disabled','true');
    return a;
  }

  function patch(){
    addStyles();
    document.querySelectorAll('#list .lead').forEach(card=>{
      if(card.querySelector('.crm-intel-tools'))return;
      const lead=leadFromCard(card),actions=card.querySelector('.actions');
      if(!lead||!actions)return;
      const tools=document.createElement('span');
      tools.className='crm-intel-tools';
      const hasSearch=!!(String(lead.comune||'').trim()||fullStreet(lead));
      const hasDirectory=!!directoryQuery(lead);
      tools.appendChild(icon(hasSearch?controllaUrl(lead):'', 'Controlla immobile su Google', '⌕', 'search'));
      tools.appendChild(icon(hasDirectory?pagineBiancheUrl(lead):'', 'Pagine Bianche · ricerca da indirizzo', 'PB'));
      tools.appendChild(icon(hasDirectory?pagineGialleUrl(lead):'', 'Pagine Gialle · ricerca da indirizzo', 'PG'));
      actions.appendChild(tools);
    });
  }

  function start(){
    const list=document.getElementById('list');
    if(!list)return;
    patch();
    new MutationObserver(patch).observe(list,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
