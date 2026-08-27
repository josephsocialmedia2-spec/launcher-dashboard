(function(){
const CFG=window.F1_SUPABASE||{};
const LOCAL_KEY='f1CRMContacts',DEVICE_KEY='f1DeviceId',SESSION_KEY='f1SupabaseSession';
function deviceId(){let id=localStorage.getItem(DEVICE_KEY);if(!id){id='dev-'+crypto.randomUUID();localStorage.setItem(DEVICE_KEY,id)}return id}
function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(e){return null}}
function saveSession(s){localStorage.setItem(SESSION_KEY,JSON.stringify(s))}
function configured(){return !!(CFG.url&&CFG.anonKey)}
function ready(){let s=session();return configured()&&!!(s&&(s.access_token||s.refresh_token))}
async function authToken(){let s=session();if(!configured()||!s)throw new Error('Cloud non autenticato');if(s.access_token&&(!s.expires_at||Date.now()<Number(s.expires_at)-60000))return s.access_token;if(!s.refresh_token)throw new Error('Sessione scaduta');let res=await fetch(CFG.url.replace(/\/$/,'')+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'apikey':CFG.anonKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});if(!res.ok)throw new Error('Refresh login '+res.status);let j=await res.json();s={access_token:j.access_token,refresh_token:j.refresh_token||s.refresh_token,expires_at:Date.now()+Number(j.expires_in||3600)*1000,user:j.user||s.user};saveSession(s);return s.access_token}
async function headers(extra={}){return {'apikey':CFG.anonKey,'Authorization':'Bearer '+await authToken(),'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation',...extra}}
function local(){try{let d=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]');return Array.isArray(d)?d:[]}catch(e){return []}}
function saveLocal(arr){localStorage.setItem(LOCAL_KEY,JSON.stringify(arr))}
function toRow(c){return {id:String(c.id),name:c.name||'',phone:c.phone||'',address:c.address||'',source:c.source||'',note:c.note||'',outcome:c.outcome||'',next_action:c.next||'',followup_date:c.date||null,updated_at:c.ts||new Date().toISOString(),device_id:deviceId(),deleted:false}}
function fromRow(r){return {id:r.id,name:r.name||'',phone:r.phone||'',address:r.address||'',source:r.source||'',note:r.note||'',outcome:r.outcome||'Da richiamare',next:r.next_action||'',date:r.followup_date||'',ts:r.updated_at||new Date().toISOString()}}
async function request(path,opt={}){let hs=await headers(opt.headers||{}),res=await fetch(CFG.url.replace(/\/$/,'')+'/rest/v1/'+path,{...opt,headers:hs});if(!res.ok)throw new Error('Supabase '+res.status+': '+await res.text());let t=await res.text();return t?JSON.parse(t):null}
async function pushOne(c){if(!ready())return false;await request(CFG.table+'?on_conflict=id',{method:'POST',body:JSON.stringify([toRow(c)])});return true}
async function remove(id){if(!ready())return false;await request(CFG.table+'?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({deleted:true,updated_at:new Date().toISOString(),device_id:deviceId()})});return true}
async function pull(){if(!ready())return local();let rows=await request(CFG.table+'?select=*&order=updated_at.desc');let remote=(rows||[]).filter(r=>!r.deleted).map(fromRow),merged=new Map();[...local(),...remote].forEach(c=>{let old=merged.get(c.id);if(!old||String(c.ts||'')>String(old.ts||''))merged.set(c.id,c)});let arr=[...merged.values()].sort((a,b)=>String(b.ts||'').localeCompare(String(a.ts||'')));saveLocal(arr);return arr}
async function syncAll(){if(!ready())return {cloud:false,count:local().length};for(const c of local())await pushOne(c);let arr=await pull();return {cloud:true,count:arr.length}}
window.F1Sync={ready,configured,authToken,pushOne,remove,pull,syncAll,deviceId,session};
})();
