(()=>{
'use strict';
const VERSION='20260918-online-v3';
const $=id=>document.getElementById(id);
const txt=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const rpc=(n,p={})=>F1StaffData.rpc(n,p);
const MUNICIPALITIES={
  lower:['Almese','Avigliana','Borgone Susa','Bruzolo','Bussoleno','Caprie','Caselette','Chianocco','Chiusa di San Michele','Condove','Mattie','Meana di Susa','Mompantero','Rubiana','San Didero','San Giorio di Susa','Sant’Ambrogio di Torino','Sant’Antonino di Susa','Susa','Vaie','Venaus','Villar Dora','Villar Focchiardo'],
  upper:['Bardonecchia','Cesana Torinese','Chiomonte','Exilles','Claviere','Gravere','Oulx','Salbertrand','Sauze d’Oulx','Sauze di Cesana','Sestriere'],
  cenischia:['Giaglione','Novalesa','Moncenisio']
};
const ALLOWED_ROADS=new Set(['residential','service','living_street','pedestrian','unclassified','tertiary','tertiary_link','secondary','secondary_link','primary','primary_link','track','road']);
const EDIT_SIGNALS=['NESSUN SEGNALE','IMMOBILE GIÀ SUL MERCATO','CARTELLO VENDITA','CARTELLO AFFITTO','LAVORI','CANTIERE','RISTRUTTURAZIONE','NUOVA COSTRUZIONE','TERRENO','POSSIBILE IMMOBILE NON UTILIZZATO','CIVICO NON INDIVIDUATO','ALTRO'];
const EDIT_TYPES=['CONDOMINIO','APPARTAMENTO','VILLA','CASA INDIPENDENTE','BIFAMILIARE','RUSTICO','TERRENO','NEGOZIO','LOCALE COMMERCIALE','CAPANNONE','ALTRO'];
const EDIT_TARGETS=['NEGOZIO','RESIDENTE','VICINO','AMMINISTRATORE','CONOSCENTE DELLA ZONA','NESSUNO APPROPRIATO'];
let selectedMunicipality='';
let crmCache=null;
let activeContact={target:'',civic:'',progressId:'',record:null};
let activeNoteRecord=null;
let mediaRecorder=null;
let mediaStream=null;
let mediaChunks=[];
let mediaStarted=0;
let audioTimer=null;
let contactDraftTimer=null;
let activeEditRecord=null;

function excludedRoad(name,type=''){
  const n=txt(name).toUpperCase(),t=txt(type).toLowerCase();
  return !name||n.includes('AUTOSTRADA')||n.includes('RACCORDO AUTOSTRADALE')||n==='A32'||n==='E70'||['motorway','motorway_link','trunk','trunk_link'].includes(t);
}
function setStatus(id,msg,bad=false){
  const e=$(id);if(!e)return;e.textContent=msg;e.style.color=bad?'#b42318':'#0b6f3d';
}
function screen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));
  document.querySelectorAll('.topnav').forEach(b=>b.classList.toggle('active',b.dataset.screen===id));
  window.scrollTo(0,0);
}
async function crm(force=false){
  if(!force&&crmCache)return crmCache;
  crmCache=await rpc('f1_territory_mobile_crm_v3',{p_limit:1200})||{};
  crmCache.civics=crmCache.civics||[];
  crmCache.conversations=crmCache.conversations||[];
  crmCache.news=crmCache.news||[];
  crmCache.notes=crmCache.notes||[];
  crmCache.letters=crmCache.letters||[];
  crmCache.streets=crmCache.streets||[];
  crmCache.territory_leads=crmCache.territory_leads||[];
  crmCache.zone_runs=crmCache.zone_runs||[];
  return crmCache;
}
async function engine(force=false){return F1NotiziereEngine.load({force})}
async function currentContext(){
  const e=await engine(false),p=e?.territory?.progress||null;
  return {engine:e,progress:p,civic:txt($('civicInput')?.value)||txt(p?.next_civic)||txt(p?.civic_start)};
}
async function ensureCurrentCivic(){
  const x=await currentContext();
  if(!x.progress)throw new Error('SELEZIONA PRIMA UNA VIA');
  if(!x.civic)throw new Error('INSERISCI PRIMA IL CIVICO');
  await rpc('f1_territory_set_manual_civic_v3',{p_progress_id:x.progress.progress_id,p_civico:x.civic});
  await rpc('f1_territory_ensure_civic_v2',{p_progress_id:x.progress.progress_id,p_civico:x.civic});
  const data=await crm(true);
  const rec=data.civics.find(r=>r.progress_id===x.progress.progress_id&&txt(r.civico)===x.civic&&txt(r.via).toLowerCase()===txt(x.progress.via).toLowerCase());
  if(!rec)throw new Error('RIGA CRM IMMOBILE NON DISPONIBILE');
  return {...x,record:rec};
}

