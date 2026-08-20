(function(){
const CFG=window.F1_SUPABASE||{};
const LOCAL_KEY='f1CRMContacts';
const DEVICE_KEY='f1DeviceId';
function deviceId(){let id=localStorage.getItem(DEVICE_KEY);if(!id){id='dev-'+crypto.randomUUID();localStorage.setItem(DEVICE_KEY,id)}return id}
function ready(){return !!(CFG.url&&CFG.anonKey)}
function headers(extra={}){return {'apikey':CFG.anonKey,'Authorization':'Bearer '+CFG.anonKey,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation',...extra}}
function local(){try{let d=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]');return Array.isArray(d)?d:[]}catch(e){return []}}
function saveLocal(arr){localStorage.setItem(LOCAL_KEY,JSON.stringify(arr))}
function toRow(c){return {id:String(c.id),name:c.name||'',phone:c.phone||'',address:c.address||'',source:c.source||'',note:c.note||'',outcome:c.outcome||'',next_action:c.next||'',followup_date:c.date||null,updated_at:c.ts||new Date().toISOString(),device_id:deviceId(),deleted:false}}
function fromRow(r){return {id:r.id,name:r.name||'',phone:r.phone||'',address:r.address||'',source:r.source||'',note:r.note||'',outcome:r.outcome||'Da richiamare',next:r.next_action||'',date:r.followup_date||'',ts:r.updated_at||new Date().toISOString()}}
async function request(path,opt={}){let res=await fetch(CFG.url.replace(/\/$/,'')+'/rest/v1/'+path,{...opt,headers:headers(opt.headers||{})});if(!res.ok)throw new Error('Supabase '+res.status+': '+await res.text());let t=await res.text();return t?JSON.parse(t):null}
async function pushOne(c){if(!ready())return false;await request(CFG.table+'?on_conflict=id',{method:'POST',body:JSON.stringify([toRow(c)])});return true}
async function remove(id){if(!ready())return false;await request(CFG.table+'?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({deleted:true,updated_at:new Date().toISOString(),device_id:deviceId()})});return true}
async function pull(){if(!ready())return local();let rows=await request(CFG.table+'?select=*&order=updated_at.desc');let remote=(rows||[]).filter(r=>!r.deleted).map(fromRow);let merged=new Map();[...local(),...remote].forEach(c=>{let old=merged.get(c.id);if(!old||String(c.ts||'')>String(old.ts||''))merged.set(c.id,c)});let arr=[...merged.values()].sort((a,b)=>String(b.ts||'').localeCompare(String(a.ts||'')));saveLocal(arr);return arr}
async function syncAll(){if(!ready())return {cloud:false,count:local().length};for(const c of local())await pushOne(c);let arr=await pull();return {cloud:true,count:arr.length}}
window.F1Sync={ready,pushOne,remove,pull,syncAll,deviceId};
})();
