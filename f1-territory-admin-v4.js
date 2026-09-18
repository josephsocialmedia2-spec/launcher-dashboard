(()=>{'use strict';
const VERSION='20260919-territory-admin-v5';
const $=id=>document.getElementById(id);
const txt=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const rpc=(n,p={})=>F1StaffData.rpc(n,p);
let profile=null,data=null,timer=null;

function style(){
  if($('f1tv4Style'))return;
  const s=document.createElement('style');s.id='f1tv4Style';s.textContent=`
  .f1tv4{margin-top:18px}.f1tv4-card{background:#fff;border:1px solid #dce6df;border-radius:18px;padding:18px;box-shadow:0 10px 30px rgba(17,56,37,.08)}
  .f1tv4-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.f1tv4-head h2{margin:2px 0 0}.f1tv4-live{font-size:10px;font-weight:900;color:#0b6f3d}
  .f1tv4-kpis{display:grid;grid-template-columns:repeat(7,minmax(92px,1fr));gap:8px;margin-top:14px}.f1tv4-kpi{border:1px solid #dce6df;border-radius:12px;padding:10px;background:#f8fbf9}.f1tv4-kpi strong{display:block;font-size:20px}.f1tv4-kpi small{font-size:9px;font-weight:850;color:#657269}
  .f1tv4-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.f1tv4-btn{min-height:40px;border:1px solid #cfdad3;background:#fff;border-radius:10px;padding:8px 12px;font-weight:900;cursor:pointer;text-decoration:none;color:#17211b;display:inline-flex;align-items:center;justify-content:center}.f1tv4-btn.primary{background:#0b6f3d;color:#fff;border-color:#0b6f3d}.f1tv4-btn.warn{background:#fff7e0;border-color:#e3c36b;color:#6e5000}
  .f1tv4-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.f1tv4-box{border:1px solid #dde7e0;border-radius:14px;padding:13px;background:#fbfdfb}.f1tv4-box h3{margin:0;font-size:14px}.f1tv4-sub{font-size:9px;color:#68746c;font-weight:800}
  .f1tv4-list{display:grid;gap:7px;margin-top:9px;max-height:330px;overflow:auto}.f1tv4-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;border:1px solid #e0e8e2;border-radius:10px;padding:9px;background:#fff}.f1tv4-row strong{font-size:11px}.f1tv4-row small{display:block;color:#6a776f;font-size:9px;margin-top:2px}.f1tv4-row-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.f1tv4-mini{min-height:31px;border:1px solid #cad7cf;border-radius:8px;background:#fff;padding:5px 8px;font-size:8px;font-weight:900;cursor:pointer}.f1tv4-mini.primary{background:#0b6f3d;color:#fff;border-color:#0b6f3d}.f1tv4-mini.done{background:#f5efe0;border-color:#decfa5;color:#5d4a17}
  .f1tv4-assets{margin-top:14px;border-top:1px solid #e3ebe6;padding-top:13px}.f1tv4-assets-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:9px}.f1tv4-asset{border:1px solid #dce6df;border-radius:12px;padding:11px;background:#f7fbf8}.f1tv4-asset strong{display:block;font-size:11px}.f1tv4-asset small{display:block;font-size:8px;color:#68746c;margin:3px 0 8px}.f1tv4-asset input{width:100%;font-size:9px}.f1tv4-asset-state{font-size:8px;margin-top:6px;min-height:16px;color:#53645a}.f1tv4-asset-state.ok{color:#067647;font-weight:900}.f1tv4-asset-state.bad{color:#b42318;font-weight:900}
  .f1tv4-activity{margin-top:14px;border-top:1px solid #e3ebe6;padding-top:12px}.f1tv4-event{display:grid;grid-template-columns:minmax(110px,1fr) minmax(180px,2fr) auto;gap:8px;align-items:center;padding:8px;border:1px solid #e1e8e3;border-radius:9px;background:#fff;font-size:9px}.f1tv4-event small{color:#6a776f}
  @media(max-width:1100px){.f1tv4-kpis{grid-template-columns:repeat(4,1fr)}.f1tv4-assets-grid{grid-template-columns:1fr}.f1tv4-grid{grid-template-columns:1fr}}
  @media(max-width:620px){.f1tv4-kpis{grid-template-columns:repeat(2,1fr)}.f1tv4-event{grid-template-columns:1fr}.f1tv4-row{grid-template-columns:1fr}.f1tv4-row-actions{justify-content:flex-start}}
  `;document.head.appendChild(s);
}
function inject(){
  if($('f1TerritoryAdminV4'))return;
  $('f1TerritoryAdminV3')?.remove();
  const section=document.createElement('section');section.id='f1TerritoryAdminV4';section.className='f1tv4';
  section.innerHTML=`
  <div class="f1tv4-card">
    <div class="f1tv4-head"><div><small>F1 TERRITORY · CRM ONLINE CONDIVISO</small><h2>MOBILE ↔ CRM ↔ DASHBOARD PC</h2></div><span id="f1tv4Live" class="f1tv4-live">CARICAMENTO…</span></div>
    <div class="f1tv4-kpis">
      <div class="f1tv4-kpi"><strong id="f1tv4Civics">0</strong><small>IMMOBILI / CIVICI</small></div>
      <div class="f1tv4-kpi"><strong id="f1tv4Contacts">0</strong><small>CONTATTI</small></div>
      <div class="f1tv4-kpi"><strong id="f1tv4News">0</strong><small>NOTIZIE</small></div>
      <div class="f1tv4-kpi"><strong id="f1tv4Notes">0</strong><small>NOTE</small></div>
      <div class="f1tv4-kpi"><strong id="f1tv4Ocr">0</strong><small>OCR FOTO</small></div>
      <div class="f1tv4-kpi"><strong id="f1tv4Print">0</strong><small>LETTERE DA STAMPARE</small></div>
      <div class="f1tv4-kpi"><strong id="f1tv4Deliver">0</strong><small>LETTERE DA IMBUCARE</small></div>
      <div class="f1tv4-kpi"><strong id="f1tv4Appointments">0</strong><small>APPUNTAMENTI OGGI</small></div>
      <div class="f1tv4-kpi"><strong id="f1tv4Followups">0</strong><small>FOLLOW-UP APERTI</small></div>
    </div>
    <div class="f1tv4-actions">
      <a class="f1tv4-btn primary" href="territory-mobile.html">APRI F1 TERRITORY MOBILE</a>
      <button id="f1tv4Excel" class="f1tv4-btn" type="button">SCARICA EXCEL CRM</button>
      <button id="f1tv4Refresh" class="f1tv4-btn" type="button">AGGIORNA ORA</button>
    </div>
    <div class="f1tv4-grid">
      <div class="f1tv4-box"><div><h3>RIPRENDI LA ZONA</h3><span class="f1tv4-sub">Ultima registrazione effettuata da ciascun operatore</span></div><div id="f1tv4Resume" class="f1tv4-list"></div></div>
      <div class="f1tv4-box"><div><h3>LETTERE DI OGGI</h3><span class="f1tv4-sub">Da stampare e da imbucare, ordinate per Comune · Via · Civico</span></div><div id="f1tv4Letters" class="f1tv4-list"></div></div>
    </div>
    <div class="f1tv4-grid">
      <div class="f1tv4-box"><div><h3>APPUNTAMENTI</h3><span class="f1tv4-sub">Appuntamenti registrati dal mobile e visibili sul PC</span></div><div id="f1tv4AppointmentsList" class="f1tv4-list"></div></div>
      <div class="f1tv4-box"><div><h3>FOLLOW-UP</h3><span class="f1tv4-sub">Richiami da gestire senza reinserire i dati</span></div><div id="f1tv4FollowupsList" class="f1tv4-list"></div></div>
    </div>
    <div id="f1tv4AssetsBox" class="f1tv4-assets">
      <div><h3 style="margin:0">MATERIALI DIGITALI WHATSAPP</h3><span class="f1tv4-sub">Il Titolare carica qui i PDF che il telefono utilizza con i referenti</span></div>
      <div class="f1tv4-assets-grid">
        ${assetCard('GIORNALINO','GIORNALINO F1')}
        ${assetCard('VOLANTINO_UFFICIO','VOLANTINO DIGITALE UFFICIO')}
        ${assetCard('REPORT_PREZZI_ZONA','REPORT PREZZI ZONA')}
      </div>
    </div>
    <div class="f1tv4-activity"><h3 style="margin:0">ULTIME REGISTRAZIONI DAL MOBILE</h3><div id="f1tv4Activity" class="f1tv4-list"></div></div>
  </div>`;
  (document.querySelector('.bottom-grid')||document.querySelector('main'))?.insertAdjacentElement('beforebegin',section);
}
function assetCard(type,label){return `<div class="f1tv4-asset"><strong>${label}</strong><small>PDF caricato dal Titolare · disponibile sul mobile</small><input id="f1tv4File_${type}" type="file" accept="application/pdf"><div class="f1tv4-actions"><button class="f1tv4-btn primary" data-publish-asset="${type}" type="button">CARICA / PUBBLICA</button><a id="f1tv4Open_${type}" class="f1tv4-btn" href="#" target="_blank" rel="noopener" style="display:none">APRI PDF</a></div><div id="f1tv4State_${type}" class="f1tv4-asset-state"></div></div>`}
function asset(type){return (data?.active_assets||[]).find(x=>x.asset_type===type)||null}
function staffName(uid){const p=(data?.team||[]).find(x=>x.user_id===uid);return txt([p?.first_name,p?.last_name].filter(Boolean).join(' '))||p?.role||'F1'}
function routeSort(a,b){return [a.comune,a.via,a.civico].map(txt).join('|').localeCompare([b.comune,b.via,b.civico].map(txt).join('|'),'it',{numeric:true,sensitivity:'base'})}
function formatDate(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?txt(v):d.toLocaleString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function safePart(v){return txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,70)||'DATO'}
async function load(){
  data=await rpc('f1_territory_office_dashboard_v5',{p_limit:2000})||{};
  for(const k of ['civics','conversations','news','letters','notes','streets','active_assets','last_positions','team','appointments','followups'])data[k]=data[k]||[];
  render();
}
function render(){
  $('f1tv4Civics').textContent=data.civics.length;$('f1tv4Contacts').textContent=data.conversations.length;$('f1tv4News').textContent=data.news.length;$('f1tv4Notes').textContent=data.notes.length;$('f1tv4Ocr').textContent=data.notes.filter(x=>x.note_type==='OCR').length;
  const p=data.letters.filter(x=>x.status==='DA_STAMPARE'),d=data.letters.filter(x=>x.status==='DA_IMBUCARE');$('f1tv4Print').textContent=p.length;$('f1tv4Deliver').textContent=d.length;const today=new Date().toISOString().slice(0,10);$('f1tv4Appointments').textContent=(data.appointments||[]).filter(x=>String(x.appointment_at||'').slice(0,10)===today).length;$('f1tv4Followups').textContent=(data.followups||[]).length;
  const syncAt=data.server_synced_at?new Date(data.server_synced_at):new Date();$('f1tv4Live').textContent='CRM ONLINE · '+new Intl.DateTimeFormat('it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(syncAt);
  renderResume();renderLetters();renderAppointments();renderFollowups();renderAssets();renderActivity();
}
function renderResume(){
  const rows=(data.last_positions||[]).slice().sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||'')));
  $('f1tv4Resume').innerHTML=rows.length?rows.map(r=>`<div class="f1tv4-row"><div><strong>${esc(r.operator_name||staffName(r.user_id))}</strong><small>${esc([r.comune,r.via,r.civico?'Civico '+r.civico:''].filter(Boolean).join(' · '))}</small><small>${esc(formatDate(r.updated_at))}</small></div><div class="f1tv4-row-actions"><a class="f1tv4-mini primary" href="territory-mobile.html">APRI MOBILE</a></div></div>`).join(''):'<div class="f1tv4-sub">Nessuna registrazione territoriale.</div>';
}
function renderLetters(){
  const rows=data.letters.filter(x=>['DA_STAMPARE','DA_IMBUCARE'].includes(x.status)).sort(routeSort);
  $('f1tv4Letters').innerHTML=rows.length?rows.map(l=>`<div class="f1tv4-row"><div><strong>${esc([l.comune,l.via,l.civico].filter(Boolean).join(' · '))}</strong><small>${esc(l.operator_name||staffName(l.user_id))} · ${esc(l.status.replaceAll('_',' '))}</small></div><div class="f1tv4-row-actions">${l.status==='DA_STAMPARE'?'<button class="f1tv4-mini primary" data-letter-pdf="'+esc(l.letter_id)+'">SCARICA PDF</button>':''}${l.status==='DA_IMBUCARE'?'<button class="f1tv4-mini done" data-letter-done="'+esc(l.letter_id)+'">IMBUCATA ✓</button>':''}</div></div>`).join(''):'<div class="f1tv4-sub">Nessuna lettera operativa.</div>';
  document.querySelectorAll('[data-letter-pdf]').forEach(b=>b.onclick=()=>downloadLetter(b.dataset.letterPdf));
  document.querySelectorAll('[data-letter-done]').forEach(b=>b.onclick=()=>markDelivered(b.dataset.letterDone));
}

