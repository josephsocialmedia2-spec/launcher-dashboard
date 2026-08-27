(function(){
const CFG=window.F1_SUPABASE||{},LOCAL='f1FieldVisits';
function local(){try{let d=JSON.parse(localStorage.getItem(LOCAL)||'[]');return Array.isArray(d)?d:[]}catch(e){return []}}
function save(a){localStorage.setItem(LOCAL,JSON.stringify(a))}
function ready(){return !!(window.F1Sync&&F1Sync.ready()&&CFG.visitsTable)}
async function request(path,opt={}){let token=await F1Sync.authToken(),res=await fetch(CFG.url.replace(/\/$/,'')+'/rest/v1/'+path,{...opt,headers:{'apikey':CFG.anonKey,'Authorization':'Bearer '+token,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation',...(opt.headers||{})}});if(!res.ok)throw new Error('Supabase visits '+res.status+': '+await res.text());let t=await res.text();return t?JSON.parse(t):null}
function row(v){return {id:String(v.id),visit_date:v.date,comune:v.comune||'',where_text:v.where||'',action:v.action||'',occurred_at:v.ts||new Date().toISOString(),device_id:F1Sync.deviceId(),deleted:false}}
function from(r){return {id:r.id,date:r.visit_date,comune:r.comune||'',where:r.where_text||'',action:r.action||'',ts:r.occurred_at||new Date().toISOString()}}
async function pushOne(v){if(!ready())return false;await request(CFG.visitsTable+'?on_conflict=id',{method:'POST',body:JSON.stringify([row(v)])});return true}
async function pull(){if(!ready())return local();let rows=await request(CFG.visitsTable+'?select=*&order=occurred_at.asc'),m=new Map();[...local(),...(rows||[]).filter(r=>!r.deleted).map(from)].forEach(v=>{let old=m.get(v.id);if(!old||String(v.ts||'')>String(old.ts||''))m.set(v.id,v)});let a=[...m.values()].sort((x,y)=>String(x.ts||'').localeCompare(String(y.ts||'')));save(a);return a}
async function syncAll(){if(!ready())return {cloud:false,count:local().length};for(const v of local())await pushOne(v);let a=await pull();return {cloud:true,count:a.length}}
window.F1FieldSync={ready,pushOne,pull,syncAll,local};
})();
