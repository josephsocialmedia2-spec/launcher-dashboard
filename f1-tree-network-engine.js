(function(){
'use strict';

const DATA_VERSION=2;
const PERIODS=[
 {id:'oggi',label:'OGGI',kind:'period'},
 {id:'ultimi_5',label:'ULTIMI 5 ANNI',kind:'period'},
 {id:'anni_5_10',label:'5–10 ANNI FA',kind:'period'},
 {id:'anni_10_20',label:'10–20 ANNI FA',kind:'period'},
 {id:'primi_lavori',label:'PRIMI LAVORI',kind:'company'},
 {id:'superiori',label:'SCUOLE SUPERIORI',kind:'school'},
 {id:'medie',label:'SCUOLE MEDIE',kind:'school'},
 {id:'elementari',label:'SCUOLE ELEMENTARI',kind:'school'},
 {id:'asilo',label:'ASILO',kind:'school'}
];
const SCHOOL_PERIODS=new Set(['superiori','medie','elementari','asilo']);
let mutationTimer=null;
let booted=false;

function now(){return new Date().toISOString()}
function dayKey(){return now().slice(0,10)}
function uniq(a){return [...new Set((a||[]).filter(Boolean))]}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9@.+ ]+/g,' ').replace(/\s+/g,' ').trim()}
function phone(v){return String(v||'').replace(/\D/g,'')}
function pairKey(a,b){return [a,b].sort().join('::')}
function splitList(v){return uniq(String(v||'').split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean))}
function periodLabel(id){return (PERIODS.find(x=>x.id===id)||{}).label||id}
function allPeople(){return (db.people||[]).filter(p=>p.id!=='root')}

