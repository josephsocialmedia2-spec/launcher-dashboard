(()=>{'use strict';
const VERSION='20260917-cash1';
let cache=null,cacheAt=0,loading=null;
const txt=v=>String(v??'').trim();
const num=v=>Number(v||0);
const up=v=>txt(v).toUpperCase();
const CLOSED=new Set(['PERSO','NON_INTERESSATO']);
function ready(){return !!window.F1StaffData?.ready?.()}
function money(v){return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(num(v))}
function dateTime(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d)}
function human(v){return txt(v).replaceAll('_',' ').toLowerCase().replace(/^./,m=>m.toUpperCase())}
async function coords(){if(!navigator.geolocation)return{latitude:null,longitude:null,gps_accuracy:null};return new Promise(resolve=>navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,gps_accuracy:p.coords.accuracy}),()=>resolve({latitude:null,longitude:null,gps_accuracy:null}),{enableHighAccuracy:false,maximumAge:60000,timeout:5000}))}
async function products(){return F1StaffData.rest('f1_cash_products?select=*&active=eq.true&order=sort_order.asc,name.asc')}
async function allProducts(){return F1StaffData.rest('f1_cash_products?select=*&order=sort_order.asc,name.asc')}
async function load({scope='ME',force=false}={}){
 if(!ready())throw new Error('ACCESSO CLOUD F1 NON PRONTO');
 if(!force&&cache&&Date.now()-cacheAt<6000)return cache;
 if(loading&&!force)return loading;
 loading=(async()=>{const [profile,state,conversions,opportunities,productRows]=await Promise.all([F1StaffData.me(),F1StaffData.rpc('f1_cash_dashboard_state',{p_scope:scope}),F1StaffData.rpc('f1_cash_conversion_stats',{p_scope:scope}),F1StaffData.rpc('f1_cash_list_opportunities',{p_limit:250,p_stage:''}),products()]);cache={profile,state:state||{},conversions:conversions||{},opportunities:Array.isArray(opportunities)?opportunities:[],products:productRows||[],scope};cacheAt=Date.now();window.dispatchEvent(new CustomEvent('f1:cash-state',{detail:cache}));return cache})().finally(()=>loading=null);
 return loading;
}
function invalidate(){cache=null;cacheAt=0}
async function territory(){return F1StaffData.rpc('f1_territory_panel_state',{})}
async function createProspect(payload={}){const gps=await coords();const body={...payload,latitude:payload.latitude??gps.latitude,longitude:payload.longitude??gps.longitude,gps_accuracy:payload.gps_accuracy??gps.gps_accuracy};const r=await F1StaffData.rpc('f1_cash_create_prospect',{p_payload:body});invalidate();return r}
async function outcome(opportunityId,outcomeCode,note='',nextAt=null){const r=await F1StaffData.rpc('f1_cash_record_outcome',{p_opportunity_id:opportunityId,p_outcome:up(outcomeCode),p_note:txt(note),p_next_at:nextAt||null});invalidate();return r}
async function offer(opportunityId,productId,proposedValue,acceptedValue=null,followupAt=null){const r=await F1StaffData.rpc('f1_cash_set_offer',{p_opportunity_id:opportunityId,p_product_id:productId||null,p_proposed_value:num(proposedValue),p_accepted_value:acceptedValue===''||acceptedValue==null?null:num(acceptedValue),p_followup_at:followupAt||null});invalidate();return r}
async function payment(opportunityId,amount,receivedAt=null,method='',note=''){const r=await F1StaffData.rpc('f1_cash_record_payment',{p_opportunity_id:opportunityId,p_amount:num(amount),p_received_at:receivedAt||new Date().toISOString(),p_method:txt(method),p_note:txt(note)});invalidate();return r}
async function production(opportunityId,stage,dueAt=null,note=''){const r=await F1StaffData.rpc('f1_cash_update_production',{p_opportunity_id:opportunityId,p_stage:up(stage),p_due_at:dueAt||null,p_note:txt(note)});invalidate();return r}
async function closeDay(){const r=await F1StaffData.rpc('f1_cash_close_day',{});invalidate();return r}
async function updateGoal(amount,targetDate=''){const r=await F1StaffData.rpc('f1_cash_update_goal',{p_amount:num(amount),p_target_date:targetDate||null});invalidate();return r}
async function upsertProduct(p={}){const r=await F1StaffData.rpc('f1_cash_upsert_product',{p_product_id:p.product_id||null,p_name:txt(p.name),p_target_price:num(p.target_price),p_price_min:num(p.price_min),p_price_max:p.price_max===''||p.price_max==null?null:num(p.price_max),p_content:txt(p.content),p_duration:txt(p.duration),p_payment_terms:txt(p.payment_terms),p_delivery_time:txt(p.delivery_time),p_estimated_margin:p.estimated_margin===''||p.estimated_margin==null?null:num(p.estimated_margin),p_active:p.active!==false,p_sort_order:Number(p.sort_order||100)});invalidate();return r}
async function history(leadId,limit=20){if(!leadId)return[];return F1StaffData.rest('interactions?lead_id=eq.'+encodeURIComponent(leadId)+'&select=interaction_type,direction,outcome,note,next_action,next_action_date,occurred_at,metadata&order=occurred_at.desc&limit='+Math.max(1,Math.min(Number(limit||20),100)))}
function telHref(phone){const p=txt(phone).replace(/[^0-9+]/g,'');return p?'tel:'+p:''}
function waHref(phone){const p=txt(phone).replace(/\D/g,'');return p?'https://wa.me/'+p:''}
function issuePhrase(issue){const map={SOCIAL_ABBANDONATI:'i social sembrano poco aggiornati',POCHE_FOTO:'la presenza online mostra poche fotografie',FOTO_SCARSE:'le immagini online potrebbero essere migliorate',NESSUN_VIDEO:'non ho trovato contenuti video evidenti',GOOGLE_DA_SISTEMARE:'la presenza Google potrebbe meritare una verifica',SITO_DA_MIGLIORARE:'il sito potrebbe meritare un aggiornamento',EVENTO_DA_PROMUOVERE:'potrebbe esserci un evento da promuovere',PUBBLICITA_DA_MIGLIORARE:'la pubblicità digitale potrebbe essere verificata',NESSUNA_PRESENZA_DIGITALE_EVIDENTE:'non ho trovato una presenza digitale evidente'};return map[up(issue)]||''}
function conversationGuide(o={}){const verified=['OSSERVATO','DICHIARATO','VERIFICATO'].includes(up(o.evidence_kind)),phrase=issuePhrase(o.observed_issue);const opening=verified&&phrase?`Buongiorno, sto lavorando con attività della zona sulla comunicazione digitale. Ho notato che ${phrase}. Posso chiederle chi segue oggi questa parte?`:'Buongiorno, sto lavorando con attività della zona sulla comunicazione digitale. Posso chiederle chi segue oggi questa parte e se avete qualcosa che vorreste migliorare?';return{why:verified&&phrase?`Segnale registrato come ${human(o.evidence_kind)}: ${phrase}.`:'Il bisogno non è verificato: non presentarlo come un problema certo.',objective:'Capire se esiste un bisogno reale e chi prende la decisione. Non vendere subito un pacchetto.',opening,nextQuestion:'Qual è oggi la parte della vostra comunicazione che vi porta via più tempo o che vorreste migliorare?',microGoal:'Ottieni un esito concreto: referente, interesse, richiamo, appuntamento oppure no.'}}
function nextNeedsDate(code){return['RICHIAMARE','APPUNTAMENTO','FOLLOW_UP'].includes(up(code))}
function active(o){return o&&!CLOSED.has(up(o.stage))}
window.F1CashEngine={version:VERSION,ready,load,invalidate,products,allProducts,territory,createProspect,outcome,offer,payment,production,closeDay,updateGoal,upsertProduct,history,coords,money,dateTime,human,telHref,waHref,conversationGuide,nextNeedsDate,active};
})();