function injectStyle(){
  if($('f1TerritoryV3Style'))return;
  const s=document.createElement('style');s.id='f1TerritoryV3Style';s.textContent=`
  .v3-list{display:grid;gap:8px}.v3-muni,.v3-street{width:100%;text-align:left;border:1px solid var(--line);border-radius:12px;background:#fff;padding:11px;cursor:pointer;display:flex;justify-content:space-between;gap:10px;align-items:center;font:inherit}.v3-muni strong,.v3-street strong{font-size:12px}.v3-muni small,.v3-street small{display:block;margin-top:3px;color:var(--mut);font-size:9px}.v3-state{font-size:8px;font-weight:950;color:var(--g);white-space:nowrap}.v3-search{margin:10px 0}.v3-gps{background:var(--g);color:#fff;border:0;border-radius:13px;padding:13px;width:100%;font-weight:950;cursor:pointer}.v3-gps.off{background:#163f2b}.v3-status{font-size:10px;font-weight:850;margin-top:8px;color:var(--mut);line-height:1.4}.v3-script{margin-top:10px;padding:11px;border:1px solid #b9dfc9;border-radius:11px;background:#f4fbf7}.v3-script .ask{font-size:13px;font-weight:950;font-style:italic}.v3-script .offer{margin-top:8px;font-size:10px;font-weight:900;line-height:1.45}.v3-wa{margin-top:9px;width:100%;min-height:48px;border:0;border-radius:11px;background:#148c4f;color:#fff;font-weight:950;cursor:pointer}.v3-value{margin-top:10px;padding:11px;border:1px solid #e2b500;border-radius:11px;background:#fffbea}.v3-value-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}.v3-value-grid button{border:1px solid #e2b500;background:#fff;border-radius:9px;padding:8px;font-size:9px;font-weight:900}.v3-note-row{display:flex;gap:10px;align-items:center;margin-top:10px}.v3-note-btn{width:88px;height:78px;border:0;border-radius:10px;background:#d71920;color:#fff;font-weight:950;cursor:pointer}.v3-note-count{font-size:9px;color:#a61d22;font-weight:900}.v3-contact-context{padding:9px;border:1px solid #b9dfc9;border-radius:10px;background:#f4fbf7;font-size:10px}.v3-outcomes{display:grid;grid-template-columns:1fr 1fr;gap:7px}.v3-outcomes button{min-height:44px;border:1px solid var(--line);background:#fff;border-radius:10px;font-size:10px;font-weight:900}.v3-notes-list{display:grid;gap:8px}.v3-note{border:1px solid var(--line);border-radius:10px;padding:9px}.v3-note small{color:var(--mut)}.v3-note audio{width:100%;margin-top:7px}.v3-record{background:#d71920!important;color:#fff!important}.v3-audio-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.v3-export{background:#0b6f3d!important;color:#fff!important}.rownum button{border:0;background:transparent;color:#0b6f3d;font-weight:950;cursor:pointer}.v3-crm-note{min-width:170px}.v3-crm-note button{margin-top:4px}.v3-hidden{display:none!important}
  @media(max-width:560px){.v3-value-grid{grid-template-columns:1fr}.v3-audio-actions{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
}
function injectScreens(){
  if(!$('municipalities')){
    const home=$('home');
    home.insertAdjacentHTML('afterend',`
    <section id="municipalities" class="screen"><div class="stack">
      <div class="card"><div class="ey">RICERCA TERRITORIALE</div><h1>COMUNI DELLA VALLE DI SUSA</h1><input id="v3MunicipalitySearch" class="v3-search" placeholder="Cerca Comune"><div id="v3MunicipalityList" class="v3-list"></div></div>
    </div></section>
    <section id="municipality" class="screen"><div class="stack">
      <div class="card"><div class="ey">COMUNE ASSEGNATO / SELEZIONATO</div><h1 id="v3MunicipalityTitle">—</h1><button id="v3GpsBtn" class="v3-gps off" type="button">◎ ATTIVA GPS · POSIZIONE PRECISA</button><div id="v3GpsState" class="v3-status">GPS OFF · parte solo premendo il tasto.</div></div>
      <div class="card"><div class="row"><h2>ELENCO VIE</h2><span id="v3StreetCount" class="queuecount">0</span></div><div id="v3StreetStatus" class="v3-status">Seleziona un Comune.</div><div id="v3StreetList" class="v3-list" style="margin-top:10px"></div></div>
    </div></section>
    <section id="civicEdit" class="screen"><div class="stack">
      <div class="card">
        <div class="row"><div><div class="ey">CRM · MODIFICA IMMOBILE</div><h2 id="v3EditComune">—</h2><div id="v3EditVia" class="route">—</div></div><button id="v3EditBack" class="mini" type="button">← CRM</button></div>
        <div class="mut" style="margin-top:12px">CIVICO</div><div style="font-size:30px;font-weight:950" id="v3EditCivic">—</div>
        <div class="v3-note-row"><button id="v3EditNotes" class="v3-note-btn" type="button">＋<br>AGGIUNGI<br>NOTE</button><div><strong id="v3EditNoteCount" class="v3-note-count">0 NOTE</strong><div class="mut" style="font-size:9px;margin-top:3px">Note scritte o audio collegate esattamente a questa riga CRM.</div></div></div>
        <div class="v3-contact-context" style="margin-top:10px"><div class="ey">PROSSIMA AZIONE</div><strong id="v3EditNext">—</strong></div>
        <div id="v3EditReadOnly" class="v3-status"></div>
      </div>
      <div class="card"><div class="row"><h2>COSA VEDI?</h2><span class="ey">SALVATAGGIO ONLINE</span></div><div id="v3EditSignals" class="grid2" style="margin-top:9px"></div><div id="v3EditSignalState" class="v3-status"></div></div>
      <div class="card"><div class="row"><h2>TIPO IMMOBILE</h2><span class="mut">facoltativo</span></div><div id="v3EditTypes" class="grid2" style="margin-top:9px"></div><div id="v3EditTypeState" class="v3-status"></div></div>
      <div class="card">
        <div class="row"><h2>PARLA CON QUALCUNO</h2><span class="ey">QUANDO APPROPRIATO</span></div>
        <p class="mut" style="margin-top:6px">L'obiettivo è ottenere informazioni immobiliari utili, non semplicemente completare una mappa.</p>
        <div class="ey" style="margin-top:13px">CON CHI PUOI PARLARE?</div><div id="v3EditTargets" class="grid2" style="margin-top:8px"></div>
        <div class="scriptbox"><strong>DOMANDA CENTRALE</strong><br>«Buongiorno, F1 Immobiliare. Sto lavorando specificamente questa zona. Per caso sa se nel quartiere c'è qualcuno che sta pensando di vendere nei prossimi mesi?»</div>
        <div class="v3-script"><div class="ask">“Qual è il numero migliore a cui contattarla?”</div><div class="offer">LE MANDO LE NOSTRE OFFERTE IMMOBILIARI, DOVESSE AVERE BISOGNO HA I NOSTRI RECAPITI!</div><button id="v3EditSendBulletin" class="v3-wa" type="button">INVIO GIORNALINO · WHATSAPP</button><div id="v3EditBulletinState" class="v3-status">Il PDF viene pubblicato dal Titolare F1 dalla dashboard centrale.</div></div>
        <div class="v3-value"><div class="ey">OTTENERE IL NUMERO · SCAMBIO DI VALORE PROFESSIONALE</div><div class="v3-value-grid"><button type="button" data-v3-edit-value="REPORT PREZZI ZONA">REPORT PREZZI ZONA</button><button type="button" data-v3-edit-value="APPENA ACQUISITO">APPENA ACQUISITO</button><button type="button" data-v3-edit-value="APPENA VENDUTO">APPENA VENDUTO</button></div><div id="v3EditValueScript" class="v3-status"><b>FRASE DA DIRE</b><br>Seleziona il valore che stai offrendo.</div></div>
      </div>
    </div></section>`);
  }
}
function injectTerritoryExtras(){
  const terr=$('terr');if(!terr)return;
  const firstCard=terr.querySelector('.card');
  if(firstCard&&!$('v3AddNotes')){
    const wrap=document.createElement('div');wrap.className='v3-note-row';wrap.innerHTML='<button id="v3AddNotes" class="v3-note-btn" type="button">＋<br>AGGIUNGI<br>NOTE</button><div><strong id="v3NoteCount" class="v3-note-count">0 NOTE</strong><div class="mut" style="font-size:9px;margin-top:3px">Note scritte o audio collegate alla riga CRM.</div></div>';
    firstCard.appendChild(wrap);
    const next=document.createElement('div');next.id='v3OperationalNext';next.className='v3-contact-context';next.style.marginTop='10px';next.innerHTML='<div class="ey">PROSSIMA AZIONE</div><strong id="v3OperationalNextText">—</strong>';firstCard.appendChild(next);
  }
  const script=terr.querySelector('.scriptbox');
  if(script&&!$('v3SendBulletin')){
    script.insertAdjacentHTML('afterend',`
    <div class="v3-script"><div class="ask">“Qual è il numero migliore a cui contattarla?”</div><div class="offer">LE MANDO LE NOSTRE OFFERTE IMMOBILIARI, DOVESSE AVERE BISOGNO HA I NOSTRI RECAPITI!</div><button id="v3SendBulletin" class="v3-wa" type="button">INVIO GIORNALINO · WHATSAPP</button><div id="v3BulletinState" class="v3-status">Il PDF viene pubblicato dal Titolare F1 dalla dashboard centrale.</div></div>
    <div class="v3-value"><div class="ey">OTTENERE IL NUMERO · SCAMBIO DI VALORE PROFESSIONALE</div><p class="mut" style="font-size:10px;margin-top:5px">Non presentarla come una richiesta d'aiuto. Collega il recapito a un servizio utile che F1 potrà fornire nel tempo.</p><div class="v3-value-grid"><button type="button" data-v3-value="REPORT PREZZI ZONA">REPORT PREZZI ZONA</button><button type="button" data-v3-value="APPENA ACQUISITO">APPENA ACQUISITO</button><button type="button" data-v3-value="APPENA VENDUTO">APPENA VENDUTO</button></div><div id="v3ValueScript" class="v3-status"><b>FRASE DA DIRE</b><br>Seleziona il valore che stai offrendo.</div><div class="v3-status"><b>1.</b> “Qual è il numero migliore a cui contattarla?”<br><b>2.</b> Dopo la domanda, fai silenzio.<br><b>3.</b> Se chiede perché serve, ribadisci il valore. Non inventare prefissi o cifre.</div></div>`);
  }
}
function injectModals(){
  if(!$('v3ContactModal')){
    document.body.insertAdjacentHTML('beforeend',`
    <div id="v3ContactModal" class="modal"><div class="sheet"><div class="sheethead"><div><div class="ey">CRM · CONTATTO TERRITORIALE</div><h2 id="v3ContactTitle">CONTATTO</h2></div><button data-v3-close="v3ContactModal">×</button></div><div class="sheetbody"><div id="v3ContactContext" class="v3-contact-context">—</div><div class="field"><label>NOME / ATTIVITÀ (facoltativo)</label><input id="v3ContactName"></div><div class="field"><label>TELEFONO / WHATSAPP</label><input id="v3ContactPhone" inputmode="tel"></div><div class="field"><label>NOTA</label><textarea id="v3ContactNotes" placeholder="Che cosa ti ha detto?"></textarea></div><div class="ey">COME È ANDATA?</div><div id="v3ContactOutcomes" class="v3-outcomes"></div><button id="v3ContactLetter" class="btn wide" type="button">✉ LETTERA DI PROPOSTA DI COLLABORAZIONE</button><div id="v3ContactState" class="autosave">CRM pronto.</div></div></div></div>
    <div id="v3NotesModal" class="modal"><div class="sheet"><div class="sheethead"><div><div class="ey">CRM · NOTE IMMOBILE</div><h2 id="v3NotesTitle">AGGIUNGI NOTE</h2></div><button data-v3-close="v3NotesModal">×</button></div><div class="sheetbody"><div id="v3NotesContext" class="v3-contact-context">—</div><div class="field"><label>NOTA SCRITTA</label><textarea id="v3NoteText"></textarea></div><button id="v3SaveTextNote" class="btn primary wide" type="button">SALVA NOTA SCRITTA</button><div class="v3-audio-actions"><button id="v3StartAudio" class="btn v3-record" type="button">● REGISTRA AUDIO</button><button id="v3StopAudio" class="btn" type="button" disabled>■ STOP <span id="v3AudioTime">00:00</span></button></div><div id="v3AudioState" class="v3-status">Microfono pronto.</div><div class="row"><strong>NOTE SALVATE</strong><span id="v3NotesCount" class="queuecount">0</span></div><div id="v3NotesList" class="v3-notes-list"></div></div></div></div>`);
  }
}
function allMunicipalities(){return [...MUNICIPALITIES.lower,...MUNICIPALITIES.upper,...MUNICIPALITIES.cenischia]}
function renderMunicipalities(q=''){
  const host=$('v3MunicipalityList');if(!host)return;
  q=txt(q).toLocaleLowerCase('it-IT');
  const rows=allMunicipalities().filter(x=>!q||x.toLocaleLowerCase('it-IT').includes(q));
  host.innerHTML=rows.map(name=>'<button class="v3-muni" data-v3-municipality="'+esc(name)+'"><span><strong>'+esc(name)+'</strong><small>Apri Comune e carica le vie reali</small></span><span>→</span></button>').join('');
  host.querySelectorAll('[data-v3-municipality]').forEach(b=>b.onclick=()=>selectMunicipality(b.dataset.v3Municipality));
}
async function selectMunicipality(name){
  selectedMunicipality=name;
  $('v3MunicipalityTitle').textContent=name;
  screen('municipality');
  setStatus('v3StreetStatus','Carico le vie già disponibili…');
  await loadMunicipalityStreets(name,true);
}
async function getCachedStreets(name){
  const r=await rpc('f1_territory_streets_v3',{p_comune:name});
  return Array.isArray(r)?r:[];
}
function renderStreets(rows){
  const clean=(rows||[]).filter(r=>!excludedRoad(r.via,r.road_type)).sort((a,b)=>String(a.via).localeCompare(String(b.via),'it'));
  $('v3StreetCount').textContent=clean.length;
  $('v3StreetList').innerHTML=clean.length?clean.map(r=>'<button class="v3-street" data-v3-street="'+esc(r.via)+'" data-v3-source="'+esc(r.source||'OPENSTREETMAP')+'" data-v3-ref="'+esc(r.source_ref||'')+'"><span><strong>'+esc(r.via)+'</strong><small>'+Number(r.civic_count||0)+' civici registrati'+(r.last_civic?' · ultimo '+esc(r.last_civic):'')+'</small></span><span class="v3-state">'+esc((r.status||'DA_INIZIARE').replaceAll('_',' '))+'</span></button>').join(''):'<div class="mut">Nessuna via disponibile.</div>';
  $('v3StreetList').querySelectorAll('[data-v3-street]').forEach(b=>b.onclick=()=>openStreet(b.dataset.v3Street,b.dataset.v3Source,b.dataset.v3Ref));
}
async function locateMunicipality(name){
  const u='https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=it&q='+encodeURIComponent(name+', Torino, Piemonte, Italia');
  const r=await fetch(u,{headers:{'Accept-Language':'it'}});
  if(!r.ok)throw new Error('NOMINATIM NON DISPONIBILE');
  const j=await r.json();
  return j.find(x=>['administrative','city','town','village'].includes(x.type)||x.addresstype==='administrative')||j[0]||null;
}
async function fetchOsmStreets(name){
  const loc=await locateMunicipality(name);if(!loc)throw new Error('COMUNE NON TROVATO SU OPENSTREETMAP');
  let query='';
  if(loc.osm_type==='relation'){
    const area=3600000000+Number(loc.osm_id);
    query='[out:json][timeout:35];area('+area+')->.a;way(area.a)["highway"]["name"];out tags;';
  }else{
    const b=(loc.boundingbox||[]).map(Number);
    if(b.length!==4)throw new Error('CONFINI COMUNE NON DISPONIBILI');
    query='[out:json][timeout:35];way["highway"]["name"]('+b[0]+','+b[2]+','+b[1]+','+b[3]+');out tags;';
  }
  const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
  let data=null,lastErr=null;
  for(const ep of endpoints){
    try{const r=await fetch(ep,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(query)});if(!r.ok)throw new Error('OVERPASS '+r.status);data=await r.json();break}catch(e){lastErr=e}
  }
  if(!data)throw lastErr||new Error('OVERPASS NON DISPONIBILE');
  const map=new Map();
  for(const e of data.elements||[]){
    const via=txt(e.tags?.name),type=txt(e.tags?.highway);
    if(!via||excludedRoad(via,type)||!ALLOWED_ROADS.has(type))continue;
    const key=via.toLocaleLowerCase('it-IT');
    if(!map.has(key))map.set(key,{via,road_type:type,source:'OpenStreetMap / Overpass',source_ref:'way/'+e.id});
  }
  return [...map.values()].sort((a,b)=>a.via.localeCompare(b.via,'it'));
}
async function loadMunicipalityStreets(name,refreshOsm=false){
  try{
    let cached=await getCachedStreets(name);
    if(cached.length){renderStreets(cached);setStatus('v3StreetStatus',cached.length+' vie nel CRM. Verifica online in corso…')}
    if(refreshOsm||!cached.length){
      const online=await fetchOsmStreets(name);
      await rpc('f1_territory_sync_streets_v3',{p_comune:name,p_streets:online});
      cached=await getCachedStreets(name);
      renderStreets(cached);
      setStatus('v3StreetStatus',cached.length+' vie reali · OpenStreetMap / Overpass');
    }
  }catch(e){setStatus('v3StreetStatus','Vie online non disponibili: '+(e.message||e),true)}
}
async function openStreet(via,source='OPENSTREETMAP',ref=''){
  activeEditRecord=null;
  if(excludedRoad(via))return;
  try{
    setStatus('v3StreetStatus','Apro '+via+'…');
    await rpc('f1_territory_open_street_v3',{p_comune:selectedMunicipality,p_via:via,p_source:source,p_source_ref:ref});
    F1NotiziereEngine.invalidate();
    location.hash='terr';
    location.reload();
  }catch(e){setStatus('v3StreetStatus',e.message||e,true)}
}
function geo(){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation)return reject(new Error('GPS NON DISPONIBILE'));
    navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,maximumAge:0,timeout:15000});
  });
}
async function reverseRoad(lat,lon){
  const u='https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat='+encodeURIComponent(lat)+'&lon='+encodeURIComponent(lon);
  const r=await fetch(u,{headers:{'Accept-Language':'it'}});if(!r.ok)throw new Error('LOCALIZZAZIONE VIA NON DISPONIBILE');
  return r.json();
}
async function nearestRoad(lat,lon){
  const q='[out:json][timeout:20];way(around:120,'+lat+','+lon+')["highway"]["name"];out tags center;';
  const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(q)});
  const j=await r.json();
  const rows=(j.elements||[]).map(e=>({via:txt(e.tags?.name),type:txt(e.tags?.highway),ref:'way/'+e.id})).filter(x=>x.via&&!excludedRoad(x.via,x.type)&&ALLOWED_ROADS.has(x.type));
  return rows[0]||null;
}
async function activateGps(){
  if(!selectedMunicipality)return;
  setStatus('v3GpsState','Richiesta posizione precisa…');
  try{
    const p=await geo(),lat=p.coords.latitude,lon=p.coords.longitude,acc=Math.round(p.coords.accuracy||0);
    $('gpsStatus').textContent='GPS ON · ±'+acc+'m';$('gpsStatus').classList.add('on');
    const rev=await reverseRoad(lat,lon),a=rev.address||{};
    const foundComune=txt(a.town||a.city||a.village||a.municipality||a.county);
    if(foundComune&&foundComune.toLocaleLowerCase('it-IT')!==selectedMunicipality.toLocaleLowerCase('it-IT')&&!foundComune.toLocaleLowerCase('it-IT').includes(selectedMunicipality.toLocaleLowerCase('it-IT'))){
      setStatus('v3GpsState','La posizione risulta in '+foundComune+', non in '+selectedMunicipality+'.',true);return;
    }
    let via=txt(a.road||a.pedestrian||a.residential||a.path),ref='';
    if(excludedRoad(via)){const near=await nearestRoad(lat,lon);via=near?.via||'';ref=near?.ref||''}
    if(!via)throw new Error('VIA NON RILEVATA');
    setStatus('v3GpsState','✓ '+via+' · precisione ±'+acc+' m');
    await openStreet(via,'GPS · OpenStreetMap',ref);
  }catch(e){$('gpsStatus').textContent='GPS OFF';$('gpsStatus').classList.remove('on');setStatus('v3GpsState',e.message||'GPS NON DISPONIBILE',true)}
}

