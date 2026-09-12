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
  const hay=norm([signal.seller_signal,signal.lead_reason,signal.category,signal.reason,signal.priorita,signal.status,signal.source_type,signal.listing_status].filter(Boolean).join(' '));
  const flags=[];let eventType='PROPERTY_FIRST_SEEN',taskType='VERIFY',reason='Annuncio di mercato da classificare obbligatoriamente nel CRM',coreCategory='',marketCategory='MARKET_LISTING',pillar=1;
  const explicitFsbo=/\bfsbo\b|vendita privata|trattativa privata/.test(hay);
  const privateCandidate=/indizio privat|(^|\s)privato(\s|$)|no agenzi|no intermediari|market_signal/.test(hay);
  const explicitExpired=/incarico scaduto|mandato scaduto|expired verified|expired_verified/.test(hay);
  const expiredCandidate=/invendut|possibile scadut|ritirat|non piu rilevat|cambio agenz|ripubblic|relist/.test(hay);
  const competitor=/indizio agenz|agenzia concorrente|competitor/.test(hay);
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
function marketCategory(lead){const t=String(lead?.source_type||'').toUpperCase(),r=String(lead?.lead_reason||'').toUpperCase();if(t==='COMPETITOR_LISTING'||/CONCORRENZA|INDIZIO_AGENZIA|COMPETITOR/.test(r))return'COMPETITOR_LISTING';if(t==='EXPIRED_VERIFIED'||/EXPIRED_VERIFIED|INCARICO_SCADUTO_VERIFICATO/.test(r))return'EXPIRED_VERIFIED';if(t==='EXPIRED_CANDIDATE'||/POSSIBILE_SCADUTO|NON_PIU_RILEVATO|CAMBIO_AGENZIA|RIPUBBLICATO/.test(r))return'EXPIRED_CANDIDATE';if(t==='FSBO')return'FSBO';if(t==='FSBO_CANDIDATE'||t==='MARKET_SIGNAL'||/INDIZIO_PRIVATO/.test(r))return'FSBO_CANDIDATE';if(t==='MARKET_LISTING')return'MARKET_LISTING';return''}
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
function installMarketCrmOptions(){const el=document.getElementById('fType');if(!el)return;for(const value of ['COMPETITOR_LISTING','MARKET_LISTING','FSBO_CANDIDATE','EXPIRED_CANDIDATE','EXPIRED_VERIFIED']){if(![...el.options].some(o=>o.value===value)){const o=document.createElement('option');o.value=value;o.textContent=value;el.appendChild(o)}}}
installMarketCrmOptions();
window.F1AcquisitionCore={CONFIG_URL,TERRITORY_URL,PUBLIC_FEED_URL,TASK_CACHE_KEY,LEAD_CACHE_KEY,norm,todayRome,nowIso,fetchJson,loadConfig,territoryCommunes,territorySet,inTerritory,territorySide,territoryRank,territoryDirective,clampScore,scoreOpportunity,classifySignal,coreCategory,marketCategory,contactEligible,localTasks,localLeads,saveLocalTasks,saveLocalLeads,mergeTasks,taskIdentity,taskIsOpen,isDue,loadPublicFeed,funnelFromLeads,installMarketCrmOptions};
})();

