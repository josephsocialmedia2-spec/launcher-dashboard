(()=>{'use strict';
const $=id=>document.getElementById(id);
const META={
  persona:{icon:'👥',title:'PERSONA'},
  cartello:{icon:'🏷️',title:'CARTELLO VENDESI'},
  condominio:{icon:'🏢',title:'CONDOMINIO / CASA'},
  attivita:{icon:'🏪',title:'NEGOZIO / BAR'},
  professionista:{icon:'👔',title:'PROFESSIONISTA'},
  telefono:{icon:'☎️',title:'TELEFONATA'}
};
let current=null;
function syncGuide(){const out=$('situationGuide'),src=$('say');if(out&&src)out.textContent=src.textContent||''}
function openOverlay(key){
  const meta=META[key];if(!meta)return;
  current=key;
  $('situationIcon').textContent=meta.icon;
  $('situationTitle').textContent=meta.title;
  $('situationOverlay').dataset.situation=key;
  $('situationOverlay').classList.add('open');
  $('situationOverlay').setAttribute('aria-hidden','false');
  document.body.classList.add('situationOverlayOpen');
  syncGuide();
  setTimeout(()=>$('situationClose')?.focus(),30);
}
function closeOverlay(){
  const o=$('situationOverlay');if(!o)return;
  o.classList.remove('open');o.setAttribute('aria-hidden','true');delete o.dataset.situation;
  document.body.classList.remove('situationOverlayOpen');current=null;
}
function runSituation(button){
  const fn=button?.onclick;if(typeof fn==='function')fn.call(button);
  openOverlay(button.dataset.situation);
}
function runAnswer(key){
  const core=document.querySelector(`.answers [data-answer="${CSS.escape(key)}"]`);
  if(core&&typeof core.onclick==='function')core.onclick.call(core);
  syncGuide();
}
function init(){
  const overlay=$('situationOverlay');if(!overlay)return;
  document.addEventListener('click',e=>{
    const situation=e.target.closest?.('[data-situation]');
    if(situation&&!situation.closest('#situationOverlay')){
      e.preventDefault();e.stopImmediatePropagation();runSituation(situation);return;
    }
    const answer=e.target.closest?.('[data-overlay-answer]');
    if(answer){e.preventDefault();runAnswer(answer.dataset.overlayAnswer);return;}
  },true);
  $('situationClose')?.addEventListener('click',closeOverlay);
  $('situationBack')?.addEventListener('click',closeOverlay);
  $('situationRegister')?.addEventListener('click',()=>{closeOverlay();$('newContactBtn')?.click()});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('open'))closeOverlay()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.AcqSituationOverlay={open:openOverlay,close:closeOverlay,getCurrent:()=>current};
})();