function canEditRecord(record){
  return !!record && String(record.user_id||'')===String(stateProfile()?.user_id||'');
}
function editButton(value,selected,kind){
  return '<button type="button" class="choice'+(selected?' sel':'')+'" data-v3-edit-'+kind+'="'+esc(value)+'">'+esc(value)+'</button>';
}
async function renderEditRecord(record,refresh=false){
  if(!record)return;
  if(refresh){
    const data=await crm(true);
    record=data.civics.find(x=>x.civic_record_id===record.civic_record_id)||record;
  }
  activeEditRecord=record;
  $('v3EditComune').textContent=record.comune||'—';
  $('v3EditVia').textContent=record.via||'—';
  $('v3EditCivic').textContent=record.civico||'—';
  $('v3EditNext').textContent=record.next_action||'NESSUNA AZIONE';
  const data=await crm(false);
  const notes=(data.notes||[]).filter(n=>n.civic_record_id===record.civic_record_id);
  $('v3EditNoteCount').textContent=notes.length+' '+(notes.length===1?'NOTA':'NOTE');
  const editable=canEditRecord(record);
  $('v3EditReadOnly').textContent=editable?'MODIFICA ONLINE · ogni dato viene scritto sul CRM F1':'SOLA LETTURA · record di un altro funzionario';
  $('v3EditSignals').innerHTML=EDIT_SIGNALS.map(v=>editButton(v,(record.signals||[]).includes(v),'signal')).join('');
  $('v3EditTypes').innerHTML=EDIT_TYPES.map(v=>editButton(v,record.property_type===v,'type')).join('');
  $('v3EditTargets').innerHTML=EDIT_TARGETS.map(v=>editButton(v,false,'target')).join('');
  document.querySelectorAll('[data-v3-edit-signal]').forEach(b=>{b.disabled=!editable;b.onclick=()=>toggleEditSignal(b.dataset.v3EditSignal)});
  document.querySelectorAll('[data-v3-edit-type]').forEach(b=>{b.disabled=!editable;b.onclick=()=>setEditType(b.dataset.v3EditType)});
  document.querySelectorAll('[data-v3-edit-target]').forEach(b=>{b.disabled=!editable;b.onclick=()=>openContactForRecord(b.dataset.v3EditTarget,activeEditRecord)});
  $('v3EditNotes').disabled=!editable;
  $('v3EditSendBulletin').disabled=!editable;
}
async function toggleEditSignal(value){
  if(!canEditRecord(activeEditRecord))return;
  let arr=[...(activeEditRecord.signals||[])];
  if(value==='NESSUN SEGNALE')arr=arr.includes(value)?[]:['NESSUN SEGNALE'];
  else{
    arr=arr.filter(x=>x!=='NESSUN SEGNALE');
    arr=arr.includes(value)?arr.filter(x=>x!==value):[...arr,value];
  }
  try{
    setStatus('v3EditSignalState','Salvataggio…');
    const r=await rpc('f1_territory_civic_patch_record_v3',{p_civic_record_id:activeEditRecord.civic_record_id,p_property_type:null,p_signals:arr});
    activeEditRecord=r;crmCache=null;setStatus('v3EditSignalState','✓ SEGNALI SALVATI NEL CRM');await renderEditRecord(r,true);
  }catch(e){setStatus('v3EditSignalState',e.message||e,true)}
}
async function setEditType(value){
  if(!canEditRecord(activeEditRecord))return;
  try{
    setStatus('v3EditTypeState','Salvataggio…');
    const r=await rpc('f1_territory_civic_patch_record_v3',{p_civic_record_id:activeEditRecord.civic_record_id,p_property_type:value,p_signals:null});
    activeEditRecord=r;crmCache=null;setStatus('v3EditTypeState','✓ TIPO IMMOBILE SALVATO NEL CRM');await renderEditRecord(r,true);
  }catch(e){setStatus('v3EditTypeState',e.message||e,true)}
}
async function openContactForRecord(target,record){
  if(target==='NESSUNO APPROPRIATO'){setStatus('v3EditReadOnly','✓ NESSUNA CONVERSAZIONE POSSIBILE');return}
  if(!canEditRecord(record))return;
  const data=await crm(true);
  const existing=(data.conversations||[]).filter(c=>c.civic_record_id===record.civic_record_id&&c.target_type===target).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0];
  activeContact={target,civic:record.civico,progressId:record.progress_id,record:existing||null,directRecord:record,leadId:existing?.lead_id||''};
  $('v3ContactTitle').textContent=target;
  $('v3ContactContext').textContent=[record.comune,record.via,'CIVICO '+record.civico,target].filter(Boolean).join(' · ');
  $('v3ContactName').value=existing?.person_name||'';
  $('v3ContactPhone').value=existing?.phone||'';
  $('v3ContactNotes').value=existing?.notes||'';
  $('v3ContactOutcomes').innerHTML=['NESSUNA INFORMAZIONE','INFORMAZIONE UTILE','POSSIBILE VENDITA','DA RICONTATTARE','APPUNTAMENTO'].map(v=>'<button type="button" data-v3-outcome="'+esc(v)+'">'+esc(v)+'</button>').join('');
  $('v3ContactOutcomes').querySelectorAll('[data-v3-outcome]').forEach(b=>b.onclick=()=>saveContactOutcome(b.dataset.v3Outcome));
  setStatus('v3ContactState','CRM pronto · dati associati esattamente a '+record.via+' '+record.civico);
  $('v3ContactModal').classList.add('open');
}
async function backToCRM(){
  screen('crm');
  setTimeout(()=>{$('openCRMExcel')?.click()},80);
}
async function openContact(target){
  if(target==='NESSUNO APPROPRIATO'){setStatus('terrStatus','✓ NESSUNA CONVERSAZIONE POSSIBILE');return}
  try{
    const x=await currentContext();if(!x.progress||!x.civic)throw new Error('INSERISCI PRIMA IL CIVICO');
    activeContact={target,civic:x.civic,progressId:x.progress.progress_id,record:null};
    const data=await crm(true);
    const existing=data.conversations.find(c=>c.progress_id===x.progress.progress_id&&txt(c.civico)===x.civic&&c.target_type===target);
    activeContact.record=existing||null;
    $('v3ContactTitle').textContent=target;
    $('v3ContactContext').textContent=[x.progress.comune,x.progress.via,'CIVICO '+x.civic,target].filter(Boolean).join(' · ');
    $('v3ContactName').value=existing?.person_name||'';
    $('v3ContactPhone').value=existing?.phone||'';
    $('v3ContactNotes').value=existing?.notes||'';
    $('v3ContactOutcomes').innerHTML=['NESSUNA INFORMAZIONE','INFORMAZIONE UTILE','POSSIBILE VENDITA','DA RICONTATTARE','APPUNTAMENTO'].map(v=>'<button type="button" data-v3-outcome="'+esc(v)+'">'+esc(v)+'</button>').join('');
    $('v3ContactOutcomes').querySelectorAll('[data-v3-outcome]').forEach(b=>b.onclick=()=>saveContactOutcome(b.dataset.v3Outcome));
    setStatus('v3ContactState','CRM pronto · dati associati a '+x.progress.via+' '+x.civic);
    $('v3ContactModal').classList.add('open');
  }catch(e){alert(e.message||e)}
}
async function maybeSaveLead(){
  const name=txt($('v3ContactName').value),phone=txt($('v3ContactPhone').value);
  if(!name&&!phone)return '';
  const direct=activeContact.directRecord||null;
  const x=direct?{progress:{comune:direct.comune,zona:direct.zona,via:direct.via},civic:direct.civico}:await currentContext();
  const saved=await F1StaffData.createOrLinkLead({
    nome:name,
    telefono:phone,
    comune:txt(x.progress?.comune),
    zona:txt(x.progress?.zona),
    via:txt(x.progress?.via),
    civico:x.civic,
    source_type:'TERRITORY',
    source:'F1 TERRITORY',
    lead_reason:'CONTATTO TERRITORIALE · '+(activeContact.target||'CONTATTO'),
    status:'DA_VERIFICARE',
    next_action:'COMPLETARE CONVERSAZIONE / QUALIFICARE',
    notes:txt($('v3ContactNotes').value),
    created_by:[stateProfile()?.first_name,stateProfile()?.last_name].filter(Boolean).join(' ')
  });
  const leadId=txt(saved?.lead_id||saved?.record?.lead_id||saved?.lead?.lead_id);
  if(leadId)activeContact.leadId=leadId;
  return leadId;
}
async function saveContactDraft(){
  const name=txt($('v3ContactName')?.value),phone=txt($('v3ContactPhone')?.value),notes=txt($('v3ContactNotes')?.value);
  if(!name&&!phone)return;
  try{
    setStatus('v3ContactState','Salvataggio immediato nel CRM…');
    await maybeSaveLead();
    crmCache=null;
    setStatus('v3ContactState','✓ CONTATTO SALVATO NEL CRM · puoi continuare la conversazione');
  }catch(e){
    setStatus('v3ContactState',e.message||e,true);
  }
}
function queueContactDraftSave(){
  clearTimeout(contactDraftTimer);
  contactDraftTimer=setTimeout(saveContactDraft,450);
}
function stateProfile(){return window.F1TerritoryV3?.profile||null}
async function saveContactOutcome(outcome){
  try{
    setStatus('v3ContactState','Salvataggio nel CRM…');
    let leadId='';try{leadId=await maybeSaveLead()}catch(_){}
    let res;
    if(activeContact.directRecord){
      res=await rpc('f1_territory_conversation_add_record_v3',{p_civic_record_id:activeContact.directRecord.civic_record_id,p_target_type:activeContact.target,p_person_name:txt($('v3ContactName').value),p_phone:txt($('v3ContactPhone').value),p_outcome:outcome,p_notes:txt($('v3ContactNotes').value),p_lead_id:leadId||null});
    }else{
      await rpc('f1_territory_set_manual_civic_v3',{p_progress_id:activeContact.progressId,p_civico:activeContact.civic});
      res=await rpc('f1_territory_conversation_add_v2',{p_progress_id:activeContact.progressId,p_civico:activeContact.civic,p_target_type:activeContact.target,p_person_name:txt($('v3ContactName').value),p_phone:txt($('v3ContactPhone').value),p_outcome:outcome,p_notes:txt($('v3ContactNotes').value),p_lead_id:leadId||null});
    }
    crmCache=null;setStatus('v3ContactState','✓ '+outcome+' · SALVATO NEL CRM');
    if(activeContact.directRecord){const d=await crm(true),fresh=d.civics.find(x=>x.civic_record_id===activeContact.directRecord.civic_record_id);if(fresh){activeEditRecord=fresh;await renderEditRecord(fresh,false)}}
    setTimeout(()=>{window.dispatchEvent(new Event('focus'))},150);
    if(res?.news?.observation_id&&['INFORMAZIONE UTILE','POSSIBILE VENDITA'].includes(outcome))setStatus('v3ContactState','✓ CRM aggiornato · notizia creata');
  }catch(e){setStatus('v3ContactState',e.message||e,true)}
}
async function createContactLetter(){
  try{
    if(activeContact.directRecord)await rpc('f1_territory_letter_create_record_v3',{p_civic_record_id:activeContact.directRecord.civic_record_id});
    else{
      await rpc('f1_territory_set_manual_civic_v3',{p_progress_id:activeContact.progressId,p_civico:activeContact.civic});
      await rpc('f1_territory_letter_create_v2',{p_progress_id:activeContact.progressId,p_civico:activeContact.civic});
    }
    crmCache=null;setStatus('v3ContactState','✓ LETTERA CREATA · DA STAMPARE');
  }catch(e){setStatus('v3ContactState',e.message||e,true)}
}
function normalizePhone(v){
  let d=String(v||'').replace(/\D+/g,'');if(d.startsWith('00'))d=d.slice(2);if(!d.startsWith('39')&&d.length===10)d='39'+d;return d;
}
async function sendBulletinForRecord(record,statusId){
  try{
    const data=await crm(true);
    const rows=(data.conversations||[]).filter(c=>c.civic_record_id===record.civic_record_id&&txt(c.phone)).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
    const contact=rows[0];if(!contact)throw new Error('MANCA UN TELEFONO / WHATSAPP NEL CRM DEL CIVICO');
    const b=data.active_bulletin;if(!b?.public_url)throw new Error('IL TITOLARE NON HA ANCORA PUBBLICATO IL GIORNALINO PDF');
    const phone=normalizePhone(contact.phone);if(!phone)throw new Error('NUMERO WHATSAPP NON VALIDO');
    const name=txt(contact.person_name),msg=(name?'Buongiorno '+name+',':'Buongiorno,')+'\ncome anticipato, le mando le nostre offerte immobiliari F1.\nDovesse avere bisogno, ha i nostri recapiti.\n\n'+b.public_url;
    setStatus(statusId,'✓ Apro WhatsApp con il giornalino pubblicato.');
    location.href='https://wa.me/'+phone+'?text='+encodeURIComponent(msg);
  }catch(e){setStatus(statusId,e.message||e,true)}
}
async function sendBulletin(){
  try{
    const x=await ensureCurrentCivic();
    await sendBulletinForRecord(x.record,'v3BulletinState');
  }catch(e){setStatus('v3BulletinState',e.message||e,true)}
}
async function sendEditBulletin(){
  if(!activeEditRecord)return;
  await sendBulletinForRecord(activeEditRecord,'v3EditBulletinState');
}

