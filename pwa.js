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

  // PWA bootstrap only. The previous implementation injected buyer-demand and
  // Radar Edilizio sections directly into oggi.html. The Acquisition Command
  // Center now owns its layout explicitly, so dynamic dashboard mutation here
  // would recreate a second source of UI truth.
})();
