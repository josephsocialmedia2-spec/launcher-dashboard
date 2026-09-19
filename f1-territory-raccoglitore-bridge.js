(()=>{
'use strict';
const VERSION='20260919-secure-raccoglitore1';
const RACC='./F1_Raccoglitore_Dati_Operativo_V6_LAYOUT_V2_ESATTO.html';
const $=id=>document.getElementById(id);
let alerts={followup_today:0,followup_overdue:0,followup_upcoming:0,news_over_7:0};
let secretTaps=[];
function num(v){return Number(v||0)||0}
function injectStyle(){
  if($('f1RaccBridgeStyle'))return;
  const s=document.createElement('style');s.id='f1RaccBridgeStyle';s.textContent=`
  .f1-muni-head{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;border:0;background:transparent;padding:2px 0 8px;text-align:left;color:var(--ink);cursor:pointer}
  .f1-muni-head strong{font-size:20px;font-weight:950}.f1-muni-head span{font-size:20px;font-weight:950;color:var(--g);transition:transform .18s ease}.f1-muni-head[aria-expanded="true"] span{transform:rotate(180deg)}
  .f1-muni-help{font-size:10px;color:var(--mut);font-weight:800;margin:-2px 0 10px}.f1-muni-body[hidden]{display:none!important}
  .f1-racc-shell{margin-top:12px;border:1px solid #c9ded2;border-radius:14px;background:#fff;overflow:hidden;box-shadow:0 6px 20px rgba(11,111,61,.06)}
  .f1-racc-row{display:grid;grid-template-columns:minmax(0,1fr) 18px auto;align-items:center;gap:6px;padding:7px 8px}
  .f1-racc-brand{min-width:0;border:0;background:transparent;display:flex;align-items:center;gap:7px;padding:0;text-align:left;cursor:pointer;color:var(--ink)}
  .f1-racc-logo{width:27px;height:27px;border-radius:8px;background:var(--g);color:#fff;display:grid;place-items:center;font-size:11px;font-weight:950;flex:0 0 auto}.f1-racc-name{font-size:12px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.f1-racc-caret{font-size:11px;color:var(--g);font-weight:950;margin-left:auto}.f1-racc-brand[aria-expanded="true"] .f1-racc-caret{transform:rotate(180deg)}
  .f1-secret-dot{width:12px;height:12px;padding:0;border-radius:50%;border:1px solid #fff;background:#20b768;box-shadow:0 0 0 1px #0b6f3d,0 0 6px rgba(32,183,104,.55);cursor:pointer}
  .f1-watch-news{min-height:30px;border:1px solid #b9dfc9;border-radius:8px;background:#eef9f2;color:#07502d;padding:5px 7px;font-size:9px;font-weight:950;white-space:nowrap;cursor:pointer}.f1-watch-news em{display:inline-flex;min-width:16px;height:16px;align-items:center;justify-content:center;border-radius:999px;background:#b42318;color:#fff;font-size:8px;font-style:normal;margin-left:3px}.f1-watch-news em:empty{display:none}
  .f1-racc-actions{border-top:1px solid var(--line);padding:9px;display:grid;gap:8px;background:#f8fbf9}.f1-racc-actions[hidden]{display:none!important}.f1-alert-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.f1-alert{border:1px solid var(--line);border-radius:9px;background:#fff;padding:7px 8px;display:flex;align-items:center;justify-content:space-between;gap:5px;font-size:9px;font-weight:900}.f1-alert strong{font-size:14px;color:var(--gd)}.f1-alert.warn strong{color:#b42318}.f1-racc-buttons{display:grid;grid-template-columns:1fr 1fr;gap:6px}.f1-racc-buttons button{min-height:36px;border:1px solid var(--line);border-radius:9px;background:#fff;font-size:9px;font-weight:950;color:var(--ink);cursor:pointer}.f1-racc-buttons button.primary{background:var(--g);color:#fff;border-color:var(--g)}
  @media(max-width:390px){.f1-racc-row{grid-template-columns:minmax(0,1fr) 16px auto;gap:4px;padding:6px}.f1-racc-logo{width:24px;height:24px}.f1-racc-name{font-size:10px}.f1-watch-news{font-size:8px;padding:4px 5px}.f1-alert-grid{grid-template-columns:1fr 1fr}}
  `;document.head.appendChild(s);
}
function setBackVisibility(){
  const b=$('globalBack');if(!b)return;
  const start=$('municipalities')?.classList.contains('active');
  b.classList.toggle('hidden',!!start);
}
function buildMunicipalityAccordion(){
  const screen=$('municipalities'),card=screen?.querySelector('.card');
  if(!card||$('f1MunicipalityAccordion'))return false;
  const oldTitle=card.querySelector('h1'),input=$('v3MunicipalitySearch'),list=$('v3MunicipalityList');
  if(!input||!list)return false;
  card.querySelector('.ey')?.classList.add('hidden');
  if(oldTitle)oldTitle.classList.add('hidden');
  const head=document.createElement('button');head.type='button';head.id='f1MunicipalityAccordion';head.className='f1-muni-head';head.setAttribute('aria-expanded','false');head.innerHTML='<strong>COMUNI DELLA VALLE DI SUSA</strong><span>⌄</span>';
  const help=document.createElement('div');help.className='f1-muni-help';help.textContent='Tocca il titolo per aprire tutti i Comuni.';
  const body=document.createElement('div');body.id='f1MunicipalityBody';body.className='f1-muni-body';body.hidden=true;
  input.parentNode.insertBefore(head,input);head.after(help);help.after(body);body.append(input,list);
  head.onclick=()=>{const open=head.getAttribute('aria-expanded')!=='true';head.setAttribute('aria-expanded',String(open));body.hidden=!open};
  return true;
}
function buildRaccoglitoreBar(){
  if($('f1RaccShell'))return true;
  const card=$('municipalities')?.querySelector('.card');if(!card)return false;
  const shell=document.createElement('div');shell.id='f1RaccShell';shell.className='f1-racc-shell';shell.innerHTML=`
    <div class="f1-racc-row">
      <button id="f1RaccBrand" class="f1-racc-brand" type="button" aria-expanded="false"><span class="f1-racc-logo">F1</span><span class="f1-racc-name">F1 Immobiliare</span><span class="f1-racc-caret">⌄</span></button>
      <button id="f1RaccSecretDot" class="f1-secret-dot" type="button" aria-label="Accesso riservato"></button>
      <button id="f1RaccNews" class="f1-watch-news" type="button">GUARDA NOTIZIE <em id="f1NewsOver7Badge"></em></button>
    </div>
    <div id="f1RaccActions" class="f1-racc-actions" hidden>
      <div class="f1-alert-grid">
        <div class="f1-alert"><span>FOLLOW-UP OGGI</span><strong id="f1FollowToday">0</strong></div>
        <div class="f1-alert warn"><span>SCADUTI</span><strong id="f1FollowOverdue">0</strong></div>
        <div class="f1-alert"><span>PROSSIMI</span><strong id="f1FollowUpcoming">0</strong></div>
        <div class="f1-alert warn"><span>VERIFICA &gt;7 GG</span><strong id="f1NewsOver7">0</strong></div>
      </div>
      <div class="f1-racc-buttons"><button id="f1OpenFollow" type="button">APRI FOLLOW-UP</button><button id="f1EnableNotifications" class="primary" type="button">ATTIVA NOTIFICHE</button></div>
    </div>`;
  card.appendChild(shell);
  $('f1RaccBrand').onclick=()=>{const b=$('f1RaccBrand'),a=$('f1RaccActions'),open=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',String(open));a.hidden=!open};
  $('f1RaccNews').onclick=e=>{e.stopPropagation();location.href=RACC+'#news'};
  $('f1OpenFollow').onclick=()=>{location.href=RACC+'#followup'};
  $('f1EnableNotifications').onclick=requestNotifications;
  $('f1RaccSecretDot').onclick=e=>{e.preventDefault();e.stopPropagation();const now=Date.now();secretTaps=secretTaps.filter(t=>now-t<=3000);secretTaps.push(now);if(secretTaps.length>=5){secretTaps=[];location.href=RACC}};
  return true;
}
async function loadAlerts(){
  if(!window.F1StaffData?.rpc||!window.F1Sync?.ready?.())return;
  try{
    const a=await F1StaffData.rpc('f1_raccoglitore_alerts_v1',{});alerts=a||alerts;
    const map={f1FollowToday:'followup_today',f1FollowOverdue:'followup_overdue',f1FollowUpcoming:'followup_upcoming',f1NewsOver7:'news_over_7'};
    for(const [id,k] of Object.entries(map))if($(id))$(id).textContent=String(num(alerts[k]));
    if($('f1NewsOver7Badge'))$('f1NewsOver7Badge').textContent=num(alerts.news_over_7)?String(num(alerts.news_over_7)):'';
    maybeNotify(false);
  }catch(e){console.warn('F1 alerts',e)}
}
async function requestNotifications(){
  if(!('Notification' in window)){alert('Le notifiche browser non sono supportate su questo dispositivo.');return}
  try{const p=await Notification.requestPermission();if(p==='granted'){await maybeNotify(true);$('f1EnableNotifications').textContent='NOTIFICHE ATTIVE'}else $('f1EnableNotifications').textContent='NOTIFICHE NON ATTIVE'}catch(e){console.warn(e)}
}
async function maybeNotify(force){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  const due=num(alerts.followup_today)+num(alerts.followup_overdue),stale=num(alerts.news_over_7);if(!due&&!stale)return;
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date()),key='f1TerritoryNotice:'+day+':'+due+':'+stale;
  if(!force&&localStorage.getItem('f1TerritoryNoticeLast')===key)return;
  const body=[due?due+' follow-up da gestire':'',stale?stale+' notizie da verificare oltre 7 giorni':''].filter(Boolean).join(' · ');
  try{if(navigator.serviceWorker){const reg=await navigator.serviceWorker.ready;await reg.showNotification('F1 Territory · attività da gestire',{body,tag:'f1-territory-alerts-'+day,renotify:false})}else new Notification('F1 Territory · attività da gestire',{body})}catch(_){try{new Notification('F1 Territory · attività da gestire',{body})}catch(__){}}
  localStorage.setItem('f1TerritoryNoticeLast',key);
}
function observeScreens(){
  document.querySelectorAll('.screen').forEach(s=>new MutationObserver(setBackVisibility).observe(s,{attributes:true,attributeFilter:['class']}));setBackVisibility();
}
function boot(){
  injectStyle();let tries=0;const timer=setInterval(()=>{tries++;if(buildMunicipalityAccordion()&&buildRaccoglitoreBar()){clearInterval(timer);observeScreens();loadAlerts();setInterval(loadAlerts,60000)}else if(tries>120)clearInterval(timer)},50);
}
window.F1TerritoryRaccoglitoreBridge={version:VERSION,loadAlerts};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
