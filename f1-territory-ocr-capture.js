(()=>{'use strict';
const VERSION='20260919-ocr-crm1';
const BUCKET='f1-territory-photos';
const $=id=>document.getElementById(id);
const txt=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let capture=null,busy=false;

function uuid(){return crypto.randomUUID?.()||('ocr-'+Date.now()+'-'+Math.random().toString(16).slice(2));}
function injectStyle(){
  if($('f1OcrCaptureStyle'))return;
  const s=document.createElement('style');s.id='f1OcrCaptureStyle';s.textContent=
  '.f1ocr-overlay{position:fixed;inset:0;z-index:130;background:#000c;display:grid;align-items:end}.f1ocr-panel{max-height:94dvh;overflow:auto;background:#fff;color:#17211b;border-radius:20px 20px 0 0;padding:14px 13px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -16px 50px #0007}.f1ocr-head{display:flex;justify-content:space-between;align-items:center;gap:10px;position:sticky;top:-14px;background:#fffefa;padding:10px 0;z-index:2}.f1ocr-head h2{margin:0;font-size:18px}.f1ocr-close{width:40px;height:40px;border:0;border-radius:50%;background:#eef3ef;font-size:22px}.f1ocr-step{display:grid;gap:10px}.f1ocr-preview{width:100%;max-height:310px;object-fit:contain;border:1px solid #d9e2dc;border-radius:12px;background:#f6f7f6}.f1ocr-field{width:100%;border:1px solid #cfd9d2;border-radius:10px;padding:11px;font:inherit;background:#fff;color:#17211b}.f1ocr-label{font-size:10px;font-weight:900;color:#68746c;letter-spacing:.05em}.f1ocr-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.f1ocr-btn{min-height:50px;border:1px solid #cfd9d2;border-radius:11px;background:#fff;font:inherit;font-weight:950;padding:10px;cursor:pointer}.f1ocr-primary{background:#0b6f3d;border-color:#0b6f3d;color:#fff}.f1ocr-call{background:#067647;border-color:#067647;color:#fff}.f1ocr-wa{background:#148c4f;border-color:#148c4f;color:#fff}.f1ocr-ok{border:2px solid #0b6f3d;background:#eef9f2;color:#07502d;border-radius:14px;padding:13px;font-size:12px;line-height:1.5}.f1ocr-ok strong{font-size:20px}.f1ocr-warn{border:1px solid #e2b500;background:#fffbea;color:#5f4d00;border-radius:12px;padding:11px;font-size:11px;line-height:1.45}.f1ocr-bad{border:1px solid #efb5af;background:#fff4f2;color:#8b2118;border-radius:12px;padding:11px;font-size:11px;line-height:1.45}.f1ocr-status{min-height:18px;color:#0b6f3d;font-size:11px;font-weight:900}.f1ocr-msg{white-space:pre-wrap;min-height:180px}.f1ocr-hidden{display:none!important}@media(min-width:680px){.f1ocr-overlay{align-items:center;justify-items:center}.f1ocr-panel{width:min(680px,94vw);border-radius:20px;max-height:92vh}}@media(max-width:420px){.f1ocr-grid{grid-template-columns:1fr}}';
  document.head.appendChild(s);
}
function status(m,bad=false){const e=$('f1OcrStatus');if(e){e.textContent=m;e.style.color=bad?'#b42318':'#0b6f3d';}}
function setTerrStatus(m,bad=false){const e=$('terrStatus');if(e){e.textContent=m;e.style.color=bad?'var(--red)':'var(--g)';}}
async function loadTesseract(){
  if(window.Tesseract?.createWorker)return window.Tesseract;
  await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('MOTORE OCR NON DISPONIBILE'));document.head.appendChild(s)});
  if(!window.Tesseract?.createWorker)throw new Error('MOTORE OCR NON DISPONIBILE');
  return window.Tesseract;
}
async function decodeImage(file){
  let bmp=null,url='';
  try{
    try{bmp=await createImageBitmap(file,{imageOrientation:'from-image'})}catch(_){bmp=await createImageBitmap(file)}
    const max=1800,scale=Math.min(1,max/Math.max(bmp.width,bmp.height)),w=Math.max(1,Math.round(bmp.width*scale)),h=Math.max(1,Math.round(bmp.height*scale)),c=document.createElement('canvas');
    c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(bmp,0,0,w,h);bmp.close?.();
    try{const d=x.getImageData(0,0,w,h),p=d.data;for(let i=0;i<p.length;i+=4){const g=.299*p[i]+.587*p[i+1]+.114*p[i+2],v=Math.max(0,Math.min(255,(g-128)*1.22+128));p[i]=p[i+1]=p[i+2]=v}x.putImageData(d,0,0)}catch(_){}
    return await new Promise(resolve=>c.toBlob(b=>resolve(b||file),'image/jpeg',.92));
  }catch(first){
    try{
      url=URL.createObjectURL(file);const img=new Image();img.decoding='async';img.src=url;await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject});
      const max=1800,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale)),c=document.createElement('canvas');
      c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
      return await new Promise(resolve=>c.toBlob(b=>resolve(b||file),'image/jpeg',.92));
    }catch(_){return file}finally{if(url)URL.revokeObjectURL(url)}
  }
}
async function runOcr(file){
  const T=await loadTesseract(),prepared=await decodeImage(file);
  let worker=null;
  try{
    worker=await T.createWorker('ita',1,{logger:m=>{if(m.status==='recognizing text')status('OCR '+Math.round((m.progress||0)*100)+'%')}});
    const r=await worker.recognize(prepared);
    return {text:txt(r?.data?.text),confidence:Number(r?.data?.confidence||0)};
  }finally{try{await worker?.terminate?.()}catch(_){}}
}
function phoneCandidates(text){
  const out=[],re=/(?:(?:\+\s*39|00\s*39)[\s.\/-]*)?(?:\d[\s.\/-]*){7,12}\d/g;
  for(const m of String(text||'').matchAll(re)){
    const raw=txt(m[0]),digits=raw.replace(/\D/g,'');if(digits.length<7||digits.length>14)continue;
    let normalized=digits;if(/^00\s*39/.test(raw.replace(/\s+/g,'')))normalized='+'+digits.slice(2);else if(/^\s*\+/.test(raw))normalized='+'+digits;
    if(!out.some(x=>x.normalized===normalized))out.push({raw,normalized});
  }
  return out;
}
function classify(text){
  const u=String(text||'').toUpperCase();let sign='ALTRO';
  if(/VENDESI|IN\s+VENDITA|\bVENDITA\b/.test(u))sign='CARTELLO_VENDESI';
  else if(/AFFITTASI|IN\s+AFFITTO|\bAFFITTO\b/.test(u))sign='CARTELLO_AFFITTASI';
  else if(/AGENZIA|IMMOBILIARE/.test(u))sign='CARTELLO_AGENZIA';
  else if(/PRIVATO/.test(u))sign='CARTELLO_PRIVATO';
  const props=['APPARTAMENTO','VILLA','CASA','TERRENO','BOX','LOCALE','NEGOZIO','CAPANNONE'];
  return {sign,property:props.find(x=>u.includes(x))||'',agency:/AGENZIA|IMMOBILIARE/.test(u)};
}
function waPhone(v){let d=String(v||'').replace(/\D/g,'');if(d.startsWith('00'))d=d.slice(2);if(!d.startsWith('39'))d='39'+d;return d;}
function telPhone(v){const s=txt(v);if(s.startsWith('+'))return '+'+s.replace(/\D/g,'');let d=s.replace(/\D/g,'');if(d.startsWith('0039'))return '+'+d.slice(2);return d;}
function nextUsefulDate(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).reduce((a,p)=>(a[p.type]=p.value,a),{});
  let d=new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),12));
  do{d.setUTCDate(d.getUTCDate()+1)}while(d.getUTCDay()===0);
  return d.toISOString().slice(0,10);
}
function prettyDate(v){
  if(!v)return'';const d=new Date(v+'T12:00:00Z');
  return new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',weekday:'long',day:'numeric',month:'long'}).format(d);
}
function addressLabel(ctx){return [ctx.via,ctx.zona?('Zona '+ctx.zona):'',ctx.comune].filter(Boolean).join(' · ');}
function messageFor(ctx,date,time){
  return 'Buongiorno, sono Joseph Malafronte di F1 Immobiliare. Ho visto il Suo cartello vendesi in '+addressLabel(ctx)+'.\n\n'+
  'Invece di proporLe il solito "finto cliente", Le offro una promozione immobiliare completamente gratuita per il Suo immobile, studiata per trovare un acquirente reale e concludere la vendita nel minor tempo possibile.\n\n'+
  'Sarò in zona per alcuni appuntamenti questo '+prettyDate(date)+'. Che ne dice se ci incontriamo direttamente sul posto alle '+time+' per una breve chiacchierata e per spiegarLe come funziona?\n\n'+
  'Resto in attesa di un Suo riscontro. Buona giornata!\n\nF1 Immobiliare\nJoseph Malafronte\nhttps://f1immobiliare.com/';
}
async function context(){
  let st=null;
  try{st=await window.F1NotiziereEngine?.load?.({force:!!navigator.onLine})}catch(_){}
  if(!st)st=await window.F1MobileStore?.cachedState?.();
  const p=st?.territory?.progress;if(!p)throw new Error('NESSUN GIRO TERRITORIALE ATTIVO');
  const cv=txt($('civicInput')?.value)||txt(p.next_civic||p.civic_start||p.last_civic);if(!cv)throw new Error('INSERISCI PRIMA IL CIVICO');
  return {progress_id:p.progress_id,comune:txt(p.comune),zona:txt(p.zona),via:txt(p.via),civico:cv};
}
async function ensureCivicRecord(ctx){
  const crm=await F1StaffData.rpc('f1_territory_mobile_crm_v5',{p_limit:2000}).catch(()=>null);
  const existing=crm?.civics?.find(r=>r.progress_id===ctx.progress_id&&txt(r.via).toLowerCase()===ctx.via.toLowerCase()&&txt(r.civico)===ctx.civico);
  if(existing?.civic_record_id)return existing.civic_record_id;
  try{return await F1StaffData.rpc('f1_territory_ensure_civic_v2',{p_progress_id:ctx.progress_id,p_civico:ctx.civico})}catch(first){
    let restore='';
    try{
      const st=await F1NotiziereEngine.load({force:true}),p=st?.territory?.progress;
      if(p?.progress_id===ctx.progress_id)restore=txt(p.next_civic||p.civic_start);
      await F1StaffData.rpc('f1_territory_set_manual_civic_v3',{p_progress_id:ctx.progress_id,p_civico:ctx.civico});
      const id=await F1StaffData.rpc('f1_territory_ensure_civic_v2',{p_progress_id:ctx.progress_id,p_civico:ctx.civico});
      if(restore&&restore!==ctx.civico)await F1StaffData.rpc('f1_territory_set_manual_civic_v3',{p_progress_id:ctx.progress_id,p_civico:restore}).catch(()=>{});
      return id;
    }catch(_){throw first}
  }
}
async function uploadPhoto(file,item){
  const cfg=window.F1_SUPABASE||{},me=await F1StaffData.me(),uid=me.user_id||me.userId;if(!cfg.url||!cfg.anonKey||!uid)throw new Error('UPLOAD FOTO NON CONFIGURATO');
  const blob=await decodeImage(file),path=uid+'/ocr/'+item.id+'.jpg',encoded=path.split('/').map(encodeURIComponent).join('/'),token=await F1Sync.authToken();
  const r=await fetch(cfg.url.replace(/\/$/,'')+'/storage/v1/object/'+BUCKET+'/'+encoded,{method:'POST',headers:{apikey:cfg.anonKey,Authorization:'Bearer '+token,'Content-Type':'image/jpeg','x-upsert':'false'},body:blob});
  if(!r.ok&&r.status!==409)throw new Error('UPLOAD FOTO NON COMPLETATO: '+await r.text());
  return path;
}
function noteText(item,path){
  const c=item.ctx,d=item.data,when=new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(item.created_at));
  return 'FOTO OCR · '+when+'\n\nComune: '+c.comune+'\nVia: '+c.via+'\nCivico: '+c.civico+
  '\n\nTESTO ACQUISITO:\n'+d.text+'\n\nTELEFONO RILEVATO:\n'+(d.phone||'NESSUN TELEFONO RILEVATO')+
  '\n\nTIPO:\n'+(d.sign_type||'FOTO OCR GENERICA')+(d.property_type?'\nTIPO IMMOBILE: '+d.property_type:'')+
  '\n\nFOTO:\n'+path+'\n\nORIGINE:\nFOTO OCR';
}
async function saveOnline(item){
  const civicId=await ensureCivicRecord(item.ctx),path=await uploadPhoto(item.file,item),crm=await F1StaffData.rpc('f1_territory_mobile_crm_v5',{p_limit:2000}).catch(()=>null);
  const exists=crm?.notes?.some(n=>n.civic_record_id===civicId&&txt(n.photo_path)===path);
  if(!exists)await F1StaffData.rpc('f1_territory_note_add_v4',{p_civic_record_id:civicId,p_note_type:'OCR',p_note_text:noteText(item,path),p_audio_path:'',p_audio_mime:'',p_audio_duration_seconds:null,p_photo_path:path,p_source_file_name:item.file?.name||'foto-ocr.jpg'});
  window.F1NotiziereEngine?.invalidate?.();window.dispatchEvent(new CustomEvent('f1:territory-capture-saved',{detail:{kind:'OCR',civic_record_id:civicId,photo_path:path}}));
  return {civic_record_id:civicId,photo_path:path};
}
async function queue(item){
  const ids=await F1MobileStore.get('pendingOcrIds')||[];if(!ids.includes(item.id))ids.push(item.id);
  await F1MobileStore.set('pendingOcrIds',ids);await F1MobileStore.set('pendingOcr:'+item.id,item);window.dispatchEvent(new CustomEvent('f1:outbox-change'));
}
async function flush(){
  if(!navigator.onLine||!window.F1MobileStore||!window.F1StaffData?.ready?.())return;
  const ids=await F1MobileStore.get('pendingOcrIds')||[],keep=[];
  for(const id of ids){const item=await F1MobileStore.get('pendingOcr:'+id);if(!item)continue;try{await saveOnline(item);await F1MobileStore.set('pendingOcr:'+id,null);setTerrStatus('✓ SINCRONIZZATO CON CRM')}catch(e){console.warn('[F1 pending OCR]',e);keep.push(id);break}}
  await F1MobileStore.set('pendingOcrIds',keep);window.dispatchEvent(new CustomEvent('f1:outbox-change'));
}
function open(){
  injectStyle();capture=null;let o=$('f1OcrOverlay');if(o)o.remove();o=document.createElement('div');o.id='f1OcrOverlay';o.className='f1ocr-overlay';
  o.innerHTML='<section class="f1ocr-panel" role="dialog" aria-modal="true"><div class="f1ocr-head"><div><div class="f1ocr-label">F1 TERRITORY · FOTO OCR</div><h2>📷 FOTO OCR</h2></div><button id="f1OcrClose" class="f1ocr-close" type="button">×</button></div><div id="f1OcrBody"></div></section>';
  document.body.appendChild(o);$('f1OcrClose').onclick=close;renderCapture();
}
function close(){if(capture?.previewUrl)URL.revokeObjectURL(capture.previewUrl);$('f1OcrOverlay')?.remove();capture=null;}
function renderCapture(){
  const b=$('f1OcrBody');b.innerHTML='<div class="f1ocr-step"><div class="f1ocr-warn">Fotografa qualsiasi informazione utile. F1 estrae il testo, rileva eventuali numeri e salva il risultato come NOTA del civico corrente.</div><input id="f1OcrFile" type="file" accept="image/*" capture="environment" hidden><button id="f1OcrTake" class="f1ocr-btn f1ocr-primary" type="button">📷 SCATTA / SCEGLI FOTO</button><div id="f1OcrStatus" class="f1ocr-status"></div></div>';
  $('f1OcrTake').onclick=()=>$('f1OcrFile').click();$('f1OcrFile').onchange=e=>analyze(e.target.files?.[0]);
}
async function analyze(file){
  if(!file||busy)return;busy=true;let ctx=null,text='',confidence=0,error='';
  try{ctx=await context();capture={id:uuid(),file,ctx,created_at:new Date().toISOString(),previewUrl:URL.createObjectURL(file),data:{text:'',phone:'',sign_type:'',property_type:''}};renderAnalyzing();
    try{const r=await runOcr(file);text=r.text;confidence=r.confidence;if(!text)error='OCR NON RIUSCITO · INSERISCI O CORREGGI IL TESTO'}catch(e){console.warn('[F1 FOTO OCR]',e);error='OCR NON RIUSCITO · INSERISCI O CORREGGI IL TESTO'}
    renderReview(text,confidence,error);
  }catch(e){status(String(e?.message||e),true)}finally{busy=false}
}
function renderAnalyzing(){
  const b=$('f1OcrBody');b.innerHTML='<div class="f1ocr-step"><img class="f1ocr-preview" src="'+capture.previewUrl+'" alt="Anteprima foto"><div class="f1ocr-status" id="f1OcrStatus">PREPARO IMMAGINE E AVVIO OCR…</div></div>';
}
function renderReview(text,confidence,error){
  const phones=phoneCandidates(text),cl=classify(text),first=phones[0]?.normalized||'',b=$('f1OcrBody');
  capture.data={text,phone:first,sign_type:cl.sign==='ALTRO'?'':cl.sign,property_type:cl.property};
  const options=phones.length>1?'<div><label class="f1ocr-label">NUMERI TROVATI</label><select id="f1OcrPhoneSelect" class="f1ocr-field">'+phones.map(p=>'<option value="'+esc(p.normalized)+'">'+esc(p.raw)+'</option>').join('')+'</select></div>':'';
  b.innerHTML='<div class="f1ocr-step"><img class="f1ocr-preview" src="'+capture.previewUrl+'" alt="Anteprima foto">'+
  (error?'<div class="f1ocr-bad"><b>'+esc(error)+'</b></div>':'<div class="f1ocr-ok"><b>TESTO ACQUISITO</b><br>Affidabilità OCR: '+Math.round(confidence||0)+'%</div>')+
  '<div><label class="f1ocr-label">TESTO ACQUISITO / CORREGGIBILE</label><textarea id="f1OcrText" class="f1ocr-field" style="min-height:150px">'+esc(text)+'</textarea></div>'+options+
  '<div><label class="f1ocr-label">TELEFONO RILEVATO / CORREGGIBILE</label><input id="f1OcrPhone" class="f1ocr-field" inputmode="tel" value="'+esc(first)+'" placeholder="Nessun telefono rilevato"></div>'+
  '<div class="f1ocr-warn">Tipo rilevato: <b id="f1OcrClass">'+esc(capture.data.sign_type||'FOTO OCR GENERICA')+'</b>'+(capture.data.property_type?' · '+esc(capture.data.property_type):'')+'</div>'+
  '<div class="f1ocr-grid"><button id="f1OcrAgain" class="f1ocr-btn" type="button">RIFAI FOTO</button><button id="f1OcrSave" class="f1ocr-btn f1ocr-primary" type="button">✓ CONFERMA E SALVA NEL CRM</button></div><div id="f1OcrStatus" class="f1ocr-status"></div></div>';
  const sel=$('f1OcrPhoneSelect');if(sel)sel.onchange=()=>{$('f1OcrPhone').value=sel.value};
  $('f1OcrText').oninput=()=>{const c=classify($('f1OcrText').value);capture.data.sign_type=c.sign==='ALTRO'?'':c.sign;capture.data.property_type=c.property;$('f1OcrClass').textContent=[capture.data.sign_type||'FOTO OCR GENERICA',c.property].filter(Boolean).join(' · ');if(!$('f1OcrPhone').value){const p=phoneCandidates($('f1OcrText').value)[0];if(p)$('f1OcrPhone').value=p.normalized}};
  $('f1OcrAgain').onclick=renderCapture;$('f1OcrSave').onclick=save;
}
async function save(){
  if(busy||!capture)return;const textv=txt($('f1OcrText')?.value),phone=txt($('f1OcrPhone')?.value);if(!textv){status('INSERISCI O CORREGGI IL TESTO PRIMA DI SALVARE.',true);return}
  const c=classify(textv);capture.data={text:textv,phone,sign_type:c.sign==='ALTRO'?'':c.sign,property_type:c.property};busy=true;status('SALVO FOTO E NOTA NEL CRM…');
  try{
    if(!navigator.onLine){await queue(capture);renderSuccess(null,true);return}
    const saved=await saveOnline(capture);renderSuccess(saved,false);setTerrStatus('✓ DATI ACQUISITI · NOTA SALVATA NEL CRM');
  }catch(e){status('SALVATAGGIO NON COMPLETATO · '+String(e?.message||e),true)}finally{busy=false}
}
function renderSuccess(saved,pending){
  const d=capture.data,c=capture.ctx,hasPhone=phoneCandidates(d.phone)[0]||(/\d{7,}/.test(d.phone.replace(/\D/g,''))?{normalized:d.phone}:null),sale=d.sign_type==='CARTELLO_VENDESI',b=$('f1OcrBody');
  const date=nextUsefulDate(),time='17:00';
  b.innerHTML='<div class="f1ocr-step"><div class="f1ocr-ok"><strong>✓ DATI ACQUISITI</strong><br><br>Comune: '+esc(c.comune)+'<br>Via: '+esc(c.via)+'<br>Civico: '+esc(c.civico)+'<br><br>Testo:<br>'+esc(d.text).replace(/\n/g,'<br>')+'<br><br>Telefono: '+esc(d.phone||'NESSUN TELEFONO RILEVATO')+'<br>Tipo: '+esc(d.sign_type||'FOTO OCR GENERICA')+'<br>Foto: '+(pending?'SALVATA SUL TELEFONO':'SALVATA')+'<br>CRM: '+(pending?'IN ATTESA DI SINCRONIZZAZIONE':'NOTA SALVATA')+'</div>'+
  (hasPhone?'<button id="f1OcrCall" class="f1ocr-btn f1ocr-call" type="button">📞 CHIAMA SUBITO</button>':'')+
  (hasPhone&&sale?'<div class="f1ocr-grid"><div><label class="f1ocr-label">DATA APPUNTAMENTO</label><input id="f1OcrDate" class="f1ocr-field" type="date" value="'+date+'"></div><div><label class="f1ocr-label">ORA APPUNTAMENTO</label><input id="f1OcrTime" class="f1ocr-field" type="time" value="'+time+'"></div></div><div><label class="f1ocr-label">ANTEPRIMA MESSAGGIO</label><textarea id="f1OcrMessage" class="f1ocr-field f1ocr-msg"></textarea></div><button id="f1OcrWa" class="f1ocr-btn f1ocr-wa" type="button">💬 INVIA MESSAGGIO WHATSAPP</button>':'')+
  '<button id="f1OcrDone" class="f1ocr-btn f1ocr-primary" type="button">CONTINUA GIRO</button></div>';
  if(hasPhone)$('f1OcrCall').onclick=()=>{location.href='tel:'+telPhone(d.phone)};
  if(hasPhone&&sale){const update=()=>{$('f1OcrMessage').value=messageFor(c,$('f1OcrDate').value,$('f1OcrTime').value||'17:00')};$('f1OcrDate').onchange=update;$('f1OcrTime').onchange=update;update();$('f1OcrWa').onclick=()=>{location.href='https://wa.me/'+waPhone(d.phone)+'?text='+encodeURIComponent($('f1OcrMessage').value)}}
  $('f1OcrDone').onclick=close;
}
function boot(){
  injectStyle();const q=$('quickPhoto');if(q)q.onclick=open;const n=$('noteCameraBtn');if(n)n.onclick=open;
  addEventListener('online',()=>setTimeout(flush,900));setTimeout(flush,2500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.F1TerritoryOcrCapture={version:VERSION,open,flush,phoneCandidates,classify,nextUsefulDate,messageFor};
})();