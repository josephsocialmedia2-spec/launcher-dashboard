(()=> {
  'use strict';
  const SECRET_KEY='f1SecretDbGesture';
  const isCRM=/\/crm\.html$/i.test(location.pathname);

  function arm(dot){
    if(!dot || dot.dataset.f1SecretArmed==='1') return;
    dot.dataset.f1SecretArmed='1';
    dot.setAttribute('aria-label','Stato cloud');
    let clicks=0, resetTimer=null;
    dot.addEventListener('click', ev=>{
      ev.preventDefault();
      ev.stopPropagation();
      clicks+=1;
      clearTimeout(resetTimer);
      resetTimer=setTimeout(()=>{clicks=0},3500);
      if(clicks<5) return;
      clicks=0;
      clearTimeout(resetTimer);
      sessionStorage.setItem(SECRET_KEY,'1');
      location.href='database-f1.html';
    });
  }

  function install(){
    let dot=document.querySelector('#cloudPill .live-dot');
    if(!dot && isCRM){
      const cloud=document.getElementById('cloudStatus');
      if(cloud){
        dot=document.createElement('span');
        dot.className='f1-secret-dot';
        dot.style.cssText='display:inline-block;width:8px;height:8px;border-radius:50%;background:#39f28a;box-shadow:0 0 10px rgba(57,242,138,.55);margin-right:6px;vertical-align:middle;';
        cloud.prepend(dot);
      }
    }
    arm(dot);

    if(isCRM && new URLSearchParams(location.search).get('openImport')==='1'){
      let tries=0;
      const timer=setInterval(async()=>{
        tries++;
        try{
          if(window.F1CRMExcelImport && window.F1CRMAuthGuard?.ready?.()){
            clearInterval(timer);
            history.replaceState(null,'','crm.html');
            await window.F1CRMExcelImport.open();
          }
        }catch(_){}
        if(tries>120) clearInterval(timer);
      },250);
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();