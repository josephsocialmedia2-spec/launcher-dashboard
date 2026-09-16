(()=>{'use strict';
const VERSION='20260916-mobile-store1';
const DB_NAME='f1-notiziere-mobile';
const DB_VERSION=1;
let dbp=null;
const emit=(name,detail={})=>window.dispatchEvent(new CustomEvent(name,{detail:{...detail,version:VERSION}}));
function openDB(){
  if(dbp)return dbp;
  dbp=new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB_NAME,DB_VERSION);
    r.onupgradeneeded=()=>{
      const db=r.result;
      if(!db.objectStoreNames.contains('kv'))db.createObjectStore('kv',{keyPath:'key'});
      if(!db.objectStoreNames.contains('outbox')){const s=db.createObjectStore('outbox',{keyPath:'id'});s.createIndex('by_status','status',{unique:false});s.createIndex('by_created','created_at',{unique:false});}
    };
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
  return dbp;
}
async function tx(store,mode,fn){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction(store,mode),s=t.objectStore(store);let out;try{out=fn(s)}catch(e){reject(e);return}t.oncomplete=()=>resolve(out?.result??out);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||new Error('IDB_ABORT'))})}
async function get(key){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction('kv','readonly'),r=t.objectStore('kv').get(key);r.onsuccess=()=>resolve(r.result?.value??null);r.onerror=()=>reject(r.error)})}
async function set(key,value){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put({key,value,updated_at:new Date().toISOString()});t.oncomplete=()=>resolve(value);t.onerror=()=>reject(t.error)})}
async function listOutbox(){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction('outbox','readonly'),r=t.objectStore('outbox').getAll();r.onsuccess=()=>resolve((r.result||[]).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at))));r.onerror=()=>reject(r.error)})}
async function enqueue(type,payload,meta={}){const row={id:crypto.randomUUID(),type,payload,meta,status:'PENDING',attempts:0,last_error:'',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};const db=await openDB();await new Promise((resolve,reject)=>{const t=db.transaction('outbox','readwrite');t.objectStore('outbox').put(row);t.oncomplete=resolve;t.onerror=()=>reject(t.error)});emit('f1:outbox-change',{count:(await listOutbox()).filter(x=>x.status!=='SYNCED').length});return row}
async function patchOutbox(id,patch){const db=await openDB();await new Promise((resolve,reject)=>{const t=db.transaction('outbox','readwrite'),s=t.objectStore('outbox'),r=s.get(id);r.onsuccess=()=>{if(!r.result){resolve();return} s.put({...r.result,...patch,updated_at:new Date().toISOString()})};t.oncomplete=resolve;t.onerror=()=>reject(t.error)});emit('f1:outbox-change',{});}
async function removeOutbox(id){const db=await openDB();await new Promise((resolve,reject)=>{const t=db.transaction('outbox','readwrite');t.objectStore('outbox').delete(id);t.oncomplete=resolve;t.onerror=()=>reject(t.error)});emit('f1:outbox-change',{});}
async function pendingCount(){return (await listOutbox()).filter(x=>x.status!=='SYNCED').length}
function cloneState(s){try{return structuredClone(s)}catch(_){return JSON.parse(JSON.stringify(s))}}
function civicOfProgress(p){return String(p?.next_civic||p?.civic_start||'').trim()}
function optimisticComplete(state,expected){const s=cloneState(state||{}),p=s?.territory?.progress;if(!p)return s;const current=civicOfProgress(p);if(expected&&current!==String(expected))return s;const seq=Array.isArray(p.civic_sequence)?p.civic_sequence.map(String):[];let next='';if(seq.length){const i=seq.indexOf(current);if(i>=0&&i<seq.length-1)next=seq[i+1]}
p.last_civic=current;p.next_civic=next;p.status=next?'IN_CORSO':'DA_CONSUNTIVARE';p.updated_at=new Date().toISOString();if(s.territory?.summary)s.territory.summary.civics=Number(s.territory.summary.civics||0)+1;if(s.instruction){s.instruction={kind:next?'CIVIC':'CONSUNTIVO',priority:'ALTA',title:next?`VAI AL CIVICO ${next}`:'GIRO DA CONSUNTIVARE',detail:[p.comune,p.zona,p.via].filter(Boolean).join(' · '),cta:next?`INIZIA CIVICO ${next}`:'APRI CONSUNTIVO',href:next?'notiziere-mobile.html#civico':'crm.html?mode=notiziere',progress:p,summary:s.territory?.summary||{},pending:s.territory?.pending_news||[],nextTitle:next?'Dopo il salvataggio F1 mostrerà il prossimo civico.':'Completa il consuntivo del giro.'}}
return s}
async function cacheState(state){return set('state',state)}
async function cachedState(){return get('state')}
async function setConflict(conflict){await set('conflict',conflict||null);emit('f1:conflict-change',{conflict:conflict||null})}
async function getConflict(){return get('conflict')}
window.F1MobileStore={version:VERSION,openDB,get,set,enqueue,listOutbox,patchOutbox,removeOutbox,pendingCount,cacheState,cachedState,optimisticComplete,setConflict,getConflict};
})();
