(()=>{
'use strict';
if(window.__ACQ_BOOTSTRAP_V21__) return;
window.__ACQ_BOOTSTRAP_V21__=true;
const VER='21.1.0';
const LOG='acqDiagLog', SNAP='acqLastGoodSnapshot', FAIL='acqBootFailures';
const REQUIRED=[
  ['acquisizione-vai-qui-addon.js',()=>!!document.getElementById('acquisizioneVaiQuiButton')],
  ['performance-addon.js',()=>!!document.getElementById('perfCard')],
  ['chiudi-contatto-addon.js',()=>typeof window.closeContact==='function'],
  ['backup-addon.js',()=>!!document.getElementById('backupDataButton')]
];
const OPTIONAL=['reel-social-addon.js','piano-pubblicazione-addon.js','strategia-dettagli-addon.js','piano-deluxe-whatsapp-addon.js','digital-strategist-addon.js'];
const DATA_KEYS=['acqProMobile','acqSeller','acqPublicationPlan','f1VaiZonaTargets','f1LastZone','f1Performance'];
function log(type,msg,extra){try{const a=JSON.parse(localStorage.getItem(LOG)||'[]');a.push({ts:new Date().toISOString(),type,msg,extra:extra||null,ver:VER});while(a.length>120)a.shift();localStorage.setItem(LOG,JSON.stringify(a))}catch{}}
function normalize(){const s=document.getElementById('source');if(!s)return;const map={Referral:'Segnalazione',Partner:'Professionista / collaboratore',Inbound:'Persona che ci ha contattato'};[...s.options].forEach(o=>{const t=o.textContent.trim();if(map[t]){o.textContent=map[t];o.value=map[t]}});if(map[s.value])s.value=map[s.value]}
function validMainData(){try{const raw=localStorage.getItem('acqProMobile');if(!raw)return true;const d=JSON.parse(raw);return !!d&&typeof d==='object'&&Array.isArray(d.contacts)&&d.stats&&typeof d.stats==='object'}catch{return false}}
function snapshot(){try{if(!validMainData())return;const data={};DATA_KEYS.forEach(k=>data[k]=localStorage.getItem(k));localStorage.setItem(SNAP,JSON.stringify({ts:new Date().toISOString(),data}));log('snapshot','Snapshot dati valido creato')}catch(e){log('error','Snapshot fallito',String(e))}}
function restoreSnapshot(){try{const s=JSON.parse(localStorage.getItem(SNAP)||'null');if(!s||!s.data)return false;Object.entries(s.data).forEach(([k,v])=>{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)});log('repair','Dati ripristinati da snapshot');return true}catch(e){log('error','Ripristino snapshot fallito',String(e));return false}}
function dataHealth(){if(!validMainData()){log('error','Dati principali corrotti');restoreSnapshot()}try{const total=Object.keys(localStorage).reduce((n,k)=>n+(localStorage.getItem(k)||'').length,0);if(total>3500000)log('warn','Dati locali sopra 3.5MB',{chars:total})}catch{}}
function loadScript(src,attempt=0,timeout=5000){return new Promise((resolve,reject)=>{const clean=src.split('?')[0];const existing=[...document.scripts].find(s=>s.src&&s.src.includes('/'+clean));if(existing&&attempt===0){resolve('present');return}const s=document.createElement('script');let done=false;const t=setTimeout(()=>{if(done)return;done=true;s.remove();reject(new Error('timeout '+clean))},timeout);s.src='./'+clean+'?v=21&attempt='+attempt+'&t='+Date.now();s.async=true;s.onload=()=>{if(done)return;done=true;clearTimeout(t);resolve('loaded')};s.onerror=()=>{if(done)return;done=true;clearTimeout(t);s.remove();reject(new Error('load '+clean))};document.body.appendChild(s)})}
async function ensure(src,test,required=true){for(let i=0;i<2;i++){try{if(test&&test())return true;await loadScript(src,i);await new Promise(r=>setTimeout(r,60));if(!test||test()){log('module','Modulo OK '+src);return true}}catch(e){log('warn','Modulo fallito '+src,{try:i+1,error:String(e)})}}if(required)log('error','Modulo obbligatorio non disponibile '+src);return false}
function safeMode(){document.documentElement.dataset.acqSafeMode='1';let b=document.getElementById('acqSafeModeNotice');if(!b){b=document.createElement('div');b.id='acqSafeModeNotice';b.style.cssText='position:sticky;top:0;z-index:9999;padding:8px;background:#fff3cd;color:#6b5300;text-align:center;font:700 12px Arial';b.textContent='MODALITÀ SICURA — core operativo, dati preservati';document.body.prepend(b)}log('repair','Modalità sicura attivata')}
function selfCheck(){normalize();const opts=[...document.querySelectorAll('#source option')].map(o=>o.textContent.trim());const checks={core:typeof window.start==='function'&&typeof window.ans==='function',contact:!!document.getElementById('name')&&!!document.getElementById('phone')&&!!document.getElementById('address'),sources:!opts.some(x=>['Referral','Partner','Inbound'].includes(x)),close:typeof window.closeContact==='function',zone:!!document.getElementById('acquisizioneVaiQuiButton'),geo:!!document.getElementById('sonoQuiButton'),resume:!!document.getElementById('riprendiDaIeri'),manualAddress:!!document.getElementById('inserisciViaCivico'),performance:!!document.getElementById('perfCard'),news:!!document.getElementById('newsBtn'),goals:!!document.getElementById('goalBtn'),backup:!!document.getElementById('backupDataButton')};const fail=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);log(fail.length?'warn':'ok','Autodiagnosi',{checks,fail});return{checks,fail}}
function countFailure(){const n=(+localStorage.getItem(FAIL)||0)+1;localStorage.setItem(FAIL,String(n));if(n>=4)safeMode()}
window.addEventListener('error',e=>{log('js-error',e.message,{src:e.filename,line:e.lineno});countFailure()});
window.addEventListener('unhandledrejection',e=>{log('promise-error',String(e.reason));countFailure()});
async function boot(){normalize();dataHealth();setTimeout(snapshot,500);for(const [src,test] of REQUIRED)await ensure(src,test,true);for(const src of OPTIONAL)ensure(src,null,false);normalize();const r=selfCheck();if(r.fail.includes('close')||r.fail.includes('contact')||r.fail.includes('zone'))safeMode();else localStorage.setItem(FAIL,'0');snapshot();window.__ACQ_READY__=true;window.dispatchEvent(new CustomEvent('acq-ready',{detail:r}))}
window.AcqDiagnostics={version:VER,run:selfCheck,log:()=>JSON.parse(localStorage.getItem(LOG)||'[]'),snapshot,restoreSnapshot,safeMode};
if(document.readyState==='complete')setTimeout(boot,0);else window.addEventListener('load',()=>setTimeout(boot,0),{once:true});
})();
