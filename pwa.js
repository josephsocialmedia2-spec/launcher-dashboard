(()=>{
  'use strict';

  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('./sw.js',{scope:'./'})
        .then(reg=>{
          document.documentElement.dataset.f1Sw='ready';
          if(reg.waiting) window.dispatchEvent(new CustomEvent('f1:sw-update-ready'));
        })
        .catch(err=>{
          document.documentElement.dataset.f1Sw='error';
          console.warn('F1 service worker non disponibile',err);
        });
    });
  }

  function loadOnce(src,id){
    if(document.getElementById(id)||document.querySelector(`script[src^="${src.split('?')[0]}"]`))return;
    const s=document.createElement('script');s.id=id;s.src=src;s.defer=true;document.body.appendChild(s);
  }

  const page=location.pathname.split('/').pop().toLowerCase();
  if(page==='notiziere-mobile.html'){
    loadOnce('f1-mobile-field-only-guard.js?v=20260916-office1','f1MobileFieldOnlyLoader');
  }
// PWA bootstrap only. The Acquisition Command Center owns its layout explicitly.
})();