(function(){
'use strict';
if(!/seller-radar-unico\.html$/i.test(location.pathname))return;
const LEG={S:['soggiorno','soggiorni'],K:['cucina separata','cucine separate'],AK:['angolo cottura','angoli cottura'],C:['camera','camere'],CM:['camera matrimoniale','camere matrimoniali'],CS:['camera singola/cameretta','camere singole/camerette'],B:['bagno','bagni'],WC:['servizio igienico','servizi igienici'],I:['ingresso','ingressi'],DIS:['disimpegno','disimpegni'],RIP:['ripostiglio','ripostigli'],BAL:['balcone','balconi'],TERR:['terrazzo','terrazzi'],CANT:['cantina','cantine'],BOX:['box/autorimessa','box/autorimesse'],PA:['posto auto','posti auto'],GIARD:['giardino','giardini']};
const ORDER=['S','K','AK','C','CM','CS','B','WC','I','DIS','RIP','BAL','TERR','CANT','BOX','PA','GIARD'];
const WORD_NUM={un:1,uno:1,una:1,due:2,tre:3,quattro:4,cinque:5,sei:6,sette:7,otto:8,nove:9,dieci:10};
function n(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function strip(s){return String(s||'').replace(/^\s*[-#]+\s*/,'').replace(/\*\*/g,'').replace(/__+/g,'').trim()}
function lines(text){return String(text||'').split(/\r?\n/).map(strip).filter(Boolean)}
function val(text,labels){const ls=lines(text),wanted=(Array.isArray(labels)?labels:[labels]).map(n);for(let i=0;i<ls.length;i++){if(wanted.includes(n(ls[i]))){for(let j=i+1;j<Math.min(ls.length,i+5);j++){const v=ls[j].trim();if(v&&!wanted.includes(n(v)))return v}}}return''}
function qty(v){const s=n(v);return /^\d+$/.test(s)?Number(s):(WORD_NUM[s]||0)}
function explicitCount(text,words){const lineNorm=String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\n]+/g,' '),alts=words.map(w=>n(w).replace(/\s+/g,'[ \\t]+')).join('|'),re=new RegExp('\\b(\\d+|un|uno|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)[ \\t]+(?:'+alts+')\\b','i'),m=lineNorm.match(re);return m?qty(m[1]):0}
function yes(text,labels){return/^(si|presente|yes)$/.test(n(val(text,labels)))}
function numField(text,labels){const m=String(val(text,labels)||'').match(/\d+/);return m?Number(m[0]):0}
function add(map,k,q){q=Number(q)||0;if(q)map[k]=q}
function parseCodes(input){const found=[],unknown=[],seen=new Set(),re=/\b([A-Z]{1,5})\s*[:=X]\s*(\d+)\b/g;let m,text=String(input||'').toUpperCase();while((m=re.exec(text))){const sigla=m[1],qty=Number(m[2]),token=sigla+':'+qty;if(seen.has(token))continue;seen.add(token);if(LEG[sigla])found.push({sigla,qty});else unknown.push(token)}return{found,unknown}}
function render(parts){const sorted=[...parts.found].sort((a,b)=>ORDER.indexOf(a.sigla)-ORDER.indexOf(b.sigla)),codes=sorted.map(x=>`${x.sigla}:${x.qty}`),human=sorted.map(({sigla,qty})=>`${qty} ${qty===1?LEG[sigla][0]:LEG[sigla][1]}`);if(parts.unknown.length){codes.push(...parts.unknown);human.push('SIGLA NON RICONOSCIUTA: '+parts.unknown.join(', '))}return codes.length?codes.join(' | ')+' → '+human.join(', '):''}
function natural(text){const raw=String(text||''),flat=n(raw),m={};const bagni=numField(raw,['bagni','bagno']);if(bagni)add(m,'B',bagni);const camere=numField(raw,['camere da letto','camere']);const cucina=n(val(raw,['cucina']));if(cucina.includes('angolo cottura'))add(m,'AK',1);else if(cucina.includes('cucina'))add(m,'K',1);let cm=explicitCount(raw,['camere matrimoniali','camera matrimoniale']);if(!cm&&/\bcamera matrimoniale\b/.test(flat))cm=1;let cs=Math.max(explicitCount(raw,['camerette','cameretta']),explicitCount(raw,['camere singole','camera singola']));if(!cs&&(/\bcameretta\b/.test(flat)||/\bcamera singola\b/.test(flat)))cs=1;if(cm)add(m,'CM',cm);if(cs)add(m,'CS',cs);if(camere&&!cm&&!cs)add(m,'C',camere);let sog=explicitCount(raw,['soggiorni','soggiorno']);if(!sog&&/\bsoggiorno\b/.test(flat))sog=1;if(sog)add(m,'S',sog);if(/\bingresso\b/.test(flat))add(m,'I',Math.max(1,explicitCount(raw,['ingressi','ingresso'])));if(/\bdisimpegno\b/.test(flat))add(m,'DIS',Math.max(1,explicitCount(raw,['disimpegni','disimpegno'])));if(/\bripostiglio\b/.test(flat))add(m,'RIP',Math.max(1,explicitCount(raw,['ripostigli','ripostiglio'])));let bal=explicitCount(raw,['balconi','balcone']);if(!bal&&yes(raw,['balcone','balconi']))bal=1;else if(!bal&&/\bbalcone\b/.test(flat))bal=1;if(bal)add(m,'BAL',bal);let terr=explicitCount(raw,['terrazzi','terrazzo']);if(!terr&&yes(raw,['terrazzo','terrazzi']))terr=1;else if(!terr&&/\bterrazzo\b/.test(flat))terr=1;if(terr)add(m,'TERR',terr);let cant=explicitCount(raw,['cantine','cantina']);if(!cant&&/\bcantina\b/.test(flat))cant=1;if(cant)add(m,'CANT',cant);const boxField=val(raw,['box, posti auto','box posti auto','box']);let box=0,pa=0;if(boxField){const q=(String(boxField).match(/\d+/)||[])[0];if(/box|garage|autorimessa/i.test(boxField))box=Number(q||1);if(/posto auto/i.test(boxField))pa=Number(q||1)}box=Math.max(box,explicitCount(raw,['box','garage','autorimesse','autorimessa']));if(!box&&/\b(autorimessa|garage|box privato|box in garage)\b/.test(flat))box=1;if(box)add(m,'BOX',box);if(pa)add(m,'PA',pa);let giard=explicitCount(raw,['giardini','giardino']);if(!giard&&/\bgiardino\b/.test(flat))giard=1;if(giard)add(m,'GIARD',giard);return ORDER.filter(k=>m[k]).map(k=>({sigla:k,qty:m[k]}))}
window.extractComposition=function(text,fallback){const raw=String(text||''),parsed=parseCodes(raw);if(parsed.found.length||parsed.unknown.length)return render(parsed);const fb=parseCodes(fallback);if(fb.found.length||fb.unknown.length)return render(fb);const nat=natural(raw);if(nat.length)return render({found:nat,unknown:[]});return String(fallback||'').trim()};
})();
