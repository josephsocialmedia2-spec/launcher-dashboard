(function(){
'use strict';
const CFG=window.F1_SUPABASE||{};
const DEVICE_KEY='f1DeviceId',SESSION_KEY='f1SupabaseSession';
function deviceId(){let id=localStorage.getItem(DEVICE_KEY);if(!id){id='dev-'+crypto.randomUUID();localStorage.setItem(DEVICE_KEY,id)}return id}
function normalizeSession(raw){if(!raw||typeof raw!=='object')return null;const s={...raw};let exp=Number(s.expires_at||0);if(exp&&exp<1e12)exp*=1000;if(!exp&&s.expires_in)exp=Date.now()+Number(s.expires_in||3600)*1000;s.expires_at=exp||0;return s}
function readStored(store){try{return normalizeSession(JSON.parse(store.getItem(SESSION_KEY)||'null'))}catch(_){return null}}
function session(){const local=readStored(localStorage),tab=readStored(sessionStorage),s=local||tab;if(s){try{const text=JSON.stringify(s);localStorage.setItem(SESSION_KEY,text);sessionStorage.setItem(SESSION_KEY,text)}catch(_){}}return s}
function saveSession(raw){const s=normalizeSession(raw);if(!s){clearSession();return null}const text=JSON.stringify(s);localStorage.setItem(SESSION_KEY,text);sessionStorage.setItem(SESSION_KEY,text);return s}
function clearSession(){sessionStorage.removeItem(SESSION_KEY);localStorage.removeItem(SESSION_KEY)}
function configured(){return !!(CFG.url&&CFG.anonKey)}
function ready(){const s=session();return configured()&&!!(s&&(s.access_token||s.refresh_token))}
function authBase(){if(!configured())throw new Error('Supabase non configurato');return CFG.url.replace(/\/$/,'')+'/auth/v1/'}
async function authJson(path,opt={}){const res=await fetch(authBase()+path,{...opt,headers:{apikey:CFG.anonKey,'Content-Type':'application/json',...(opt.headers||{})}}),text=await res.text();let body=null;try{body=text?JSON.parse(text):null}catch(_){body={msg:text}}if(!res.ok)throw new Error(body?.msg||body?.message||body?.error_description||body?.error||('Supabase Auth '+res.status));return body}
async function signInWithPassword(email,password){email=String(email||'').trim();password=String(password||'');if(!email||!password)throw new Error('Inserisci email e password');const j=await authJson('token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});if(!j?.access_token||!j?.refresh_token)throw new Error('Sessione Supabase non ricevuta');return saveSession(j)}
async function sendMagicLink(email,redirectTo){email=String(email||'').trim();if(!email)throw new Error('Inserisci la tua email');const qs=redirectTo?'?redirect_to='+encodeURIComponent(String(redirectTo)):'';await authJson('otp'+qs,{method:'POST',body:JSON.stringify({email,create_user:false,data:{}})});return true}
function acceptRedirectSession(){const h=new URLSearchParams(String(location.hash||'').replace(/^#/,''));const err=h.get('error_description')||h.get('error');if(err)throw new Error(err);const access=h.get('access_token'),refresh=h.get('refresh_token');if(!access||!refresh)return false;saveSession({access_token:access,refresh_token:refresh,expires_in:Number(h.get('expires_in')||3600),token_type:h.get('token_type')||'bearer'});history.replaceState(null,'',location.pathname+location.search);return true}
async function authToken(){let s=session();if(!configured()||!s)throw new Error('Cloud non autenticato');if(s.access_token&&(!s.expires_at||Date.now()<Number(s.expires_at)-60000))return s.access_token;if(!s.refresh_token){clearSession();throw new Error('Sessione scaduta')};const j=await authJson('token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:s.refresh_token})});if(!j?.access_token){clearSession();throw new Error('Refresh login non riuscito')}s=saveSession({...j,refresh_token:j.refresh_token||s.refresh_token,user:j.user||s.user});return s.access_token}
async function signOut(){const s=session();try{if(s?.access_token)await fetch(authBase()+'logout',{method:'POST',headers:{apikey:CFG.anonKey,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'}})}catch(_){}finally{clearSession()}return true}
function legacyDisabled(){throw new Error('CRM legacy disattivato: usare F1 ACQUISITION ENGINE · CRM UNIFICATO')}
window.F1Sync={ready,configured,authToken,deviceId,session,saveSession,clearSession,signInWithPassword,sendMagicLink,acceptRedirectSession,signOut,pushOne:legacyDisabled,remove:legacyDisabled,pull:legacyDisabled,syncAll:legacyDisabled};
})();