function log(message){
 db.automationLog=Array.isArray(db.automationLog)?db.automationLog:[];
 db.automationLog.unshift({at:now(),message:String(message||'')});
 db.automationLog=db.automationLog.slice(0,60);
}
function saveDirect(){
 try{localStorage.setItem('alberoFontiNotizie',JSON.stringify(db))}catch(_){}
 try{window.F1TreeCloud?.schedulePush?.()}catch(_){}
}
function migrate(){
 let changed=false;
 if(!db||typeof db!=='object')return false;
 if(!Number.isFinite(Number(db.dataVersion))||Number(db.dataVersion)<DATA_VERSION){db.dataVersion=DATA_VERSION;changed=true}
 for(const [k,def] of [['relations',[]],['places',[]],['memories',[]],['automationLog',[]],['duplicateCandidates',[]]]){
   if(!Array.isArray(db[k])){db[k]=def;changed=true}
 }
 db.mnemonic=db.mnemonic&&typeof db.mnemonic==='object'?db.mnemonic:{};
 if(!Array.isArray(db.mnemonic.answerHistory)){db.mnemonic.answerHistory=[];changed=true}
 if(!Array.isArray(db.mnemonic.ignoredDuplicatePairs)){db.mnemonic.ignoredDuplicatePairs=[];changed=true}
 db.mnemonic.pendingDuplicate=db.mnemonic.pendingDuplicate||null;
 db.people=(db.people||[]).map(p=>{
   if(!Array.isArray(p.periodContexts)){p.periodContexts=[];changed=true}
   if(!Array.isArray(p.places)){p.places=[];changed=true}
   if(!Array.isArray(p.memories)){p.memories=[];changed=true}
   if(!Array.isArray(p.schools)){p.schools=[];changed=true}
   if(!Array.isArray(p.companies)){p.companies=[];changed=true}
   if(!Array.isArray(p.contextTags)){p.contextTags=[];changed=true}
   return p;
 });
 // Solo classificazioni esplicite già scritte nei dati, senza inventare contesti.
 db.people.forEach(p=>{
   if(p.id==='root'||p.periodContexts.length)return;
   const hay=norm([p.notes,p.category,p.source].join(' '));
   const map=[
     ['asilo',/\bASILO\b/],['elementari',/\bELEMENTAR/],['medie',/\bMEDIE\b/],
     ['superiori',/\bSUPERIOR/],['primi_lavori',/\bPRIMI LAVOR/]
   ];
   const found=map.filter(x=>x[1].test(hay)).map(x=>x[0]);
   if(found.length){p.periodContexts=uniq([...p.periodContexts,...found]);changed=true}
 });
 if(changed){log('Migrazione dati v2 completata senza eliminare i dati esistenti');saveDirect()}
 return changed;
}
function personCompleteness(p){
 let n=0,total=7;
 if(p.phone)n++; if(p.email)n++; if(p.town)n++; if((p.periodContexts||[]).length)n++;
 if((p.places||[]).length)n++; if((p.memories||[]).length)n++; if(p.notes)n++;
 return n/total;
}
function duplicateScore(a,b){
 if(!a||!b||a.id===b.id)return 0;
 const pa=phone(a.phone),pb=phone(b.phone),ea=norm(a.email),eb=norm(b.email);
 if(pa&&pb&&pa.length>=6&&pa===pb)return 1;
 if(ea&&eb&&ea===eb)return 1;
 const fa=norm([a.name,a.surname].join(' ')),fb=norm([b.name,b.surname].join(' '));
 const firstA=norm(a.name),firstB=norm(b.name),surA=norm(a.surname),surB=norm(b.surname);
 let s=0;
 if(fa&&fa===fb)s=.78;
 else if(firstA&&firstA===firstB&&surA&&surB&&(surA===surB||surA[0]===surB[0]))s=.58;
 if(s&&norm(a.town)&&norm(a.town)===norm(b.town))s+=.12;
 if(s&&uniq(a.periodContexts).some(x=>uniq(b.periodContexts).includes(x)))s+=.06;
 if(s&&uniq(a.companies).some(x=>uniq(b.companies).map(norm).includes(norm(x))))s+=.05;
 if(s&&uniq(a.schools).some(x=>uniq(b.schools).map(norm).includes(norm(x))))s+=.05;
 return Math.min(1,s);
}
function computeDuplicates(){
 const p=allPeople(),ignored=new Set(db.mnemonic.ignoredDuplicatePairs||[]),out=[];
 const cap=Math.min(p.length,900);
 for(let i=0;i<cap;i++)for(let j=i+1;j<cap;j++){
   const key=pairKey(p[i].id,p[j].id);if(ignored.has(key))continue;
   const score=duplicateScore(p[i],p[j]);
   if(score>=.58)out.push({a:p[i].id,b:p[j].id,score:Number(score.toFixed(2)),certain:score>=.95});
 }
 out.sort((x,y)=>y.score-x.score);
 db.duplicateCandidates=out.slice(0,100);
 return db.duplicateCandidates;
}
function periodStats(){
 const result={};
 PERIODS.forEach(x=>result[x.id]=[]);
 allPeople().forEach(p=>(p.periodContexts||[]).forEach(id=>{if(result[id])result[id].push(p)}));
 return result;
}
function chooseMnemonicQuestion(){
 const stats=periodStats();
 let period=PERIODS.slice().sort((a,b)=>(stats[a.id]?.length||0)-(stats[b.id]?.length||0))[0]||PERIODS[0];
 const people=stats[period.id]||[];
 if(!people.length){
   if(period.id==='asilo'){
     const hasAsiloPlace=(db.places||[]).some(x=>x.periodId==='asilo');
     if(!hasAsiloPlace)return {id:'q_'+Date.now(),periodId:'asilo',answerType:'place',text:'Come si chiamava l’asilo?',anchorId:null};
     return {id:'q_'+Date.now(),periodId:'asilo',answerType:'person',text:'Ricordi qualche bambino o maestra dell’asilo?',anchorId:null};
   }
   const text={
     oggi:'Chi frequenti oggi e non hai ancora inserito?',
     ultimi_5:'Chi frequentavi negli ultimi 5 anni?',
     anni_5_10:'Chi frequentavi tra 5 e 10 anni fa?',
     anni_10_20:'Chi frequentavi tra 10 e 20 anni fa?',
     primi_lavori:'Chi ricordi dei tuoi primi lavori?',
     superiori:'Chi frequentavi alle scuole superiori?',
     medie:'Chi sedeva vicino a te o tornava a casa con te alle scuole medie?',
     elementari:'Chi ricordi delle scuole elementari?'
   }[period.id]||('Chi ricordi del periodo '+period.label+'?');
   return {id:'q_'+Date.now(),periodId:period.id,answerType:'person',text,anchorId:null};
 }
 const anchor=people.slice().sort((a,b)=>personCompleteness(a)-personCompleteness(b))[0];
 const full=upperName([anchor.name,anchor.surname].filter(Boolean).join(' '));
 if(!(anchor.places||[]).length)return {id:'q_'+Date.now(),periodId:period.id,answerType:'place',text:'Dove frequentavi '+full+' in quel periodo?',anchorId:anchor.id};
 if(!(anchor.memories||[]).length)return {id:'q_'+Date.now(),periodId:period.id,answerType:'memory',text:'Che cosa ricordi di '+full+' in quel periodo?',anchorId:anchor.id};
 return {id:'q_'+Date.now(),periodId:period.id,answerType:'person',text:'Chi altro ricordi attraverso '+full+' in quel periodo?',anchorId:anchor.id};
}
function ensureQuestion(force){
 if(force||!db.mnemonic.current||!PERIODS.some(x=>x.id===db.mnemonic.current.periodId))db.mnemonic.current=chooseMnemonicQuestion();
 return db.mnemonic.current;
}
function relationExists(a,b,type,periodId){
 return (db.relations||[]).some(r=>r.sourceId===a&&r.targetId===b&&r.type===type&&r.periodId===periodId);
}
function addRelation(a,b,type,periodId,context){
 if(!a||!b||a===b)return;
 if(relationExists(a,b,type,periodId))return;
 db.relations.push({id:'rel_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6),sourceId:a,targetId:b,type:type||'conosce',periodId:periodId||'',context:context||'',createdAt:now()});
}
function makePersonFromAnswer(text,periodId,anchorId){
 const parts=String(text||'').trim().split(/\s+/).filter(Boolean);
 const name=upperName(parts.shift()||''),surname=upperName(parts.join(' '));
 return {id:'p_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),parentId:anchorId||'root',name,surname,phone:'',email:'',category:SCHOOL_PERIODS.has(periodId)?'scuola':periodId==='primi_lavori'?'lavoro':'',source:'',stage:'Nome',town:'',notes:'Ricordato dal motore mnemonico · '+periodLabel(periodId),influence:false,firstContact:'',lastContact:'',nextContact:'',touchpointHistory:{},socialSearchHistory:{},lifeTriggers:[],lifeTriggerHistory:[],lifeTriggerStatus:{},lifeTriggerNews:{},periodContexts:[periodId],places:[],memories:[],schools:[],companies:[],contextTags:['MNEMONICO'],createdAt:now(),updatedAt:now(),contactDates:[]};
}
function exactPerson(name,surname){
 const n=norm(name),s=norm(surname);
 return allPeople().find(p=>norm(p.name)===n&&norm(p.surname)===s)||null;
}
function sameFirstCandidates(name){
 const n=norm(name);return allPeople().filter(p=>norm(p.name)===n);
}
function addAnswerHistory(q,answer,kind,targetId){
 db.mnemonic.answerHistory.push({at:now(),question:q.text,answer,answerType:kind,periodId:q.periodId,targetId:targetId||''});
 db.mnemonic.answerHistory=db.mnemonic.answerHistory.slice(-300);
}
function saveMnemonicAnswer(){
 const input=document.getElementById('mnemonicAnswer');if(!input)return;
 const answer=input.value.trim();if(!answer)return toast('Scrivi una risposta');
 const q=ensureQuestion(false);
 if(q.answerType==='person'){
   const parts=answer.split(/\s+/).filter(Boolean),name=upperName(parts.shift()||''),surname=upperName(parts.join(' '));
   const exact=surname?exactPerson(name,surname):null;
   if(exact){
     exact.periodContexts=uniq([...(exact.periodContexts||[]),q.periodId]);
     if(q.anchorId)addRelation(q.anchorId,exact.id,'ricordo_collegato',q.periodId,q.text);
     exact.updatedAt=now();addAnswerHistory(q,answer,'person',exact.id);log('Collegata persona esistente '+upperName([exact.name,exact.surname].join(' '))+' al periodo '+periodLabel(q.periodId));
   }else{
     const cands=sameFirstCandidates(name);
     if(cands.length){
       db.mnemonic.pendingDuplicate={answer,name,surname,periodId:q.periodId,anchorId:q.anchorId||'',question:q.text,candidateIds:cands.map(x=>x.id)};
       log('Risposta ambigua: '+answer+' richiede conferma duplicato');
       saveDirect();renderAllExtensions();return;
     }
     const p=makePersonFromAnswer(answer,q.periodId,q.anchorId);db.people.push(p);
     if(q.anchorId)addRelation(q.anchorId,p.id,'ricordo_collegato',q.periodId,q.text);
     addAnswerHistory(q,answer,'person',p.id);log('Creato nuovo nominativo da domanda mnemonica: '+upperName([p.name,p.surname].join(' ')));
   }
 }else if(q.answerType==='place'){
   const rec={id:'place_'+Date.now().toString(36),name:answer,periodId:q.periodId,personId:q.anchorId||'',createdAt:now()};
   db.places.push(rec);
   if(q.anchorId){const p=db.people.find(x=>x.id===q.anchorId);if(p){p.places=uniq([...(p.places||[]),answer]);p.updatedAt=now()}}
   addAnswerHistory(q,answer,'place',q.anchorId||'');log('Aggiunto luogo/contesto: '+answer);
 }else{
   const rec={id:'mem_'+Date.now().toString(36),text:answer,periodId:q.periodId,personId:q.anchorId||'',createdAt:now()};
   db.memories.push(rec);
   if(q.anchorId){const p=db.people.find(x=>x.id===q.anchorId);if(p){p.memories=uniq([...(p.memories||[]),answer]);p.updatedAt=now()}}
   addAnswerHistory(q,answer,'memory',q.anchorId||'');log('Aggiunto ricordo: '+answer);
 }
 input.value='';db.mnemonic.current=chooseMnemonicQuestion();computeDuplicates();saveDirect();renderAll();toast('Risposta salvata · albero aggiornato');
}
function resolvePendingDuplicate(personId,createNew){
 const pd=db.mnemonic.pendingDuplicate;if(!pd)return;
 let target=null;
 if(!createNew)target=db.people.find(x=>x.id===personId)||null;
 if(target){
   target.periodContexts=uniq([...(target.periodContexts||[]),pd.periodId]);
   if(pd.anchorId)addRelation(pd.anchorId,target.id,'ricordo_collegato',pd.periodId,pd.question);
   target.updatedAt=now();log('Confermata persona esistente per la risposta '+pd.answer);
 }else{
   target=makePersonFromAnswer(pd.answer,pd.periodId,pd.anchorId);db.people.push(target);
   if(pd.anchorId)addRelation(pd.anchorId,target.id,'ricordo_collegato',pd.periodId,pd.question);
   log('Confermata nuova persona distinta: '+pd.answer);
 }
 addAnswerHistory({text:pd.question,periodId:pd.periodId},pd.answer,'person',target.id);
 db.mnemonic.pendingDuplicate=null;db.mnemonic.current=chooseMnemonicQuestion();computeDuplicates();saveDirect();renderAll();toast('Conferma salvata');
}
function mergePeople(primaryId,duplicateId){
 if(primaryId===duplicateId)return;
 const a=db.people.find(x=>x.id===primaryId),b=db.people.find(x=>x.id===duplicateId);if(!a||!b||a.id==='root'||b.id==='root')return;
 const fill=['phone','email','town','notes','category','source','firstContact','lastContact','nextContact'];
 fill.forEach(k=>{if(!a[k]&&b[k])a[k]=b[k]});
 ['periodContexts','places','memories','schools','companies','contextTags','contactDates','lifeTriggers','lifeTriggerHistory'].forEach(k=>a[k]=uniq([...(a[k]||[]),...(b[k]||[])]));
 a.influence=!!(a.influence||b.influence);
 a.touchpointHistory={...(b.touchpointHistory||{}),...(a.touchpointHistory||{})};
 a.socialSearchHistory={...(b.socialSearchHistory||{}),...(a.socialSearchHistory||{})};
 a.lifeTriggerStatus={...(b.lifeTriggerStatus||{}),...(a.lifeTriggerStatus||{})};
 a.lifeTriggerNews={...(b.lifeTriggerNews||{}),...(a.lifeTriggerNews||{})};
 db.people.forEach(p=>{if(p.parentId===b.id)p.parentId=a.id});
 db.relations=(db.relations||[]).map(r=>({...r,sourceId:r.sourceId===b.id?a.id:r.sourceId,targetId:r.targetId===b.id?a.id:r.targetId})).filter(r=>r.sourceId!==r.targetId);
 db.people=db.people.filter(x=>x.id!==b.id);try{window.F1TreeCloud?.queueDeleteLegacyIds?.([b.id])}catch(_){}a.updatedAt=now();
 log('Unificati due record persona su conferma utente: '+upperName([a.name,a.surname].join(' ')));
 computeDuplicates();saveDirect();renderAll();toast('Persone unificate');
}
function ignoreDuplicate(a,b){
 db.mnemonic.ignoredDuplicatePairs=uniq([...(db.mnemonic.ignoredDuplicatePairs||[]),pairKey(a,b)]);
 computeDuplicates();saveDirect();renderAllExtensions();toast('Segnate come persone diverse');
}
function formFields(){
 const checked=[...document.querySelectorAll('#pPeriodContexts input[type="checkbox"]:checked')].map(x=>x.value);
 return {periodContexts:checked,places:splitList(document.getElementById('pPlaces')?.value),memories:splitList(document.getElementById('pMemories')?.value),schools:splitList(document.getElementById('pSchools')?.value),companies:splitList(document.getElementById('pCompanies')?.value),contextTags:[]};
}
function loadPersonFields(p){
 const periods=new Set((p&&p.periodContexts)||[]);
 const box=document.getElementById('pPeriodContexts');
 if(box)box.innerHTML=PERIODS.map(x=>'<label class="period-check"><input type="checkbox" value="'+x.id+'" '+(periods.has(x.id)?'checked':'')+'> '+x.label+'</label>').join('');
 const map=[['pPlaces','places'],['pMemories','memories'],['pSchools','schools'],['pCompanies','companies']];
 map.forEach(([id,k])=>{const el=document.getElementById(id);if(el)el.value=((p&&p[k])||[]).join('\n')});
 renderPersonRelations(p);
}
function renderPersonRelations(p){
 const el=document.getElementById('personRelations');if(!el)return;
 if(!p||!p.id||p.id==='draft'){el.innerHTML='<span class="tip">Salva la persona per vedere i collegamenti.</span>';return}
 const rel=(db.relations||[]).filter(r=>r.sourceId===p.id||r.targetId===p.id);
 if(!rel.length){el.innerHTML='<span class="tip">Nessun collegamento contestuale aggiuntivo.</span>';return}
 el.innerHTML=rel.slice(0,20).map(r=>{
   const other=db.people.find(x=>x.id===(r.sourceId===p.id?r.targetId:r.sourceId));
   return '<button type="button" class="relation-pill" onclick="openPerson(\''+(other?other.id:'')+'\')">'+(other?esc(upperName([other.name,other.surname].join(' '))):'RELAZIONE')+' · '+esc(periodLabel(r.periodId))+'</button>';
 }).join('');
}
function renderChronology(){
 const el=document.getElementById('chronologyGraph');if(!el)return;
 const stats=periodStats();
 const unclassified=allPeople().filter(p=>!(p.periodContexts||[]).length);
 const cards=PERIODS.map(period=>{
   const list=stats[period.id]||[],weak=list.length<3;
   const names=list.slice(0,6).map(p=>'<button onclick="openPerson(\''+p.id+'\')">'+esc(upperName([p.name,p.surname].filter(Boolean).join(' ')))+'</button>').join('');
   return '<div class="period-node kind-'+period.kind+' '+(weak?'weak':'')+'"><div class="period-node-title">'+esc(period.label)+'</div><div class="period-node-count">'+list.length+' persone</div><div class="period-node-people">'+(names||'<span>ramo da sviluppare</span>')+'</div><button class="period-question" onclick="F1NetworkEngine.usePeriod(\''+period.id+'\')">PROSSIMA DOMANDA</button></div>';
 }).join('');
 el.innerHTML='<div class="chrono-root">IO</div><div class="chrono-line"></div><div class="period-grid">'+cards+'</div>'+(unclassified.length?'<div class="unclassified">DA CLASSIFICARE: '+unclassified.length+' persone già presenti</div>':'');
}
function usePeriod(id){
 const stats=periodStats(),people=stats[id]||[],period=PERIODS.find(x=>x.id===id)||PERIODS[0];
 if(!people.length)db.mnemonic.current={id:'q_'+Date.now(),periodId:id,answerType:'person',text:'Chi ricordi del periodo '+period.label+'?',anchorId:null};
 else{
   const p=people[0];db.mnemonic.current={id:'q_'+Date.now(),periodId:id,answerType:'person',text:'Chi altro ricordi attraverso '+upperName([p.name,p.surname].join(' '))+'?',anchorId:p.id};
 }
 saveDirect();renderNextQuestion();document.getElementById('mnemonicPanel')?.scrollIntoView({behavior:'smooth',block:'center'});
}
function renderNextQuestion(){
 const el=document.getElementById('mnemonicQuestion');if(!el)return;
 const q=ensureQuestion(false);
 el.textContent=q.text;
 const tag=document.getElementById('mnemonicPeriod');if(tag)tag.textContent=periodLabel(q.periodId);
 const pd=db.mnemonic.pendingDuplicate;
 const dup=document.getElementById('mnemonicDuplicateReview');
 if(dup){
   if(!pd){dup.innerHTML='';dup.style.display='none'}
   else{
     dup.style.display='block';
     const cands=(pd.candidateIds||[]).map(id=>db.people.find(x=>x.id===id)).filter(Boolean);
     dup.innerHTML='<b>SOLO TU PUOI CONFERMARE QUESTO</b><p>Hai scritto <strong>'+esc(pd.answer)+'</strong>. Esiste già un nominativo compatibile.</p><div class="dup-actions">'+cands.map(p=>'<button onclick="F1NetworkEngine.resolvePendingDuplicate(\''+p.id+'\',false)">È '+esc(upperName([p.name,p.surname].join(' ')))+'</button>').join('')+'<button onclick="F1NetworkEngine.resolvePendingDuplicate(\'\',true)">È UNA PERSONA NUOVA</button></div>';
   }
 }
}
function renderDuplicatePanel(){
 const el=document.getElementById('duplicatePanel');if(!el)return;
 const d=(db.duplicateCandidates||[])[0];
 if(!d){el.innerHTML='<div class="okline">Nessun possibile duplicato da confermare.</div>';return}
 const a=db.people.find(x=>x.id===d.a),b=db.people.find(x=>x.id===d.b);if(!a||!b)return;
 el.innerHTML='<div class="dup-score">'+Math.round(d.score*100)+'% compatibilità</div><div class="dup-pair"><b>'+esc(upperName([a.name,a.surname].join(' ')))+'</b><span>↔</span><b>'+esc(upperName([b.name,b.surname].join(' ')))+'</b></div><div class="dup-actions"><button onclick="F1NetworkEngine.mergePeople(\''+a.id+'\',\''+b.id+'\')">STESSA PERSONA</button><button onclick="F1NetworkEngine.ignoreDuplicate(\''+a.id+'\',\''+b.id+'\')">PERSONE DIVERSE</button></div>';
}
function renderNetworkKpis(){
 const el=document.getElementById('networkKpis');if(!el)return;
 const people=allPeople(),today=dayKey(),stats=periodStats();
 const links=(db.relations||[]).length+people.filter(p=>p.parentId&&p.parentId!=='root').length;
 const items=[
  ['PERSONE TOTALI',people.length],['CON TELEFONO',people.filter(p=>p.phone).length],['CON EMAIL',people.filter(p=>p.email).length],
  ['DA COMPLETARE',people.filter(p=>personCompleteness(p)<.55).length],['MAI CONTATTATE',people.filter(p=>!(p.contactDates||[]).length).length],
  ['CONTATTI OGGI',todayContactCount()],['OBIETTIVO 30',Math.min(30,todayContactCount())+'/30'],['OBIETTIVO 50',Math.min(50,todayContactCount())+'/50'],
  ['CENTRI INFLUENZA',people.filter(p=>p.influence).length],['NOTIZIE',people.filter(p=>STAGES.indexOf(p.stage)>=4).length],
  ['APPUNTAMENTI',people.filter(p=>STAGES.indexOf(p.stage)>=6).length],['COLLEGAMENTI',links],
  ['PERIODI ESPLORATI',PERIODS.filter(x=>(stats[x.id]||[]).length).length],['RAMI DA SVILUPPARE',PERIODS.filter(x=>(stats[x.id]||[]).length<3).length],
  ['DUPLICATI DA VERIFICARE',(db.duplicateCandidates||[]).length],['NUOVI NOMI OGGI',people.filter(p=>String(p.createdAt||'').slice(0,10)===today).length]
 ];
 el.innerHTML=items.map(x=>'<div class="network-kpi"><b>'+x[1]+'</b><span>'+x[0]+'</span></div>').join('');
}
function renderAutomationLog(){
 const el=document.getElementById('automationLog');if(!el)return;
 const rows=(db.automationLog||[]).slice(0,12);
 el.innerHTML=rows.length?rows.map(r=>'<div><time>'+new Date(r.at).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})+'</time><span>'+esc(r.message)+'</span></div>').join(''):'<div><span>Nessuna attività tecnica registrata.</span></div>';
}
function renderAllExtensions(){
 if(!booted)return;
 renderChronology();renderNextQuestion();renderDuplicatePanel();renderNetworkKpis();renderAutomationLog();
 const p=(typeof drawerMode!=='undefined'&&drawerMode==='edit')?db.people.find(x=>x.id===document.getElementById('personId')?.value):null;
 if(p)renderPersonRelations(p);
}
function runEngine(reason){
 migrate();
 computeDuplicates();
 ensureQuestion(false);
 if(reason==='boot'){
   log('Analizzate '+allPeople().length+' persone');
   log('Trovati '+(db.duplicateCandidates||[]).length+' possibili duplicati');
   const stats=periodStats(),weak=PERIODS.filter(x=>(stats[x.id]||[]).length<3);
   if(weak[0])log(periodLabel(weak[0].id)+' classificato come ramo incompleto');
 }
 saveDirect();renderAllExtensions();
}
function afterMutation(){
 if(!booted)return;
 clearTimeout(mutationTimer);
 mutationTimer=setTimeout(function(){computeDuplicates();db.mnemonic.current=chooseMnemonicQuestion();saveDirect();renderAllExtensions()},220);
}
function contactPriority(p){
 let score=0;
 if(p.stage==='Nome')score+=100;
 if(!(p.contactDates||[]).length)score+=80;
 if(p.nextContact&&p.nextContact<dayKey())score+=70;
 if(p.influence)score+=50;
 if(personCompleteness(p)<.55)score+=30;
 if(STAGES.indexOf(p.stage)>=4)score-=25;
 return score;
}
function bestOperationalContact(lastId){
 const people=allPeople();if(!people.length)return null;
 return people.slice().sort((a,b)=>{
   const d=contactPriority(b)-contactPriority(a);if(d)return d;
   if(a.id===lastId)return 1;if(b.id===lastId)return -1;
   return String(a.name).localeCompare(String(b.name));
 })[0]||null;
}
function focusMnemonic(){
 closeIncomingContactPop();
 document.getElementById('mnemonicPanel')?.scrollIntoView({behavior:'smooth',block:'center'});
 setTimeout(()=>document.getElementById('mnemonicAnswer')?.focus(),350);
}
function boot(){
 if(booted)return;
 booted=true;
 migrate();
 computeDuplicates();
 ensureQuestion(false);
 log('Motore automatico rete avviato');
 runEngine('boot');
}
window.F1NetworkEngine={
 DATA_VERSION,PERIODS,boot,afterMutation,renderAllExtensions,formFields,loadPersonFields,renderPersonRelations,
 saveMnemonicAnswer,resolvePendingDuplicate,mergePeople,ignoreDuplicate,usePeriod,bestOperationalContact,focusMnemonic,
 recordLog:function(message){log(message);saveDirect();renderAutomationLog()},triggerNewContactPopup:function(){try{closeCoachPopup()}catch(_){}try{openIncomingContact()}catch(_){}}
};
window.triggerNewContactPopup=function(){return window.F1NetworkEngine.triggerNewContactPopup()};
})();