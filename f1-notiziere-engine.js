(()=>{'use strict';
const VERSION='20260917-territory2';
const CLOSED=new Set(['DONE','COMPLETED','CLOSED','CANCELLED','ANNULLATO','ARCHIVED']);
let cache=null,cacheAt=0,loading=null;
const txt=v=>String(v??'').trim();
const up=v=>txt(v).toUpperCase();
const esc=v=>encodeURIComponent(txt(v));
function ready(){return !!window.F1StaffData?.ready?.()}
function civicOf(p){return txt(p?.next_civic||p?.civic_start||'')}
function openTask(t){return !CLOSED.has(up(t?.status))}
function taskHref(t){const v=up(`${t?.task_type||''} ${t?.reason||''} ${t?.outcome||''}`);if(/FIELD|TERRITOR|GIRO/.test(v))return'territory-mobile.html#terr';if(/CALL|CHIAM|PHONE|CONTATT|PROSPECT/.test(v))return'telefonate-oggi.html';if(/FOLLOW|RICHIAM/.test(v))return'oggi.html#tasks';if(/SCRIPT/.test(v))return'script.html';return'crm.html?mode=notiziere'}
function instructionFrom(state){
  const p=state?.territory?.progress||null,pending=state?.territory?.pending_news||[],summary=state?.territory?.summary||{},civic=civicOf(p);
  if(p){
    if(up(p.status)==='DA_CONSUNTIVARE'&&pending.length){const n=pending[0];return{kind:'CRM_PENDING',priority:'ALTA',title:`REGISTRA ${pending.length} DATO${pending.length===1?'':'I'} NEL CRM`,detail:`${txt(p.comune)||'Territorio'} · ${txt(p.via)||'via da verificare'} · prima di chiudere il giro`,cta:'REGISTRA ADESSO',href:`territory-mobile.html#not`,progress:p,summary,pending,nextTitle:'Chiudi il giro soltanto dopo aver registrato i dati pendenti.'}}
    if(civic){return{kind:'CIVIC',priority:'ALTA',title:`VAI AL CIVICO ${civic}`,detail:[p.comune,p.zona,p.via].map(txt).filter(Boolean).join(' · '),cta:`APRI CIVICO ${civic}`,href:'territory-mobile.html#terr',progress:p,summary,pending,nextTitle:'Dopo il salvataggio F1 ti mostrerà il prossimo civico configurato.'}}
    if(up(p.status)==='DA_CONSUNTIVARE'){return{kind:'CONSUNTIVO',priority:'NORMALE',title:'GIRO DA CONSUNTIVARE',detail:[p.comune,p.zona,p.via].map(txt).filter(Boolean).join(' · '),cta:'APRI CRM TERRITORIALE',href:'territory-mobile.html#crm',progress:p,summary,pending,nextTitle:'Dopo il consuntivo attendi la prossima assegnazione.'}}
    return{kind:'NEEDS_SEQUENCE',priority:'ALTA',title:'PERCORSO CIVICI DA CONFIGURARE',detail:'F1 non inventa il civico successivo. Serve una sequenza civici assegnata al giro.',cta:'VERIFICA ASSEGNAZIONE',href:'territory-control.html',progress:p,summary,pending,nextTitle:'Dopo la configurazione F1 riprenderà dal primo civico assegnato.'};
  }
  const task=(state?.tasks||[]).filter(openTask).sort((a,b)=>String(a.due_date||'9999').localeCompare(String(b.due_date||'9999'))||Number(b.priority||0)-Number(a.priority||0))[0];
  if(task)return{kind:'TASK',priority:'ALTA',title:txt(task.reason||task.task_type||'ATTIVITÀ ASSEGNATA').toUpperCase(),detail:`${txt(task.task_type)||'TASK'}${task.due_date?' · scadenza '+String(task.due_date).slice(0,10):''}`,cta:'APRI ATTIVITÀ',href:taskHref(task),task,nextTitle:'Registra l’esito: F1 calcolerà poi la prossima azione.'};
  return{kind:'NO_ASSIGNMENT',priority:'NORMALE',title:'NESSUNA ATTIVITÀ ASSEGNATA',detail:'Non inventare un’attività. Aggiorna i dati; se lo stato resta vuoto serve un’assegnazione F1.',cta:'AGGIORNA DATI',href:'ricerca-territoriale.html',nextTitle:'F1 mostrerà qui il prossimo ordine quando sarà assegnato.'};
}
async function load({force=false}={}){
  if(!ready())throw new Error('ACCESSO CLOUD F1 NON PRONTO');
  if(!force&&cache&&Date.now()-cacheAt<8000)return cache;
  if(loading&&!force)return loading;
  loading=(async()=>{const profile=await F1StaffData.me();const territory=await F1StaffData.rpc('f1_territory_panel_state',{});let tasks=[];if(!territory?.progress&&profile?.user_id)tasks=await F1StaffData.tasks(profile.user_id);cache={profile,territory:territory||{progress:null,summary:{},pending_news:[]},tasks:tasks||[]};cache.instruction=instructionFrom(cache);cacheAt=Date.now();window.dispatchEvent(new CustomEvent('f1:notiziere-state',{detail:cache}));return cache})().finally(()=>{loading=null});
  return loading;
}
function invalidate(){cache=null;cacheAt=0}
async function coords(){if(!navigator.geolocation)return{latitude:null,longitude:null};return new Promise(resolve=>{navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude}),()=>resolve({latitude:null,longitude:null}),{enableHighAccuracy:false,maximumAge:60000,timeout:5000})})}
async function addObservation(progressId,payload){const body={p_progress_id:progressId,p_observation_type:txt(payload.observation_type),p_detail:txt(payload.detail),p_news_type:txt(payload.news_type),p_building:txt(payload.building),p_source:txt(payload.source),p_person_name:txt(payload.person_name),p_notes:txt(payload.notes),p_status:txt(payload.status||'OSSERVAZIONE')};const r=await F1StaffData.rpc('f1_territory_guided_add_observation',body);invalidate();return r}
async function registerContact(progressId){const r=await F1StaffData.rpc('f1_territory_guided_register_contact',{p_progress_id:progressId});invalidate();return r}
async function pause(progressId,expectedCivic){const c=await coords(),r=await F1StaffData.rpc('f1_territory_guided_pause',{p_progress_id:progressId,p_expected_civic:txt(expectedCivic),p_latitude:c.latitude,p_longitude:c.longitude});invalidate();return r}
async function completeCivic(progressId,expectedCivic){const c=await coords(),r=await F1StaffData.rpc('f1_territory_guided_complete_civic',{p_progress_id:progressId,p_expected_civic:txt(expectedCivic),p_latitude:c.latitude,p_longitude:c.longitude});invalidate();return r}
function mapUrl(progress){const civic=civicOf(progress),q=[progress?.via,civic,progress?.comune,progress?.zona].map(txt).filter(Boolean).join(' ');return q?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q):'https://www.google.com/maps'}
const PERSON_OUTCOMES={
  INFO:{status:'DA_VERIFICARE',next_action:'VERIFICA INFORMAZIONE',task_type:'VERIFY'},
  CALLBACK:{status:'RICHIAMO',next_action:'RICHIAMA',task_type:'FOLLOW_UP',needs_date:true},
  REFERRAL:{status:'DA_VERIFICARE',next_action:'VERIFICA SEGNALAZIONE',task_type:'FOLLOW_UP'},
  SELL:{status:'DA_VERIFICARE',next_action:'VERIFICA ESIGENZA DI VENDITA',task_type:'VERIFY'},
  BUY:{status:'DA_ANALIZZARE',next_action:'VERIFICA ESIGENZA DI ACQUISTO',task_type:'VERIFY'},
  DNC:{status:'NON_CONTATTARE',next_action:'NON CONTATTARE',task_type:'',do_not_contact:true},
  PARTIAL:{status:'DA_ANALIZZARE',next_action:'VERIFICA DATI',task_type:'VERIFY'},
  OTHER:{status:'DA_ANALIZZARE',next_action:'VERIFICA NOTA',task_type:'VERIFY'}
};
function personRule(outcome,date=''){const r={...(PERSON_OUTCOMES[up(outcome)]||PERSON_OUTCOMES.OTHER)};if(r.needs_date){if(!txt(date))throw new Error('INDICA LA DATA DEL RICHIAMO');r.next_action=`RICHIAMA IL ${txt(date)}`;r.next_action_date=txt(date)}return r}
window.F1NotiziereEngine={version:VERSION,ready,load,invalidate,instructionFrom,civicOf,mapUrl,addObservation,registerContact,pause,completeCivic,personRule,PERSON_OUTCOMES};
})();
