(()=>{
if(window.__ACQ_CORE_LOADER__) return;
window.__ACQ_CORE_LOADER__=true;
const files=[
  'acquisizione-vai-qui-addon.js',
  'performance-addon.js',
  'chiudi-contatto-addon.js',
  'backup-addon.js',
  'piano-pubblicazione-addon.js',
  'strategia-dettagli-addon.js',
  'piano-deluxe-whatsapp-addon.js',
  'reel-social-addon.js',
  'digital-strategist-addon.js'
];
function normalizeSources(){
  const s=document.getElementById('source'); if(!s) return;
  const map={Referral:'Segnalazione',Partner:'Professionista / collaboratore',Inbound:'Persona che ci ha contattato'};
  [...s.options].forEach(o=>{const t=o.textContent.trim(); if(map[t]){o.textContent=map[t];o.value=map[t];}});
  if(map[s.value]) s.value=map[s.value];
}
async function loadOne(file){
  if(document.querySelector(`script[data-acq-addon="${file}"]`)) return;
  await new Promise(resolve=>{
    const s=document.createElement('script');
    s.src=`./${file}?v=21`;
    s.async=false;
    s.dataset.acqAddon=file;
    s.onload=resolve;
    s.onerror=()=>{console.warn('Addon non caricato:',file);resolve();};
    document.body.appendChild(s);
  });
}
async function start(){
  normalizeSources();
  for(const f of files) await loadOne(f);
  normalizeSources();
  window.__ACQ_READY__=true;
  window.dispatchEvent(new CustomEvent('acquisitorepro:ready'));
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
