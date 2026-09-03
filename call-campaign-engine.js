(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const QUEUE_KEY='f1CallCampaignQueue', EVENTS_KEY='f1CallEvents', EXCL_KEY='f1CallExclusions', FEEDBACK_KEY='f1IntentFeedback';
let config=null,intentConfig=null,campaign=null,current=null,operatorMode=false,lastReply='',listening=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,"'").replace(/[^a-z0-9à-ù' ]/gi,' ').replace(/\s+/g,' ').trim();
const loadLocal=(k,fallback=[])=>{try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??fallback}catch(e){return fallback}};
const saveLocal=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function queue(){const q=loadLocal(QUEUE_KEY,[]);return Array.isArray(q)?q:[]}
function saveQueue(q){saveLocal(QUEUE_KEY,q)}
function exclusions(){const x=loadLocal(EXCL_KEY,[]);return Array.isArray(x)?x:[]}
function phoneKey(p){return String(p||'').replace(/\D/g,'').replace(/^39(?=3|0)/,'')}
function isExcluded(p){const k=phoneKey(p);return exclusions().some(x=>phoneKey(x.phone)===k)}
function now(){return new Date().toISOString()}
function uid(prefix='CALL'){return prefix+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)}
function toast(t){const el=$('#toast');if(!el)return;el.textContent=t;el.classList.add('on');setTimeout(()=>el.classList.remove('on'),2200)}
function setStatus(t,kind=''){const el=$('#engineStatus');if(!el)return;el.textContent=t;el.className='state '+kind}
function safeSource(){if(!current?.contact?.source)return 'Non ho qui una fonte verificata e non le do un’informazione inventata.';return 'Il numero proviene dalla fonte indicata nella scheda: '+current.contact.source+'. Se vuole, gliela leggo esattamente.'}
const replies={
  POSSIBILE_CAMBIO:'Capisco. Allora non parto dalla vendita: prima capisco che cosa vorrebbe cambiare e perché. Le faccio poche domande concrete.',
  NON_VENDE:'Va bene. Non le chiedo di vendere. Se oggi non c’è una motivazione reale, non forzo la conversazione. Possiamo chiudere qui oppure concordare un richiamo solo se lo desidera lei.',
  VALORE_CASA:'Per darle un numero serio preferisco verificare immobile, microzona e comparabili. Possiamo fissare una valutazione senza impegno e poi decide lei se approfondire.',
  ALTRA_AGENZIA:'Perfetto, non voglio interferire. Mi basta capire se esiste già un incarico firmato oppure se sta ancora valutando le alternative.',
  RICHIAMATA:'Va bene. Mi dica giorno e fascia oraria in cui preferisce essere richiamato e lo registro.',
  STOP_CONTATTO:'Ricevuto. Registro subito che non desidera altri contatti.',
  APPUNTAMENTO:'Perfetto. Registriamo giorno e fascia oraria, così l’appuntamento entra correttamente nel CRM.'
};
async function boot(){
  try{
    const [a,b]=await Promise.all([fetch('call-campaigns.json?v='+Date.now(),{cache:'no-store'}),fetch('call-intent-examples.json?v='+Date.now(),{cache:'no-store'})]);
    config=await a.json();intentConfig=await b.json();campaign=config.campaigns.find(x=>x.id===config.default_campaign)||config.campaigns[0];
    $('#campaignName').textContent=campaign.label;$('#campaignObjective').textContent=campaign.objective;
    bind();renderQueue();renderStats();resetCall();setStatus('MOTORE CAMPAGNA PRONTO','ok');
  }catch(e){setStatus('ERRORE CONFIGURAZIONE: '+e.message,'bad')}
}
function bind(){
  $('#addProspect').onclick=addProspect;$('#nextProspect').onclick=nextProspect;$('#listenBtn').onclick=listen;$('#analyzeBtn').onclick=analyzeTyped;$('#speakBtn').onclick=speakReply;$('#takeoverBtn').onclick=toggleTakeover;$('#resetCall').onclick=resetCall;
  $('#responseText').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();analyzeTyped()}});
  $$('[data-outcome]').forEach(b=>b.onclick=()=>finish(b.dataset.outcome));
  $('#clearDone').onclick=()=>{saveQueue(queue().filter(x=>!x.done));renderQueue();toast('Coda ripulita')};
}
function addProspect(){
  const name=$('#pName').value.trim(),phone=$('#pPhone').value.trim(),city=$('#pCity').value.trim(),source=$('#pSource').value.trim(),reason=$('#pReason').value.trim();
  if(!phone){toast('Scrivi il telefono');return}if(isExcluded(phone)){toast('NUMERO IN NON CONTATTARE');return}
  const q=queue();if(q.some(x=>phoneKey(x.phone)===phoneKey(phone)&&!x.done)){toast('Numero già in coda');return}
  const c={id:uid('PROSPECT'),name,phone,city,source,reason,status:'DA_CHIAMARE',created_at:now(),done:false};q.push(c);saveQueue(q);['pName','pPhone','pCity','pSource','pReason'].forEach(id=>$('#'+id).value='');renderQueue();selectProspect(c.id)
}
function renderQueue(){
  const q=queue();const box=$('#queueList');
  box.innerHTML=q.length?q.map(x=>`<button class="qitem ${current?.contact?.id===x.id?'active':''} ${x.done?'done':''}" data-id="${esc(x.id)}"><b>${esc(x.name||'Senza nome')}</b><span>${esc(x.phone)} ${x.city?'· '+esc(x.city):''}</span><small>${esc(x.status||'DA_CHIAMARE')} ${x.source?'· '+esc(x.source):''}</small></button>`).join(''):'<div class="empty">Nessun numero in coda. Aggiungi il primo contatto della campagna.</div>';
  $$('.qitem').forEach(b=>b.onclick=()=>selectProspect(b.dataset.id));
  $('#queueCount').textContent=q.filter(x=>!x.done).length;
}
function selectProspect(id){const c=queue().find(x=>x.id===id);if(!c)return;if(isExcluded(c.phone)){toast('Numero escluso dai contatti');return}current={contact:c,stateId:campaign.start_state,answers:{},transcript:[],started_at:now(),suggestedOutcome:'',lastIntent:''};operatorMode=false;renderCall();renderQueue()}
function nextProspect(){const q=queue().filter(x=>!x.done&&!isExcluded(x.phone));if(!q.length){toast('Coda terminata');return}const ix=current?q.findIndex(x=>x.id===current.contact.id):-1;selectProspect(q[(ix+1+q.length)%q.length].id)}
function resetCall(){current=null;operatorMode=false;lastReply='';$('#contactName').textContent='NESSUN CONTATTO SELEZIONATO';$('#contactMeta').textContent='Aggiungi o scegli un numero dalla coda.';$('#callLink').href='#';$('#callLink').classList.add('disabled');$('#stepNo').textContent='—';$('#stepTitle').textContent='SELEZIONA UN CONTATTO';$('#promptText').textContent='Il motore partirà dal punto 8 e guiderà la conversazione passo per passo.';$('#replyText').textContent='';$('#transcript').innerHTML='';$('#responseText').value='';renderIntentButtons();renderQueue()}
function state(){return current?campaign.states[current.stateId]:null}
function renderCall(){if(!current)return resetCall();const c=current.contact,s=state();$('#contactName').textContent=c.name||'Senza nome';$('#contactMeta').textContent=[c.phone,c.city,c.source,c.reason].filter(Boolean).join(' · ');$('#callLink').href='tel:'+c.phone;$('#callLink').classList.remove('disabled');renderState(s);renderTranscript();renderIntentButtons();updateTakeover()}
function renderState(s){if(!s)return;if(s.terminal){$('#stepNo').textContent='✓';$('#stepTitle').textContent='ESITO PRONTO';$('#promptText').textContent='Registra l’esito per chiudere la telefonata.';return}$('#stepNo').textContent=s.number||'→';$('#stepTitle').textContent=s.title||'';$('#promptText').textContent=s.prompt||''}
function renderTranscript(){const box=$('#transcript');box.innerHTML=current?.transcript?.length?current.transcript.map(x=>`<div class="bubble ${x.who==='CLIENTE'?'client':'ai'}"><b>${x.who}</b>${esc(x.text)}</div>`).join(''):'<div class="muted">La trascrizione della chiamata apparirà qui.</div>';box.scrollTop=box.scrollHeight}
function addTranscript(who,text){if(!current||!text)return;current.transcript.push({who,text,at:now()});renderTranscript()}
function allExamples(){const base=intentConfig?.intents||{},fb=loadLocal(FEEDBACK_KEY,[]);const out={};Object.entries(base).forEach(([k,v])=>out[k]=[...v]);fb.forEach(x=>{(out[x.intent]??=[]).push(x.text)});return out}
function detectIntent(text){const n=norm(text),all=allExamples();let best=null,bestScore=0;for(const [intent,examples] of Object.entries(all)){for(const e of examples){const ne=norm(e);let score=0;if(n===ne)score=100;else if(n.includes(ne)||ne.includes(n))score=75;else{const a=new Set(n.split(' ')),b=new Set(ne.split(' '));const inter=[...a].filter(x=>b.has(x)&&x.length>2).length;score=inter*12}if(score>bestScore){bestScore=score;best=intent}}}return bestScore>=24?best:'CONTINUA'}
function analyzeTyped(){if(!current){toast('Seleziona un contatto');return}const t=$('#responseText').value.trim();if(!t){toast('Scrivi o ascolta la risposta');return}$('#responseText').value='';addTranscript('CLIENTE',t);applyIntent(detectIntent(t),t,false)}
function applyIntent(intent,text,corrected){if(!current)return;current.lastIntent=intent;if(corrected){const fb=loadLocal(FEEDBACK_KEY,[]);fb.push({intent,text,at:now()});saveLocal(FEEDBACK_KEY,fb);cloudUpsert('call_intent_feedback',uid('INTENT'),{intent,text,campaign_id:campaign.id,created_at:now()});toast('Correzione salvata')}
  if(operatorMode){setStatus('CONTROLLO OPERATORE · AI IN PAUSA');return}
  if(intent==='STOP_CONTATTO'){lastReply=replies.STOP_CONTATTO;showReply(lastReply);finish('DO_NOT_CONTACT');return}
  if(intent==='ORIGINE_NUMERO'){lastReply=safeSource();showReply(lastReply);return}
  if(intent==='RICHIAMATA'){lastReply=replies.RICHIAMATA;showReply(lastReply);go('RICHIAMATA');return}
  if(intent==='VALORE_CASA'){lastReply=replies.VALORE_CASA;showReply(lastReply);go('VALUTAZIONE');return}
  if(intent==='ALTRA_AGENZIA'){lastReply=replies.ALTRA_AGENZIA;showReply(lastReply);go('ALTRA_AGENZIA');return}
  if(intent==='POSSIBILE_CAMBIO'){lastReply=replies.POSSIBILE_CAMBIO;showReply(lastReply);go('MOTIVAZIONE');return}
  if(intent==='NON_VENDE'){lastReply=replies.NON_VENDE;showReply(lastReply);current.suggestedOutcome='NOT_INTERESTED';setStatus('NESSUNA MOTIVAZIONE · non creare CRM salvo richiamo concordato');return}
  if(intent==='APPUNTAMENTO'){lastReply=replies.APPUNTAMENTO;showReply(lastReply);go('APPUNTAMENTO');return}
  const s=state();if(!s||s.terminal)return;if(s.capture)current.answers[s.capture]=text;if(s.next){const nx=campaign.states[s.next];if(nx?.terminal){renderState(nx);current.suggestedOutcome=nx.terminal;setStatus('PERCORSO COMPLETATO · registra l’esito','ok')}else go(s.next)}
}
function go(id){if(!campaign.states[id])return;current.stateId=id;renderState(state());renderIntentButtons()}
function showReply(text){$('#replyText').textContent=text;addTranscript('F1',text)}
function renderIntentButtons(){const box=$('#intentButtons');const t=current?.transcript?.filter(x=>x.who==='CLIENTE').slice(-1)[0]?.text||'';const arr=['POSSIBILE_CAMBIO','NON_VENDE','ORIGINE_NUMERO','VALORE_CASA','ALTRA_AGENZIA','RICHIAMATA','APPUNTAMENTO','STOP_CONTATTO'];box.innerHTML=arr.map(x=>`<button class="chip" data-intent="${x}">${x.replaceAll('_',' ')}</button>`).join('');$$('[data-intent]').forEach(b=>b.onclick=()=>{if(!t){toast('Prima registra la risposta del cliente');return}applyIntent(b.dataset.intent,t,true)})}
function listen(){if(!current){toast('Seleziona un contatto');return}const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('Riconoscimento vocale non disponibile: scrivi la risposta');return}if(listening){try{listening.stop()}catch(e){};listening=null;return}const r=new SR();listening=r;r.lang='it-IT';r.interimResults=true;r.continuous=false;r.onstart=()=>{$('#listenBtn').textContent='■ FERMA ASCOLTO';setStatus('ASCOLTO MICROFONO ATTIVO')};r.onresult=e=>{let fin='',inter='';for(let i=e.resultIndex;i<e.results.length;i++){const z=e.results[i][0].transcript;e.results[i].isFinal?fin+=z:inter+=z}$('#responseText').value=fin||inter;if(fin){const t=fin.trim();addTranscript('CLIENTE',t);$('#responseText').value='';applyIntent(detectIntent(t),t,false)}};r.onerror=()=>setStatus('MICROFONO NON DISPONIBILE · usa il campo testo');r.onend=()=>{listening=null;$('#listenBtn').textContent='🎙 ASCOLTA RISPOSTA'};r.start()}
function speakReply(){const t=lastReply||$('#promptText').textContent;if(!t)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='it-IT';u.rate=1.02;const vs=speechSynthesis.getVoices().filter(v=>String(v.lang).toLowerCase().startsWith('it'));if(vs[0])u.voice=vs[0];speechSynthesis.speak(u)}
function toggleTakeover(){operatorMode=!operatorMode;if(operatorMode)speechSynthesis.cancel();updateTakeover();setStatus(operatorMode?'CONTROLLO OPERATORE · AI IN PAUSA':'AI RIPRESA · continua dalla risposta successiva',operatorMode?'warn':'ok')}
function updateTakeover(){const b=$('#takeoverBtn');b.textContent=operatorMode?'RIPRENDI IA':'INTERVENGO IO';b.classList.toggle('resume',operatorMode)}
function summary(){if(!current)return'';const a=current.answers;return ['Campagna: '+campaign.label,current.contact.reason?'Motivo contatto: '+current.contact.reason:'',a.property_type?'Immobile: '+a.property_type:'',a.motivation?'Motivazione: '+a.motivation:'',a.property_notes?'Dettagli: '+a.property_notes:'',a.timing?'Tempi: '+a.timing:'',a.problem?'Problema: '+a.problem:'',a.decision_makers?'Decisori: '+a.decision_makers:'',a.agency_status?'Altra agenzia: '+a.agency_status:'',a.callback_request?'Richiamo: '+a.callback_request:'',a.appointment_request?'Appuntamento: '+a.appointment_request:''].filter(Boolean).join(' | ')}
async function finish(outcome){if(!current){toast('Nessuna chiamata aperta');return}const c=current.contact, useful=['APPOINTMENT','VALUATION','CALLBACK','FOLLOWUP','POSSIBLE_SALE'].includes(outcome),event={id:uid('CALL-EVENT'),campaign_id:campaign.id,prospect_id:c.id,name:c.name||'',phone:c.phone||'',city:c.city||'',source:c.source||'',reason:c.reason||'',outcome,answers:current.answers,transcript:current.transcript,started_at:current.started_at,ended_at:now(),operator_takeover:operatorMode};
  const ev=loadLocal(EVENTS_KEY,[]);ev.unshift(event);saveLocal(EVENTS_KEY,ev.slice(0,1000));await cloudUpsert('call_events',event.id,event);
  if(outcome==='DO_NOT_CONTACT')await exclude(c,event);
  if(useful)await toCRM(c,outcome,event);
  const q=queue();const i=q.findIndex(x=>x.id===c.id);if(i>=0){if(outcome==='NO_ANSWER'){q[i]={...q[i],status:'NON_RISPONDE',last_outcome:outcome,last_call_at:now(),done:false};const x=q.splice(i,1)[0];q.push(x)}else q[i]={...q[i],status:outcome,last_outcome:outcome,last_call_at:now(),done:true};saveQueue(q)}
  renderStats();renderQueue();setStatus('ESITO REGISTRATO · '+outcome,'ok');toast('Telefonata registrata');setTimeout(nextProspect,250)
}
async function exclude(c,event){const x=exclusions();if(!x.some(v=>phoneKey(v.phone)===phoneKey(c.phone)))x.push({id:uid('DNC'),phone:c.phone,name:c.name||'',source:c.source||'',created_at:now(),reason:'Richiesta durante campagna telefonica'});saveLocal(EXCL_KEY,x);const rec=x[x.length-1];await cloudUpsert('call_exclusions',rec.id,rec);const crm=loadLocal('f1CRMContacts',[]).find(v=>phoneKey(v.phone)===phoneKey(c.phone));if(crm&&window.F1Sync?.ready())try{await F1Sync.pushOne({...crm,call_excluded:1,privacy_status:'NON CONTATTARE',note:(crm.note||'')+' | Richiesta NON CONTATTARE '+now()})}catch(e){}
}
async function toCRM(c,outcome,event){const map={APPOINTMENT:'Appuntamento',VALUATION:'Valutazione',CALLBACK:'Da richiamare',FOLLOWUP:'Da richiamare',POSSIBLE_SALE:'Possibile vendita'};const existing=loadLocal('f1CRMContacts',[]).find(v=>phoneKey(v.phone)===phoneKey(c.phone));const rec={id:existing?.id||uid('CRM'),name:existing?.name||c.name||'',phone:c.phone,address:existing?.address||c.city||'',source:c.source||'Campagna telefonica',outcome:map[outcome]||'Da richiamare',note:[existing?.note,summary()].filter(Boolean).join(' | '),next:outcome==='APPOINTMENT'||outcome==='VALUATION'?'Preparare appuntamento':outcome==='CALLBACK'?'Richiamare come concordato':'Sviluppare contatto',date:$('#followupDate').value||existing?.date||'',ts:now(),call_excluded:0,privacy_status:''};
  const local=loadLocal('f1CRMContacts',[]);const ix=local.findIndex(v=>v.id===rec.id);if(ix>=0)local[ix]=rec;else local.unshift(rec);saveLocal('f1CRMContacts',local);if(window.F1Sync?.ready())try{await F1Sync.pushOne(rec)}catch(e){toast('CRM cloud non raggiungibile: copia locale salvata')}
}
async function cloudUpsert(collection,id,payload){if(!window.F1Sync?.ready())return false;try{await F1Sync.upsert(collection,id,payload);return true}catch(e){return false}}
function renderStats(){const e=loadLocal(EVENTS_KEY,[]),today=new Date().toISOString().slice(0,10),d=e.filter(x=>String(x.ended_at||'').slice(0,10)===today);$('#sCalls').textContent=d.length;$('#sUseful').textContent=d.filter(x=>['APPOINTMENT','VALUATION','CALLBACK','FOLLOWUP','POSSIBLE_SALE'].includes(x.outcome)).length;$('#sAppointments').textContent=d.filter(x=>['APPOINTMENT','VALUATION'].includes(x.outcome)).length;$('#sNoAnswer').textContent=d.filter(x=>x.outcome==='NO_ANSWER').length}
window.F1CallCampaign={boot,selectProspect,finish,detectIntent};
boot();
})();
