(()=>{'use strict';
const VERSION='20260914-guide3';
const $=id=>document.getElementById(id);
const txt=v=>String(v||'').trim().toUpperCase();
let workspaceUrl='',workspaceLabel='';

function sameOrigin(url){
  try{const u=new URL(url||'index.html',location.href);return u.origin===location.origin?u:null}catch(_){return null}
}
function setStatus(message,error=false){
  const e=$('f1AiStatus');
  if(!e)return;
  e.textContent=message;
  e.className='f1-ai-status on'+(error?' err':'');
  clearTimeout(e._guidedTimer);
  e._guidedTimer=setTimeout(()=>e.className='f1-ai-status',5000);
}
function currentDailyTask(){
  const title=txt($('f1AiTitle')?.textContent);
  return (window.F1DailyCommand?.TASKS||[]).find(t=>txt(t.name)===title)||null;
}
function inferHref(){
  const daily=currentDailyTask();
  if(daily?.href&&daily.href!=='#')return daily.href;
  const where=txt($('f1AiWhere')?.textContent),title=txt($('f1AiTitle')?.textContent),v=`${where} ${title}`;
  if(/CENTRALE RISULTATI/.test(v))return'centrale-risultati.html';
  if(/FOLLOW/.test(v))return'oggi.html#tasks';
  if(/TELEFON|PROSPECT|CONTATT/.test(v))return'telefonate-oggi.html';
  if(/SCADUT|SELLER RADAR/.test(v))return'seller-radar-unico.html?view=scaduti';
  if(/MARKET PREVIEW/.test(v))return'market-preview.html';
  if(/ADDRESS|INDIRIZZ/.test(v))return'address-intelligence.html';
  if(/CLIENTI PASSATI|CENTRO DI INFLUENZA|REFERRAL|COI/.test(v))return'clienti-passati-coi.html';
  if(/SCRIPT/.test(v))return'script.html';
  return'crm.html';
}
function ensureWorkspace(){
  const left=document.querySelector('.f1-dashboard-left');
  if(!left)return null;
  let ws=$('f1GuidedWorkspace');
  if(ws)return ws;
  ws=document.createElement('section');
  ws.id='f1GuidedWorkspace';
  ws.className='f1-guided-workspace';
  ws.setAttribute('aria-label','Postazione operativa guidata');
  ws.innerHTML=`<div class="f1-guided-toolbar">
    <div class="f1-guided-heading"><span class="f1-guided-kicker">MODALITÀ GUIDATA · LA GUIDA RESTA SEMPRE A DESTRA</span><b id="f1GuidedTitle">MODULO OPERATIVO</b></div>
    <div class="f1-guided-tools"><button type="button" id="f1GuidedBack">TORNA ALLA DASHBOARD</button><button type="button" id="f1GuidedReload">RICARICA MODULO</button><a id="f1GuidedPopout" href="#" target="_blank" rel="noopener">APRI PAGINA</a></div>
  </div>
  <div class="f1-guided-instruction"><b id="f1GuidedTask">TASK CORRENTE</b><span>Segui la GUIDA FUNZIONARIO a destra. Non cambiare attività finché non hai raggiunto la condizione di completamento.</span></div>
  <iframe id="f1GuidedFrame" title="Modulo operativo F1" loading="eager"></iframe>`;
  left.appendChild(ws);
  $('f1GuidedBack').onclick=closeWorkspace;
  $('f1GuidedReload').onclick=()=>{const f=$('f1GuidedFrame');if(f?.src)f.src=f.src};
  return ws;
}
function openWorkspace(url,label){
  const u=sameOrigin(url);
  if(!u){if(url)window.open(url,'_blank','noopener');setStatus('Strumento esterno aperto in una nuova scheda. La guida resta qui.');return false}
  if(/\/(?:index\.html)?$/.test(u.pathname)&&!u.search&&!u.hash){closeWorkspace();return true}
  const ws=ensureWorkspace();
  if(!ws)return false;
  workspaceUrl=u.href;
  workspaceLabel=label||$('f1AiWhere')?.textContent||$('f1AiTitle')?.textContent||'MODULO OPERATIVO';
  $('f1GuidedTitle').textContent=workspaceLabel;
  $('f1GuidedTask').textContent=`STAI LAVORANDO SU: ${$('f1AiTitle')?.textContent||'TASK CORRENTE'}`;
  $('f1GuidedPopout').href=u.href;
  const frame=$('f1GuidedFrame');
  if(frame.src!==u.href)frame.src=u.href;
  document.querySelector('.f1-dashboard-left')?.classList.add('f1-guided-open');
  ws.classList.add('on');
  setStatus(`MODULO APERTO · ${workspaceLabel}. La guida resta visibile a destra.`);
  return true;
}
function closeWorkspace(){
  $('f1GuidedWorkspace')?.classList.remove('on');
  document.querySelector('.f1-dashboard-left')?.classList.remove('f1-guided-open');
  workspaceUrl='';workspaceLabel='';
}
async function markCloudRunning(){
  try{
    if(!window.F1StaffData?.ready?.())return;
    const profile=await F1StaffData.me(),uid=profile.user_id||profile.userId;
    const rows=await F1StaffData.tasks(uid),title=txt($('f1AiTitle')?.textContent);
    const row=(rows||[]).find(t=>{
      const status=txt(t.status),name=txt(`${t.reason||''} ${t.task_type||''}`);
      return !['DONE','COMPLETED','CLOSED','CANCELLED','ANNULLATO','ARCHIVED'].includes(status)&&(name.includes(title)||title.includes(name));
    });
    if(row?.task_id)await F1StaffData.rest(`tasks?task_id=eq.${encodeURIComponent(row.task_id)}`,{method:'PATCH',body:JSON.stringify({status:'IN_PROGRESS',updated_at:new Date().toISOString()}),prefer:'return=minimal'});
  }catch(_){/* best effort: la guida non deve bloccarsi per il cloud */}
}
function syncButton(){
  const b=$('f1AiStart');if(!b)return;
  const d=currentDailyTask(),running=d&&window.F1DailyCommand?.loadState?.()?.tasks?.[d.id]?.status==='running';
  b.textContent=running?'APRI MODULO':'AVVIA E APRI';
}
async function startGuided(){
  const daily=currentDailyTask();
  try{
    if(daily)window.F1DailyCommand?.startTask?.(daily.id);else await markCloudRunning();
    syncButton();
    openWorkspace(inferHref(),$('f1AiWhere')?.textContent||$('f1AiTitle')?.textContent);
    setStatus('TASK AVVIATO · lavora nel modulo a sinistra e segui la guida a destra.');
  }catch(e){setStatus('ERRORE AVVIO · '+String(e.message||e),true)}
}
function captureGuideClick(e){
  const target=e.target instanceof Element?e.target:null;if(!target)return;
  if(target.closest('#f1AiStart')){
    e.preventDefault();e.stopImmediatePropagation();startGuided();return;
  }
  const link=target.closest('#f1AIGuide a[href]');
  if(link){
    const u=sameOrigin(link.getAttribute('href'));
    if(u){e.preventDefault();e.stopImmediatePropagation();openWorkspace(u.href,link.textContent.trim()||'MODULO OPERATIVO')}
  }
}
function afterGuideClick(e){
  const target=e.target instanceof Element?e.target:null;if(!target)return;
  if(target.closest('#f1AiDone'))setTimeout(closeWorkspace,30);
}
function init(){
  document.addEventListener('click',captureGuideClick,true);
  document.addEventListener('click',afterGuideClick,false);
  const observer=new MutationObserver(()=>{
    syncButton();
    if($('f1GuidedWorkspace')?.classList.contains('on')&&$('f1GuidedTask'))$('f1GuidedTask').textContent=`STAI LAVORANDO SU: ${$('f1AiTitle')?.textContent||'TASK CORRENTE'}`;
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  const wait=setInterval(()=>{if($('f1AIGuide')){clearInterval(wait);syncButton();ensureWorkspace()}},100);
  setTimeout(()=>clearInterval(wait),10000);
}
window.F1GuidedWorkspace={version:VERSION,open:openWorkspace,close:closeWorkspace,state:()=>({open:!!$('f1GuidedWorkspace')?.classList.contains('on'),url:workspaceUrl,label:workspaceLabel})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
// Integration trigger: companion must remain loaded by index.html.
})();
