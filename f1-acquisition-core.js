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
function contactEligible(lead){return !!(lead&&lead.telefono&&!lead.do_not_contact&&String(lead.status||'').toUpperCase()!=='NON_CONTATTARE')}
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
const W={un:1,uno:1,una:1,due:2,tre:3,quattro:4,cinque:5,sei:6,sette:7,otto:8,nove:9,dieci:10};
const norm2=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const strip=v=>String(v||'').replace(/^\s*[-#]+\s*/,'').replace(/\*\*/g,'').replace(/__+/g,'').trim();
const rows=t=>String(t||'').split(/\r?\n/).map(strip).filter(Boolean);
function value(t,labels){const a=rows(t),w=(Array.isArray(labels)?labels:[labels]).map(norm2);for(let i=0;i<a.length;i++)if(w.includes(norm2(a[i])))for(let j=i+1;j<Math.min(a.length,i+5);j++){const v=a[j];if(v&&!w.includes(norm2(v)))return v}return''}
function has(t,labels){const a=rows(t).map(norm2),w=(Array.isArray(labels)?labels:[labels]).map(norm2);return w.some(x=>a.includes(x))}
const no=v=>/^(no|assente|assenti|nessuno|nessuna|non presente|non presenti)$/.test(norm2(v));
function q(v){const s=norm2(v);return /^\d+$/.test(s)?Number(s):(W[s]||0)}
function countLine(t,words){const alts=words.map(x=>norm2(x).replace(/\s+/g,'[ \\t]+')).join('|'),re=new RegExp('\\b(\\d+|un|uno|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)[ \\t]+(?:'+alts+')\\b','i');for(const line of rows(t)){const m=norm2(line).match(re);if(m)return q(m[1])}return 0}
function fieldCount(t,labels){if(!has(t,labels))return null;const v=value(t,labels);if(no(v))return 0;const m=String(v).match(/\d+/);if(m)return Number(m[0]);return v?1:0}
function codes(input){const out=[],bad=[],seen=new Set(),re=/\b([A-Z]{1,5})\s*[:=X]\s*(\d+)\b/g;let m,s=String(input||'').toUpperCase();while((m=re.exec(s))){const k=m[1],n=Number(m[2]),tok=k+':'+n;if(seen.has(tok))continue;seen.add(tok);if(LEG[k])out.push({sigla:k,qty:n});else bad.push(tok)}return{out,bad}}
function render2(items,bad=[]){items=[...items].sort((a,b)=>ORDER.indexOf(a.sigla)-ORDER.indexOf(b.sigla));const c=items.map(x=>x.sigla+':'+x.qty),h=items.map(x=>x.qty+' '+(x.qty===1?LEG[x.sigla][0]:LEG[x.sigla][1]));if(bad.length){c.push(...bad);h.push('SIGLA NON RICONOSCIUTA: '+bad.join(', '))}return c.length?c.join(' | ')+' → '+h.join(', '):''}
window.extractComposition=function(text,fallback){
  let p=codes(text);if(!p.out.length&&!p.bad.length&&fallback)p=codes(fallback);if(p.out.length||p.bad.length)return render2(p.out,p.bad);
  const t=String(text||''),flat=norm2(t),m={};const set=(k,n)=>{n=Number(n)||0;if(n)m[k]=Math.max(m[k]||0,n)};
  const cams=fieldCount(t,['camere da letto','camere']),baths=fieldCount(t,['bagni','bagno']);if(baths>0)set('B',baths);
  const kitchen=has(t,['cucina'])?value(t,['cucina']):'';if(kitchen&&!no(kitchen)){if(norm2(kitchen).includes('angolo cottura'))set('AK',1);else set('K',1)}
  let cm=countLine(t,['camere matrimoniali','camera matrimoniale']);if(!cm&&/\bcamera matrimoniale\b/.test(flat))cm=1;
  let cs=Math.max(countLine(t,['camerette','cameretta']),countLine(t,['camere singole','camera singola']));if(!cs&&(/\bcameretta\b/.test(flat)||/\bcamera singola\b/.test(flat)))cs=1;
  if(cm)set('CM',cm);if(cs)set('CS',cs);if(cams>0){const rest=cams-(cm+cs);if(cm+cs===0)set('C',cams);else if(rest>0)set('C',rest)}
  let s=countLine(t,['soggiorni','soggiorno']);if(!s&&/\bsoggiorno\b/.test(flat))s=1;if(s)set('S',s);
  if(/\bingresso\b/.test(flat))set('I',Math.max(1,countLine(t,['ingressi','ingresso'])));if(/\bdisimpegno\b/.test(flat))set('DIS',Math.max(1,countLine(t,['disimpegni','disimpegno'])));if(/\bripostiglio\b/.test(flat))set('RIP',Math.max(1,countLine(t,['ripostigli','ripostiglio'])));
  for(const [sigla,labels,words] of [['BAL',['balcone','balconi'],['balconi','balcone']],['TERR',['terrazzo','terrazzi'],['terrazzi','terrazzo']]]){const f=fieldCount(t,labels),desc=countLine(t,words);if(f!==null){if(f>0)set(sigla,Math.max(f,desc||0))}else if(desc)set(sigla,desc)}
  const cant=fieldCount(t,['cantina','cantine']);if(cant!==null){if(cant>0)set('CANT',cant)}else{const x=countLine(t,['cantine','cantina']);if(x)set('CANT',x)}
  const giard=fieldCount(t,['giardino','giardini']);if(giard!==null){if(giard>0)set('GIARD',giard)}else{let x=countLine(t,['giardini','giardino']);if(!x&&/\bgiardino\b/.test(flat))x=1;if(x)set('GIARD',x)}
  const boxLabels=['box, posti auto','box posti auto','box'],boxHas=has(t,boxLabels),bv=boxHas?value(t,boxLabels):'';if(boxHas&&!no(bv)){const first=(String(bv).match(/\d+/)||[])[0];if(/box|garage|autorimessa/i.test(bv))set('BOX',Number(first||1));else if(/posti? auto/i.test(bv))set('PA',Number(first||1))}else if(!boxHas){let bx=countLine(t,['box','garage','autorimesse','autorimessa']);if(!bx&&/\b(autorimessa|garage|box privato|box in garage)\b/.test(flat))bx=1;if(bx)set('BOX',bx);const pa=countLine(t,['posti auto','posto auto']);if(pa)set('PA',pa)}
  return render2(ORDER.filter(k=>m[k]).map(k=>({sigla:k,qty:m[k]})));
};
})();

