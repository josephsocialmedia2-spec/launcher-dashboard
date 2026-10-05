(()=>{'use strict';
const LOGIN='setup-cloud.html?return=ricerca-territoriale.html';
const PROTECTED_SCRIPTS=[
  'f1-staff-data.js?v=20261005-os2',
  'f1-notiziere-engine.js?v=20261005-os2',
  'f1-realtime.js?v=20261005-os2',
  'f1-territory-workspace.js?v=20261005-os2'
];
let ok=false,settled=false;
function reveal(){document.documentElement.classList.remove('f1-auth-pending')}
function load(src){return new Promise((resolve,reject)=>{if(document.querySelector(`script[data-f1-protected="${src}"]`)){resolve();return}const s=document.createElement('script');s.src=src;s.dataset.f1Protected=src;s.onload=resolve;s.onerror=()=>reject(new Error('Modulo protetto non caricato: '+src));document.body.appendChild(s)})}
function setLocal(reason){
  window.F1_TERRITORY_MODE='LOCAL';
  const cloud=document.getElementById('twCloud'),rt=document.getElementById('twRealtime');
  if(cloud)cloud.textContent='MODALITÀ LOCALE';
  if(rt)rt.textContent='CLOUD NON COLLEGATO';
  const existing=document.querySelector('script[data-f1-local-fallback]');
  if(!existing){const s=document.createElement('script');s.src='f1-territory-local.js?v=20261005-local1';s.dataset.f1LocalFallback='1';document.body.appendChild(s)}
  window.dispatchEvent(new CustomEvent('f1:dashboard-local-ready',{detail:{reason:String(reason||'NO_SESSION'),login:LOGIN}}));
}
async function applyRoleUi(){
  try{const me=await window.F1StaffData?.me?.(),isOwner=String(me?.role||'').toUpperCase()==='TITOLARE';document.querySelectorAll('a[href*="accessi-ufficio.html"]').forEach(a=>{a.hidden=!isOwner;if(!isOwner)a.setAttribute('aria-hidden','true')})}
  catch(_){document.querySelectorAll('a[href*="accessi-ufficio.html"]').forEach(a=>{a.hidden=true;a.setAttribute('aria-hidden','true')})}
}
async function start(){
  reveal();
  if(!/\/ricerca-territoriale\.html$/i.test(location.pathname)){settled=true;return}
  if(!window.F1Sync?.configured?.()){setLocal('SUPABASE_NOT_CONFIGURED');settled=true;return}
  try{ok=await window.F1Sync.ensureSession()}catch(err){console.warn('F1 territory auth validation',err);setLocal('AUTH_UNAVAILABLE');settled=true;return}
  if(!ok){setLocal('NO_SESSION');settled=true;return}
  window.F1_TERRITORY_MODE='CLOUD';
  try{for(const src of PROTECTED_SCRIPTS)await load(src);await applyRoleUi()}
  catch(err){console.error('F1 territory protected module',err);setLocal('MODULE_ERROR');settled=true;window.dispatchEvent(new CustomEvent('f1:dashboard-module-error',{detail:{message:String(err?.message||err)}}));return}
  settled=true;window.dispatchEvent(new CustomEvent('f1:dashboard-auth-ready'));
}
window.F1DashboardAuthGuard={ready:()=>ok&&settled,mode:()=>window.F1_TERRITORY_MODE||'PENDING'};start();
})();