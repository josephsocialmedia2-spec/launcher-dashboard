window.F1_SUPABASE = {
  // Backend canonico del CRM UNIFICATO. Non è sovrascrivibile da vecchi valori browser.
  url: 'https://nqnmlsmeiynxbdojeyjt.supabase.co',
  anonKey: 'sb_publishable_Clz5qPTkTtvwV0rqWTcfMQ_sCDSRgnu',
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
  const SELLER_STORE='f1_territory_contacts_v1';

  function crmState(){
    try{return state}catch(_){return null}
  }

  function safeRows(key){
    try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch(_){return[]}
  }

  function extractApprovalId(note){
    const m=String(note||'').match(/\[CENTRALE:([^\]]+)\]/i);
    return m?m[1].trim():'';
  }

  function extractLabel(note,label){
    const re=new RegExp('(?:^|\\|)\\s*'+label+'\\s*:\\s*([^|]+)','i'),m=String(note||'').match(re);
    return m?m[1].trim():'';
  }

  function sellerLeadId(row){
    const approval=extractApprovalId(row.note);
    if(approval)return 'seller-approved-'+approval.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
    const seed=[row.comune,row.via,row.civico,row.fonte].filter(Boolean).join('-').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
    return seed?'seller-approved-'+seed:'';
  }

  function syncApprovedSellerRows(){
    if(!window.F1AcquisitionCore)return 0;
    const seller=safeRows(SELLER_STORE).filter(r=>/APPROVATO DA CENTRALE RISULTATI|\[CENTRALE:/i.test(String(r.note||'')));
    if(!seller.length)return 0;
    const leads=F1AcquisitionCore.localLeads(),byId=new Map(leads.map((l,i)=>[String(l.lead_id||''),i]));
    let changed=0;
    for(const row of seller){
      const id=sellerLeadId(row);if(!id)continue;
      const idx=byId.has(id)?byId.get(id):-1,now=new Date().toISOString();
      const sourceUrl=extractLabel(row.note,'LINK ANNUNCIO');
      const propertyId=extractLabel(row.note,'PROPERTY_ID');
      if(idx>=0){
        const old=leads[idx]||{},next={...old};
        if(!next.comune&&row.comune)next.comune=row.comune;
        if(!next.via&&row.via)next.via=row.via;
        if(!next.civico&&row.civico)next.civico=row.civico;
        if(!next.telefono&&row.telefono)next.telefono=row.telefono;
        if(!next.email&&row.email)next.email=row.email;
        if(!next.source_url&&sourceUrl)next.source_url=sourceUrl;
        if(!next.immobile_id&&propertyId)next.immobile_id=propertyId;
        if(!next.notes&&row.note)next.notes=row.note;
        if(JSON.stringify(next)!==JSON.stringify(old)){next.updated_at=now;leads[idx]=next;changed++}
        continue;
      }
      leads.push({
        lead_id:id,pillar:1,source_type:'MARKET_SIGNAL',source:row.fonte||'SELLER_RADAR_APPROVATO',source_url:sourceUrl,
        created_at:now,first_seen:'',last_seen:'',nome:row.nome||'',cognome:row.cognome||'',azienda:'',telefono:row.telefono||'',email:row.email||'',
        comune:row.comune||'',via:row.via||'',civico:row.civico||'',zona:row.via||'',immobile_id:propertyId,competitor_agency:'',
        lead_reason:'SELLER_RADAR_APPROVATO',lead_score:50,confidence:'MEDIUM',status:'DA_ANALIZZARE',last_contact:'',next_action:'',next_action_date:'',
        assigned_to:'',notes:row.note||'',privacy_basis:'SELLER_RADAR_APPROVED_RECORD',do_not_contact:false,rpo_status:'DA_VERIFICARE',
        created_by:'central_approval_bridge',updated_at:now,deleted:false
      });
      byId.set(id,leads.length-1);changed++;
    }
    if(changed)F1AcquisitionCore.saveLocalLeads(leads);
    return changed;
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

  function refreshAfterImport(){
    try{if(typeof reload==='function')reload();else patch()}catch(_){patch()}
  }

  function start(){
    const list=document.getElementById('list');
    if(!list)return;
    const imported=syncApprovedSellerRows();
    if(imported)setTimeout(refreshAfterImport,0);
    patch();
    new MutationObserver(patch).observe(list,{childList:true,subtree:true});
    window.addEventListener('storage',e=>{if(e.key===SELLER_STORE&&syncApprovedSellerRows())refreshAfterImport()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
