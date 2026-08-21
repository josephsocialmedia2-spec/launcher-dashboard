(()=>{'use strict';
const MAIN='acqProV25',SNAP='acqProV25Snapshot',MARK='acqMobilePreflight';
const disposable=['acqDiagLog','acqProV25Errors','acqLastGoodSnapshot','acqBootFailures'];
const str=v=>v==null?'':String(v);const num=(v,d=0)=>Number.isFinite(Number(v))?Math.max(0,Number(v)):d;
function parse(k){try{const r=localStorage.getItem(k);return r?JSON.parse(r):null}catch{return null}}
function validState(s){return !!s&&typeof s==='object'&&!Array.isArray(s)}
function sanitizeContact(c,i){if(!c||typeof c!=='object')return null;return{id:str(c.id||('recovered-'+Date.now()+'-'+i)),name:str(c.name),phone:str(c.phone),address:str(c.address),source:str(c.source||'Giro zona'),note:str(c.note),outcome:str(c.outcome||'Da richiamare'),next:str(c.next||c.nextAction),date:str(c.date),ts:str(c.ts||new Date().toISOString())}}
function sanitizeZone(z){if(!z||typeof z!=='object')return null;const lat=Number(z.lat),lon=Number(z.lon);return{paese:str(z.paese||z.comune||z.zona),via:str(z.via||z.address),civico:str(z.civico),cosa:str(z.cosa||'Presidio / acquisizione'),prezzo:str(z.prezzo),segnale:str(z.segnale||'Giro zona'),lat:Number.isFinite(lat)?lat:null,lon:Number.isFinite(lon)?lon:null}}
function sanitizePublication(p){if(!p||typeof p!=='object'||!Array.isArray(p.channels))return null;return{property:str(p.property),address:str(p.address),channels:p.channels.filter(x=>x&&typeof x==='object').slice(0,50).map((c,i)=>({id:c.id??i,name:str(c.name||('Canale '+(i+1))),planned:c.planned!==false,date:str(c.date),status:str(c.status||'DA PROGRAMMARE'),url:str(c.url)}))}}
function sanitize(s){s=validState(s)?s:{};const contacts=Array.isArray(s.contacts)?s.contacts.map(sanitizeContact).filter(Boolean).slice(0,5000):[];const zones=Array.isArray(s.zones)?s.zones.map(sanitizeZone).filter(Boolean).slice(0,5000):[];const c=s.counters&&typeof s.counters==='object'?s.counters:{};const g=s.goals&&typeof s.goals==='object'?s.goals:{};return{...s,contacts,zones,zoneIndex:Math.max(0,Math.min(num(s.zoneIndex),Math.max(0,zones.length-1))),lastZone:sanitizeZone(s.lastZone),counters:{conversations:num(c.conversations),news:num(c.news)},goals:{conversations:num(g.conversations,100),news:num(g.news,20),appointments:num(g.appointments,5),properties:num(g.properties,3)},session:s.session&&typeof s.session==='object'?{active:!!s.session.active,situation:s.session.situation||null}:{active:false,situation:null},seller:s.seller&&typeof s.seller==='object'?{docs:s.seller.docs&&typeof s.seller.docs==='object'?s.seller.docs:{},pq:s.seller.pq&&typeof s.seller.pq==='object'?s.seller.pq:{}}:{docs:{},pq:{}},publication:sanitizePublication(s.publication),events:Array.isArray(s.events)?s.events.filter(x=>x&&typeof x==='object').slice(-80):[]}}
function safeWrite(k,v){try{localStorage.setItem(k,v);return true}catch(e){if(e?.name==='QuotaExceededError'||e?.name==='NS_ERROR_DOM_QUOTA_REACHED'){for(const x of disposable)try{localStorage.removeItem(x)}catch{}try{localStorage.setItem(k,v);return true}catch{}}return false}}
let action='none';try{
  let main=parse(MAIN);const snap=parse(SNAP);
  if(!validState(main)&&validState(snap?.state)){main=snap.state;action='snapshot-restored'}
  if(validState(main)){const clean=sanitize(main);if(safeWrite(MAIN,JSON.stringify(clean))){safeWrite(SNAP,JSON.stringify({ts:new Date().toISOString(),state:clean}));if(action==='none')action='normalized'}}
  else action='legacy-migration';
  safeWrite(MARK,JSON.stringify({ts:new Date().toISOString(),action,ok:true}));
}catch(e){try{localStorage.setItem(MARK,JSON.stringify({ts:new Date().toISOString(),action:'preflight-error',ok:false,error:String(e)}))}catch{}}
window.__ACQ_MOBILE_PREFLIGHT__={ok:true,action};
})();
(()=>{const s=document.createElement('script');s.src='./seller-signals-zone-v11.js?v=11';s.async=false;document.head.appendChild(s)})();
