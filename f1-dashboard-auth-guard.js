(()=>{'use strict';
const LOGIN='setup-cloud.html?return=ricerca-territoriale.html';
let ok=false,settled=false;
function reveal(){document.documentElement.classList.remove('f1-auth-pending')}
function redirect(){if(settled)return;settled=true;try{window.F1Sync?.clearSession?.()}catch(_){}location.replace(LOGIN)}
async function start(){
  if(!/\/ricerca-territoriale\.html$/i.test(location.pathname)){reveal();return}
  if(!window.F1Sync?.configured?.()){redirect();return}
  try{
    ok=await window.F1Sync.ensureSession();
    if(!ok){redirect();return}
    settled=true;reveal();
    window.dispatchEvent(new CustomEvent('f1:dashboard-auth-ready'));
  }catch(err){console.error('F1 dashboard auth guard',err);redirect()}
}
window.F1DashboardAuthGuard={ready:()=>ok&&settled};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
