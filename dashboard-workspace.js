(()=>{'use strict';
const VERSION='20260916-central-bootstrap1';
function loadCss(){if(document.querySelector('link[data-f1-central-dashboard]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='f1-central-dashboard.css?v=20260916-central1';link.dataset.f1CentralDashboard='1';document.head.appendChild(link)}
function loadApp(){if(window.F1CentralDashboard||document.querySelector('script[data-f1-central-dashboard]'))return;const script=document.createElement('script');script.src='f1-central-dashboard.js?v=20260916-central1';script.defer=true;script.dataset.f1CentralDashboard='1';document.body.appendChild(script)}
function init(){window.F1_CENTRAL_DASHBOARD=true;loadCss();loadApp()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.F1DashboardBootstrap={version:VERSION};
})();
