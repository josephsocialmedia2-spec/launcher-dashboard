(function(){
const CFG=window.F1_SUPABASE||{};
const SESSION_KEYS=['f1SupabaseSession','f1_session'];
const LOCAL_KEY='f1CRMContacts';
const LEGACY_KEY='acqProMobile';
function readSession(){for(const k of SESSION_KEYS){try{const s=JSON.parse(localStorage.getItem(k)||'null');if(s&&(s.access_token||s.refresh_token))return s}catch(e){}}return null}
function saveSession(s){SESSION_KEYS.forEach(k=>localStorage.setItem(k,JSON.stringify(s)))}
function clearSession(){SESSION_KEYS.forEach(k=>localStorage.removeItem(k))}
function configured(){return !!(CFG.url&&CFG.anonKey&&CFG.table)}
function ready(){return configured()&&!!readSession()}
async function authToken(){let s=readSession();if(!s)throw Error('Login F1 non attivo');if(s.access_token&&(!s.expires_at||Date.now()<Number(s.expires_at)-60000))return s.access_token;if(!s.refresh_token)throw Error('Sessione scaduta');let r=await fetch(CFG.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:CFG.anonKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});let j=await r.json();if(!r.ok)throw Error(j.error_description||j.msg||'Sessione scaduta');s={...j,expires_at:Date.now()+Number(j.expires_in||3600)*1000};saveSession(s);return s.access_token}
async function req(path,opt={}){let token=await authToken();let r=await fetch(CFG.url+'/rest/v1/'+path,{...opt,headers:{apikey:CFG.anonKey,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation',...(opt.headers||{})}});let t=await r.text();if(!r.ok)throw Error('Supabase '+r.status+': '+t);return t?JSON.parse(t):null}
function local(){try{let a=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return []}}
function saveLocal(a){localStorage.setItem(LOCAL_KEY,JSON.stringify(a))}
function legacy(){try{let d=JSON.parse(localStorage.getItem(LEGACY_KEY)||'{}');return Array.isArray(d.contacts)?d.contacts:[]}catch(e){return []}}
function normalize(c,i=0){let full=(c.name||'').trim(),parts=full.split(/\s+/);return {id:String(c.id||('CRM-'+Date.now()+'-'+i)),first_name:c.first_name||parts.shift()||'',last_name:c.last_name||parts.join(' '),phone:c.phone||'',street:c.street||c.address||'',civic:c.civic||'',city:c.city||'',source:c.source||'CRM',pipeline_stage:c.pipeline_stage||c.outcome||'Da richiamare',notes:c.notes||c.note||'',next_action:c.next_action||c.next||'',next_followup:c.next_followup||c.date||'',call_excluded:Number(c.call_excluded||0),privacy_status:c.privacy_status||'',updated_at:c.updated_at||c.ts||new Date().toISOString()}}
function display(c){return {id:c.id||'',name:[c.first_name,c.last_name].filter(Boolean).join(' ')||c.company||'',phone:c.phone||'',address:[c.street,c.civic,c.city].filter(Boolean).join(' '),source:c.source||'',note:c.notes||c.last_note||'',outcome:c.pipeline_stage||c.last_outcome||'Da richiamare',next:c.next_action||'',date:c.next_followup||'',ts:c.updated_at||new Date().toISOString(),call_excluded:Number(c.call_excluded||0),privacy_status:c.privacy_status||''}}
async function rows(collection){return await req(`${CFG.table}?collection=eq.${encodeURIComponent(collection)}&deleted=eq.false&select=record_id,payload,updated_at&order=updated_at.desc`)||[]}
async function upsert(collection,recordId,payload){let s=readSession(),uid=s?.user?.id;if(!uid)throw Error('Utente F1 non disponibile');payload={...payload,id:payload.id||recordId,updated_at:new Date().toISOString()};return req(`${CFG.table}?on_conflict=owner_id,collection,record_id`,{method:'POST',body:JSON.stringify([{owner_id:uid,collection,record_id:String(recordId),payload,updated_at:new Date().toISOString(),deleted:false}])})}
async function softDelete(collection,recordId){return req(`${CFG.table}?collection=eq.${encodeURIComponent(collection)}&record_id=eq.${encodeURIComponent(recordId)}`,{method:'PATCH',body:JSON.stringify({deleted:true,updated_at:new Date().toISOString()})})}
async function pullContacts(){let remote=(await rows('contacts')).map(r=>display(r.payload||{}));let merged=new Map();[...local(),...remote].forEach((c,i)=>{let n=normalize(c,i),d=display(n),old=merged.get(d.id);if(!old||String(d.ts)>=String(old.ts))merged.set(d.id,d)});let arr=[...merged.values()].sort((a,b)=>String(b.ts).localeCompare(String(a.ts)));saveLocal(arr);return arr}
async function migrateLegacy(){if(!ready())return;let all=[...legacy(),...local()];let seen=new Set();for(let i=0;i<all.length;i++){let n=normalize(all[i],i);let key=(n.phone||n.id).replace(/\D/g,'')||n.id;if(seen.has(key))continue;seen.add(key);await upsert('contacts',n.id,n)}localStorage.setItem('f1UnifiedMigrationDone','1')}
async function pushOne(c){let n=normalize(c);await upsert('contacts',n.id,n);return true}
async function remove(id){await softDelete('contacts',id);return true}
async function syncAll(){if(!ready())return {cloud:false,count:local().length};if(localStorage.getItem('f1UnifiedMigrationDone')!=='1')await migrateLegacy();for(const c of local())await pushOne(c);let arr=await pullContacts();return {cloud:true,count:arr.length}}
async function getToday(){let r=await req(`${CFG.table}?collection=eq.settings&record_id=eq.today-context&deleted=eq.false&select=payload&limit=1`);return r?.[0]?.payload||null}
async function setToday(payload){return upsert('settings','today-context',{_f1_type:'today_context',...payload})}
async function getCollection(collection){return (await rows(collection)).map(r=>r.payload||{})}
window.F1Sync={ready,configured,readSession,saveSession,clearSession,authToken,rows,upsert,softDelete,pull:pullContacts,pushOne,remove,syncAll,getToday,setToday,getCollection,normalize,display};
})();
