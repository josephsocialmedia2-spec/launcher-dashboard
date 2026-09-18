(()=>{
'use strict';
const VERSION='20260918-territory-admin-v3';
const $=id=>document.getElementById(id);
const txt=v=>String(v??'').trim();
let profile=null,crm=null,timer=null;
const rpc=(n,p={})=>F1StaffData.rpc(n,p);

function css(){
  if($('f1TerritoryAdminV3Style'))return;
  const s=document.createElement('style');s.id='f1TerritoryAdminV3Style';s.textContent=`
  .f1tv3-panel{margin-top:18px}.f1tv3-card{background:#fff;border:1px solid #dce6df;border-radius:18px;padding:18px;box-shadow:0 10px 30px rgba(17,56,37,.08)}.f1tv3-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.f1tv3-head h2{margin:0}.f1tv3-live{font-size:10px;font-weight:900;color:#0b6f3d}.f1tv3-kpis{display:grid;grid-template-columns:repeat(6,minmax(90px,1fr));gap:8px;margin-top:14px}.f1tv3-kpi{border:1px solid #dce6df;border-radius:12px;padding:10px;background:#f8fbf9}.f1tv3-kpi strong{display:block;font-size:20px}.f1tv3-kpi small{font-size:9px;font-weight:850;color:#657269}.f1tv3-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.f1tv3-btn{min-height:42px;border:1px solid #cfdad3;background:#fff;border-radius:10px;padding:8px 12px;font-weight:900;cursor:pointer;text-decoration:none;color:#17211b;display:inline-flex;align-items:center}.f1tv3-btn.primary{background:#0b6f3d;color:#fff;border-color:#0b6f3d}.f1tv3-bulletin{margin-top:14px;padding:13px;border:1px solid #b9dfc9;border-radius:13px;background:#f4fbf7}.f1tv3-bulletin-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.f1tv3-bulletin input{width:100%;box-sizing:border-box;border:1px solid #d4ddd7;border-radius:9px;padding:9px}.f1tv3-status{font-size:10px;margin-top:8px;color:#53645a}.f1tv3-status.bad{color:#b42318}.f1tv3-status.ok{color:#067647;font-weight:900}@media(max-width:900px){.f1tv3-kpis{grid-template-columns:repeat(3,1fr)}.f1tv3-bulletin-grid{grid-template-columns:1fr}}@media(max-width:560px){.f1tv3-kpis{grid-template-columns:repeat(2,1fr)}}`;document.head.appendChild(s);
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
      <div class="f1tv3-bulletin-grid"><input id="f1tv3BulletinTitle" value="GIORNALINO F1" placeholder="Titolo giornalino"><input id="f1tv3BulletinFile" type="file" accept="application/pdf"></div>
      <div class="f1tv3-actions"><button id="f1tv3Publish" class="f1tv3-btn primary" type="button">PUBBLICA PDF PER I FUNZIONARI</button><a id="f1tv3BulletinOpen" class="f1tv3-btn" href="#" target="_blank" rel="noopener">APRI PDF ATTIVO</a></div>
      <div id="f1tv3BulletinStatus" class="f1tv3-status">Caricamento stato giornalino…</div>
    </div>
  </div>`;
  target.parentNode.insertBefore(section,target);
}
function status(msg,bad=false,ok=false){const e=$('f1tv3BulletinStatus');if(!e)return;e.textContent=msg;e.className='f1tv3-status '+(bad?'bad':ok?'ok':'')}
async function loadCRM(){
  crm=await rpc('f1_territory_mobile_crm_v3',{p_limit:1500})||{};
  crm.civics=crm.civics||[];crm.conversations=crm.conversations||[];crm.news=crm.news||[];crm.notes=crm.notes||[];crm.streets=crm.streets||[];crm.letters=crm.letters||[];
  $('f1tv3Civics').textContent=crm.civics.length;$('f1tv3Contacts').textContent=crm.conversations.length;$('f1tv3News').textContent=crm.news.length;$('f1tv3Notes').textContent=crm.notes.length;$('f1tv3Audio').textContent=crm.notes.filter(n=>n.note_type==='AUDIO').length;$('f1tv3Streets').textContent=crm.streets.length;
  $('f1tv3Live').textContent='AGGIORNATO '+new Intl.DateTimeFormat('it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date());
  const b=crm.active_bulletin;if(b?.public_url){$('f1tv3BulletinOpen').href=b.public_url;$('f1tv3BulletinOpen').style.display='inline-flex';status('PDF attivo: '+(b.title||'GIORNALINO F1')+' · pubblicato '+new Date(b.published_at).toLocaleString('it-IT'),false,true)}else{$('f1tv3BulletinOpen').style.display='none';status('Nessun giornalino PDF attivo.')}
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
  css();inject();try{profile=await F1StaffData.me();if(!['TITOLARE','ADMIN','MANAGER'].includes(String(profile.role||'').toUpperCase()))$('f1tv3BulletinBox').style.display='none';await loadCRM()}catch(e){console.error(e)}
  $('f1tv3Excel').onclick=excel;$('f1tv3Refresh').onclick=loadCRM;$('f1tv3Publish').onclick=publish;
  clearInterval(timer);timer=setInterval(()=>{if(!document.hidden)loadCRM().catch(()=>{})},15000);
  window.addEventListener('focus',()=>loadCRM().catch(()=>{}));
}
window.F1TerritoryAdminV3={version:VERSION,loadCRM,excel};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,50),{once:true});else setTimeout(init,50);
})();