(()=>{'use strict';
const LOGIN='setup-cloud.html?return=ricerca-territoriale.html';
const PROTECTED_SCRIPTS=[
  'f1-staff-data.js?v=20260916-auth1',
  'f1-notiziere-engine.js?v=20260917-territory2',
  'ricerca-territoriale.js?v=20260916-notiziere1',
  'f1-notiziere-assistant-bridge.js?v=20260916-notiziere1',
  'f1-tour-admin-dashboard.js?v=20260916-tour1',
  'f1-staff-access-panel.js?v=20260916-access1',
  'f1-realtime.js?v=20260916-mobile1',
  'f1-desktop-mobile-bridge.js?v=20260916-mobile1',
  'f1-office-sign-link.js?v=20260916-office1',
  'f1-territory-admin-v3.js?v=20260918-territory-admin-v3b'
];
let ok=false,settled=false;
function reveal(){document.documentElement.classList.remove('f1-auth-pending')}
function redirect(){if(settled)return;settled=true;try{window.F1Sync?.clearSession?.()}catch(_){}location.replace(LOGIN)}
function load(src){return new Promise((resolve,reject)=>{if(document.querySelector(`script[data-f1-protected="${src}"]`)){resolve();return}const s=document.createElement('script');s.src=src;s.dataset.f1Protected=src;s.onload=resolve;s.onerror=()=>reject(new Error('Modulo protetto non caricato: '+src));document.body.appendChild(s)})}
async function start(){
  if(!/\/ricerca-territoriale\.html$/i.test(location.pathname)){reveal();return}
  if(!window.F1Sync?.configured?.()){redirect();return}
  try{
    ok=await window.F1Sync.ensureSession();
    if(!ok){redirect();return}
    for(const src of PROTECTED_SCRIPTS)await load(src);
    settled=true;reveal();
    window.dispatchEvent(new CustomEvent('f1:dashboard-auth-ready'));
  }catch(err){console.error('F1 dashboard auth guard',err);redirect()}
}
window.F1DashboardAuthGuard={ready:()=>ok&&settled};
start();
})();
