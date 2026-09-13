(()=>{
  const DECISION_KEY='f1ApprovalDecisionsV1';
  const SELLER_STORE='f1_territory_contacts_v1';
  const CROSS_STORE='f1_seller_cross_intelligence_v1';
  const PROGRESS_STORE='f1_seller_cross_progress_v1';
  const CROSS_VERSION='V3';
  const RUNNING=new Set();
  let acquisitionTasks=null,neighborhoodData=null,activeId='';

  const STEPS=[
    ['start','Avvio incrocio'],
    ['record','Recupero scheda Seller Radar'],
    ['matches','Incrocio stesso immobile / stesso indirizzo'],
    ['prices','Confronto fonti e prezzi'],
    ['microzone','Geolocalizzazione e microzona'],
    ['business','Attività e contatti business pubblici'],
    ['archive','Aggiornamento dossier e Archivio Contatti'],
    ['done','Incrocio completato']
  ];

  function readJson(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch(_){return fallback}}
  function writeJson(key,value){localStorage.setItem(key,JSON.stringify(value))}
  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
  function clean(v){return String(v||'').replace(/\s+/g,' ').trim()}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function unique(values){return [...new Set(values.filter(Boolean))]}
  function sleep(ms=35){return new Promise(r=>setTimeout(r,ms))}
  function splitAddress(raw){let via=String(raw||'').trim(),civico='';if(!via)via='INDIRIZZO DA VERIFICARE';if(!/da verificare|non disponibile|n\.d\./i.test(via)){const m=via.match(/\s+(\d+[A-Za-z]?(?:[\/-][A-Za-z0-9]+)?)$/);if(m){civico=m[1];via=via.slice(0,m.index).trim()}}return{via,civico}}
  function inferType(title){const s=norm(title),rules=[['villa bifamiliare','Villa bifamiliare'],['villa unifamiliare','Villa unifamiliare'],['casa indipendente','Casa indipendente'],['casa semindipendente','Casa semindipendente'],['attivita commerciale','Attività commerciale'],['locale commerciale','Locale commerciale'],['appartamento','Appartamento'],['capannone','Capannone'],['terratetto','Terratetto'],['rustico','Rustico'],['negozio','Negozio'],['villa','Villa']];for(const [k,v] of rules)if(s.includes(k))return v;return''}
  function archivePrice(v){const raw=String(v||'').trim();if(!raw)return'';if(/^\d+(?:\.0+)?$/.test(raw)){const n=Number(raw);if(Number.isFinite(n))return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n)}return raw}
  function urlKey(v){try{const u=new URL(String(v||''));u.hash='';u.pathname=u.pathname.replace(/\/+$/,'')||'/';return (u.origin+u.pathname+(u.search||'')).toLowerCase()}catch(_){return String(v||'').trim().toLowerCase()}}
  function samePlace(a,b){const ca=norm(a.comune),cb=norm(b.comune),va=norm(a.via),vb=norm(b.via);return !!ca&&ca===cb&&!!va&&va===vb&&!/da verificare|non disponibile/.test(va)}

  function decisionMap(){return readJson(DECISION_KEY,{})}
  function setDecision(id,status,extra={}){const d=decisionMap(),k=String(id),old=d[k]||{},now=new Date().toISOString();d[k]={...old,...extra,status,outcome:status==='DONE'?'COMPLETATO':status==='PROCESSING'?'IN_LAVORAZIONE':status==='ERROR'?'ERRORE':status==='CANCELLED'?'ELIMINATO':'',updated_at:now};writeJson(DECISION_KEY,d);return d[k]}
  function progressMap(){return readJson(PROGRESS_STORE,{})}
  function getProgress(id){return progressMap()[String(id)]||null}
  function saveProgress(id,p){const all=progressMap();all[String(id)]=p;writeJson(PROGRESS_STORE,all);renderModal();return p}
  function baseProgress(id){return{approval_id:String(id),version:CROSS_VERSION,status:'PROCESSING',started_at:new Date().toISOString(),updated_at:new Date().toISOString(),steps:STEPS.map(([id,label])=>({id,label,status:'WAITING',detail:'',updated_at:''})),snapshot:{}}}
  function patchProgress(id,patch){const p=getProgress(id)||baseProgress(id);Object.assign(p,patch,{updated_at:new Date().toISOString()});return saveProgress(id,p)}
  function step(id,key,status,detail=''){const p=getProgress(id)||baseProgress(id),s=p.steps.find(x=>x.id===key);if(s){s.status=status;s.detail=detail;s.updated_at=new Date().toISOString()}p.updated_at=new Date().toISOString();saveProgress(id,p);paint(id);return p}
  function snapshot(id,patch){const p=getProgress(id)||baseProgress(id);p.snapshot={...(p.snapshot||{}),...patch};p.updated_at=new Date().toISOString();saveProgress(id,p);return p}

  function findQueue(id){try{return (typeof queue!=='undefined'?queue:[]).find(r=>String(r.approval_id)===String(id))||null}catch(_){return null}}
  function paint(id){const d=decisionMap()[String(id)]||{},x=findQueue(id);if(x){x.status=d.status||x.status;x.outcome=d.outcome||x.outcome;x.updated_at=d.updated_at||x.updated_at;x.seller_transfer=d.seller_transfer||'';x.seller_cross_version=d.seller_cross_version||'';x.seller_error=d.seller_error||''}try{if(typeof render==='function')render()}catch(_){}renderModal()}

  async function tasks(){if(acquisitionTasks)return acquisitionTasks;const r=await fetch('data/acquisition-public.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('Feed Seller Radar non disponibile: HTTP '+r.status);const d=await r.json();acquisitionTasks=Array.isArray(d.tasks)?d.tasks:[];return acquisitionTasks}
  async function neighborhood(){if(neighborhoodData)return neighborhoodData;const r=await fetch('data/neighborhood_intelligence.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('Neighborhood Intelligence non disponibile: HTTP '+r.status);neighborhoodData=await r.json();return neighborhoodData}
  async function sourceTask(x){const a=await tasks();return a.find(t=>String(t.task_id||'')===String(x.task_id||x.approval_id||''))||a.find(t=>x.property_id&&String(t.property_id||'')===String(x.property_id))||a.find(t=>x.source_url&&urlKey(t.source_url)===urlKey(x.source_url))||x}
  async function sourceSignal(x,t){const n=await neighborhood(),signals=Array.isArray(n.signals)?n.signals:[],sourceUrl=String(t.source_url||x.source_url||'');return signals.find(s=>sourceUrl&&urlKey(s.url_annuncio)===urlKey(sourceUrl))||signals.find(s=>norm(s.comune)===norm(t.comune||x.comune)&&norm(s.indirizzo)===norm(t.via||x.metadata?.via)&&norm(s.immobile)===norm(t.immobile||x.subject))||signals.find(s=>norm(s.comune)===norm(t.comune||x.comune)&&norm(s.indirizzo)===norm(t.via||x.metadata?.via))||null}

  async function buildCross(x,t,id){
    step(id,'matches','RUNNING','Confronto dei record già raccolti dal motore.');await sleep();
    const all=await tasks(),sig=await sourceSignal(x,t),sourceUrl=String(t.source_url||x.source_url||'');
    const matches=all.filter(r=>String(r.task_id||'')!==String(t.task_id||'')&&((sourceUrl&&urlKey(r.source_url)===urlKey(sourceUrl))||(t.property_id&&r.property_id===t.property_id)||samePlace(r,t))).slice(0,30);
    step(id,'matches','DONE',matches.length?`${matches.length} corrispondenze trovate.`:'Nessun secondo record certo trovato.');snapshot(id,{same_address_matches:matches.length});await sleep();

    step(id,'prices','RUNNING','Confronto fonti, URL e prezzi disponibili.');await sleep();
    const sources=unique([t.source,...matches.map(r=>r.source)].map(clean)),urls=unique([sourceUrl,...matches.map(r=>r.source_url)].map(clean)),prices=unique([t.prezzo,...matches.map(r=>r.prezzo)].map(clean));
    step(id,'prices','DONE',`${sources.length} fonti · ${prices.length} valori prezzo.`);snapshot(id,{sources,source_count:sources.length,price_evidence:prices,urls});await sleep();

    step(id,'microzone','RUNNING','Lettura geocodifica, vie vicine e contesto territoriale.');await sleep();
    const streets=sig&&Array.isArray(sig.streets)?unique(sig.streets.map(v=>clean(v.street))).slice(0,20):[],geo=sig&&sig.geocode?{lat:sig.geocode.lat,lon:sig.geocode.lon,display_name:clean(sig.geocode.display_name)}:null;
    step(id,'microzone','DONE',geo?`${streets.length} vie vicine · indirizzo geocodificato.`:`${streets.length} vie vicine · geocodifica non disponibile.`);snapshot(id,{geocode:geo,nearby_streets:streets,enrichment_status:sig?clean(sig.enrichment_status):'NO_SIGNAL_MATCH'});await sleep();

    step(id,'business','RUNNING','Lettura attività ed enti pubblici già rilevati nella microzona.');await sleep();
    const entities=sig&&Array.isArray(sig.public_entities)?sig.public_entities.slice(0,20).map(e=>({name:clean(e.name),phone_public:clean(e.phone_public),email_public:clean(e.email_public),website:clean(e.website),source:clean(e.source)})):[],businessContacts=entities.filter(e=>e.phone_public||e.email_public||e.website);
    step(id,'business','DONE',`${entities.length} entità pubbliche · ${businessContacts.length} con recapito business.`);snapshot(id,{public_business_entities:entities,public_business_contacts_count:businessContacts.length});await sleep();

    const cross={version:CROSS_VERSION,approval_id:String(x.approval_id||''),property_id:String(t.property_id||x.property_id||''),generated_at:new Date().toISOString(),comune:clean(t.comune||x.comune),via:clean(t.via||x.metadata?.via),immobile:clean(t.immobile||x.subject),market_category:clean(t.market_category),task_type:clean(t.task_type),confidence:clean(t.confidence),source_count:sources.length,sources,urls,price_evidence:prices,same_address_matches:matches.map(r=>({source:r.source,source_url:r.source_url,prezzo:r.prezzo,immobile:r.immobile,market_category:r.market_category})),enrichment_status:sig?clean(sig.enrichment_status):'NO_SIGNAL_MATCH',geocode:geo,nearby_streets:streets,public_business_entities:entities,public_business_contacts_count:businessContacts.length,public_queries:sig&&sig.queries?sig.queries:{},microzone_context:sig&&sig.context?sig.context:{},privacy_note:'Incrocio automatico su annunci, dati territoriali e contatti business pubblici. Nessuna identità privata viene attribuita all immobile senza evidenza.'};
    const store=readJson(CROSS_STORE,{});store[String(x.approval_id)]=cross;writeJson(CROSS_STORE,store);return cross
  }

  function crossSummary(cross){const parts=[`INCROCIO AUTO ${CROSS_VERSION}`];if(cross.market_category)parts.push('MERCATO: '+cross.market_category);if(cross.sources.length)parts.push('FONTI: '+cross.sources.join(', '));if(cross.same_address_matches.length)parts.push('MATCH STESSO INDIRIZZO: '+cross.same_address_matches.length);if(cross.price_evidence.length)parts.push('PREZZI RILEVATI: '+cross.price_evidence.join(', '));if(cross.geocode&&cross.geocode.display_name)parts.push('INDIRIZZO GEO: '+cross.geocode.display_name);if(cross.nearby_streets.length)parts.push('VIE VICINE: '+cross.nearby_streets.slice(0,8).join(', '));if(cross.public_business_entities.length)parts.push('BUSINESS PUBBLICI MICROZONA: '+cross.public_business_entities.slice(0,6).map(e=>e.name||e.website).filter(Boolean).join(', '));if(cross.public_business_contacts_count)parts.push('CONTATTI BUSINESS PUBBLICI: '+cross.public_business_contacts_count);parts.push('ENRICHMENT: '+cross.enrichment_status);return '['+parts.join(' | ')+']'}
  function mergeCrossNote(note,cross){const old=String(note||''),cleaned=old.replace(/\[INCROCIO AUTO V[0-9]+[^\]]*\]/g,'').replace(/\s*\|\s*$/,'').trim();return [cleaned,crossSummary(cross)].filter(Boolean).join(' | ')}

  async function importSeller(x,id){
    step(id,'record','RUNNING','Recupero dei dati canonici del record approvato.');const t=await sourceTask(x);step(id,'record','DONE',`${clean(t.comune||x.comune)||'Comune non indicato'} · ${clean(t.via||x.metadata?.via)||'indirizzo da verificare'}`);snapshot(id,{comune:clean(t.comune||x.comune),via:clean(t.via||x.metadata?.via),immobile:clean(t.immobile||x.subject)});await sleep();
    const cross=await buildCross(x,t,id);
    step(id,'archive','RUNNING','Aggiornamento del dossier operativo.');await sleep();
    const sourceUrl=String(t.source_url||x.source_url||''),token='[CENTRALE:'+String(x.approval_id)+']',rows=readJson(SELLER_STORE,[]);let idx=rows.findIndex(r=>String(r.note||'').includes(token)||(sourceUrl&&String(r.note||'').includes(sourceUrl)));const addr=splitAddress(t.via||x.metadata?.via||''),subject=t.immobile||x.subject||'',baseNote=['APPROVATO DA CENTRALE RISULTATI',token,subject?'IMMOBILE: '+subject:'',x.result?'MOTIVO: '+x.result:'',sourceUrl?'LINK ANNUNCIO: '+sourceUrl:'',x.property_id?'PROPERTY_ID: '+x.property_id:''].filter(Boolean).join(' | ');
    let result='INSERTED_ENRICHED';
    if(idx>=0){const current=rows[idx]||{};rows[idx]={...current,comune:current.comune||t.comune||x.comune||'',via:current.via||addr.via,civico:current.civico||addr.civico,prezzo:current.prezzo||archivePrice(t.prezzo||x.metadata?.prezzo||''),tipologia:current.tipologia||inferType(subject),fonte:current.fonte||t.source||x.platform||'',note:mergeCrossNote(current.note||baseNote,cross),stato:'DA LAVORARE'};result='ENRICHED_EXISTING'}else{rows.unshift({data_annuncio:'',in_vendita_da:'',comune:t.comune||x.comune||'',nome:'',cognome:'',via:addr.via,civico:addr.civico,prezzo:archivePrice(t.prezzo||x.metadata?.prezzo||''),tipologia:inferType(subject),composta:'',telefono:'',email:'',facebook:'',instagram:'',tiktok:'',youtube:'',fonte:t.source||x.platform||'',note:mergeCrossNote(baseNote,cross),stato:'DA LAVORARE'})}
    writeJson(SELLER_STORE,rows);step(id,'archive','DONE',result==='ENRICHED_EXISTING'?'Dossier esistente aggiornato senza duplicato.':'Nuovo dossier creato in DA LAVORARE.');return result
  }

  async function processSeller(x,{focus=false}={}){
    const id=String(x.approval_id||'');if(!id||RUNNING.has(id))return;RUNNING.add(id);
    try{
      const p=baseProgress(id);saveProgress(id,p);setDecision(id,'PROCESSING',{seller_cross_version:'',seller_error:''});x.status='PROCESSING';if(focus&&typeof $==='function'&&$('state'))$('state').value='PROCESSING';paint(id);step(id,'start','DONE','Approvazione ricevuta. Incrocio avviato.');await sleep();
      const result=await importSeller(x,id);step(id,'done','DONE','Dossier pronto per la lavorazione.');patchProgress(id,{status:'DONE',completed_at:new Date().toISOString()});setDecision(id,'DONE',{seller_transfer:result,seller_cross_version:CROSS_VERSION,seller_error:''});paint(id)
    }catch(e){const msg=String(e&&e.message||e||'Errore sconosciuto');patchProgress(id,{status:'ERROR',error:msg});setDecision(id,'ERROR',{seller_error:msg});const p=getProgress(id);if(p){const running=p.steps.find(s=>s.status==='RUNNING');if(running)step(id,running.id,'ERROR',msg)}paint(id)
    }finally{RUNNING.delete(id)}
  }

  function injectModal(){if(document.getElementById('f1WorkModal'))return;const style=document.createElement('style');style.textContent='.f1wm{position:fixed;inset:0;background:#000b;z-index:9999;display:none;padding:18px;overflow:auto}.f1wm.show{display:block}.f1wm-box{max-width:900px;margin:30px auto;background:#0d120e;border:1px solid #66552a;border-radius:16px;padding:16px;color:#fff}.f1wm-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.f1wm-close{background:#181d19;color:#fff;border:1px solid #344039;border-radius:9px;padding:8px 10px;cursor:pointer}.f1wm-step{display:grid;grid-template-columns:22px 1fr;gap:8px;padding:10px 0;border-top:1px solid #263028}.f1wm-step:first-child{border-top:0}.f1wm-i{font-size:14px}.f1wm-step b{font-size:12px}.f1wm-step small{display:block;color:#aeb7b0;margin-top:4px;line-height:1.4}.f1wm-data{margin-top:12px;padding:12px;border:1px solid #2a342c;border-radius:10px;background:#080c09;font-size:11px;line-height:1.55;white-space:pre-wrap}.f1wm-yellow{color:#f4c95d}.f1wm-green{color:#39f28a}.f1wm-red{color:#ff7979}';document.head.appendChild(style);const d=document.createElement('div');d.id='f1WorkModal';d.className='f1wm';d.innerHTML='<div class="f1wm-box"><div class="f1wm-head"><div><div class="f1wm-yellow" style="font-size:10px;font-weight:900;letter-spacing:.12em">F1 · LIVE INCROCIO</div><h2 id="f1wmTitle" style="margin:5px 0 2px">IN LAVORAZIONE</h2><div id="f1wmMeta" style="color:#aeb7b0;font-size:11px"></div></div><button class="f1wm-close" onclick="window.F1SellerBridge.closeWork()">CHIUDI</button></div><div id="f1wmSteps" style="margin-top:14px"></div><div id="f1wmData" class="f1wm-data"></div></div>';d.addEventListener('click',e=>{if(e.target===d)window.F1SellerBridge.closeWork()});document.body.appendChild(d)}
  function icon(status){return status==='DONE'?'✓':status==='RUNNING'?'●':status==='ERROR'?'✕':'○'}
  function renderModal(){if(!activeId)return;injectModal();const m=document.getElementById('f1WorkModal'),p=getProgress(activeId),x=findQueue(activeId);if(!m||!p)return;document.getElementById('f1wmTitle').textContent=x&&x.subject?x.subject:'Incrocio Seller Radar';document.getElementById('f1wmMeta').textContent=(x&&x.comune?x.comune+' · ':'')+(p.status==='PROCESSING'?'🟡 IN LAVORAZIONE':p.status==='DONE'?'🟢 COMPLETATO':'🔴 ERRORE');document.getElementById('f1wmSteps').innerHTML=p.steps.map(s=>`<div class="f1wm-step"><div class="f1wm-i ${s.status==='RUNNING'?'f1wm-yellow':s.status==='DONE'?'f1wm-green':s.status==='ERROR'?'f1wm-red':''}">${icon(s.status)}</div><div><b>${esc(s.label)}</b>${s.detail?`<small>${esc(s.detail)}</small>`:''}</div></div>`).join('');const snap=p.snapshot||{},lines=[];if(snap.sources&&snap.sources.length)lines.push('FONTI: '+snap.sources.join(', '));if(snap.price_evidence&&snap.price_evidence.length)lines.push('PREZZI: '+snap.price_evidence.join(' / '));if(Number.isFinite(snap.same_address_matches))lines.push('MATCH STESSO IMMOBILE/INDIRIZZO: '+snap.same_address_matches);if(snap.geocode&&snap.geocode.display_name)lines.push('INDIRIZZO GEO: '+snap.geocode.display_name);if(snap.nearby_streets&&snap.nearby_streets.length)lines.push('VIE VICINE: '+snap.nearby_streets.slice(0,12).join(', '));if(Number.isFinite(snap.public_business_contacts_count))lines.push('CONTATTI BUSINESS PUBBLICI: '+snap.public_business_contacts_count);if(p.error)lines.push('ERRORE: '+p.error);document.getElementById('f1wmData').textContent=lines.length?lines.join('\n'):'I dati compariranno qui mentre vengono incrociati.';m.classList.add('show')}
  function openWork(id){activeId=String(id);injectModal();renderModal()}
  function closeWork(){const m=document.getElementById('f1WorkModal');if(m)m.classList.remove('show');activeId=''}

  const originalDecide=window.decide;
  window.decide=function(id,status){let x=findQueue(id);if(status==='DONE'&&x&&x.module==='SELLER_RADAR'){processSeller(x,{focus:true});return}return originalDecide(id,status)};

  async function backfill(attempt=0){let a=[];try{a=typeof queue!=='undefined'?queue:[]}catch(_){}if(!a.length&&attempt<20){setTimeout(()=>backfill(attempt+1),500);return}const d=decisionMap(),todo=a.filter(x=>x.module==='SELLER_RADAR'&&(()=>{const z=d[String(x.approval_id)]||{};return z.status==='PROCESSING'||z.status==='ERROR'||(z.status==='DONE'&&z.seller_cross_version!==CROSS_VERSION)})());for(const x of todo)await processSeller(x,{focus:false})}

  window.F1SellerBridge={openWork,closeWork,getProgress,version:CROSS_VERSION};
  window.addEventListener('load',()=>{injectModal();setTimeout(()=>backfill(),400)});
})();
