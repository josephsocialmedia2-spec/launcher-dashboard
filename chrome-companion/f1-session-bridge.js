(()=>{
'use strict';
const SESSION_KEY='f1SupabaseSession';
let last='';
function sync(){try{const raw=localStorage.getItem(SESSION_KEY)||sessionStorage.getItem(SESSION_KEY)||'';if(!raw||raw===last)return;const session=JSON.parse(raw);if(!session?.access_token&&!session?.refresh_token)return;last=raw;chrome.runtime.sendMessage({type:'F1_SESSION_SYNC',session,origin:location.origin}).catch(()=>{})}catch(_){}}
sync();
window.addEventListener('storage',e=>{if(e.key===SESSION_KEY)sync()});
setInterval(sync,5000);
})();
