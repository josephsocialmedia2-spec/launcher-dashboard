(()=>{
  const DECISION_KEY='f1ApprovalDecisionsV1';
  const SELLER_STORE='f1_territory_contacts_v1';
  const CROSS_STORE='f1_seller_cross_intelligence_v1';
  const CROSS_VERSION='V2';
  let acquisitionTasks=null;
  let neighborhoodData=null;

  function readJson(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch(_){return fallback}}
  function writeJson(key,value){localStorage.setItem(key,JSON.stringify(value))}
  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
  function clean(v){return String(v||'').replace(/\s+/g,' ').trim()}
  function splitAddress(raw){let via=String(raw||'').trim(),civico='';if(!via)via='INDIRIZZO DA VERIFICARE';if(!/da verificare|non disponibile|n\.d\./i.test(via)){const m=via.match(/\s+(\d+[A-Za-z]?(?:[\/-][A-Za-z0-9]+)?)$/);if(m){civico=m[1];via=via.slice(0,m.index).trim()}}return{via,civico}}
  function inferType(title){const s=norm(title),rules=[['villa bifamiliare','Villa bifamiliare'],['villa unifamiliare','Villa unifamiliare'],['casa indipendente','Casa indipendente'],['casa semindipendente','Casa semindipendente'],['attivita commerciale','Attività commerciale'],['locale commerciale','Locale commerciale'],['appartamento','Appartamento'],['capannone','Capannone'],['terratetto','Terratetto'],['rustico','Rustico'],['negozio','Negozio'],['villa','Villa']];for(const [k,v] of rules)if(s.includes(k))return v;return''}
  function archivePrice(v){const raw=String(v||'').trim();if(!raw)return'';if(/^\d+(?:\.0+)?$/.test(raw)){const n=Number(raw);if(Number.isFinite(n))return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n)}return raw}
  function unique(values){return [...new Set(values.filter(Boolean))]}
  function urlKey(v){try{const u=new URL(String(v||''));u.hash='';u.pathname=u.pathname.replace(/\/+$/,'')||'/';return (u.origin+u.pathname+(u.search||'')).toLowerCase()}catch(_){return String(v||'').trim().toLowerCase()}}
  function samePlace(a,b){const ca=norm(a.comune),cb=norm(b.comune),va=norm(a.via),vb=norm(b.via);return !!ca&&ca===cb&&!!va&&va===vb&&!/da verificare|non disponibile/.test(va)}

  async function tasks(){if(acquisitionTasks)return acquisitionTasks;try{const r=await fetch('data/acquisition-public.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();acquisitionTasks=Array.isArray(d.tasks)?d.tasks:[]}catch(_){acquisitionTasks=[]}return acquisitionTasks}
  async function neighborhood(){if(neighborhoodData)return neighborhoodData;try{const r=await fetch('data/neighborhood_intelligence.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);neighborhoodData=await r.json()}catch(_){neighborhoodData={signals:[]}}return neighborhoodData}
  async function sourceTask(x){const a=await tasks();return a.find(t=>String(t.task_id||'')===String(x.task_id||x.approval_id||''))||a.find(t=>x.property_id&&String(t.property_id||'')===String(x.property_id))||a.find(t=>x.source_url&&urlKey(t.source_url)===urlKey(x.source_url))||x}
  async function sourceSignal(x,t){const n=await neighborhood(),signals=Array.isArray(n.signals)?n.signals:[],sourceUrl=String(t.source_url||x.source_url||'');return signals.find(s=>sourceUrl&&urlKey(s.url_annuncio)===urlKey(sourceUrl))||signals.find(s=>norm(s.comune)===norm(t.comune||x.comune)&&norm(s.indirizzo)===norm(t.via||x.metadata?.via)&&norm(s.immobile)===norm(t.immobile||x.subject))||signals.find(s=>norm(s.comune)===norm(t.comune||x.comune)&&norm(s.indirizzo)===norm(t.via||x.metadata?.via))||null}

  async function buildCross(x,t){
    const [all,sig,n]=await Promise.all([tasks(),sourceSignal(x,t),neighborhood()]);
    const sourceUrl=String(t.source_url||x.source_url||'');
    const matches=all.filter(r=>String(r.task_id||'')!==String(t.task_id||'')&&((sourceUrl&&urlKey(r.source_url)===urlKey(sourceUrl))||(t.property_id&&r.property_id===t.property_id)||samePlace(r,t))).slice(0,30);
    const sources=unique([t.source,...matches.map(r=>r.source)]);
    const urls=unique([sourceUrl,...matches.map(r=>r.source_url)]);
    const prices=unique([t.prezzo,...matches.map(r=>r.prezzo)].map(v=>clean(v)));
    const streets=sig&&Array.isArray(sig.streets)?unique(sig.streets.map(v=>clean(v.street))).slice(0,20):[];
    const entities=sig&&Array.isArray(sig.public_entities)?sig.public_entities.slice(0,20).map(e=>({name:clean(e.name),phone_public:clean(e.phone_public),email_public:clean(e.email_public),website:clean(e.website),source:clean(e.source)})):[];
    const businessContacts=entities.filter(e=>e.phone_public||e.email_public||e.website);
    const geo=sig&&sig.geocode?{lat:sig.geocode.lat,lon:sig.geocode.lon,display_name:clean(sig.geocode.display_name)}:null;
    const cross={
      version:CROSS_VERSION,
      approval_id:String(x.approval_id||''),
      property_id:String(t.property_id||x.property_id||''),
      generated_at:new Date().toISOString(),
      comune:clean(t.comune||x.comune),
      via:clean(t.via||x.metadata?.via),
      immobile:clean(t.immobile||x.subject),
      market_category:clean(t.market_category),
      task_type:clean(t.task_type),
      confidence:clean(t.confidence),
      source_count:sources.length,
      sources,
      urls,
      price_evidence:prices,
      same_address_matches:matches.map(r=>({source:r.source,source_url:r.source_url,prezzo:r.prezzo,immobile:r.immobile,market_category:r.market_category})),
      enrichment_status:sig?clean(sig.enrichment_status):'NO_SIGNAL_MATCH',
      geocode:geo,
      nearby_streets:streets,
      public_business_entities:entities,
      public_business_contacts_count:businessContacts.length,
      public_queries:sig&&sig.queries?sig.queries:{},
      microzone_context:sig&&sig.context?sig.context:{},
      privacy_note:'Incrocio automatico su annunci, dati territoriali e contatti business pubblici. Nessuna identità privata viene inferita dall indirizzo.'
    };
    const store=readJson(CROSS_STORE,{});store[String(x.approval_id)]=cross;writeJson(CROSS_STORE,store);return cross
  }

  function crossSummary(cross){
    const parts=[`INCROCIO AUTO ${CROSS_VERSION}`];
    if(cross.market_category)parts.push('MERCATO: '+cross.market_category);
    if(cross.sources.length)parts.push('FONTI: '+cross.sources.join(', '));
    if(cross.same_address_matches.length)parts.push('MATCH STESSO INDIRIZZO: '+cross.same_address_matches.length);
    if(cross.price_evidence.length)parts.push('PREZZI RILEVATI: '+cross.price_evidence.join(', '));
    if(cross.geocode&&cross.geocode.display_name)parts.push('INDIRIZZO GEO: '+cross.geocode.display_name);
    if(cross.nearby_streets.length)parts.push('VIE VICINE: '+cross.nearby_streets.slice(0,8).join(', '));
    if(cross.public_business_entities.length)parts.push('BUSINESS PUBBLICI MICROZONA: '+cross.public_business_entities.slice(0,6).map(e=>e.name||e.website).filter(Boolean).join(', '));
    if(cross.public_business_contacts_count)parts.push('CONTATTI BUSINESS PUBBLICI: '+cross.public_business_contacts_count);
    parts.push('ENRICHMENT: '+cross.enrichment_status);
    return '['+parts.join(' | ')+']'
  }

  function mergeCrossNote(note,cross){const marker='[INCROCIO AUTO '+CROSS_VERSION;const old=String(note||'');const cleaned=old.replace(/\[INCROCIO AUTO V2[^\]]*\]/g,'').replace(/\s*\|\s*$/,'').trim();return [cleaned,crossSummary(cross)].filter(Boolean).join(' | ')}

  async function importSeller(x){
    const t=await sourceTask(x),sourceUrl=String(t.source_url||x.source_url||''),token='[CENTRALE:'+String(x.approval_id)+']',rows=readJson(SELLER_STORE,[]),cross=await buildCross(x,t);
    let idx=rows.findIndex(r=>String(r.note||'').includes(token)||(sourceUrl&&String(r.note||'').includes(sourceUrl)));
    const addr=splitAddress(t.via||x.metadata?.via||''),subject=t.immobile||x.subject||'';
    const baseNote=['APPROVATO DA CENTRALE RISULTATI',token,subject?'IMMOBILE: '+subject:'',x.result?'MOTIVO: '+x.result:'',sourceUrl?'LINK ANNUNCIO: '+sourceUrl:'',x.property_id?'PROPERTY_ID: '+x.property_id:''].filter(Boolean).join(' | ');
    if(idx>=0){const current=rows[idx]||{};rows[idx]={...current,comune:current.comune||t.comune||x.comune||'',via:current.via||addr.via,civico:current.civico||addr.civico,prezzo:current.prezzo||archivePrice(t.prezzo||x.metadata?.prezzo||''),tipologia:current.tipologia||inferType(subject),fonte:current.fonte||t.source||x.platform||'',note:mergeCrossNote(current.note||baseNote,cross),stato:current.stato||'DA LAVORARE'};writeJson(SELLER_STORE,rows);return'ENRICHED_EXISTING'}
    rows.unshift({data_annuncio:'',in_vendita_da:'',comune:t.comune||x.comune||'',nome:'',cognome:'',via:addr.via,civico:addr.civico,prezzo:archivePrice(t.prezzo||x.metadata?.prezzo||''),tipologia:inferType(subject),composta:'',telefono:'',email:'',facebook:'',instagram:'',tiktok:'',youtube:'',fonte:t.source||x.platform||'',note:mergeCrossNote(baseNote,cross),stato:'DA LAVORARE'});writeJson(SELLER_STORE,rows);return'INSERTED_ENRICHED'
  }

  function markTransfer(id,result){const d=readJson(DECISION_KEY,{}),k=String(id),prev=d[k]||{};d[k]={...prev,status:'DONE',outcome:'APPROVATO',seller_transfer:result,seller_cross_version:CROSS_VERSION,updated_at:new Date().toISOString()};writeJson(DECISION_KEY,d)}

  const originalDecide=window.decide;
  if(typeof originalDecide==='function'){
    window.decide=async function(id,status){
      let x=null;try{x=(typeof queue!=='undefined'?queue:[]).find(r=>String(r.approval_id)===String(id))}catch(_){}
      if(status==='DONE'&&x&&x.module==='SELLER_RADAR'){
        try{const result=await importSeller(x);originalDecide(id,status);markTransfer(id,result);x.seller_transfer=result;x.seller_cross_version=CROSS_VERSION;if(typeof render==='function')render();return}catch(e){alert('Incrocio automatico Seller Radar non riuscito: '+e.message);return}
      }
      return originalDecide(id,status)
    }
  }

  async function backfill(attempt=0){
    let a=[];try{a=typeof queue!=='undefined'?queue:[]}catch(_){}
    if(!a.length&&attempt<20){setTimeout(()=>backfill(attempt+1),500);return}
    const d=readJson(DECISION_KEY,{}),approved=a.filter(x=>x.module==='SELLER_RADAR'&&(d[String(x.approval_id)]||{}).status==='DONE');let changed=false;
    for(const x of approved){const old=d[String(x.approval_id)]||{};if(old.seller_cross_version===CROSS_VERSION)continue;try{const result=await importSeller(x);markTransfer(x.approval_id,result);x.seller_transfer=result;x.seller_cross_version=CROSS_VERSION;changed=true}catch(e){console.warn('Seller cross backfill',x.approval_id,e)}}
    if(changed&&typeof render==='function')render()
  }
  window.addEventListener('load',()=>setTimeout(()=>backfill(),300));
})();
