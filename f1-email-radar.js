(()=>{'use strict';
const CFG=()=>window.F1_SUPABASE||{};
const $=id=>document.getElementById(id);
let STATE={territory:null,communes:[],sources:[],entities:[],filtered:[],stats:{},latestRun:null,queue:[]};

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function toast(msg,kind='ok'){const el=$('toast');el.textContent=msg;el.className='toast '+kind;el.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>el.style.display='none',4500)}
function fmt(v){return v==null||v===''?'—':String(v)}
function safeUrl(v){try{const u=new URL(String(v||''),location.href);return /^https?:$/.test(u.protocol)?u.href:''}catch(_){return''}}
function csvCell(v){const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
async function auth(){if(!window.F1Sync?.ready?.())throw new Error('CLOUD NON AUTENTICATO');return await window.F1Sync.authToken()}
async function headers(prefer='return=representation'){return{apikey:CFG().anonKey,Authorization:'Bearer '+await auth(),'Content-Type':'application/json',Prefer:prefer}}
async function rest(path,opt={}){const url=CFG().url.replace(/\/$/,'')+'/rest/v1/'+path;const r=await fetch(url,{...opt,headers:{...(await headers(opt.prefer)),...(opt.headers||{})}});const txt=await r.text();if(!r.ok)throw new Error('Supabase '+r.status+': '+txt);return txt?JSON.parse(txt):null}
async function rpc(name,body={}){return rest('rpc/'+name,{method:'POST',body:JSON.stringify(body)})}

async function loadConfig(){
 const [t,s]=await Promise.all([fetch('config/territory.json?v='+Date.now(),{cache:'no-store'}).then(r=>r.json()),fetch('data/email-radar-sources.json?v='+Date.now(),{cache:'no-store'}).then(r=>r.json())]);
 STATE.territory=t;STATE.sources=s.sources||[];STATE.communes=[...(t.sinistra||[]),...(t.destra||[])];
 const opts=STATE.communes.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
 $('comuneFilter').insertAdjacentHTML('beforeend',opts);$('comuniList').innerHTML=opts;
 $('territoryPill').textContent=STATE.communes.length+' COMUNI CONFIGURATI';$('territoryPill').className='pill ok';
}
async function loadStats(){
 const comune=$('comuneFilter').value||null;
 STATE.stats=await rpc('f1_email_radar_dashboard',{p_comune:comune});
 [['kConfigured','configured_communes'],['kCompletedCommunes','completed_communes'],['kIncompleteCommunes','incomplete_communes'],['kErrorCommunes','error_communes'],['kSubjects','subjects'],['kCompanies','companies'],['kPros','professionals'],['kEmails','emails'],['kPec','pec'],['kPhones','phones'],['kWeb','websites'],['kVerified','verified'],['kToVerify','to_verify'],['kDup','duplicates_merged'],['kProvidersReady','providers_operational'],['kProvidersPartial','providers_partial'],['kProvidersMissing','providers_not_configured'],['kProvidersRequired','providers_required'],['kAteco','ateco_catalog']].forEach(([id,k])=>{const el=$(id);if(el)el.textContent=Number(STATE.stats?.[k]||0).toLocaleString('it-IT')});
 $('atecoPill').textContent='ATECO '+Number(STATE.stats?.ateco_catalog||0).toLocaleString('it-IT');$('atecoPill').className='pill '+(Number(STATE.stats?.ateco_catalog||0)>=3000?'ok':'warn');const lu=STATE.stats?.last_updated?new Date(STATE.stats.last_updated):null;$('updatedPill').textContent=lu&&!Number.isNaN(lu.getTime())?'AGG. '+lu.toLocaleString('it-IT'):'AGGIORNAMENTO —';
}
async function loadEntities(){
 let q='f1_email_radar_entities?select=*&order=updated_at.desc&limit=1000';
 const c=$('comuneFilter').value;if(c)q+='&comune=eq.'+encodeURIComponent(c);
 STATE.entities=await rest(q)||[];applyFilters();
}
function applyFilters(){
 const type=$('typeFilter').value,contact=$('contactFilter').value,verify=$('verifyFilter').value,ateco=$('atecoFilter').value.trim().toLowerCase(),category=$('categoryFilter').value.trim().toLowerCase(),s=$('searchBox').value.trim().toLowerCase();
 STATE.filtered=STATE.entities.filter(r=>{
   if(type==='AZIENDA'&&!['AZIENDA','IMPRESA','SOCIETA','IMPRESA_INDIVIDUALE','ATTIVITA'].includes(String(r.subject_type).toUpperCase()))return false;
   if(type==='PROFESSIONISTA'&&!['PROFESSIONISTA','STUDIO_PROFESSIONALE','AMMINISTRATORE_CONDOMINIO'].includes(String(r.subject_type).toUpperCase()))return false;
   if(contact==='EMAIL'&&!r.email)return false;if(contact==='NO_EMAIL'&&r.email)return false;if(contact==='PEC'&&!r.pec)return false;if(contact==='PHONE'&&!(r.phone||r.mobile))return false;if(contact==='WEB'&&!r.website)return false;
   if(verify&&r.verification_status!==verify)return false;
   if(ateco&&!String(r.ateco_code||'').toLowerCase().startsWith(ateco))return false;
   if(category&&!([r.category,r.profession,r.ateco_title].join(' ').toLowerCase().includes(category)))return false;
   if(s){const hay=[r.denomination,r.legal_name,r.comune,r.frazione,r.indirizzo,r.civico,r.email,r.pec,r.phone,r.mobile,r.website,r.ateco_code,r.ateco_title,r.category,r.profession].join(' ').toLowerCase();if(!hay.includes(s))return false}
   return true;
 });
 renderRows();
}
function renderRows(){
 $('tableMeta').textContent=STATE.filtered.length+' record visualizzati · '+STATE.entities.length+' caricati';
 $('rows').innerHTML=STATE.filtered.length?STATE.filtered.map(r=>{
   const src=safeUrl(r.primary_source_url),site=safeUrl(r.website);const ok=r.verification_status==='VERIFICATO';
   return '<tr>'+
   '<td><span class="tag '+(ok?'ok':'warn')+'">'+esc(r.verification_status)+'</span><div class="meta">'+esc(r.confidence_score)+'%</div></td>'+
   '<td><b>'+esc(fmt(r.comune))+'</b><div>'+esc([r.indirizzo,r.civico].filter(Boolean).join(' '))+'</div><div class="meta">'+esc(r.frazione||'')+'</div></td>'+
   '<td><b>'+esc(r.denomination||r.legal_name)+'</b><div class="meta">'+esc(r.subject_type)+' · '+esc(r.category||r.profession||'')+'</div></td>'+
   '<td><b>'+esc(r.ateco_code||'—')+'</b><div class="meta">'+esc(r.ateco_title||'')+'</div></td>'+
   '<td>'+(r.email?'<a href="mailto:'+esc(r.email)+'">'+esc(r.email)+'</a>':'—')+(r.pec?'<div><span class="tag">PEC</span> '+esc(r.pec)+'</div>':'')+'<div class="meta">'+esc(r.email_type||'')+' · '+esc(r.marketing_status||'')+'</div></td>'+
   '<td>'+esc(r.phone||r.mobile||'—')+'</td>'+
   '<td>'+(site?'<a target="_blank" rel="noopener" href="'+esc(site)+'">'+esc(r.website)+'</a>':'—')+'</td>'+
   '<td><b>'+esc(r.primary_source_type||'—')+'</b><div>'+(src?'<a target="_blank" rel="noopener" href="'+esc(src)+'">APRI FONTE</a>':'—')+'</div></td>'+
   '</tr>';
 }).join(''):'<tr><td colspan="8" class="empty">Nessun record per i filtri selezionati.</td></tr>';
}
async function loadRun(){
 const comune=$('comuneFilter').value;
 if(!comune){STATE.latestRun=null;renderSources();return}
 const runs=await rest('f1_email_radar_runs?select=*&comune=eq.'+encodeURIComponent(comune)+'&order=created_at.desc&limit=1')||[];
 STATE.latestRun=runs[0]||null;renderSources();
}
async function renderSources(){
 let progress=[];if(STATE.latestRun){progress=await rest('f1_email_radar_source_progress?select=*&run_id=eq.'+encodeURIComponent(STATE.latestRun.run_id)+'&order=sort_order.asc')||[]}
 const by=new Map(progress.map(x=>[x.source_key,x]));
 $('runMeta').textContent=STATE.latestRun?(
  'Stato: '+STATE.latestRun.status+
  ' · Discovery '+Number(STATE.latestRun.discovery_completeness||0).toFixed(1)+'%'+
  ' · Fonti richieste '+Number(STATE.latestRun.source_coverage||0).toFixed(1)+'%'+
  ' · ATECO '+Number(STATE.latestRun.ateco_coverage||0).toFixed(1)+'%'+
  ' · Contatti '+Number(STATE.latestRun.contact_coverage||0).toFixed(1)+'%'+
  ' · Qualità '+Number(STATE.latestRun.data_quality||0).toFixed(1)+'%'+
  ' · Territorio '+Number(STATE.latestRun.territorial_coverage||0).toFixed(1)+'%'+
  ' · Agg. '+new Date(STATE.latestRun.updated_at||STATE.latestRun.created_at).toLocaleString('it-IT')+
  (STATE.latestRun.last_ateco_code?' · Checkpoint ATECO '+STATE.latestRun.last_ateco_code:'')
 ):'Nessuna scansione registrata per il comune.';
 $('sourceList').innerHTML=STATE.sources.map(s=>{const p=by.get(s.key);const st=p?.status||(s.automatic?'PRONTO':(s.provider_class||'OPZIONALE'));const cls=(st==='COMPLETED'||st==='INTERACTIVE_NOT_REQUIRED'||st==='OPTIONAL_NOT_CONFIGURED')?'ok':'warn';return '<div class="source"><div class="sourceTop"><b>'+esc(s.label)+'</b><span class="tag '+cls+'">'+esc(st)+'</span></div><div class="meta">'+esc(p?.provider_class||s.provider_class||'')+' · '+esc(s.mode)+' · '+esc(s.note||'')+'</div>'+(p?.error?'<div class="meta">'+esc(p.error)+'</div>':'')+(s.url?'<a href="'+esc(s.url)+'" target="_blank" rel="noopener">APRI FONTE</a>':'')+'</div>'}).join('');
}
async function loadQueue(){
 STATE.queue=await rest('f1_email_radar_municipality_queue?select=comune,lato,sort_order,status,last_run_at&order=sort_order.asc')||[];
 const done=STATE.queue.filter(x=>x.status==='DONE').length,errors=STATE.queue.filter(x=>x.status==='ERROR').length;
 $('queueMeta').textContent=done+' completati · '+errors+' errori · '+STATE.queue.length+' Comuni canonici';
 $('queueRows').innerHTML=STATE.queue.map((x,i)=>'<tr><td>'+esc(i+1)+'</td><td><b>'+esc(x.comune)+'</b></td><td>'+esc(x.lato)+'</td><td><span class="tag '+(x.status==='DONE'?'ok':'warn')+'">'+esc(x.status)+'</span></td><td>'+esc(x.last_run_at?new Date(x.last_run_at).toLocaleString('it-IT'):'—')+'</td></tr>').join('');
}
async function reload(){await Promise.all([loadStats(),loadEntities(),loadRun(),loadQueue()])}
function formPayload(form){const fd=new FormData(form),o={};for(const [k,v] of fd.entries())o[k]=String(v).trim();o.confidence_score=Number(o.confidence_score||0);return o}
async function saveEntity(ev){
 ev.preventDefault();const btn=$('saveEntityBtn');btn.disabled=true;
 try{const out=await rpc('f1_email_radar_upsert_entity',{p_payload:formPayload($('entityForm'))});toast(out.merged?'Duplicato riconosciuto: record unificato.':'Record territoriale salvato.');$('entityDialog').close();$('entityForm').reset();await reload()}catch(e){toast(e.message,'bad')}finally{btn.disabled=false}
}
function normalizeKey(k){return String(k||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')}
function first(row,keys){for(const k of keys){const hit=Object.keys(row).find(x=>normalizeKey(x)===k);if(hit&&String(row[hit]??'').trim())return String(row[hit]).trim()}return''}
function mapImport(row){
 return {
  subject_type:first(row,['tipo_soggetto','subject_type','tipo'])||'AZIENDA',
  denomination:first(row,['denominazione','nome_attivita','azienda','name','nome']),
  legal_name:first(row,['ragione_sociale','legal_name']),
  category:first(row,['categoria','category']),
  profession:first(row,['professione','profession']),
  ateco_code:first(row,['codice_ateco','ateco','ateco_code']),
  ateco_title:first(row,['descrizione_ateco','ateco_title']),
  comune:first(row,['comune','citta','city']),
  frazione:first(row,['frazione']),
  indirizzo:first(row,['indirizzo','via','address']),
  civico:first(row,['civico']),
  cap:first(row,['cap','zip']),
  provincia:first(row,['provincia','province'])||'TO',
  phone:first(row,['telefono','phone']),
  mobile:first(row,['cellulare','mobile']),
  email:first(row,['email','email_ordinaria']),
  email_type:first(row,['email_type','tipo_email'])||'EMAIL_NON_VERIFICATA',
  pec:first(row,['pec']),
  website:first(row,['sito','sito_web','website']),
  vat_number:first(row,['partita_iva','piva','vat_number','vat']),
  primary_source_type:first(row,['tipo_fonte','fonte_principale','source_type'])||'IMPORT_FILE',
  primary_source_url:first(row,['url_fonte','fonte','source_url']),
  verification_status:first(row,['stato_verifica','verification_status'])||'DA_VERIFICARE',
  confidence_score:Number(first(row,['confidence_score','confidence'])||40),
  marketing_status:first(row,['marketing_status'])||'DA_VALUTARE',
  notes:first(row,['note','notes'])
 }
}
async function importFile(file){
 if(!window.XLSX)throw new Error('Libreria XLSX non disponibile');
 const buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:''});
 if(!rows.length)throw new Error('File vuoto');
 let saved=0,merged=0,skipped=0;
 for(let i=0;i<rows.length;i+=8){
   const batch=rows.slice(i,i+8).map(mapImport).map(async p=>{if(!p.comune||!p.denomination){skipped++;return}const out=await rpc('f1_email_radar_upsert_entity',{p_payload:p});saved++;if(out.merged)merged++});
   await Promise.all(batch);
 }
 toast('Import completato: '+saved+' salvati, '+merged+' unificati, '+skipped+' saltati.');await reload();
}
async function orchestrate(action){
 const comune=$('comuneFilter').value;if(!comune&&action==='START')throw new Error('Seleziona prima un Comune.');
 const token=await auth();const body={action,comune};if(STATE.latestRun?.run_id)body.run_id=STATE.latestRun.run_id;
 const r=await fetch(CFG().url.replace(/\/$/,'')+'/functions/v1/f1-email-radar-orchestrator',{method:'POST',headers:{apikey:CFG().anonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const x=await r.json();if(!r.ok||!x.ok)throw new Error(x.error+(x.detail?' · '+x.detail:''));
 await reload();return x;
}
async function startScan(){const x=await orchestrate('START');toast('Scansione server avviata: '+(x.run?.status||'RUNNING')+'.')}
async function continueScan(){await loadRun();if(!STATE.latestRun)return startScan();const x=await orchestrate('RESUME');toast('Scansione ripresa dal checkpoint: '+(x.run?.current_source_key||'provider successivo')+'.')}
async function pauseScan(){if(!STATE.latestRun)throw new Error('Nessuna scansione attiva.');await orchestrate('PAUSE');toast('Scansione in pausa.')}
async function retryScan(){if(!STATE.latestRun)throw new Error('Nessuna scansione attiva.');await orchestrate('RETRY');toast('Errori rimessi in coda e nuovo tentativo eseguito.')}
async function stopScan(){if(!STATE.latestRun)throw new Error('Nessuna scansione attiva.');await orchestrate('STOP');toast('Scansione fermata.','bad')}
async function syncAteco(){
 const b=$('atecoSyncBtn');b.disabled=true;b.textContent='SINCRONIZZAZIONE…';
 try{const token=await auth();const r=await fetch(CFG().url.replace(/\/$/,'')+'/functions/v1/f1-email-radar-ateco-sync',{method:'POST',headers:{apikey:CFG().anonKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error+(j.parsed?' · '+j.parsed+' righe':'')+(j.detail?' · '+j.detail:''));toast('ATECO ISTAT sincronizzato: '+(j.total||j.saved||0)+' codici.');await loadStats()}catch(e){toast('ATECO: '+e.message,'bad')}finally{b.disabled=false;b.textContent='SINCRONIZZA ATECO ISTAT'}
}
function exportRows(){return STATE.filtered.map(r=>({ID:r.entity_id,COMUNE:r.comune,FRAZIONE:r.frazione,DENOMINAZIONE:r.denomination,RAGIONE_SOCIALE:r.legal_name,TIPO_SOGGETTO:r.subject_type,CATEGORIA:r.category,PROFESSIONE:r.profession,CODICE_ATECO:r.ateco_code,ATECO_STATUS:r.ateco_status,DESCRIZIONE_ATECO:r.ateco_title,INDIRIZZO:r.indirizzo,CIVICO:r.civico,CAP:r.cap,PROVINCIA:r.provincia,LATITUDINE:r.latitude,LONGITUDINE:r.longitude,GEOCODER:r.geocoder,GEOCODE_PRECISION:r.geocode_precision,TELEFONO:r.phone,CELLULARE:r.mobile,EMAIL_ORDINARIA:r.email,TIPO_EMAIL:r.email_type,PEC:r.pec,SITO_WEB:r.website,PARTITA_IVA:r.vat_number,FONTE_PRINCIPALE:r.primary_source_type,URL_FONTE:r.primary_source_url,STATO_VERIFICA:r.verification_status,CONFIDENCE:r.confidence_score,STATO_ATTIVITA:r.activity_status,MARKETING_STATUS:r.marketing_status,ULTIMA_VERIFICA:r.last_verified_at,NOTE:r.notes}))}
function exportCsv(){const rows=exportRows();if(!rows.length)return toast('Nessun dato da esportare.','bad');const h=Object.keys(rows[0]);const csv=[h.join(','),...rows.map(r=>h.map(k=>csvCell(r[k])).join(','))].join('\r\n');downloadBlob(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),'F1_EMAIL_RADAR_'+($('comuneFilter').value||'TUTTI').replace(/\s+/g,'_')+'.csv')}
function exportXlsx(){if(!window.XLSX)return toast('Libreria XLSX non disponibile.','bad');const rows=exportRows();if(!rows.length)return toast('Nessun dato da esportare.','bad');const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Email Radar');XLSX.writeFile(wb,'F1_EMAIL_RADAR_'+($('comuneFilter').value||'TUTTI').replace(/\s+/g,'_')+'.xlsx')}
async function init(){
 try{
   await loadConfig();
   const ok=await window.F1Sync?.ensureSession?.();if(!ok)throw new Error('ACCESSO CLOUD RICHIESTO');
   $('cloudPill').textContent='CLOUD CONNESSO';$('cloudPill').className='pill ok';
   await reload();
 }catch(e){$('cloudPill').textContent='CLOUD NON DISPONIBILE';$('cloudPill').className='pill bad';toast(e.message,'bad')}
}
$('newBtn').onclick=()=>{$('entityDialog').showModal()};
$('entityForm').addEventListener('submit',saveEntity);
$('importBtn').onclick=()=>$('importFile').click();
$('importFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{await importFile(f)}catch(err){toast(err.message,'bad')}finally{e.target.value=''}};
$('scanBtn').onclick=()=>startScan().catch(e=>toast(e.message,'bad'));
$('continueBtn').onclick=()=>continueScan().catch(e=>toast(e.message,'bad'));
$('pauseBtn').onclick=()=>pauseScan().catch(e=>toast(e.message,'bad'));
$('retryBtn').onclick=()=>retryScan().catch(e=>toast(e.message,'bad'));
$('stopBtn').onclick=()=>stopScan().catch(e=>toast(e.message,'bad'));
$('atecoSyncBtn').onclick=syncAteco;
$('csvBtn').onclick=exportCsv;$('xlsxBtn').onclick=exportXlsx;
['comuneFilter','typeFilter','contactFilter','verifyFilter'].forEach(id=>$(id).addEventListener('change',async()=>{if(id==='comuneFilter')await reload();else applyFilters()}));
$('searchBox').addEventListener('input',applyFilters);$('atecoFilter').addEventListener('input',applyFilters);$('categoryFilter').addEventListener('input',applyFilters);
window.addEventListener('load',init);
})();