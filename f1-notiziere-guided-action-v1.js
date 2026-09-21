(()=>{'use strict';
const VERSION='20260921-guided-action-v2';
const $=id=>document.getElementById(id);
const txt=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const up=v=>txt(v).toUpperCase();
let activeTask=null;
let selectedOutcome='';
let recognition=null;
const OBSERVATIONS=[
 ['CARTELLO','Cartello / indicazione di vendita'],
 ['APPARENTEMENTE_VUOTO','Immobile apparentemente vuoto'],
 ['NOME_VISIBILE','Nome visibile / riferimento pubblico'],
 ['LAVORI','Lavori / movimento sull’immobile'],
 ['FONTE_ONLINE','Annuncio o fonte online'],
 ['ATTIVITA_VICINA','Informazione da attività / persona della zona'],
 ['ALTRO','Altro elemento utile']
];
const OUTCOMES=[
 ['PROPRIETARIO_IDENTIFICATO','✓ PROPRIETARIO IDENTIFICATO'],
 ['NUMERO_OTTENUTO','☎ NUMERO OTTENUTO'],
 ['POSSIBILE_VENDITA','🏠 POSSIBILE VENDITA'],
 ['RICHIESTA_VALUTAZIONE','€ RICHIESTA VALUTAZIONE'],
 ['APPUNTAMENTO_PRESO','📅 APPUNTAMENTO PRESO'],
 ['DA_RICHIAMARE','↻ DA RICHIAMARE'],
 ['NESSUNA_INFORMAZIONE','✕ NESSUNA INFORMAZIONE'],
 ['NOTIZIA_ERRATA','⚠ NOTIZIA ERRATA']
];
function injectStyle(){
 if($('f1GuidedStyle'))return;
 const s=document.createElement('style');s.id='f1GuidedStyle';s.textContent=`
 .f1-guided-modal{position:fixed;inset:0;z-index:180;background:rgba(5,20,12,.62);display:none;align-items:flex-end;justify-content:center}.f1-guided-modal.open{display:flex}
 .f1-guided-sheet{width:min(100%,760px);max-height:96dvh;overflow:auto;background:#f6f8f7;border-radius:18px 18px 0 0;padding:10px;box-shadow:0 -12px 40px rgba(0,0,0,.22)}
 .f1-guided-head{position:sticky;top:-10px;z-index:4;background:#f6f8f7;padding:8px 0 9px;border-bottom:1px solid #dce6df;display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
 .f1-guided-head .ey{font-size:8px;font-weight:950;color:#68766e;letter-spacing:.08em}.f1-guided-head h2{font-size:16px;margin:2px 0 0;font-weight:950}.f1-guided-close{width:34px;height:34px;border:1px solid #cbd8d0;border-radius:9px;background:#fff;font-size:20px;font-weight:900}
 .f1-guided-progress{display:flex;gap:3px;margin:8px 0}.f1-guided-progress i{height:4px;flex:1;background:#dce6df;border-radius:999px}.f1-guided-progress i.done,.f1-guided-progress i.active{background:#08733e}
 .f1-guide-step{border:1px solid #cbd8d0;border-radius:11px;background:#fff;margin:5px 0;overflow:hidden}.f1-guide-step summary{list-style:none;cursor:pointer;padding:9px 10px;font-size:10px;font-weight:950;display:flex;align-items:center;justify-content:space-between;gap:8px}.f1-guide-step summary::-webkit-details-marker{display:none}.f1-guide-step summary span{font-size:8px;color:#68766e}.f1-guide-step[open]{border-color:#0b7a43;box-shadow:0 4px 14px rgba(11,111,61,.07)}.f1-guide-step[open] summary{background:#edf8f1}
 .f1-guide-body{padding:0 10px 10px}.f1-guide-place{font-size:18px;font-weight:950;line-height:1.15}.f1-guide-kind{display:inline-block;margin-top:5px;border:1px solid #b9dfc9;border-radius:999px;padding:4px 7px;font-size:8px;font-weight:950;color:#07502d;background:#f4fbf7}
 .f1-guide-goal{margin-top:7px;border-left:3px solid #08733e;background:#f4fbf7;padding:7px 8px;border-radius:7px;font-size:10px;font-weight:850}.f1-guide-label{display:block;font-size:8px;font-weight:950;color:#657269;margin:8px 0 4px;letter-spacing:.04em}
 .f1-guide-btn{width:100%;min-height:42px;border:1px solid #bfd1c5;border-radius:9px;background:#fff;font-weight:950;font-size:10px;padding:7px;cursor:pointer}.f1-guide-btn.primary{background:#08733e;color:#fff;border-color:#08733e}.f1-guide-btn.soft{background:#edf8f1;color:#07502d}.f1-guide-btn.warn{background:#fff5eb;color:#9a3412;border-color:#fed7aa}
 .f1-guide-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.f1-guide-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.f1-guide-chip{border:1px solid #cbd8d0;border-radius:9px;background:#fff;padding:8px;font-size:8px;font-weight:900;min-height:40px}.f1-guide-chip.sel{background:#e5f7ec;border-color:#08733e;color:#07502d}
 .f1-guide-field{display:grid;gap:3px;margin-top:6px}.f1-guide-field label{font-size:8px;font-weight:950;color:#68766e}.f1-guide-field input,.f1-guide-field select,.f1-guide-field textarea{width:100%;border:1px solid #cbd8d0;border-radius:9px;background:#fff;padding:9px;font:inherit;font-size:11px}.f1-guide-field textarea{min-height:90px;resize:vertical}
 .f1-guide-script{font-size:12px;font-weight:850;line-height:1.45;border:1px solid #b9dfc9;background:#f4fbf7;border-radius:10px;padding:10px}.f1-guide-script small{display:block;font-size:8px;color:#68766e;margin-bottom:4px}
 .f1-guide-outcomes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.f1-guide-outcome{border:1px solid #cbd8d0;background:#fff;border-radius:9px;padding:8px;font-size:8px;font-weight:950;min-height:42px}.f1-guide-outcome.sel{border-color:#08733e;background:#e5f7ec;color:#07502d}
 .f1-guide-result{display:none;border:2px solid #08733e;border-radius:12px;background:#f0fbf4;padding:10px;margin-top:7px}.f1-guide-result.show{display:block}.f1-guide-result h3{margin:0;font-size:14px}.f1-guide-result strong{display:block;font-size:12px;margin-top:6px}.f1-guide-status{font-size:9px;font-weight:900;margin-top:7px;color:#07502d}.f1-guide-status.bad{color:#b42318}
 @media(max-width:520px){.f1-guide-grid.three{grid-template-columns:1fr 1fr}.f1-guide-sheet{padding:8px}.f1-guide-body{padding:0 8px 8px}}
 `;document.head.appendChild(s);
}
function ensureModal(){
 if($('f1GuidedModal'))return;
 injectStyle();
 const m=document.createElement('div');m.id='f1GuidedModal';m.className='f1-guided-modal';
 m.innerHTML=`<div class="f1-guided-sheet">
  <div class="f1-guided-head"><div><div class="ey">F1 TERRITORY · NOTIZIERE GUIDATO</div><h2 id="f1GuideTitle">AZIONE OPERATIVA</h2></div><button id="f1GuideClose" class="f1-guided-close" type="button">×</button></div>
  <div id="f1GuideProgress" class="f1-guided-progress"></div>
  <div id="f1GuideSteps"></div>
  <div id="f1GuideResult" class="f1-guide-result"><h3>✓ RISULTATO REGISTRATO</h3><div id="f1GuideSaved"></div><strong id="f1GuideNext">Ricalcolo prossima azione…</strong><button id="f1GuideMarketingBtn" class="f1-guide-btn" style="margin-top:8px;background:#c9141f;color:#fff;border-color:#c9141f;display:none" type="button">PIANO DI MARKETING · MOSTRA AL CLIENTE</button><button id="f1GuideNextBtn" class="f1-guide-btn primary" style="margin-top:6px" type="button">VAI ALLA PROSSIMA AZIONE</button></div>
 </div>`;
 document.body.appendChild(m);
 $('f1GuideClose').onclick=close;
 $('f1GuidedModal').onclick=e=>{if(e.target===$('f1GuidedModal'))close()};
 $('f1GuideNextBtn').onclick=()=>{close();setTimeout(()=>{const p=window.F1TerritoryAcquisitionDashboard?.getOperationalPlan?.();const t=p?.tasks?.[0];if(t)open(t)},120)};
}
function category(task){return up(task?.category||task?.record?.news_type||'')}
function scriptFor(task,owner=false){
 const c=category(task);
 if(owner){
  if(c==='RICHIESTA VALORE CASA')return'Buongiorno, la contatto in merito alla richiesta sul valore dell’immobile. Possiamo verificare insieme i dati e capire se è utile fissare un confronto più preciso?';
  if(c==='TRASFERIMENTO')return'Posso chiederle se il trasferimento comporta anche una decisione su questo immobile e con quali tempi?';
  if(c==='SUCCESSIONE')return'Vorrei capire soltanto la situazione dell’immobile e chi è la persona corretta con cui proseguire, senza presumere che ci sia già una decisione di vendita.';
  if(c==='APPARTAMENTO VUOTO')return'Posso chiederle qual è oggi la situazione dell’immobile e se avete previsto qualche cambiamento nei prossimi mesi?';
  if(c==='VECCHIO INCARICO SCADUTO')return'Vorrei capire la situazione attuale: l’immobile è ancora in vendita oppure nel frattempo avete cambiato decisione?';
  if(c==='CARTELLO PRIVATO')return'Ho visto il riferimento relativo all’immobile. È lei la persona corretta con cui parlare della vendita?';
  return'Sto lavorando specificamente questa zona. Posso chiederle se nei prossimi mesi ha previsto qualche cambiamento riguardo questo immobile?';
 }
 if(c==='CARTELLO PRIVATO')return'Buongiorno, ho visto il cartello relativo all’immobile. Sto verificando direttamente le informazioni: è lei la persona corretta con cui parlare?';
 if(c==='VECCHIO INCARICO SCADUTO')return'Buongiorno, sto verificando la situazione attuale dell’immobile. Sa indicarmi chi è la persona corretta con cui parlare?';
 return'Buongiorno, sto verificando alcune informazioni immobiliari di questa zona. Sa indicarmi chi è la persona corretta con cui parlare di questo immobile?';
}
function kindLabel(t){if(t.kind==='NEWS')return t.category||'NOTIZIA DA VERIFICARE';if(t.kind==='CRM')return'CONTATTO / FOLLOW-UP';if(t.kind==='SELLER')return'FONTE ONLINE DA VERIFICARE';return'RICERCA TERRITORIALE'}
function objective(t){return t?.objective||'OTTENERE UN ESITO UTILE E REGISTRARLO'}
function checked(name){return [...document.querySelectorAll('[name="'+name+'"]:checked')].map(x=>x.value)}
function value(id){return txt($(id)?.value)}
function choice(name){return value(name)}
function openStep(n){
 document.querySelectorAll('.f1-guide-step').forEach(d=>d.open=Number(d.dataset.step)===n);
 document.querySelectorAll('#f1GuideProgress i').forEach((i,idx)=>{i.classList.toggle('done',idx+1<n);i.classList.toggle('active',idx+1===n)});
 const el=document.querySelector('.f1-guide-step[data-step="'+n+'"]');el?.scrollIntoView({behavior:'smooth',block:'start'});
}
function nextFrom(btn){const d=btn.closest('.f1-guide-step');openStep(Number(d?.dataset.step||1)+1)}
function bindProgression(){
 document.querySelectorAll('[data-guide-next]').forEach(b=>b.onclick=()=>nextFrom(b));
 document.querySelectorAll('[data-guide-back]').forEach(b=>b.onclick=()=>{const d=b.closest('.f1-guide-step');openStep(Math.max(1,Number(d?.dataset.step||1)-1))});
 document.querySelectorAll('[data-observe]').forEach(b=>b.onclick=()=>b.classList.toggle('sel'));
 document.querySelectorAll('[data-guide-outcome]').forEach(b=>b.onclick=()=>{selectedOutcome=b.dataset.guideOutcome;document.querySelectorAll('[data-guide-outcome]').forEach(x=>x.classList.toggle('sel',x===b));$('f1GuideAppointmentBox').hidden=selectedOutcome!=='APPUNTAMENTO_PRESO'});
 $('f1GuideOwner')?.addEventListener('change',()=>{$('f1GuideScript').textContent=scriptFor(activeTask,$('f1GuideOwner').value==='SI')});
 $('f1GuideContactRole')?.addEventListener('change',()=>{if($('f1GuideContactRole').value==='PROPRIETARIO'){$('f1GuideOwner').value='SI';$('f1GuideScript').textContent=scriptFor(activeTask,true)}});
 $('f1GuideDictate')?.addEventListener('click',startDictation);
 $('f1GuideSave')?.addEventListener('click',save);
 $('f1GuideOpenSource')?.addEventListener('click',()=>{if(activeTask?.sourceUrl)window.open(activeTask.sourceUrl,'_blank','noopener')});
}
function buildSteps(task){
 const place=task.place||window.F1TerritoryAcquisitionDashboard?.basin||'—',person=task.record?.person_name||task.name||'';
 const src=task.kind==='SELLER'&&task.sourceUrl?'<button id="f1GuideOpenSource" class="f1-guide-btn soft" type="button" style="margin-top:6px">APRI LA FONTE DA VERIFICARE</button>':'';
 const steps=[
 ['📍 1 · DOVE SEI / COSA STAI VERIFICANDO',`<div class="f1-guide-place">${esc(place)}</div><span class="f1-guide-kind">${esc(kindLabel(task))}</span><div class="f1-guide-goal">OBIETTIVO: ${esc(objective(task))}</div>${src}<button class="f1-guide-btn primary" data-guide-next type="button" style="margin-top:8px">✓ SONO SUL POSTO / PRONTO</button>`],
 ['👀 2 · GUARDA E REGISTRA COSA VEDI',`<span class="f1-guide-label">TOCCA SOLO CIÒ CHE VEDI REALMENTE</span><div class="f1-guide-grid">${OBSERVATIONS.map(x=>'<button type="button" class="f1-guide-chip" data-observe value="'+esc(x[0])+'">'+esc(x[1])+'</button>').join('')}</div><div class="f1-guide-field"><label>ALTRO CHE VEDI</label><textarea id="f1GuideObservedText" placeholder="Descrivi solo fatti osservabili. Es. serrande abbassate, cartello, lavori, nominativo visibile…"></textarea></div><button class="f1-guide-btn primary" data-guide-next type="button">AVANTI →</button>`],
 ['🗣️ 3 · CON CHI STAI PARLANDO',`<div class="f1-guide-field"><label>RUOLO DELLA PERSONA</label><select id="f1GuideContactRole"><option value="">SELEZIONA</option><option>PROPRIETARIO</option><option>PERSONA PRESENTE</option><option>VICINO</option><option>ATTIVITÀ VICINA</option><option>PORTINERIA</option><option>ALTRO</option><option>NESSUNO</option></select></div><div class="f1-guide-field"><label>NOME / RIFERIMENTO, SE FORNITO</label><input id="f1GuidePerson" value="${esc(task.record?.person_name||'')}" placeholder="Non inventare il nominativo"></div><button class="f1-guide-btn primary" data-guide-next type="button">AVANTI →</button>`],
 ['💬 4 · COSA DIRE',`<div class="f1-guide-script"><small>FRASE GUIDA</small><span id="f1GuideScript">${esc(scriptFor(task,false))}</span></div><div class="f1-guide-goal">ASCOLTA LA RISPOSTA. NON SUGGERIRE TU CHE LA PERSONA VOGLIA VENDERE.</div><button class="f1-guide-btn primary" data-guide-next type="button">HO PARLATO · AVANTI →</button>`],
 ['❓ 5 · COSA DEVI CAPIRE',`<div class="f1-guide-grid">
 <div class="f1-guide-field"><label>È IL PROPRIETARIO?</label><select id="f1GuideOwner"><option value="DA_VERIFICARE">DA VERIFICARE</option><option value="SI">SÌ</option><option value="NO">NO</option></select></div>
 <div class="f1-guide-field"><label>IMMOBILE UTILIZZATO?</label><select id="f1GuideUsed"><option value="DA_VERIFICARE">DA VERIFICARE</option><option value="SI">SÌ</option><option value="NO">NO / APPARENTEMENTE NO</option></select></div>
 <div class="f1-guide-field"><label>PREVEDE UN CAMBIAMENTO?</label><select id="f1GuideChange"><option value="DA_VERIFICARE">DA VERIFICARE</option><option value="SI">SÌ</option><option value="NO">NO</option></select></div>
 <div class="f1-guide-field"><label>VUOLE ESSERE RICONTATTATO?</label><select id="f1GuideContactOk"><option value="DA_VERIFICARE">DA VERIFICARE</option><option value="SI">SÌ</option><option value="NO">NO</option></select></div>
 <div class="f1-guide-field"><label>INTERESSA CONOSCERE IL VALORE?</label><select id="f1GuideValuation"><option value="DA_VERIFICARE">DA VERIFICARE</option><option value="SI">SÌ</option><option value="NO">NO</option></select></div>
 <div class="f1-guide-field"><label>C'È GIÀ UN INTERMEDIARIO?</label><select id="f1GuideIntermediary"><option value="DA_VERIFICARE">DA VERIFICARE</option><option value="SI">SÌ</option><option value="NO">NO</option></select></div></div>
 <div class="f1-guide-field"><label>TEMPI INDICATI</label><input id="f1GuideTiming" placeholder="Es. entro 6 mesi / nessuna tempistica"></div>
 <div class="f1-guide-field"><label>MOTIVO / SITUAZIONE EMERSA</label><textarea id="f1GuideMotivation" placeholder="Trasferimento, successione, immobile inutilizzato, richiesta valore… solo se dichiarato o verificato"></textarea></div>
 <button class="f1-guide-btn primary" data-guide-next type="button">AVANTI →</button>`],
 ['☎️ 6 · RECAPITO',`<div class="f1-guide-script"><small>QUANDO ESISTE UN MOTIVO PER PROSEGUIRE</small>“Qual è il recapito migliore per farle avere le informazioni o farla ricontattare?”</div><div class="f1-guide-grid"><div class="f1-guide-field"><label>TELEFONO / WHATSAPP</label><input id="f1GuidePhone" inputmode="tel" value="${esc(task.record?.phone_normalized||task.record?.phone||task.phone||'')}"></div><div class="f1-guide-field"><label>EMAIL, SE FORNITA</label><input id="f1GuideEmail" inputmode="email"></div></div><button class="f1-guide-btn primary" data-guide-next type="button">AVANTI →</button>`],
 ['🎯 7 · COSA DEVI OTTENERE',`<div class="f1-guide-goal">${esc(objective(task))}</div><p style="font-size:9px;font-weight:800">Non fermarti a “ho parlato con qualcuno”. Chiudi l’azione con un esito verificabile: proprietario, recapito, intenzione, follow-up oppure appuntamento.</p><button class="f1-guide-btn primary" data-guide-next type="button">AVANTI →</button>`],
 ['📅 8 · SE C’È UNA POSSIBILITÀ CONCRETA',`<div class="f1-guide-script"><small>PROVA A DEFINIRE UN PASSO PRECISO</small>“Per approfondire correttamente la situazione possiamo fissare un momento preciso con il professionista che segue la zona. Le è più comodo un primo orario oppure un secondo?”</div><div class="f1-guide-field"><label>DATA / ORA, SOLO SE CONFERMATA</label><input id="f1GuideAppointment" type="datetime-local"></div><button class="f1-guide-btn primary" data-guide-next type="button">AVANTI →</button>`],
 ['✅ 9 · COME È ANDATA?',`<div class="f1-guide-outcomes">${OUTCOMES.map(x=>'<button type="button" class="f1-guide-outcome" data-guide-outcome="'+x[0]+'">'+x[1]+'</button>').join('')}</div><div id="f1GuideAppointmentBox" hidden class="f1-guide-status">Inserisci la data/ora nel passaggio precedente prima di salvare.</div><button class="f1-guide-btn primary" data-guide-next type="button" style="margin-top:7px">AVANTI →</button>`],
 ['📝 10 · COSA HAI CAPITO',`<div class="f1-guide-field"><label>SCRIVI O DETTA TUTTO QUELLO CHE HAI CAPITO</label><textarea id="f1GuideSummary" placeholder="Riporta fatti, parole utili, situazione, persone citate e prossimo passo. Non trasformare supposizioni in fatti."></textarea></div><button id="f1GuideDictate" class="f1-guide-btn soft" type="button">🎙 DETTA NOTA</button><button class="f1-guide-btn primary" data-guide-next type="button" style="margin-top:5px">AVANTI →</button>`],
 ['💾 11 · REGISTRA TUTTO',`<div class="f1-guide-goal">F1 salverà il riepilogo, i dati raccolti, l’esito, il recapito e l’eventuale appuntamento. Poi ricalcolerà i KPI e la prossima azione.</div><button id="f1GuideSave" class="f1-guide-btn primary" type="button" style="margin-top:8px">✓ REGISTRA TUTTO E CONTINUA</button><div id="f1GuideStatus" class="f1-guide-status"></div>`]
 ];
 $('f1GuideSteps').innerHTML=steps.map((x,i)=>'<details class="f1-guide-step" data-step="'+(i+1)+'" '+(i===0?'open':'')+'><summary>'+x[0]+'<span>PASSO '+(i+1)+'/11</span></summary><div class="f1-guide-body">'+x[1]+'</div></details>').join('');
 $('f1GuideProgress').innerHTML=steps.map(()=>'<i></i>').join('');
 bindProgression();openStep(1);
}
function collect(){
 const obs=[...document.querySelectorAll('[data-observe].sel')].map(b=>b.value);
 return {
  guided_version:VERSION,
  observed_flags:obs,
  observed_text:value('f1GuideObservedText'),
  contact_role:value('f1GuideContactRole'),
  person_name:value('f1GuidePerson'),
  owner_status:value('f1GuideOwner')||'DA_VERIFICARE',
  property_used:value('f1GuideUsed')||'DA_VERIFICARE',
  change_planned:value('f1GuideChange')||'DA_VERIFICARE',
  contact_ok:value('f1GuideContactOk')||'DA_VERIFICARE',
  wants_valuation:value('f1GuideValuation')||'DA_VERIFICARE',
  intermediary:value('f1GuideIntermediary')||'DA_VERIFICARE',
  timing:value('f1GuideTiming'),
  motivation:value('f1GuideMotivation'),
  phone:value('f1GuidePhone'),
  email:value('f1GuideEmail'),
  appointment_at:value('f1GuideAppointment'),
  outcome:selectedOutcome,
  summary:value('f1GuideSummary'),
  captured_at:new Date().toISOString()
 };
}
function outcomeForConversation(o){
 return ({PROPRIETARIO_IDENTIFICATO:'INFORMAZIONE UTILE',NUMERO_OTTENUTO:'INFORMAZIONE UTILE',POSSIBILE_VENDITA:'POSSIBILE VENDITA',RICHIESTA_VALUTAZIONE:'POSSIBILE VENDITA',APPUNTAMENTO_PRESO:'APPUNTAMENTO',DA_RICHIAMARE:'DA RICONTATTARE',NESSUNA_INFORMAZIONE:'NESSUNA INFORMAZIONE',NOTIZIA_ERRATA:'NESSUNA INFORMAZIONE'})[o]||'INFORMAZIONE UTILE';
}
function compiledNote(d,t){
 const lines=[
  'NOTIZIERE GUIDATO',
  'AZIONE: '+kindLabel(t),
  'POSIZIONE: '+(t.place||''),
  d.observed_flags.length?'OSSERVATO: '+d.observed_flags.join(', '):'',
  d.observed_text?'DETTAGLIO VISIVO: '+d.observed_text:'',
  d.contact_role?'CON CHI: '+d.contact_role:'',
  d.person_name?'NOME: '+d.person_name:'',
  'PROPRIETARIO: '+d.owner_status,
  'IMMOBILE UTILIZZATO: '+d.property_used,
  'CAMBIAMENTO PREVISTO: '+d.change_planned,
  d.timing?'TEMPI: '+d.timing:'',
  d.motivation?'SITUAZIONE: '+d.motivation:'',
  'RICONTATTO: '+d.contact_ok,
  'VALORE CASA: '+d.wants_valuation,
  'INTERMEDIARIO: '+d.intermediary,
  d.email?'EMAIL: '+d.email:'',
  'ESITO: '+d.outcome,
  d.summary?'COSA HO CAPITO: '+d.summary:''
 ].filter(Boolean);
 return lines.join('\n');
}
async function ensureCivic(t){
 const r=t.record||{};
 if(r.civic_record_id)return r.civic_record_id;
 if(r.progress_id&&txt(r.civico)){
  try{return await window.F1StaffData.rpc('f1_territory_ensure_civic_v2',{p_progress_id:r.progress_id,p_civico:txt(r.civico)})}catch(_){}
 }
 return null;
}
async function maybeLead(d,t){
 if(!d.person_name&&!d.phone)return '';
 try{
  const r=t.record||{},saved=await window.F1StaffData.createOrLinkLead({
   nome:d.person_name,telefono:d.phone,email:d.email||'',comune:txt(r.comune||t.comune),zona:txt(r.zona),via:txt(r.via),civico:txt(r.civico),
   source_type:t.kind==='SELLER'?'SELLER_RADAR':'TERRITORY',source:t.sourceUrl||t.source||'F1 TERRITORY',
   lead_reason:'NOTIZIERE GUIDATO · '+outcomeForConversation(d.outcome),
   status:d.outcome==='APPUNTAMENTO_PRESO'?'APPUNTAMENTO':['POSSIBILE_VENDITA','RICHIESTA_VALUTAZIONE'].includes(d.outcome)?'DA_QUALIFICARE':'DA_VERIFICARE',
   next_action:d.outcome==='APPUNTAMENTO_PRESO'?'PREPARA APPUNTAMENTO':d.outcome==='DA_RICHIAMARE'?'PROGRAMMA RICHIAMO':'VERIFICA / QUALIFICA',
   notes:compiledNote(d,t)
  });
  return txt(saved?.lead_id||saved?.record?.lead_id||saved?.lead?.lead_id);
 }catch(_){return''}
}
async function saveNewsTask(d,t,civicId,leadId){
 const r=t.record||{};
 const detail=[txt(r.detail),d.summary?'NOTIZIERE: '+d.summary:''].filter(Boolean).join('\n');
 await window.F1StaffData.rpc('f1_territory_news_update_v2',{
  p_observation_id:r.observation_id||t.id,
  p_person_name:d.person_name||txt(r.person_name),
  p_phone:d.phone||txt(r.phone_normalized),
  p_detail:detail,
  p_owner_status:d.owner_status==='SI'?'SÌ':d.owner_status==='NO'?'NO':'DA_VERIFICARE',
  p_market_publisher:txt(r.market_publisher),p_market_price:txt(r.market_price),p_market_agency:txt(r.market_agency),
  p_market_time_on_market:txt(r.market_time_on_market),p_market_source_url:txt(r.market_source_url),
  p_seller_qualification:d
 });
 if(civicId){
  await window.F1StaffData.rpc('f1_territory_note_add_v4',{p_civic_record_id:civicId,p_note_type:'NOTIZIERE_GUIDATO',p_note_text:compiledNote(d,t),p_audio_path:'',p_audio_mime:'',p_audio_duration_seconds:null,p_photo_path:'',p_source_file_name:''});
  await window.F1StaffData.rpc('f1_territory_conversation_add_record_v4',{
   p_civic_record_id:civicId,p_target_type:d.contact_role||'CONTATTO TERRITORIALE',p_person_name:d.person_name||txt(r.person_name),
   p_phone:d.phone||txt(r.phone_normalized),p_outcome:outcomeForConversation(d.outcome),p_notes:compiledNote(d,t),p_lead_id:leadId||null,
   p_value_offer:d.wants_valuation==='SI'?'REPORT PREZZI ZONA':'',
   p_appointment_at:d.outcome==='APPUNTAMENTO_PRESO'&&d.appointment_at?new Date(d.appointment_at).toISOString():null
  });
 }
 if(civicId||d.outcome==='NOTIZIA_ERRATA')await window.F1StaffData.rpc('f1_territory_news_resolve_v2',{p_observation_id:r.observation_id||t.id});
}
async function saveCrmTask(d,t,civicId,leadId){
 if(!civicId)throw new Error('RECORD IMMOBILE NON DISPONIBILE: registra almeno la nota nella scheda CRM.');
 const r=t.record||{};
 await window.F1StaffData.rpc('f1_territory_note_add_v4',{p_civic_record_id:civicId,p_note_type:'NOTIZIERE_GUIDATO',p_note_text:compiledNote(d,t),p_audio_path:'',p_audio_mime:'',p_audio_duration_seconds:null,p_photo_path:'',p_source_file_name:''});
 await window.F1StaffData.rpc('f1_territory_conversation_add_record_v4',{
  p_civic_record_id:civicId,p_target_type:d.contact_role||txt(r.target_type)||'CONTATTO TERRITORIALE',p_person_name:d.person_name||txt(r.person_name),
  p_phone:d.phone||txt(r.phone),p_outcome:outcomeForConversation(d.outcome),p_notes:compiledNote(d,t),p_lead_id:leadId||txt(r.lead_id)||null,
  p_value_offer:d.wants_valuation==='SI'?'REPORT PREZZI ZONA':'',
  p_appointment_at:d.outcome==='APPUNTAMENTO_PRESO'&&d.appointment_at?new Date(d.appointment_at).toISOString():null
 });
}
async function saveSellerTask(d,t,leadId){
 const me=await window.F1StaffData.me();
 await window.F1StaffData.addNews(me.user_id,{
  level:['POSSIBILE_VENDITA','RICHIESTA_VALUTAZIONE','APPUNTAMENTO_PRESO'].includes(d.outcome)?'N3':'N1',
  title:'VERIFICA FONTE ONLINE · '+(t.place||'BACINO F1'),detail:compiledNote(d,t),source:t.sourceUrl||t.source||'SELLER RADAR',
  source_reference:t.sourceUrl||'',regione:'Piemonte',provincia:'TO',comune:txt(t.record?.comune),zona:txt(t.record?.zona),via:txt(t.record?.via),
  microzona:'',justification:'Verifica eseguita dal Notiziere guidato F1',usable:!['NESSUNA_INFORMAZIONE','NOTIZIA_ERRATA'].includes(d.outcome),
  status:'ACTIVE',lead_id:leadId||'',property_id:''
 });
}
async function save(){
 const status=$('f1GuideStatus');status.className='f1-guide-status';const d=collect();
 if(!d.outcome){status.className='f1-guide-status bad';status.textContent='Seleziona prima COME È ANDATA nel passaggio 9.';openStep(9);return}
 if(d.outcome==='APPUNTAMENTO_PRESO'&&!d.appointment_at){status.className='f1-guide-status bad';status.textContent='Hai indicato APPUNTAMENTO PRESO: inserisci data e ora nel passaggio 8.';openStep(8);return}
 status.textContent='Salvataggio completo nel CRM…';$('f1GuideSave').disabled=true;
 try{
  const t=activeTask,civicId=await ensureCivic(t),leadId=await maybeLead(d,t);
  if(t.kind==='NEWS')await saveNewsTask(d,t,civicId,leadId);
  else if(t.kind==='CRM')await saveCrmTask(d,t,civicId,leadId);
  else if(t.kind==='SELLER')await saveSellerTask(d,t,leadId);
  else if(civicId)await window.F1StaffData.rpc('f1_territory_note_add_v4',{p_civic_record_id:civicId,p_note_type:'NOTIZIERE_GUIDATO',p_note_text:compiledNote(d,t),p_audio_path:'',p_audio_mime:'',p_audio_duration_seconds:null,p_photo_path:'',p_source_file_name:''});
  status.textContent='✓ Tutto registrato. Ricalcolo KPI e priorità…';
  await window.F1TerritoryAcquisitionDashboard?.refresh?.();
  const plan=window.F1TerritoryAcquisitionDashboard?.getOperationalPlan?.(),next=plan?.tasks?.[0];
  $('f1GuideSaved').textContent='Esito: '+d.outcome.replaceAll('_',' ')+' · '+(t.place||'');
  $('f1GuideNext').textContent=next?'ORA FAI: '+(next.place||next.name||'PROSSIMA AZIONE')+' · '+next.action:'Nessuna altra azione prioritaria disponibile.';
  $('f1GuideSteps').style.display='none';$('f1GuideProgress').style.display='none';$('f1GuideResult').classList.add('show');const mb=$('f1GuideMarketingBtn');if(mb&&civicId){mb.style.display='block';mb.onclick=()=>openMarketingForCivic(civicId)};
 }catch(e){status.className='f1-guide-status bad';status.textContent='ERRORE: '+(e?.message||e);$('f1GuideSave').disabled=false}
}
async function openMarketingForCivic(civicId){
 try{
  const data=await window.F1StaffData.rpc('f1_territory_mobile_crm_v5',{p_limit:700})||{},record=(data.civics||[]).find(x=>txt(x.civic_record_id)===txt(civicId));
  if(!record)throw new Error('SCHEDA IMMOBILE NON TROVATA');
  const same=x=>txt(x?.civic_record_id)===txt(civicId)||(txt(x?.comune).toLowerCase()===txt(record.comune).toLowerCase()&&txt(x?.via).toLowerCase()===txt(record.via).toLowerCase()&&txt(x?.civico)===txt(record.civico));
  const context={record,news:(data.news||[]).filter(same),conversations:(data.conversations||[]).filter(same),notes:(data.notes||[]).filter(same),letters:(data.letters||[]).filter(same)};
  if(!window.F1PropertyMarketingPlan?.open)throw new Error('MODULO PIANO DI MARKETING NON PRONTO');
  close();window.F1PropertyMarketingPlan.open(context);
 }catch(e){alert(e?.message||e)}
}
function startDictation(){
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 const b=$('f1GuideDictate'),out=$('f1GuideSummary');
 if(!SR){b.textContent='DETTATURA NON DISPONIBILE';return}
 try{recognition?.stop()}catch(_){}
 recognition=new SR();recognition.lang='it-IT';recognition.interimResults=false;recognition.continuous=false;
 b.textContent='🎙 ASCOLTO…';recognition.onresult=e=>{const t=Array.from(e.results).map(r=>r[0]?.transcript||'').join(' ');out.value=txt(out.value+' '+t);b.textContent='🎙 DETTA NOTA'};
 recognition.onerror=()=>{b.textContent='🎙 DETTA NOTA'};recognition.onend=()=>{b.textContent='🎙 DETTA NOTA'};recognition.start();
}
function open(task){
 if(!task)return;
 if(task.kind==='TERRITORY'){window.F1TerritoryShow?.('terr');document.querySelector('.topnav[data-screen="terr"]')?.click();return}
 ensureModal();activeTask=task;selectedOutcome='';
 $('f1GuideResult').classList.remove('show');$('f1GuideSteps').style.display='block';$('f1GuideProgress').style.display='flex';
 $('f1GuideTitle').textContent=(task.place||'AZIONE')+' · '+kindLabel(task);
 buildSteps(task);$('f1GuidedModal').classList.add('open');document.body.style.overflow='hidden';
}
function close(){try{recognition?.stop()}catch(_){};$('f1GuidedModal')?.classList.remove('open');document.body.style.overflow='';activeTask=null}
window.F1GuidedAction={version:VERSION,open,close};
})();