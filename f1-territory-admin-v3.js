(()=>{
'use strict';
const VERSION='20260918-territory-admin-v3b';
const $=id=>document.getElementById(id);
const txt=v=>String(v??'').trim();
let profile=null,crm=null,timer=null,teamRows=[];
const rpc=(n,p={})=>F1StaffData.rpc(n,p);

function css(){
  if($('f1TerritoryAdminV3Style'))return;
  const s=document.createElement('style');s.id='f1TerritoryAdminV3Style';s.textContent=`
  .f1tv3-panel{margin-top:18px}.f1tv3-card{background:#fff;border:1px solid #dce6df;border-radius:18px;padding:18px;box-shadow:0 10px 30px rgba(17,56,37,.08)}.f1tv3-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.f1tv3-head h2{margin:0}.f1tv3-live{font-size:10px;font-weight:900;color:#0b6f3d}.f1tv3-kpis{display:grid;grid-template-columns:repeat(6,minmax(90px,1fr));gap:8px;margin-top:14px}.f1tv3-kpi{border:1px solid #dce6df;border-radius:12px;padding:10px;background:#f8fbf9}.f1tv3-kpi strong{display:block;font-size:20px}.f1tv3-kpi small{font-size:9px;font-weight:850;color:#657269}.f1tv3-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.f1tv3-btn{min-height:42px;border:1px solid #cfdad3;background:#fff;border-radius:10px;padding:8px 12px;font-weight:900;cursor:pointer;text-decoration:none;color:#17211b;display:inline-flex;align-items:center}.f1tv3-btn.primary{background:#0b6f3d;color:#fff;border-color:#0b6f3d}.f1tv3-bulletin{margin-top:14px;padding:13px;border:1px solid #b9dfc9;border-radius:13px;background:#f4fbf7}.f1tv3-bulletin-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.f1tv3-bulletin input{width:100%;box-sizing:border-box;border:1px solid #d4ddd7;border-radius:9px;padding:9px}.f1tv3-status{font-size:10px;margin-top:8px;color:#53645a}.f1tv3-activity{margin-top:14px;border-top:1px solid #e1e8e3;padding-top:12px}.f1tv3-activity-list{display:grid;gap:7px;margin-top:8px}.f1tv3-event{display:grid;grid-template-columns:minmax(120px,1fr) minmax(180px,2fr) auto;gap:8px;align-items:center;padding:8px 9px;border:1px solid #e1e8e3;border-radius:10px;background:#fbfdfb;font-size:10px}.f1tv3-event small{color:#64736a}.f1tv3-status.bad{color:#b42318}.f1tv3-status.ok{color:#067647;font-weight:900}@media(max-width:900px){.f1tv3-kpis{grid-template-columns:repeat(3,1fr)}.f1tv3-bulletin-grid{grid-template-columns:1fr}}@media(max-width:560px){.f1tv3-kpis{grid-template-columns:repeat(2,1fr)}}`;document.head.appendChild(s);
}
function inject(){
  if($('f1TerritoryAdminV3'))return;
  const target=document.querySelector('.bottom-grid')||document.querySelector('main');
  const section=document.createElement('section');section.id='f1TerritoryAdminV3';section.className='f1tv3-panel';section.innerHTML=`
  <div class="f1tv3-card">
    <div class="f1tv3-head"><div><small>F1 TERRITORY · CRM ONLINE</small><h2>CONTROLLO TERRITORIO</h2></div><span id="f1tv3Live" class="f1tv3-live">AGGIORNAMENTO…</span></div>
    <div class="f1tv3-kpis">
      <div class="f1tv3-kpi"><strong id="f1tv3Civics">0</strong><small>IMMOBILI / CIVICI</small></div>
      <div class="f1tv3-kpi"><strong id="f1tv3Contacts">0</strong><small>CONTATTI</small></div>
      <div class="f1tv3-kpi"><strong id="f1tv3News">0</strong><small>NOTIZIE</small></div>
      <div class="f1tv3-kpi"><strong id="f1tv3Notes">0</strong><small>NOTE</small></div>
      <div class="f1tv3-kpi"><strong id="f1tv3Audio">0</strong><small>NOTE AUDIO</small></div>
      <div class="f1tv3-kpi"><strong id="f1tv3Streets">0</strong><small>VIE</small></div>
    </div>
    <div class="f1tv3-actions"><a class="f1tv3-btn primary" href="territory-mobile.html#crm">APRI CRM TERRITORIALE</a><button id="f1tv3Excel" class="f1tv3-btn" type="button">SCARICA EXCEL</button><button id="f1tv3Refresh" class="f1tv3-btn" type="button">AGGIORNA ORA</button></div>
    <div id="f1tv3BulletinBox" class="f1tv3-bulletin">
      <strong>GIORNALINO F1 · PDF WHATSAPP</strong>
      <div class="f1tv3-bulletin-grid"><input id="f1tv3BulletinTitle" value="GIORNALINO F1 · OFFERTE IMMOBILIARI" placeholder="Titolo giornalino"><input id="f1tv3BulletinFile" type="file" accept="application/pdf"></div>
      <textarea id="f1tv3BulletinIntro" style="width:100%;box-sizing:border-box;margin-top:8px;min-height:70px;border:1px solid #d4ddd7;border-radius:9px;padding:9px" placeholder="Introduzione">Le nostre proposte immobiliari selezionate. Per informazioni e visite contatta F1 Immobiliare.</textarea>
      <textarea id="f1tv3BulletinOffers" style="width:100%;box-sizing:border-box;margin-top:8px;min-height:120px;border:1px solid #d4ddd7;border-radius:9px;padding:9px" placeholder="Una offerta per riga: Comune | Tipologia / descrizione | Prezzo | Link"></textarea>
      <div class="f1tv3-actions"><button id="f1tv3CreatePublish" class="f1tv3-btn primary" type="button">CREA E PUBBLICA PDF</button><button id="f1tv3Publish" class="f1tv3-btn" type="button">PUBBLICA PDF GIÀ PRONTO</button><a id="f1tv3BulletinOpen" class="f1tv3-btn" href="#" target="_blank" rel="noopener">APRI PDF ATTIVO</a></div>
      <div id="f1tv3BulletinStatus" class="f1tv3-status">Caricamento stato giornalino…</div>
    </div>
    <div class="f1tv3-activity"><div class="f1tv3-head"><div><small>AGGIORNAMENTO IN TEMPO REALE</small><h2>ATTIVITÀ FUNZIONARI</h2></div></div><div id="f1tv3Activity" class="f1tv3-activity-list"><div class="f1tv3-status">Caricamento attività…</div></div></div>
  </div>`;
  target.parentNode.insertBefore(section,target);
}
function status(msg,bad=false,ok=false){const e=$('f1tv3BulletinStatus');if(!e)return;e.textContent=msg;e.className='f1tv3-status '+(bad?'bad':ok?'ok':'')}
function staffName(userId){
  const p=teamRows.find(x=>String(x.user_id)===String(userId));
  return p?[p.first_name,p.last_name].filter(Boolean).join(' ')||p.email||'Funzionario F1':'Funzionario F1';
}
function activityEvents(){
  const rows=[];
  (crm.civics||[]).forEach(r=>rows.push({at:r.updated_at,user:r.user_id,label:'CIVICO / IMMOBILE',detail:[r.comune,r.via,r.civico,r.property_type].filter(Boolean).join(' · ')}));
  (crm.conversations||[]).forEach(r=>rows.push({at:r.created_at||r.updated_at,user:r.user_id,label:'CONVERSAZIONE',detail:[r.person_name||r.target_type,r.outcome,r.via,r.civico].filter(Boolean).join(' · ')}));
  (crm.news||[]).forEach(r=>rows.push({at:r.updated_at||r.observed_at,user:r.user_id,label:'NOTIZIA',detail:[r.news_type||r.observation_type,r.via,r.civico,r.next_action].filter(Boolean).join(' · ')}));
  (crm.notes||[]).forEach(r=>rows.push({at:r.created_at,user:r.user_id,label:r.note_type==='AUDIO'?'NOTA AUDIO':'NOTA',detail:[r.comune,r.via,r.civico,r.note_type==='TEXT'?String(r.note_text||'').slice(0,70):((r.audio_duration_seconds||'')+'s')].filter(Boolean).join(' · ')}));
  return rows.filter(x=>x.at).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,12);
}
function renderActivity(){
  const e=$('f1tv3Activity');if(!e)return;const rows=activityEvents();
  e.innerHTML=rows.length?rows.map(x=>'<div class="f1tv3-event"><strong>'+staffName(x.user)+'</strong><span><b>'+x.label+'</b><br><small>'+String(x.detail||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))+'</small></span><small>'+new Date(x.at).toLocaleString('it-IT')+'</small></div>').join(''):'<div class="f1tv3-status">Nessuna attività territoriale registrata.</div>';
}
async function loadCRM(){
  crm=await rpc('f1_territory_mobile_crm_v3',{p_limit:1500})||{};
  crm.civics=crm.civics||[];crm.conversations=crm.conversations||[];crm.news=crm.news||[];crm.notes=crm.notes||[];crm.streets=crm.streets||[];crm.letters=crm.letters||[];
  $('f1tv3Civics').textContent=crm.civics.length;$('f1tv3Contacts').textContent=crm.conversations.length;$('f1tv3News').textContent=crm.news.length;$('f1tv3Notes').textContent=crm.notes.length;$('f1tv3Audio').textContent=crm.notes.filter(n=>n.note_type==='AUDIO').length;$('f1tv3Streets').textContent=crm.streets.length;
  $('f1tv3Live').textContent='AGGIORNATO '+new Intl.DateTimeFormat('it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date());
  const b=crm.active_bulletin;if(b?.public_url){$('f1tv3BulletinOpen').href=b.public_url;$('f1tv3BulletinOpen').style.display='inline-flex';status('PDF attivo: '+(b.title||'GIORNALINO F1')+' · pubblicato '+new Date(b.published_at).toLocaleString('it-IT'),false,true)}else{$('f1tv3BulletinOpen').style.display='none';status('Nessun giornalino PDF attivo.')}
  renderActivity();
}
function loadJsPdf(){
  return new Promise((resolve,reject)=>{
    if(window.jspdf?.jsPDF)return resolve(window.jspdf.jsPDF);
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
    s.onload=()=>resolve(window.jspdf.jsPDF);
    s.onerror=()=>reject(new Error('GENERATORE PDF NON DISPONIBILE'));
    document.head.appendChild(s);
  });
}
function parseOffers(){
  return txt($('f1tv3BulletinOffers').value).split(/\n+/).map(line=>{
    const p=line.split('|').map(txt);
    return {comune:p[0]||'',descrizione:p[1]||'',prezzo:p[2]||'',link:p[3]||''};
  }).filter(x=>x.comune||x.descrizione||x.prezzo||x.link).slice(0,8);
}
async function createBulletinPdf(){
  const JsPDF=await loadJsPdf(),doc=new JsPDF({unit:'mm',format:'a4'}),title=txt($('f1tv3BulletinTitle').value)||'GIORNALINO F1 · OFFERTE IMMOBILIARI',intro=txt($('f1tv3BulletinIntro').value),offers=parseOffers();
  if(!offers.length)throw new Error('INSERISCI ALMENO UNA OFFERTA IMMOBILIARE');
  doc.setTextColor(11,111,61);doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text('F1 IMMOBILIARE',15,18);
  doc.setTextColor(25,33,28);doc.setFontSize(14);doc.text(title,15,28);
  doc.setFont('helvetica','normal');doc.setFontSize(9);const introLines=doc.splitTextToSize(intro||'Le nostre proposte immobiliari selezionate.',180);doc.text(introLines,15,36);
  let y=36+introLines.length*4+6;
  offers.forEach((o,i)=>{
    if(y>257){doc.addPage();y=18}
    doc.setDrawColor(210);doc.roundedRect(15,y,180,27,2,2);
    doc.setTextColor(11,111,61);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text((i+1)+'. '+(o.comune||'OFFERTA F1'),20,y+7);
    doc.setTextColor(30);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(doc.splitTextToSize(o.descrizione||'Immobile F1',115),20,y+13);
    if(o.prezzo){doc.setFont('helvetica','bold');doc.text(o.prezzo,150,y+8)}
    if(o.link){doc.setFont('helvetica','normal');doc.setFontSize(7);doc.textWithLink('APRI ANNUNCIO',150,y+17,{url:o.link})}
    y+=32;
  });
  doc.setTextColor(55);doc.setFontSize(8);doc.setFont('helvetica','normal');
  doc.text('F1 IMMOBILIARE di Aurigemma Francesca',15,282);
  doc.text('Francesca +39 371 424 6300 · Joseph +39 371 370 8294 · f1immobiliaresusa@outlook.it',15,287);
  return doc.output('blob');
}
async function createAndPublish(){
  if(!['TITOLARE','ADMIN','MANAGER'].includes(String(profile?.role||'').toUpperCase()))return status('Solo il Titolare può creare e pubblicare il giornalino.',true);
  try{
    status('Creo il giornalino PDF…');
    const blob=await createBulletinPdf(),path=profile.user_id+'/'+Date.now()+'-giornalino-f1.pdf',url=await storageUploadPdf(blob,path);
    await rpc('f1_territory_bulletin_publish_v3',{p_title:txt($('f1tv3BulletinTitle').value)||'GIORNALINO F1',p_pdf_path:path,p_public_url:url});
    await loadCRM();
    status('✓ PDF creato e pubblicato. È ora disponibile nel tasto INVIO GIORNALINO sul telefono.',false,true);
  }catch(e){status(e.message||e,true)}
}
async function storageUploadPdf(file,path){
  const cfg=window.F1_SUPABASE,token=await F1Sync.authToken();
  const r=await fetch(cfg.url.replace(/\/$/,'')+'/storage/v1/object/f1-territory-bulletins/'+path,{method:'POST',headers:{apikey:cfg.anonKey,Authorization:'Bearer '+token,'Content-Type':'application/pdf','x-upsert':'false'},body:file});
  const t=await r.text();if(!r.ok)throw new Error('UPLOAD PDF: '+t);
  return cfg.url.replace(/\/$/,'')+'/storage/v1/object/public/f1-territory-bulletins/'+path;
}
async function publish(){
  if(!['TITOLARE','ADMIN','MANAGER'].includes(String(profile?.role||'').toUpperCase()))return status('Solo il Titolare può pubblicare il giornalino.',true);
  const file=$('f1tv3BulletinFile').files?.[0];if(!file)return status('Seleziona un file PDF.',true);
  if(file.type!=='application/pdf')return status('Il giornalino deve essere un PDF.',true);
  try{status('Caricamento PDF…');const path=profile.user_id+'/'+Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9._-]+/g,'_'),url=await storageUploadPdf(file,path);await rpc('f1_territory_bulletin_publish_v3',{p_title:txt($('f1tv3BulletinTitle').value)||'GIORNALINO F1',p_pdf_path:path,p_public_url:url});await loadCRM();$('f1tv3BulletinFile').value='';status('✓ Giornalino pubblicato. Il tasto INVIO GIORNALINO del telefono userà questo PDF.',false,true)}catch(e){status(e.message||e,true)}
}
function loadXlsx(){return new Promise((resolve,reject)=>{if(window.XLSX)return resolve();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('Libreria Excel non disponibile'));document.head.appendChild(s)})}
async function excel(){
  try{await loadXlsx();await loadCRM();const wb=XLSX.utils.book_new(),add=(n,r)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(r),n);
    add('IMMOBILI',crm.civics.map(r=>({COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,STATO:r.status,TIPOLOGIA:r.property_type,SEGNALI:(r.signals||[]).join(' · '),'PROSSIMA AZIONE':r.next_action,AGGIORNATO:r.updated_at})));
    add('CONTATTI',crm.conversations.map(r=>({NOMINATIVO:r.person_name,TIPO:r.target_type,TELEFONO:r.phone,COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,ESITO:r.outcome,'PROSSIMA AZIONE':r.next_action,NOTE:r.notes})));
    add('NOTIZIE',crm.news.map(r=>({TIPO:r.news_type||r.observation_type,COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,STATO:r.workflow_state||r.status,NOMINATIVO:r.person_name,TELEFONO:r.phone_normalized,NOTE:r.notes,PROPRIETARIO:r.owner_status,'CHI PUBBLICA':r.market_publisher,PREZZO:r.market_price,AGENZIA:r.market_agency,'TEMPO IN VENDITA':r.market_time_on_market,'PROSSIMA AZIONE':r.next_action})));
    add('NOTE',crm.notes.map(r=>({TIPO:r.note_type,COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,NOTA:r.note_text,'AUDIO PATH':r.audio_path,'DURATA AUDIO':r.audio_duration_seconds,CREATA:r.created_at})));
    add('LETTERE',crm.letters.map(r=>({COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,FUNZIONARIO:r.operator_name,STATO:r.status,CREATA:r.created_at,STAMPATA:r.printed_at,IMBUCATA:r.delivered_at})));
    add('VIE',crm.streets.map(r=>({COMUNE:r.comune,VIA:r.via,STATO:r.status,'ULTIMO CIVICO':r.last_civic,'PROSSIMO CIVICO':r.next_civic,COPERTURA:r.coverage_pct,FONTE:r.source})));
    add('FOLLOW-UP',crm.conversations.filter(r=>r.outcome==='DA RICONTATTARE'||r.status==='RICHIAMO').map(r=>({SOGGETTO:r.person_name||r.target_type,COMUNE:r.comune,VIA:r.via,CIVICO:r.civico,'PROSSIMA AZIONE':r.next_action,STATO:r.status})));
    XLSX.writeFile(wb,'F1_Territory_CRM_'+new Date().toISOString().slice(0,10)+'.xlsx');
  }catch(e){alert(e.message||e)}
}
async function init(){
  css();inject();try{profile=await F1StaffData.me();try{teamRows=await F1StaffData.team()||[]}catch(_){teamRows=[]}if(!['TITOLARE','ADMIN','MANAGER'].includes(String(profile.role||'').toUpperCase()))$('f1tv3BulletinBox').style.display='none';await loadCRM()}catch(e){console.error(e)}
  $('f1tv3Excel').onclick=excel;$('f1tv3Refresh').onclick=loadCRM;$('f1tv3Publish').onclick=publish;$('f1tv3CreatePublish').onclick=createAndPublish;
  clearInterval(timer);timer=setInterval(()=>{if(!document.hidden)loadCRM().catch(()=>{})},15000);
  window.addEventListener('focus',()=>loadCRM().catch(()=>{}));
}
window.F1TerritoryAdminV3={version:VERSION,loadCRM,excel};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,50),{once:true});else setTimeout(init,50);
})();