async function openNotesForCurrent(){
  try{const x=await ensureCurrentCivic();await openNotesForRecord(x.record)}catch(e){alert(e.message||e)}
}
async function openNotesForRecord(record){
  activeNoteRecord=record;const data=await crm(true),notes=data.notes.filter(n=>n.civic_record_id===record.civic_record_id);
  $('v3NotesContext').textContent=[record.comune,record.via,'CIVICO '+record.civico].filter(Boolean).join(' · ');
  $('v3NotesCount').textContent=notes.length;
  $('v3NotesTitle').textContent='NOTE · '+record.via+' '+record.civico;
  $('v3NoteText').value='';
  $('v3NotesList').innerHTML=notes.length?notes.map(n=>'<div class="v3-note"><div class="row"><strong>'+(n.note_type==='AUDIO'?'NOTA AUDIO':'NOTA SCRITTA')+'</strong><small>'+new Date(n.created_at).toLocaleString('it-IT')+'</small></div>'+(n.note_type==='TEXT'?'<div style="margin-top:6px;white-space:pre-wrap">'+esc(n.note_text||'')+'</div>':'<audio controls data-audio-path="'+esc(n.audio_path||'')+'"></audio>')+'</div>').join(''):'<div class="mut">Nessuna nota salvata.</div>';
  $('v3NotesModal').classList.add('open');
  await hydrateAudioUrls();
}
async function saveTextNote(){
  if(!activeNoteRecord)return;const note=txt($('v3NoteText').value);if(!note)return;
  try{await rpc('f1_territory_note_add_v3',{p_civic_record_id:activeNoteRecord.civic_record_id,p_note_type:'TEXT',p_note_text:note,p_audio_path:'',p_audio_mime:'',p_audio_duration_seconds:null});crmCache=null;await openNotesForRecord(activeNoteRecord);updateNoteCount()}catch(e){setStatus('v3AudioState',e.message||e,true)}
}
async function storageUpload(bucket,path,blob,contentType){
  const cfg=window.F1_SUPABASE,token=await F1Sync.authToken();
  const r=await fetch(cfg.url.replace(/\/$/,'')+'/storage/v1/object/'+bucket+'/'+path,{method:'POST',headers:{apikey:cfg.anonKey,Authorization:'Bearer '+token,'Content-Type':contentType,'x-upsert':'false'},body:blob});
  const t=await r.text();if(!r.ok)throw new Error('UPLOAD AUDIO: '+t);return path;
}
async function signedAudio(path){
  if(!path)return'';const cfg=window.F1_SUPABASE,token=await F1Sync.authToken();
  const r=await fetch(cfg.url.replace(/\/$/,'')+'/storage/v1/object/sign/f1-territory-audio/'+path,{method:'POST',headers:{apikey:cfg.anonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});
  const j=await r.json();if(!r.ok)return'';return cfg.url.replace(/\/$/,'')+'/storage/v1'+j.signedURL;
}
async function hydrateAudioUrls(){
  for(const a of document.querySelectorAll('#v3NotesList audio[data-audio-path]')){const u=await signedAudio(a.dataset.audioPath);if(u)a.src=u}
}
function audioClock(){
  const s=Math.max(0,Math.floor((Date.now()-mediaStarted)/1000));$('v3AudioTime').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
}
async function startAudio(){
  if(!activeNoteRecord)return;
  try{
    mediaStream=await navigator.mediaDevices.getUserMedia({audio:true});mediaChunks=[];
    const mime=MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'audio/webm';
    mediaRecorder=new MediaRecorder(mediaStream,{mimeType:mime});
    mediaRecorder.ondataavailable=e=>{if(e.data?.size)mediaChunks.push(e.data)};
    mediaRecorder.onstop=finishAudio;mediaRecorder.start(500);mediaStarted=Date.now();audioTimer=setInterval(audioClock,500);$('v3StartAudio').disabled=true;$('v3StopAudio').disabled=false;setStatus('v3AudioState','● REGISTRAZIONE IN CORSO');
  }catch(e){setStatus('v3AudioState','MICROFONO NON DISPONIBILE / NON AUTORIZZATO',true)}
}
function stopAudio(){if(mediaRecorder&&mediaRecorder.state!=='inactive'){setStatus('v3AudioState','Salvataggio audio…');mediaRecorder.stop()}}
async function finishAudio(){
  clearInterval(audioTimer);audioTimer=null;const duration=Math.max(1,Math.round((Date.now()-mediaStarted)/1000));
  try{
    const blob=new Blob(mediaChunks,{type:mediaRecorder?.mimeType||'audio/webm'}),me=await F1StaffData.me(),path=me.user_id+'/'+activeNoteRecord.civic_record_id+'/'+Date.now()+'.webm';
    await storageUpload('f1-territory-audio',path,blob,blob.type);
    await rpc('f1_territory_note_add_v3',{p_civic_record_id:activeNoteRecord.civic_record_id,p_note_type:'AUDIO',p_note_text:'',p_audio_path:path,p_audio_mime:blob.type,p_audio_duration_seconds:duration});
    crmCache=null;setStatus('v3AudioState','✓ AUDIO SALVATO · '+duration+'s');await openNotesForRecord(activeNoteRecord);updateNoteCount();
  }catch(e){setStatus('v3AudioState',e.message||e,true)}
  finally{mediaStream?.getTracks().forEach(t=>t.stop());mediaStream=null;mediaRecorder=null;mediaChunks=[];$('v3StartAudio').disabled=false;$('v3StopAudio').disabled=true;$('v3AudioTime').textContent='00:00'}
}
async function updateNoteCount(){
  const data=await crm(true);
  if($('civicEdit')?.classList.contains('active')&&activeEditRecord){
    const fresh=data.civics.find(x=>x.civic_record_id===activeEditRecord.civic_record_id)||activeEditRecord;
    activeEditRecord=fresh;
    const n=data.notes.filter(z=>z.civic_record_id===fresh.civic_record_id).length;
    if($('v3EditNoteCount'))$('v3EditNoteCount').textContent=n+' '+(n===1?'NOTA':'NOTE');
    if($('v3EditNext'))$('v3EditNext').textContent=fresh.next_action||'NESSUNA AZIONE';
    return;
  }
  const x=await currentContext().catch(()=>null);if(!x?.progress||!x.civic)return;
  const r=data.civics.find(c=>c.progress_id===x.progress.progress_id&&txt(c.civico)===x.civic),n=r?data.notes.filter(z=>z.civic_record_id===r.civic_record_id).length:0;
  if($('v3NoteCount'))$('v3NoteCount').textContent=n+' '+(n===1?'NOTA':'NOTE');
  const conv=(data.conversations||[]).filter(z=>z.progress_id===x.progress.progress_id&&txt(z.civico)===x.civic).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0];
  const next=conv?.next_action||r?.next_action||'NESSUNA AZIONE';
  if($('v3OperationalNextText'))$('v3OperationalNextText').textContent=next;
}

