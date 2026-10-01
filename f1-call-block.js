(function(){
  'use strict';
  const VERSION='20261001-callroutine-off1';

  function cleanup(){
    document.getElementById('f1CallBlockGate')?.remove();
    document.getElementById('f1CallBlockGateStyle')?.remove();
    document.body?.classList.remove('focus-active');
  }

  function isEnabled(){return false;}

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',cleanup,{once:true});
  }else{
    cleanup();
  }
  window.addEventListener('pageshow',cleanup);

  window.F1CallBlock={
    version:VERSION,
    enabled:false,
    isEnabled,
    cleanup
  };
})();