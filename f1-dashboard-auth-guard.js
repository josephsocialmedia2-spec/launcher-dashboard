(()=>{'use strict';
const LOGIN='setup-cloud.html?return=ricerca-territoriale.html';
const PROTECTED_SCRIPTS=[
  'f1-staff-data.js?v=20261005-os1',
  'f1-notiziere-engine.js?v=20261005-os1',
  'f1-realtime.js?v=20261005-os1',
  'f1-territory-workspace.js?v=20261005-os1'
];
let ok=false,settled=false;
function reveal(){document.documentElement.classList.remove('f1-auth-pending')}
function redirectAuth(){if(settled)return;settled=true;try{window.F1Sync?.clearSession?.()}catch(_){}location.replace(LOGIN)}
function load(src){return new Promise((resolve,reject)=>{if(document.querySelector(`script[data-f1-protected="${src}"]`)){resolve();return}const s=document.createElement('script');s.src=src;s.dataset.f1Protected=src;s.onload=resolve;s.onerror=()=>reject(new Error('Modulo protetto non caricato: '+src));document.body.appendChild(s)})}
async function applyRoleUi(){
  try{const me=await window.F1StaffData?.me?.(),isOwner=String(me?.role||'').toUpperCase()==='TITOLARE';document.querySelectorAll('a[href*="accessi-ufficio.html"]').forEach(a=>{a.hidden=!isOwner;if(!isOwner)a.setAttribute('aria-hidden','true')})}
  catch(_){document.querySelectorAll('a[href*="accessi-ufficio.html"]').forEach(a=>{a.hidden=true;a.setAttribute('aria-hidden','true')})}
}
async function start(){
  if(!/\/ricerca-territoriale\.html$/i.test(location.pathname)){reveal();return}
  if(!window.F1Sync?.configured?.()){redirectAuth();return}
  try{ok=await window.F1Sync.ensureSession()}catch(err){console.error('F1 territory auth validation',err);redirectAuth();return}
  if(!ok){redirectAuth();return}
  try{for(const src of PROTECTED_SCRIPTS)await load(src);await applyRoleUi()}
  catch(err){console.error('F1 territory protected module',err);reveal();window.dispatchEvent(new CustomEvent('f1:dashboard-module-error',{detail:{message:String(err?.message||err)}}));return}
  settled=true;reveal();window.dispatchEvent(new CustomEvent('f1:dashboard-auth-ready'));
}
window.F1DashboardAuthGuard={ready:()=>ok&&settled};start();
})();
