(function(){
'use strict';
const CFG=window.F1_SUPABASE||{};
const DEVICE_KEY='f1DeviceId',SESSION_KEY='f1SupabaseSession';
const AUTH_TIMEOUT_MS=Math.max(100,Number(window.F1_AUTH_TIMEOUT_MS||15000)||15000);
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function loginEmail(email){return String(email||'').trim().toLowerCase()}
function assertEmail(email){if(!EMAIL_RE.test(String(email||'')))throw new Error('Inserisci una email valida');return email}
function deviceId(){let id=localStorage.getItem(DEVICE_KEY);if(!id){id='dev-'+crypto.randomUUID();localStorage.setItem(DEVICE_KEY,id)}return id}
function normalizeSession(raw){if(!raw||typeof raw!=='object')return null;const s={...raw};let exp=Number(s.expires_at||0);if(exp&&exp<1e12)exp*=1000;if(!exp&&s.expires_in)exp=Date.now()+Number(s.expires_in||3600)*1000;s.expires_at=exp||0;s.saved_at=Number(s.saved_at||0);return s}
function readStored(store){try{return normalizeSession(JSON.parse(store.getItem(SESSION_KEY)||'null'))}catch(_){return null}}
function chooseSession(local,tab){if(!local)return tab;if(!tab)return local;const l=Number(local.saved_at||local.expires_at||0),t=Number(tab.saved_at||tab.expires_at||0);return t>l?tab:local}
function session(){const local=readStored(localStorage),tab=readStored(sessionStorage),s=chooseSession(local,tab);if(s){try{const text=JSON.stringify(s);localStorage.setItem(SESSION_KEY,text);sessionStorage.setItem(SESSION_KEY,text)}catch(_){}}return s}
function saveSession(raw){const s=normalizeSession({...raw,saved_at:Date.now()});if(!s){clearSession();return null}const text=JSON.stringify(s);localStorage.setItem(SESSION_KEY,text);sessionStorage.setItem(SESSION_KEY,text);return s}
function clearSession(){sessionStorage.removeItem(SESSION_KEY);localStorage.removeItem(SESSION_KEY)}
function configured(){return !!(CFG.url&&CFG.anonKey)}
function ready(){const s=session();return configured()&&!!(s&&(s.access_token||s.refresh_token))}
function authBase(){if(!configured())throw new Error('Supabase non configurato');return CFG.url.replace(/\/$/,'')+'/auth/v1/'}
function networkError(err){if(err?.name==='AbortError'){const e=new Error('Tempo massimo di connessione superato. Controlla la rete e riprova.');e.code='AUTH_TIMEOUT';return e}if(/failed to fetch|networkerror|load failed|network request failed/i.test(String(err?.message||err))){const e=new Error('Connessione non disponibile. Controlla la rete e riprova.');e.code='AUTH_NETWORK';return e}return err}
async function fetchAuth(url,opt={}){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),AUTH_TIMEOUT_MS);try{return await fetch(url,{...opt,signal:ctl.signal})}catch(err){throw networkError(err)}finally{clearTimeout(timer)}}
async function authJson(path,opt={}){const res=await fetchAuth(authBase()+path,{...opt,headers:{apikey:CFG.anonKey,'Content-Type':'application/json',...(opt.headers||{})}}),text=await res.text();let body=null;try{body=text?JSON.parse(text):null}catch(_){body={msg:text}}if(!res.ok){const e=new Error(body?.msg||body?.message||body?.error_description||body?.error||('Supabase Auth '+res.status));e.status=res.status;throw e}return body}
async function signInWithPassword(email,password){email=assertEmail(loginEmail(email));password=String(password||'');if(!password)throw new Error('Inserisci email e password');const j=await authJson('token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});if(!j?.access_token||!j?.refresh_token)throw new Error('Sessione Supabase non ricevuta');return saveSession(j)}
async function signUpWithPassword(email,password,data={},redirectTo=''){email=assertEmail(loginEmail(email));password=String(password||'');if(!password)throw new Error('Inserisci email e password');if(password.length<12)throw new Error('La password deve contenere almeno 12 caratteri');const qs=redirectTo?'?redirect_to='+encodeURIComponent(String(redirectTo)):'';const j=await authJson('signup'+qs,{method:'POST',body:JSON.stringify({email,password,data:data&&typeof data==='object'?data:{}})});if(j?.access_token&&j?.refresh_token)saveSession(j);return j}
async function sendMagicLink(email,redirectTo){email=assertEmail(loginEmail(email));const qs=redirectTo?'?redirect_to='+encodeURIComponent(String(redirectTo)):'';await authJson('otp'+qs,{method:'POST',body:JSON.stringify({email,create_user:false,data:{}})});return true}
async function sendRecoveryEmail(email,redirectTo){email=assertEmail(loginEmail(email));const qs=redirectTo?'?redirect_to='+encodeURIComponent(String(redirectTo)):'';await authJson('recover'+qs,{method:'POST',body:JSON.stringify({email})});return true}
function acceptRedirectSession(){const h=new URLSearchParams(String(location.hash||'').replace(/^#/,''));const err=h.get('error_description')||h.get('error');if(err)throw new Error(err);const access=h.get('access_token'),refresh=h.get('refresh_token');if(!access||!refresh)return false;saveSession({access_token:access,refresh_token:refresh,expires_in:Number(h.get('expires_in')||3600),token_type:h.get('token_type')||'bearer',recovery:h.get('type')==='recovery'});history.replaceState(null,'',location.pathname+location.search);return true}
async function refreshSession(){let s=session();if(!s?.refresh_token){clearSession();throw new Error('Sessione scaduta')}try{const j=await authJson('token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:s.refresh_token})});if(!j?.access_token)throw new Error('Refresh login non riuscito');s=saveSession({...j,refresh_token:j.refresh_token||s.refresh_token,user:j.user||s.user});return s}catch(e){clearSession();throw e}}
async function authToken(forceRefresh=false){let s=session();if(!configured()||!s)throw new Error('Cloud non autenticato');if(!forceRefresh&&s.access_token&&(!s.expires_at||Date.now()<Number(s.expires_at)-60000))return s.access_token;s=await refreshSession();return s.access_token}
async function updatePassword(password){password=String(password||'');if(password.length<12)throw new Error('La nuova password deve contenere almeno 12 caratteri');const token=await authToken(false),j=await authJson('user',{method:'PUT',headers:{Authorization:'Bearer '+token},body:JSON.stringify({password})});const s=session();if(s)saveSession({...s,recovery:false,user:j||s.user});return j}
async function currentUser(token){let res;try{res=await fetchAuth(authBase()+'user',{headers:{apikey:CFG.anonKey,Authorization:'Bearer '+token}})}catch(e){throw e}const text=await res.text();let body=null;try{body=text?JSON.parse(text):null}catch(_){body=null}return{ok:res.ok,status:res.status,user:body}}
async function ensureSession(){if(!configured()||!session())return false;try{let token=await authToken(false),check=await currentUser(token);if(check.ok&&check.user?.id)return true;if(check.status===401||check.status===403){token=await authToken(true);check=await currentUser(token);if(check.ok&&check.user?.id)return true}clearSession();return false}catch(e){if(e?.status===401||e?.status===403||/refresh|sessione|token|invalid|expired|non autenticato/i.test(String(e?.message||''))){clearSession();return false}throw e}}
async function signOut(){const s=session();try{if(s?.access_token)await fetchAuth(authBase()+'logout',{method:'POST',headers:{apikey:CFG.anonKey,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'}})}catch(_){}finally{clearSession()}return true}
function legacyDisabled(){throw new Error('CRM legacy disattivato: usare F1 ACQUISITION ENGINE · CRM UNIFICATO')}
window.F1Sync={ready,configured,authToken,ensureSession,currentUser,refreshSession,deviceId,session,saveSession,clearSession,loginEmail,signInWithPassword,signUpWithPassword,sendMagicLink,sendRecoveryEmail,updatePassword,acceptRedirectSession,signOut,pushOne:legacyDisabled,remove:legacyDisabled,pull:legacyDisabled,syncAll:legacyDisabled};
})();

(function loadF1GlobalBrand(){
  'use strict';
  if(document.querySelector('script[data-f1-global-brand]'))return;
  const s=document.createElement('script');
  s.src='f1-global-brand.js?v=20260919-layout-final1';
  s.defer=true;
  s.dataset.f1GlobalBrand='1';
  document.head.appendChild(s);
})();