function renderAppointments(){
  const rows=(data.appointments||[]).slice().sort((a,b)=>String(a.appointment_at||'').localeCompare(String(b.appointment_at||'')));
  $('f1tv4AppointmentsList').innerHTML=rows.length?rows.map(r=>`<div class="f1tv4-row"><div><strong>${esc(r.person_name||r.target_type||'APPUNTAMENTO')}</strong><small>${esc([r.comune,r.via,r.civico?'Civico '+r.civico:''].filter(Boolean).join(' · '))}</small><small>${esc(formatDate(r.appointment_at))}${r.phone?' · '+esc(r.phone):''}</small></div><div class="f1tv4-row-actions"><span class="f1tv4-mini primary">APPUNTAMENTO</span></div></div>`).join(''):'<div class="f1tv4-sub">Nessun appuntamento registrato.</div>';
}
function renderFollowups(){
  const rows=(data.followups||[]).slice().sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||'')));
  $('f1tv4FollowupsList').innerHTML=rows.length?rows.map(r=>`<div class="f1tv4-row"><div><strong>${esc(r.person_name||r.target_type||'CONTATTO')}</strong><small>${esc([r.comune,r.via,r.civico?'Civico '+r.civico:''].filter(Boolean).join(' · '))}</small><small>${esc(r.phone||'')} ${r.next_action?' · '+esc(r.next_action):''}</small></div><div class="f1tv4-row-actions"><span class="f1tv4-mini done">DA RICHIAMARE</span></div></div>`).join(''):'<div class="f1tv4-sub">Nessun follow-up aperto.</div>';
}
function renderAssets(){
  for(const type of ['GIORNALINO','VOLANTINO_UFFICIO','REPORT_PREZZI_ZONA']){
    const a=asset(type),link=$('f1tv4Open_'+type),st=$('f1tv4State_'+type);
    if(a?.public_url){link.href=a.public_url;link.style.display='inline-flex';st.className='f1tv4-asset-state ok';st.textContent='✓ ATTIVO · '+formatDate(a.published_at)}else{link.style.display='none';st.className='f1tv4-asset-state';st.textContent='Nessun PDF attivo.'}
  }
}
function activityRows(){
  const rows=[];
  data.civics.forEach(r=>rows.push({at:r.updated_at,user:r.user_id,label:'CIVICO',detail:[r.comune,r.via,r.civico,r.property_type,(r.signals||[]).join(' / ')].filter(Boolean).join(' · ')}));
  data.conversations.forEach(r=>rows.push({at:r.updated_at||r.created_at,user:r.user_id,label:r.outcome==='APPUNTAMENTO'?'APPUNTAMENTO':'CONTATTO',detail:[r.person_name||r.target_type,r.comune,r.via,r.civico,r.outcome].filter(Boolean).join(' · ')}));
  data.notes.forEach(r=>rows.push({at:r.created_at,user:r.user_id,label:r.note_type==='OCR'?'FOTO OCR':r.note_type==='AUDIO'?'NOTA AUDIO':'NOTA',detail:[r.comune,r.via,r.civico,r.note_text?String(r.note_text).slice(0,80):''].filter(Boolean).join(' · ')}));
  return rows.filter(x=>x.at).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,15);
}
function renderActivity(){
  const rows=activityRows();$('f1tv4Activity').innerHTML=rows.length?rows.map(x=>`<div class="f1tv4-event"><strong>${esc(staffName(x.user))}</strong><span><b>${esc(x.label)}</b><br><small>${esc(x.detail)}</small></span><small>${esc(formatDate(x.at))}</small></div>`).join(''):'<div class="f1tv4-sub">Nessuna attività registrata.</div>';
}
async function authUpload(file,path){
  const cfg=window.F1_SUPABASE,token=await F1Sync.authToken();if(!cfg?.url||!cfg?.anonKey)throw new Error('SUPABASE NON CONFIGURATO');
  const r=await fetch(cfg.url.replace(/\/$/,'')+'/storage/v1/object/f1-territory-bulletins/'+path,{method:'POST',headers:{apikey:cfg.anonKey,Authorization:'Bearer '+token,'Content-Type':'application/pdf','x-upsert':'false'},body:file});
  const t=await r.text();if(!r.ok)throw new Error('UPLOAD PDF: '+t);
  return cfg.url.replace(/\/$/,'')+'/storage/v1/object/public/f1-territory-bulletins/'+path;
}
async function publishAsset(type){
  if(!['TITOLARE','ADMIN','MANAGER'].includes(String(profile?.role||'').toUpperCase()))return alert('Solo il Titolare può pubblicare i materiali.');
  const input=$('f1tv4File_'+type),file=input?.files?.[0],st=$('f1tv4State_'+type);if(!file)return alert('Seleziona un PDF.');
  if(file.type!=='application/pdf')return alert('Il file deve essere PDF.');
  try{st.className='f1tv4-asset-state';st.textContent='CARICAMENTO…';const path='assets/'+type.toLowerCase()+'/'+profile.user_id+'/'+Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9._-]+/g,'_'),url=await authUpload(file,path);await rpc('f1_territory_asset_publish_v4',{p_asset_type:type,p_title:type.replaceAll('_',' '),p_pdf_path:path,p_public_url:url});input.value='';await load()}catch(e){st.className='f1tv4-asset-state bad';st.textContent=e.message||e}
}
function loadJsPdf(){return new Promise((resolve,reject)=>{if(window.jspdf?.jsPDF)return resolve(window.jspdf.jsPDF);const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';s.onload=()=>resolve(window.jspdf.jsPDF);s.onerror=()=>reject(new Error('GENERATORE PDF NON DISPONIBILE'));document.head.appendChild(s)})}
async function downloadLetter(id){
  const l=data.letters.find(x=>x.letter_id===id);if(!l)return;
  try{const JsPDF=await loadJsPdf(),doc=new JsPDF({unit:'mm',format:'a4'}),left=20,width=170;let y=20;doc.setTextColor(11,111,61);doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text('F1 IMMOBILIARE',left,y);y+=6;doc.setFont('helvetica','normal');doc.setTextColor(70);doc.setFontSize(9);doc.text('F1 IMMOBILIARE di Aurigemma Francesca',left,y);y+=5;doc.text('f1immobiliaresusa@outlook.it',left,y);y+=12;doc.setTextColor(30);doc.setFontSize(11);doc.text('Buongiorno,',left,y);y+=9;doc.text(doc.splitTextToSize('sono '+(l.operator_name||'Funzionario F1')+' di F1 Immobiliare.',width),left,y);y+=12;doc.text(doc.splitTextToSize('Sto lavorando professionalmente in questa zona e ho notato l’immobile situato in:',width),left,y);y+=12;doc.setFont('helvetica','bold');doc.text(doc.splitTextToSize(l.address_text||([l.via,l.civico,l.comune].filter(Boolean).join(' ')),width),left,y);y+=16;doc.setFont('helvetica','normal');doc.text(doc.splitTextToSize('Non so se stiate valutando di venderlo, oggi o nei prossimi mesi. Se la vendita dell’immobile fosse una possibilità, sarei interessato a parlarne direttamente con voi e a capire quali siano i vostri programmi. La conversazione è naturalmente senza impegno.',width),left,y);y+=35;doc.setFont('helvetica','bold');doc.text((l.operator_name||'F1 Immobiliare')+' - F1 Immobiliare',left,y);y+=6;doc.setFont('helvetica','normal');doc.text('Tel. '+(l.operator_phone||''),left,y);
    const filename='F1_LETTERA_'+safePart(l.comune)+'_'+safePart(l.via)+(l.civico?'_'+safePart(l.civico):'')+'.pdf';doc.save(filename);
    await rpc('f1_territory_letter_update_v4',{p_letter_id:l.letter_id,p_status:'DA_IMBUCARE',p_address_text:l.address_text||'',p_address_source:l.address_source||'CRM',p_verified:!!l.address_verified_at,p_pdf_filename:filename,p_pdf_downloaded:true});await load()
  }catch(e){alert(e.message||e)}
}
async function markDelivered(id){try{const l=data.letters.find(x=>x.letter_id===id);await rpc('f1_territory_letter_update_v4',{p_letter_id:id,p_status:'IMBUCATA',p_address_text:l?.address_text||'',p_address_source:l?.address_source||'CRM',p_verified:!!l?.address_verified_at,p_pdf_filename:l?.pdf_filename||null,p_pdf_downloaded:false});await load()}catch(e){alert(e.message||e)}}
function loadXlsx(){return new Promise((resolve,reject)=>{if(window.XLSX)return resolve();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('LIBRERIA EXCEL NON DISPONIBILE'));document.head.appendChild(s)})}
async function excel(){
  try{await loadXlsx();await load();const wb=XLSX.utils.book_new(),add=(n,r)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(r.length?r:[{INFO:'Nessun dato'}]),n);
    add('IMMOBILI',data.civics.map(r=>({COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,STATO:r.status,TIPOLOGIA:r.property_type,SEGNALI:(r.signals||[]).join(' | '),'PROSSIMA AZIONE':r.next_action,AGGIORNATO:r.updated_at})));
    add('NOTE',data.notes.map(r=>({TIPO:r.note_type,COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,NOTA:r.note_text,'FOTO PATH':r.photo_path,'AUDIO PATH':r.audio_path,FILE:r.source_file_name,CREATA:r.created_at})));
    add('CONTATTI',data.conversations.map(r=>({NOMINATIVO:r.person_name,TIPO:r.target_type,TELEFONO:r.phone,COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,ESITO:r.outcome,'SCAMBIO VALORE':r.value_offer,'APPUNTAMENTO':r.appointment_at,'PROSSIMA AZIONE':r.next_action,NOTE:r.notes})));
    add('NOTIZIE',data.news.map(r=>({TIPO:r.news_type||r.observation_type,COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,STATO:r.workflow_state||r.status,NOMINATIVO:r.person_name,TELEFONO:r.phone_normalized,NOTE:r.notes,PROPRIETARIO:r.owner_status,'CHI PUBBLICA':r.market_publisher,PREZZO:r.market_price,AGENZIA:r.market_agency,'TEMPO IN VENDITA':r.market_time_on_market,'PROSSIMA AZIONE':r.next_action})));
    add('LETTERE',data.letters.map(r=>({COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,FUNZIONARIO:r.operator_name,STATO:r.status,'PDF FILE':r.pdf_filename,CREATA:r.created_at,SCARICATA:r.pdf_downloaded_at,IMBUCATA:r.delivered_at})));
    add('VIE',data.streets.map(r=>({COMUNE:r.comune,VIA:r.via,STATO:r.status,'ULTIMO CIVICO':r.last_civic,'PROSSIMO CIVICO':r.next_civic,COPERTURA:r.coverage_pct,FONTE:r.source})));
    add('FOLLOW-UP',data.conversations.filter(r=>r.outcome==='DA RICONTATTARE'||r.status==='RICHIAMO'||r.outcome==='APPUNTAMENTO').map(r=>({SOGGETTO:r.person_name||r.target_type,TELEFONO:r.phone,COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,ESITO:r.outcome,APPUNTAMENTO:r.appointment_at,'PROSSIMA AZIONE':r.next_action,STATO:r.status})));
    XLSX.writeFile(wb,'F1_Territory_CRM_'+new Date().toISOString().slice(0,10)+'.xlsx')
  }catch(e){alert(e.message||e)}
}
async function init(){
  style();inject();
  try{profile=await F1StaffData.me();if(!['TITOLARE','ADMIN','MANAGER'].includes(String(profile.role||'').toUpperCase()))$('f1tv4AssetsBox').style.display='none';await load()}catch(e){console.error(e)}
  $('f1tv4Refresh').onclick=()=>load().catch(e=>alert(e.message||e));$('f1tv4Excel').onclick=excel;
  document.querySelectorAll('[data-publish-asset]').forEach(b=>b.onclick=()=>publishAsset(b.dataset.publishAsset));
  clearInterval(timer);timer=setInterval(()=>{if(!document.hidden)load().catch(()=>{})},15000);window.addEventListener('focus',()=>load().catch(()=>{}));
}
window.F1TerritoryAdminV4={version:VERSION,load,excel};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,100),{once:true});else setTimeout(init,100);
})();