(function(){
'use strict';
const pathname=location.pathname.toLowerCase();
const IS_SELLER=/seller-radar-unico\.html$/.test(pathname),IS_COMPETITOR=/competitor-intelligence\.html$/.test(pathname);
if(!IS_SELLER&&!IS_COMPETITOR)return;
const text=(el,sel)=>String(el.querySelector(sel)?.textContent||'').trim();
const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
const nprice=v=>{const n=String(v||'').replace(/[^0-9]/g,'');return n?String(Number(n)):''};
function splitVia(value){const s=clean(value);const m=s.match(/^(.*?)[,\s]+(\d+[A-Za-z]?)$/);return m?{via:m[1].trim(),civico:m[2]}:{via:s,civico:''}}
function baths(value){const m=String(value||'').match(/(?:\bBAGNI\b|\bB\b)\s*[:=]\s*(\d+)|\b(\d+)\s+bagni\b/i);return m?String(m[1]||m[2]||''):''}
function addressUrl(data){const p=new URLSearchParams();for(const k of ['comune','via','civico','prezzo','tipologia','bagni','dettagli','raw']){const v=clean(data[k]);if(v)p.set(k,v.slice(0,k==='raw'?700:450))}return 'address-intelligence.html?'+p.toString()}
function sellerData(card,index){
  let t={};try{if(typeof AREA!=='undefined'&&Array.isArray(AREA))t=AREA[index]||{}}catch(_){t={}}
  const addressText=text(card,'.address'),parts=addressText.split(',').map(clean).filter(Boolean),fallbackComune=parts.length>1?parts.pop():'',fallbackVia=parts.join(', '),street=splitVia(t.via||fallbackVia),title=text(card,'.listingTitle'),price=t.prezzo||text(card,'.price'),composition=t.composta||t.composizione||'',source=t.source||text(card,'.source');
  return {comune:t.comune||fallbackComune,via:street.via,civico:street.civico,prezzo:nprice(price),tipologia:t.tipologia||t.tipo||'',bagni:baths(composition),dettagli:[composition,source,t.reason||t.lead_reason||'',t.source_url||''].filter(Boolean).join(' | '),raw:[title,addressText,text(card,'.price'),composition,source].filter(Boolean).join(' | ')};
}
function competitorData(card){
  const cardTitle=text(card,'.title'),meta=text(card,'.meta'),metaParts=meta.split(' · ').map(clean),titleParts=cardTitle.split(/\s+—\s+/),fallbackComune=titleParts.shift()||'',fallbackVia=titleParts.join(' — ');let r=null;
  try{if(typeof ROWS!=='undefined'&&Array.isArray(ROWS))r=ROWS.find(x=>{const c=clean(x.comune),v=clean(x.via),tp=clean(x.tipologia),po=clean(x.latest&&x.latest.portal);return (!c||cardTitle.includes(c))&&(!v||cardTitle.includes(v))&&(!tp||meta.includes(tp))&&(!po||meta.includes(po))})||null}catch(_){r=null}
  const latest=r&&r.latest||{},street=splitVia(r&&r.via||fallbackVia),details=[latest.surface_mq?latest.surface_mq+' mq':'',latest.portal||metaParts[1]||'',r&&r.marketCategory||'',r&&r.signal||'',latest.source_url||''].filter(Boolean).join(' | '),raw=[cardTitle,meta,details].filter(Boolean).join(' | ');
  return {comune:r&&r.comune||fallbackComune,via:street.via,civico:street.civico,prezzo:nprice(latest.asking_price||''),tipologia:r&&r.tipologia||metaParts[0]||'',bagni:baths(JSON.stringify(latest.evidence||{})),dettagli:details,raw};
}
function addButton(card,data){const actions=card.querySelector('.actions');if(!actions||actions.querySelector('.f1-address-btn'))return;const a=document.createElement('a');a.className='btn alt f1-address-btn';a.target='_blank';a.rel='noopener';a.href=addressUrl(data);a.textContent='ANALIZZA INDIRIZZO';actions.appendChild(a)}
function patch(){const list=document.getElementById('list');if(!list)return;if(IS_SELLER)[...list.querySelectorAll('.listing')].forEach((card,i)=>addButton(card,sellerData(card,i)));else [...list.querySelectorAll('.item')].forEach(card=>addButton(card,competitorData(card)))}
function start(){const list=document.getElementById('list');if(!list)return;patch();new MutationObserver(()=>patch()).observe(list,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
