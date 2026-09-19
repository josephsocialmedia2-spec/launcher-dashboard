(()=>{
'use strict';
const VERSION='20260919-home-dashboard-v2';
const INACTIVITY_MS=5*60*1000;
const $=id=>document.getElementById(id);
const qs=s=>document.querySelector(s);
const qsa=s=>[...document.querySelectorAll(s)];
let idleTimer=0,lastActivity=Date.now();

function injectStyle(){
  if($('f1HomeDashboardStyle'))return;
  document.documentElement.classList.add('f1-home-dashboard-v1');
  const s=document.createElement('style');
  s.id='f1HomeDashboardStyle';
  s.textContent=`
  .f1-home-dash{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
  .f1-home-tile{min-height:96px;border:1px solid var(--line);border-radius:16px;background:#fff;color:var(--ink);padding:12px;text-align:left;display:flex;flex-direction:column;justify-content:space-between;gap:8px;cursor:pointer;box-shadow:0 4px 14px rgba(12,43,27,.06)}
  .f1-home-tile strong{font-size:12px;font-weight:950;line-height:1.15}.f1-home-tile small{font-size:9px;color:var(--mut);font-weight:800;line-height:1.35}.f1-home-tile .ico{font-size:22px;line-height:1}
  .f1-home-tile.resume{background:linear-gradient(180deg,#f5fff8,#e8f7ed);border-color:#9dceb0}.f1-home-tile.capture{background:linear-gradient(145deg,#063e25,#0b6f3d);border-color:#063e25;color:#fff}.f1-home-tile.capture small{color:#d6efe0}.f1-home-tile:disabled{opacity:.48;cursor:not-allowed}
  .f1-home-idle-note{margin-top:8px;padding:8px 9px;border:1px solid #d8e5dc;border-radius:10px;background:#f7faf8;color:var(--mut);font-size:9px;font-weight:850;line-height:1.35}
  @media(max-width:720px){
    .f1-home-dashboard-v1 .top{grid-template-columns:auto minmax(0,1fr)!important;row-gap:6px!important;padding:7px 8px!important}
    .f1-home-dashboard-v1 .top .meta{grid-column:1/-1!important;display:grid!important;grid-template-columns:auto repeat(5,minmax(0,1fr))!important;grid-template-rows:auto auto!important;gap:5px!important;overflow:visible!important;width:100%!important}
    .f1-home-dashboard-v1 .top .meta>#clock{grid-column:1;grid-row:1;align-self:center;font-size:11px!important}
    .f1-home-dashboard-v1 .top .meta>.topnav:nth-of-type(1){grid-column:2;grid-row:1}
    .f1-home-dashboard-v1 .top .meta>.topnav:nth-of-type(2){grid-column:3;grid-row:1}
    .f1-home-dashboard-v1 .top .meta>.topnav:nth-of-type(3){grid-column:4;grid-row:1}
    .f1-home-dashboard-v1 .top .meta>.topnav:nth-of-type(4){grid-column:5;grid-row:1}
    .f1-home-dashboard-v1 .top .meta>.topnav:nth-of-type(5){grid-column:6;grid-row:1}
    .f1-home-dashboard-v1 .top .meta>.topnav{width:100%;min-height:38px!important;padding:4px 3px!important;font-size:9px!important}
    .f1-home-dashboard-v1 #lettersNotice{grid-column:1/span 2;grid-row:2;justify-self:start;min-width:42px;min-height:32px!important;justify-content:center}
    .f1-home-dashboard-v1 #lettersNotice .label{display:none!important}
    .f1-home-dashboard-v1 #crmSyncStatus{grid-column:3/span 2;grid-row:2;justify-self:center;align-self:center}
    .f1-home-dashboard-v1 #gpsStatus{grid-column:5/span 2;grid-row:2;justify-self:end;align-self:center}
    .f1-home-dashboard-v1 .performance{top:var(--f1-mobile-top-height,92px)!important}
  }
  @media(max-width:390px){.f1-home-dash{gap:7px}.f1-home-tile{min-height:90px;padding:10px}.f1-home-tile strong{font-size:11px}.f1-home-tile small{font-size:8px}}
  `;
  document.head.appendChild(s);
}

function updateTopOffset(){
  const top=qs('.top');
  if(!top)return;
  document.documentElement.style.setProperty('--f1-mobile-top-height',Math.ceil(top.getBoundingClientRect().height)+'px');
}

function activateMunicipalityHome(reason='manual'){
  try{qs('.topnav[data-screen="home"]')?.click()}catch(_){}
  setTimeout(()=>{
    const target=$('municipalities');
    if(!target)return;
    qsa('.screen').forEach(s=>s.classList.toggle('active',s===target));
    qsa('.topnav').forEach(b=>b.classList.toggle('active',b.dataset.screen==='home'));
    $('globalBack')?.classList.add('hidden');
    qsa('.modal.open').forEach(m=>m.classList.remove('open'));
    try{history.replaceState(null,'',location.pathname+location.search)}catch(_){}
    window.scrollTo(0,0);
    syncDashboard();
    if(reason==='idle')document.documentElement.dataset.f1IdleReturn='1';
  },0);
}

function clickCore(screen){
  const b=qs(`.topnav[data-screen="${screen}"]`);
  if(b)b.click();
}

function syncDashboard(){
  const place=$('mobileResumePlace')?.textContent?.trim()||'Nessun giro salvato';
  const meta=$('mobileResumeMeta')?.textContent?.trim()||'Il CRM conserva automaticamente il punto di lavoro.';
  const r=$('f1HomeResume');
  const rp=$('f1HomeResumePlace');
  const rm=$('f1HomeResumeMeta');
  if(rp)rp.textContent=place;
  if(rm)rm.textContent=meta;
  if(r){
    const core=$('mobileResumeBtn');
    r.disabled=!!core?.disabled||!core;
  }
}

function openPrivateSign(){
  if(!window.F1SignCapture?.open){
    alert('FUNZIONE CARTELLO NON ANCORA PRONTA. RIPROVA TRA UN ISTANTE.');
    return;
  }
  window.F1SignCapture.open({autoTake:true,source:'HOME_SCATTA_CARTELLO_PRIVATO'});
}
function buildDashboard(){
  const screen=$('municipalities');
  const card=screen?.querySelector('.card');
  const shell=$('f1RaccShell');
  if(!screen||!card||!shell)return false;
  if($('f1HomeDashboard')){syncDashboard();return true}
  const dash=document.createElement('div');
  dash.id='f1HomeDashboard';
  dash.className='f1-home-dash';
  dash.innerHTML=`
    <button id="f1HomeResume" class="f1-home-tile resume" type="button">
      <span class="ico">▶</span><span><strong>RIPRENDI GIRO</strong><small id="f1HomeResumePlace">—</small></span>
    </button>
    <button id="f1HomePrivateSign" class="f1-home-tile capture" type="button">
      <span class="ico">📷</span><span><strong>SCATTA CARTELLO PRIVATO</strong><small>Foto → notizia CRM → verifica proprietario</small></span>
    </button>
    <button id="f1HomeToday" class="f1-home-tile" type="button">
      <span class="ico">✓</span><span><strong>OGGI</strong><small>Appuntamenti, follow-up e lettere</small></span>
    </button>
    <button id="f1HomeCRM" class="f1-home-tile" type="button">
      <span class="ico">▦</span><span><strong>CRM</strong><small>Tutto il lavoro svolto</small></span>
    </button>`;
  shell.insertAdjacentElement('afterend',dash);
  const note=document.createElement('div');
  note.id='f1HomeIdleNote';
  note.className='f1-home-idle-note';
  note.innerHTML='<b>HOME AUTOMATICA</b> · dopo 5 minuti senza utilizzo l’app torna qui senza perdere il giro salvato.';
  dash.insertAdjacentElement('afterend',note);
  $('f1HomeResume').addEventListener('click',()=>{
    const core=$('mobileResumeBtn');
    if(core&&!core.disabled)core.click();
  });
  $('f1HomePrivateSign').addEventListener('click',openPrivateSign);
  $('f1HomeToday').addEventListener('click',()=>clickCore('oggi'));
  $('f1HomeCRM').addEventListener('click',()=>clickCore('crm'));
  syncDashboard();
  return true;
}

function scheduleIdle(){
  clearTimeout(idleTimer);
  const delay=Math.max(250,INACTIVITY_MS-(Date.now()-lastActivity)+50);
  idleTimer=setTimeout(checkIdle,delay);
}
function markActivity(){lastActivity=Date.now();scheduleIdle()}
function checkIdle(){
  const elapsed=Date.now()-lastActivity;
  if(elapsed>=INACTIVITY_MS){activateMunicipalityHome('idle');lastActivity=Date.now()}
  scheduleIdle();
}
function bindIdle(){
  ['pointerdown','touchstart','keydown','input','scroll'].forEach(ev=>window.addEventListener(ev,markActivity,{passive:true,capture:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkIdle()});
  scheduleIdle();
}

function observeResume(){
  const nodes=[$('mobileResumePlace'),$('mobileResumeMeta'),$('mobileResumeBtn')].filter(Boolean);
  if(!nodes.length)return;
  const o=new MutationObserver(syncDashboard);
  nodes.forEach(n=>o.observe(n,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled']}));
}

function boot(){
  injectStyle();
  bindIdle();
  let tries=0;
  const t=setInterval(()=>{
    tries++;
    const ready=buildDashboard();
    updateTopOffset();
    if(ready||tries>160){clearInterval(t);observeResume()}
  },50);
  window.addEventListener('resize',updateTopOffset,{passive:true});
  setTimeout(updateTopOffset,250);
  setTimeout(syncDashboard,900);
}

window.F1TerritoryHomeDashboard={version:VERSION,home:activateMunicipalityHome,sync:syncDashboard};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();