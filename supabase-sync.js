(function(){
'use strict';
const CFG=window.F1_SUPABASE||{};
const DEVICE_KEY='f1DeviceId',SESSION_KEY='f1SupabaseSession';
function deviceId(){let id=localStorage.getItem(DEVICE_KEY);if(!id){id='dev-'+crypto.randomUUID();localStorage.setItem(DEVICE_KEY,id)}return id}
function migrateLegacySession(){const legacy=localStorage.getItem(SESSION_KEY);if(!sessionStorage.getItem(SESSION_KEY)&&legacy)sessionStorage.setItem(SESSION_KEY,legacy);if(legacy)localStorage.removeItem(SESSION_KEY)}
function session(){migrateLegacySession();try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch(_){return null}}
function saveSession(s){sessionStorage.setItem(SESSION_KEY,JSON.stringify(s));localStorage.removeItem(SESSION_KEY)}
function clearSession(){sessionStorage.removeItem(SESSION_KEY);localStorage.removeItem(SESSION_KEY)}
function configured(){return !!(CFG.url&&CFG.anonKey)}
function ready(){const s=session();return configured()&&!!(s&&(s.access_token||s.refresh_token))}
async function authToken(){let s=session();if(!configured()||!s)throw new Error('Cloud non autenticato');if(s.access_token&&(!s.expires_at||Date.now()<Number(s.expires_at)-60000))return s.access_token;if(!s.refresh_token)throw new Error('Sessione scaduta');const res=await fetch(CFG.url.replace(/\/$/,'')+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:CFG.anonKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});if(!res.ok){clearSession();throw new Error('Refresh login '+res.status)}const j=await res.json();s={access_token:j.access_token,refresh_token:j.refresh_token||s.refresh_token,expires_at:Date.now()+Number(j.expires_in||3600)*1000,user:j.user||s.user};saveSession(s);return s.access_token}
function legacyDisabled(){throw new Error('CRM legacy disattivato: usare F1 ACQUISITION ENGINE · CRM UNIFICATO')}
window.F1Sync={ready,configured,authToken,deviceId,session,saveSession,clearSession,pushOne:legacyDisabled,remove:legacyDisabled,pull:legacyDisabled,syncAll:legacyDisabled};
})();