async function openCivicEditor(id){
  try{
    const data=await crm(true),r=data.civics.find(x=>x.civic_record_id===id);if(!r)return;
    $('excelModal')?.classList.remove('open');
    await renderEditRecord(r,false);
    screen('civicEdit');
  }catch(e){alert(e.message||e)}
}
function noteSummary(notes){
  if(!notes.length)return'—';const n=notes[0];return notes.length+' · '+(n.note_type==='AUDIO'?'🎙 AUDIO '+(n.audio_duration_seconds||'')+'s':txt(n.note_text).slice(0,55));
}
async function augmentExcel(){
  if(!$('xCivicsBody'))return;const data=await crm(true),table=$('xCivicsBody').closest('table'),head=table.querySelector('thead tr');
  if(!head.querySelector('[data-v3-note-head]')){const th=document.createElement('th');th.dataset.v3NoteHead='1';th.textContent='NOTE';head.children[3].after(th)}
  for(const tr of $('xCivicsBody').querySelectorAll('tr')){
    const open=tr.querySelector('[data-open-property]');if(!open)continue;const id=open.dataset.openProperty,r=data.civics.find(x=>x.civic_record_id===id);if(!r)continue;
    tr.children[0].innerHTML='<button type="button" data-v3-row="'+id+'">'+tr.children[0].textContent+'</button>';
    open.textContent='APRI / MODIFICA';open.onclick=e=>{e.preventDefault();openCivicEditor(id)};
    const notes=data.notes.filter(n=>n.civic_record_id===id);
    if(!tr.querySelector('[data-v3-note-cell]')){const td=document.createElement('td');td.dataset.v3NoteCell='1';td.className='v3-crm-note';td.innerHTML='<span>'+esc(noteSummary(notes))+'</span><br><button class="mini" type="button" data-v3-notes-row="'+id+'">NOTE</button>';tr.children[3].after(td)}
  }
  document.querySelectorAll('[data-v3-row]').forEach(b=>b.onclick=()=>openCivicEditor(b.dataset.v3Row));
  document.querySelectorAll('[data-v3-notes-row]').forEach(b=>b.onclick=()=>{const r=data.civics.find(x=>x.civic_record_id===b.dataset.v3NotesRow);if(r)openNotesForRecord(r)});
  const headBox=$('excelModal')?.querySelector('.sheethead,.excel-head');
  if(headBox&&!$('v3ExportExcel')){const b=document.createElement('button');b.id='v3ExportExcel';b.className='mini v3-export';b.textContent='SCARICA EXCEL';b.onclick=exportExcel;headBox.appendChild(b)}
}
function loadSheetJs(){
  return new Promise((resolve,reject)=>{if(window.XLSX)return resolve();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('LIBRERIA EXCEL NON DISPONIBILE'));document.head.appendChild(s)})
}
async function exportExcel(){
  try{
    await loadSheetJs();const d=await crm(true),wb=XLSX.utils.book_new();
    const add=(name,rows)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),name);
    add('IMMOBILI',d.civics.map(r=>({COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,STATO:r.status,TIPOLOGIA:r.property_type,SEGNALI:(r.signals||[]).join(' · '),'PROSSIMA AZIONE':r.next_action,AGGIORNATO:r.updated_at})));
    add('CONTATTI',d.conversations.map(r=>({NOMINATIVO:r.person_name,TIPO:r.target_type,TELEFONO:r.phone,COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,ESITO:r.outcome,'PROSSIMA AZIONE':r.next_action,NOTE:r.notes})));
    add('NOTIZIE',d.news.map(r=>({TIPO:r.news_type||r.observation_type,COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,STATO:r.workflow_state||r.status,NOMINATIVO:r.person_name,TELEFONO:r.phone_normalized,NOTE:r.notes,PROPRIETARIO:r.owner_status,'CHI PUBBLICA':r.market_publisher,PREZZO:r.market_price,AGENZIA:r.market_agency,'TEMPO IN VENDITA':r.market_time_on_market,'PROSSIMA AZIONE':r.next_action})));
    add('NOTE',d.notes.map(r=>({TIPO:r.note_type,COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,NOTA:r.note_text,'AUDIO PATH':r.audio_path,'DURATA AUDIO':r.audio_duration_seconds,CREATA:r.created_at})));
    add('LETTERE',d.letters.map(r=>({COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,FUNZIONARIO:r.operator_name,STATO:r.status,CREATA:r.created_at,STAMPATA:r.printed_at,IMBUCATA:r.delivered_at})));
    add('VIE',d.streets.map(r=>({COMUNE:r.comune,VIA:r.via,STATO:r.status,'ULTIMO CIVICO':r.last_civic,'PROSSIMO CIVICO':r.next_civic,COPERTURA:r.coverage_pct,FONTE:r.source})));
    add('FOLLOW-UP',d.conversations.filter(r=>r.outcome==='DA RICONTATTARE'||r.status==='RICHIAMO').map(r=>({SOGGETTO:r.person_name||r.target_type,COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,'PROSSIMA AZIONE':r.next_action,STATO:r.status})));
    XLSX.writeFile(wb,'F1_Territory_CRM_'+new Date().toISOString().slice(0,10)+'.xlsx');
  }catch(e){alert(e.message||e)}
}
function valueScript(v){
  const m={
    'REPORT PREZZI ZONA':'Le invio periodicamente un aggiornamento sui prezzi reali della zona. Qual è il numero migliore a cui contattarla?',
    'APPENA ACQUISITO':'Quando acquisiamo un nuovo immobile qui in zona glielo segnalo. Qual è il numero migliore a cui contattarla?',
    'APPENA VENDUTO':'Quando vendiamo in questa zona le invio un aggiornamento utile. Qual è il numero migliore a cui contattarla?'
  };return m[v]||'Qual è il numero migliore a cui contattarla?';
}
function bind(){
  $('v3MunicipalitySearch').oninput=e=>renderMunicipalities(e.target.value);
  $('v3GpsBtn').onclick=activateGps;
  $('v3EditBack').onclick=backToCRM;
  $('v3EditNotes').onclick=()=>{if(activeEditRecord)openNotesForRecord(activeEditRecord)};
  $('v3EditSendBulletin').onclick=sendEditBulletin;
  document.querySelectorAll('[data-v3-edit-value]').forEach(b=>b.onclick=()=>{$('v3EditValueScript').innerHTML='<b>FRASE DA DIRE</b><br>'+esc(valueScript(b.dataset.v3EditValue))});
  $('v3AddNotes').onclick=openNotesForCurrent;
  $('v3SendBulletin').onclick=sendBulletin;
  $('v3ContactLetter').onclick=createContactLetter;
  ['v3ContactName','v3ContactPhone','v3ContactNotes'].forEach(id=>{
    $(id).addEventListener('input',queueContactDraftSave);
    $(id).addEventListener('change',saveContactDraft);
    $(id).addEventListener('blur',saveContactDraft);
  });
  $('v3SaveTextNote').onclick=saveTextNote;
  $('v3StartAudio').onclick=startAudio;$('v3StopAudio').onclick=stopAudio;
  document.querySelectorAll('[data-v3-close]').forEach(b=>b.onclick=()=>$(b.dataset.v3Close)?.classList.remove('open'));
  document.querySelectorAll('[data-v3-value]').forEach(b=>b.onclick=()=>{$('v3ValueScript').innerHTML='<b>FRASE DA DIRE</b><br>'+esc(valueScript(b.dataset.v3Value))});
  document.addEventListener('click',e=>{
    const t=e.target.closest?.('[data-target]');if(!t)return;
    e.preventDefault();e.stopImmediatePropagation();openContact(t.dataset.target);
  },true);
  $('globalBack').addEventListener('click',e=>{
    if($('home')?.classList.contains('active')){e.preventDefault();e.stopImmediatePropagation();renderMunicipalities();screen('municipalities')}
    else if($('municipalities')?.classList.contains('active')){e.preventDefault();e.stopImmediatePropagation();screen('home')}
    else if($('municipality')?.classList.contains('active')){e.preventDefault();e.stopImmediatePropagation();renderMunicipalities();screen('municipalities')}
    else if($('civicEdit')?.classList.contains('active')){e.preventDefault();e.stopImmediatePropagation();backToCRM()}
  },true);
  $('openCRMExcel')?.addEventListener('click',()=>setTimeout(augmentExcel,120));
  $('openDeliverCRM')?.addEventListener('click',()=>setTimeout(augmentExcel,120));
  document.querySelectorAll('.excel-tab').forEach(b=>b.addEventListener('click',()=>setTimeout(augmentExcel,80)));
  $('civicInput')?.addEventListener('input',()=>setTimeout(updateNoteCount,50));
}
async function init(){
  injectStyle();injectScreens();injectTerritoryExtras();injectModals();renderMunicipalities();bind();
  try{window.F1TerritoryV3.profile=await F1StaffData.me();await crm(true);updateNoteCount()}catch(e){console.warn('F1 Territory v3 init',e)}
}
window.F1TerritoryV3={version:VERSION,profile:null,crm,openCivicEditor,openNotesForRecord,augmentExcel,exportExcel,selectMunicipality,activateGps};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);
})();