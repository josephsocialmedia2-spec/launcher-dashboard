(function(){
'use strict';

const CONFIG_URL='./config/acquisition-engine.json';
const TERRITORY_URL='./config/territory.json';
const PUBLIC_FEED_URL='./data/acquisition-public.json';
const TASK_CACHE_KEY='f1AcquisitionTasksV1';
const LEAD_CACHE_KEY='f1AcquisitionLeadsV1';
let configPromise=null;

function norm(value){return String(value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,"'").replace(/\s+/g,' ')}
function safeParse(value,fallback){try{return JSON.parse(value)}catch(_){return fallback}}
async function fetchJson(url){const res=await fetch(url+(url.includes('?')?'&':'?')+'v='+Date.now(),{cache:'no-store'});if(!res.ok)throw new Error(`${url}: HTTP ${res.status}`);return res.json()}
function todayRome(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date())}
function nowIso(){return new Date().toISOString()}
async function loadConfig(){if(!configPromise)configPromise=Promise.all([fetchJson(CONFIG_URL),fetchJson(TERRITORY_URL)]).then(([engine,territory])=>({engine,territory}));return configPromise}
function territoryCommunes(territory){const all=[territory.reference_hub,...(territory.sinistra||[]),...(territory.destra||[])],seen=new Set();return all.filter(Boolean).filter(x=>{const k=norm(x);if(seen.has(k))return false;seen.add(k);return true})}
function territorySet(territory){return new Set(territoryCommunes(territory).map(norm))}
function inTerritory(comune,territory){return territorySet(territory).has(norm(comune))}
function territorySide(comune,territory){const c=norm(comune),hub=norm(territory?.reference_hub);if(!c)return'';if(c===hub)return'CENTRO';if(new Set((territory?.sinistra||[]).map(norm)).has(c))return'SINISTRA';if(new Set((territory?.destra||[]).map(norm)).has(c))return'DESTRA';return'FUORI_TERRITORIO'}
function territoryRank(comune,territory){const c=norm(comune),all=territoryCommunes(territory).map(norm),i=all.indexOf(c);return i<0?9999:i}
function territoryDirective(territory){return{hub:territory?.reference_hub||'',policy:territory?.policy||'',mandatory:territory?.mandatory_rules||{},coverage:territory?.market_coverage||{}}}
function clampScore(value){return Math.max(0,Math.min(100,Math.round(Number(value)||0)))}
function scoreOpportunity(flags,engine,base=0){const rules=(engine&&engine.scoring)||{};let total=Number(base)||0;for(const flag of flags||[])total+=Number(rules[flag]||0);return clampScore(total)}

function classifySignal(signal){
  const hay=norm([signal.seller_signal,signal.lead_reason,signal.category,signal.reason,signal.priorita,signal.status,signal.source_type,signal.listing_status,signal.source].filter(Boolean).join(' '));
  const flags=[];let eventType='PROPERTY_FIRST_SEEN',taskType='MONITOR',reason='Annuncio di mercato registrato nel CRM e da monitorare',coreCategory='',marketCategory='COMPETITOR_LISTING',pillar=1;
  const explicitFsbo=/\bfsbo\b|vendita privata|trattativa privata/.test(hay);
  const privateCandidate=/indizio privat|(^|\s)privato(\s|$)|no agenzi|no intermediari|market_signal/.test(hay);
  const explicitExpired=/incarico scaduto|mandato scaduto|expired verified|expired_verified/.test(hay);
  const expiredCandidate=/invendut|possibile scadut|ritirat|non piu rilevat|cambio agenz|ripubblic|relist/.test(hay);
  const competitor=/indizio agenz|agenzia|competitor|immobiliare\.it|idealista|casa\.it/.test(hay);
  if(explicitFsbo){eventType='FSBO_FOUND';taskType='CALL';reason='FSBO / vendita privata con evidenza esplicita';coreCategory='FSBO';marketCategory='FSBO';flags.push('FSBO_NEW');if(/no agenzi|no intermediari/.test(hay))flags.push('NO_AGENCIES')}
  else if(privateCandidate){eventType='FSBO_CANDIDATE_FOUND';taskType='VERIFY';reason='Indizio di vendita privata da verificare';coreCategory='FSBO_CANDIDATE';marketCategory='FSBO_CANDIDATE';flags.push('FSBO_NEW');if(/no agenzi|no intermediari/.test(hay))flags.push('NO_AGENCIES')}
  else if(explicitExpired){eventType='EXPIRED_VERIFIED';taskType='VERIFY';reason='Incarico scaduto con evidenza esplicita: verificare contattabilità';coreCategory='EXPIRED_OR_POSSIBLE_EXPIRED';marketCategory='EXPIRED_VERIFIED';flags.push('EXPIRED_CANDIDATE')}
  else if(expiredCandidate){eventType=/cambio agenz/.test(hay)?'PROPERTY_AGENCY_CHANGED':/ripubblic|relist/.test(hay)?'PROPERTY_RELISTED':'EXPIRED_CANDIDATE_FOUND';taskType='VERIFY';reason='Possibile scaduto / stato incarico da verificare';coreCategory='EXPIRED_OR_POSSIBLE_EXPIRED';marketCategory='EXPIRED_CANDIDATE';flags.push('EXPIRED_CANDIDATE');if(/cambio agenz/.test(hay))flags.push('AGENCY_CHANGE');if(/ripubblic|relist/.test(hay))flags.push('RELISTED')}
  else if(/ribasso|price/.test(hay)){eventType='PROPERTY_PRICE_CHANGED';taskType='MONITOR';reason='Variazione prezzo registrata: continua monitoraggio concorrenza';marketCategory='COMPETITOR_LISTING';flags.push('PRICE_DROP');if(/multiplo|piu ribassi|multiple/.test(hay))flags.push('MULTIPLE_PRICE_DROPS')}
  else if(competitor){eventType='COMPETITOR_LISTING_FOUND';taskType='MONITOR';reason='Annuncio di agenzia concorrente registrato nel CRM';marketCategory='COMPETITOR_LISTING';flags.push('COMPETITOR_LISTING')}
  else if(/cliente passat/.test(hay)){pillar=2;eventType='PAST_CLIENT_DUE';taskType='CALL';reason='Cliente passato da ricontattare';coreCategory='PAST_CLIENT';marketCategory='';flags.push('PAST_CLIENT')}
  else if(/centro di influenza|\bcoi\b/.test(hay)){pillar=2;eventType='COI_DUE';taskType='CALL';reason='Centro di influenza da contattare';coreCategory='COI';marketCategory=''}
  else if(/referral|segnalazion/.test(hay)){pillar=2;eventType='REFERRAL_RECEIVED';taskType='FOLLOW_UP';reason='Referral da lavorare';marketCategory='';flags.push('REFERRAL')}
  else if(/richiamo|callback/.test(hay)){eventType='CALLBACK_DUE';taskType='CALL';reason='Richiamo scaduto';marketCategory='';flags.push('OVERDUE_CALLBACK')}
  else if(/website|inbound|agentpricing|modulo/.test(hay)){pillar=4;eventType='WEBSITE_LEAD';taskType='CALL';reason='Lead inbound';marketCategory='';flags.push('INBOUND_LEAD')}
  return{pillar,eventType,taskType,reason,coreCategory,marketCategory,flags};
}

function coreCategory(lead){const t=String(lead?.source_type||'').toUpperCase(),r=String(lead?.lead_reason||'').toUpperCase();if(t==='PAST_CLIENT'||r.includes('PAST_CLIENT'))return'PAST_CLIENT';if(t==='COI'||r.includes('COI'))return'COI';if(t==='FSBO'||/\bFSBO\b/.test(r))return'FSBO';if(t==='EXPIRED_CANDIDATE'||t==='EXPIRED_VERIFIED'||/SCADUT|EXPIRED|NON_PIU_RILEVATO|CAMBIO_AGENZIA/.test(r))return'EXPIRED_OR_POSSIBLE_EXPIRED';if(t==='MARKET_SIGNAL'||t==='FSBO_CANDIDATE'||/INDIZIO_PRIVATO/.test(r))return'FSBO_CANDIDATE';return''}
function marketCategory(lead){const t=String(lead?.source_type||'').toUpperCase(),r=String(lead?.lead_reason||'').toUpperCase();if(t==='COMPETITOR_LISTING'||/CONCORRENZA|INDIZIO_AGENZIA|COMPETITOR/.test(r))return'COMPETITOR_LISTING';if(t==='EXPIRED_VERIFIED'||/EXPIRED_VERIFIED|INCARICO_SCADUTO_VERIFICATO/.test(r))return'EXPIRED_VERIFIED';if(t==='EXPIRED_CANDIDATE'||/POSSIBILE_SCADUTO|NON_PIU_RILEVATO|CAMBIO_AGENZIA|RIPUBBLICATO/.test(r))return'EXPIRED_CANDIDATE';if(t==='FSBO')return'FSBO';if(t==='FSBO_CANDIDATE'||t==='MARKET_SIGNAL'||/INDIZIO_PRIVATO/.test(r))return'FSBO_CANDIDATE';return''}
function contactEligible(lead){if(!lead||!lead.telefono||lead.do_not_contact||String(lead.status||'').toUpperCase()==='NON_CONTATTARE')return false;return['VERIFICATO_OK','NON_APPLICABILE','OK','VERIFICATO'].includes(String(lead.rpo_status||'').toUpperCase())}
function localList(key){const value=safeParse(localStorage.getItem(key)||'[]',[]);return Array.isArray(value)?value:[]}
function saveLocalList(key,rows){localStorage.setItem(key,JSON.stringify(rows))}
function localTasks(){return localList(TASK_CACHE_KEY)}function localLeads(){return localList(LEAD_CACHE_KEY)}function saveLocalTasks(rows){saveLocalList(TASK_CACHE_KEY,rows)}function saveLocalLeads(rows){saveLocalList(LEAD_CACHE_KEY,rows)}
function taskIdentity(task){return String(task.task_id||task.id||[task.event_type||'',task.task_type||'',task.property_id||'',task.lead_id||'',task.source_url||'',task.reason||''].join('|'))}
function mergeTasks(...collections){const map=new Map();collections.flat().filter(Boolean).forEach(task=>{const key=taskIdentity(task),old=map.get(key);if(!old||String(task.updated_at||task.created_at||'')>=String(old.updated_at||old.created_at||''))map.set(key,task)});return[...map.values()].sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0)||String(a.due_date||'').localeCompare(String(b.due_date||'')))}
function taskIsOpen(task){return!['DONE','CANCELLED'].includes(String(task.status||'OPEN').toUpperCase())}
function isDue(task){if(!taskIsOpen(task))return false;if(!task.due_date)return true;return String(task.due_date).slice(0,10)<=todayRome()}
async function loadPublicFeed(){try{return await fetchJson(PUBLIC_FEED_URL)}catch(e){return{generated_at:null,tasks:[],events:[],summary:{},error:String(e)}}}
function funnelFromLeads(leads){const counts={LEAD:0,CONTATTO:0,APPUNTAMENTO:0,VALUTAZIONE:0,INCARICO:0,VENDUTO:0};for(const lead of leads||[]){counts.LEAD++;const s=String(lead.status||lead.outcome||'').toUpperCase();if(/CONTATT|RICHIAM|APPUNT|VALUTAZ|INCARIC|ACQUISIT|VENDUT/.test(s))counts.CONTATTO++;if(/APPUNT|VALUTAZ|INCARIC|ACQUISIT|VENDUT/.test(s))counts.APPUNTAMENTO++;if(/VALUTAZ|INCARIC|ACQUISIT|VENDUT/.test(s))counts.VALUTAZIONE++;if(/INCARIC|ACQUISIT|VENDUT/.test(s))counts.INCARICO++;if(/VENDUT/.test(s))counts.VENDUTO++}return counts}
window.F1AcquisitionCore={CONFIG_URL,TERRITORY_URL,PUBLIC_FEED_URL,TASK_CACHE_KEY,LEAD_CACHE_KEY,norm,todayRome,nowIso,fetchJson,loadConfig,territoryCommunes,territorySet,inTerritory,territorySide,territoryRank,territoryDirective,clampScore,scoreOpportunity,classifySignal,coreCategory,marketCategory,contactEligible,localTasks,localLeads,saveLocalTasks,saveLocalLeads,mergeTasks,taskIdentity,taskIsOpen,isDue,loadPublicFeed,funnelFromLeads};
})();
