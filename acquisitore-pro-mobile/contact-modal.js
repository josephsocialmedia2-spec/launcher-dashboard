(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const SOURCES=['Giro zona','Cartello','Annuncio','Segnalazione','Professionista / collaboratore','Persona che ci ha contattato'];
const OUTCOMES=['Da richiamare','Possibile vendita','Interessato','Appuntamento','Valutazione','Segnalazione','Nuovo immobile','Non interessato','Da ripassare'];
let pendingCoreEditButton=null;
function state(){try{return window.AcquisitorePro?.getState?.()||{contacts:[]}}catch{return{contacts:[]}}}
function options(values,current){return values.map(v=>`<option${v===current?' selected':''}>${esc(v)}</option>`).join('')}
function selectedContact(id){return (state().contacts||[]).find(c=>String(c.id)===String(id))||null}
function readModal(){return{name:$('mcName').value.trim(),phone:$('mcPhone').value.trim(),address:$('mcAddress').value.trim(),source:$('mcSource').value,note:$('mcNote').value.trim(),outcome:$('mcOutcome').value,next:$('mcNext').value.trim(),date:$('mcDate').value}}
function copyToCore(v){
  $('name').value=v.name;$('phone').value=v.phone;$('address').value=v.address;$('note').value=v.note;$('nextAction').value=v.next;$('nextDate').value=v.date;
  if([...$('source').options].some(o=>o.value===v.source))$('source').value=v.source;
  if([...$('outcome').options].some(o=>o.value===v.outcome))$('outcome').value=v.outcome;
}
function openEditor(contact=null,coreButton=null){
  const c=contact||{name:'',phone:'',address:'',source:'Giro zona',note:'',outcome:'Da richiamare',next:'',date:''};
  const editing=!!contact;pendingCoreEditButton=editing?coreButton:null;
  $('dialogTitle').textContent=editing?'MODIFICA CONTATTO':'NUOVO CONTATTO';
  $('dialogBody').innerHTML=`<div class="fields contactModalFields">
    <input id="mcName" placeholder="Nome / riferimento" value="${esc(c.name||'')}">
    <input id="mcPhone" inputmode="tel" autocomplete="tel" placeholder="Telefono" value="${esc(c.phone||'')}">
    <input id="mcAddress" autocomplete="street-address" placeholder="Indirizzo / zona" value="${esc(c.address||'')}">
    <label>Fonte<select id="mcSource">${options(SOURCES,c.source||'Giro zona')}</select></label>
    <textarea id="mcNote" placeholder="Nota rapida">${esc(c.note||'')}</textarea>
    <label>Esito<select id="mcOutcome">${options(OUTCOMES,c.outcome||'Da richiamare')}</select></label>
    <input id="mcNext" placeholder="Prossima azione" value="${esc(c.next||'')}">
    <label>Data richiamo<input id="mcDate" type="date" value="${esc(c.date||'')}"></label>
    <div id="mcError" class="muted"></div>
    <button id="mcSave" class="btn green">${editing?'✓ SALVA MODIFICA':'✓ SALVA CONTATTO'}</button>
  </div>`;
  const dlg=$('genericDialog');if(!dlg.open)dlg.showModal();setTimeout(()=>$('mcName')?.focus(),80);
  $('mcSave').onclick=()=>{
    const v=readModal();if(!v.name&&!v.phone&&!v.address&&!v.note){$('mcError').textContent='Inserisci almeno un dato del contatto.';return}
    if(editing){const coreEdit=pendingCoreEditButton?.onclick;if(typeof coreEdit!=='function'){$('mcError').textContent='Impossibile aprire il contatto. Chiudi e riapri la lista.';return}coreEdit.call(pendingCoreEditButton)}
    copyToCore(v);$('closeContactBtn').click();pendingCoreEditButton=null;$('contactsBtn').click();
  };
}
function init(){
  $('newContactBtn')?.addEventListener('click',()=>openEditor(null,null));
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-contact-edit]');if(!b)return;const c=selectedContact(b.dataset.contactEdit);if(!c)return;e.preventDefault();e.stopImmediatePropagation();openEditor(c,b)},true);
  $('dialogClose')?.addEventListener('click',()=>{pendingCoreEditButton=null},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

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
function installUI(){
  if($('situationOverlay'))return;
  const style=document.createElement('style');
  style.id='situationOverlayStyle';
  style.textContent=`
    body.situationOverlayOpen{overflow:hidden!important;touch-action:none}
    #situationOverlay{display:none;position:fixed;inset:0;z-index:2147483000;background:#f2f6fa;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;min-height:100dvh;color:#102844}
    #situationOverlay.open{display:block}
    #situationOverlay .sitTop{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:12px;justify-content:space-between;padding:calc(12px + env(safe-area-inset-top)) 16px 12px;background:#102844;color:#fff;box-shadow:0 4px 18px #10284433}
    #situationOverlay .sitTopTitle{display:flex;align-items:center;gap:10px;min-width:0;font-weight:950;font-size:20px;line-height:1.15}
    #situationOverlay .sitTopTitle span:last-child{overflow-wrap:anywhere}
    #situationOverlay .sitClose{flex:0 0 48px;width:48px;height:48px;border:0;border-radius:14px;background:#fff;color:#102844;font-size:30px;line-height:1;font-weight:900}
    #situationOverlay .sitWrap{width:min(100%,720px);margin:0 auto;padding:16px 16px calc(28px + env(safe-area-inset-bottom))}
    #situationOverlay .sitHero{display:grid;grid-template-columns:72px minmax(0,1fr);align-items:center;gap:14px;background:#fff;border:1px solid #d7e0e9;border-radius:22px;padding:16px;box-shadow:0 8px 24px #10284412}
    #situationOverlay .sitIcon{display:grid;place-items:center;width:72px;height:72px;border-radius:20px;background:#e8f3fb;font-size:42px}
    #situationOverlay .sitHero h2{margin:0;font-size:25px;line-height:1.1;overflow-wrap:anywhere}
    #situationOverlay .sitHero p{margin:6px 0 0;color:#607080;font-weight:700}
    #situationOverlay .sitGuide{margin-top:14px;background:#eaf5fc;border:2px solid #b8d6e9;border-radius:20px;padding:18px;font-size:20px;line-height:1.38;font-weight:900;white-space:pre-wrap;overflow-wrap:anywhere}
    #situationOverlay .sitLabel{margin:20px 2px 10px;font-size:15px;font-weight:950;letter-spacing:.04em;color:#536476}
    #situationOverlay .sitAnswers{display:grid;grid-template-columns:1fr;gap:10px}
    #situationOverlay .sitAnswers button{width:100%;min-height:64px;border:1px solid #d4dde6;border-radius:16px;background:#fff;color:#101820;font-size:19px;font-weight:950;padding:12px 14px;box-shadow:0 3px 8px #1028440d}
    #situationOverlay .sitActions{display:grid;grid-template-columns:1fr;gap:10px;margin-top:18px}
    #situationOverlay .sitRegister{min-height:62px;border:0;border-radius:16px;background:#1fa352;color:#fff;font-size:19px;font-weight:950}
    #situationOverlay .sitBack{min-height:56px;border:2px solid #102844;border-radius:16px;background:#fff;color:#102844;font-size:18px;font-weight:950}
    @media(min-width:600px){#situationOverlay .sitAnswers{grid-template-columns:1fr 1fr}}
    @media(max-width:380px){#situationOverlay .sitWrap{padding-left:10px;padding-right:10px}#situationOverlay .sitGuide{font-size:18px}#situationOverlay .sitAnswers button{font-size:17px;min-height:58px}}
  `;
  document.head.appendChild(style);
  const overlay=document.createElement('div');
  overlay.id='situationOverlay';overlay.setAttribute('aria-hidden','true');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','situationTitle');
  overlay.innerHTML=`
    <div class="sitTop"><div class="sitTopTitle"><span id="situationTopIcon">👥</span><span id="situationTitle">SITUAZIONE</span></div><button id="situationClose" class="sitClose" type="button" aria-label="Chiudi">×</button></div>
    <div class="sitWrap">
      <div class="sitHero"><div id="situationIcon" class="sitIcon">👥</div><div><h2 id="situationHeroTitle">SITUAZIONE</h2><p>Segui la conversazione. Tocca la risposta che ricevi.</p></div></div>
      <div id="situationGuide" class="sitGuide">Ti dico cosa fare e cosa dire.</div>
      <div class="sitLabel">RISPOSTA DELLA PERSONA</div>
      <div class="sitAnswers">
        <button type="button" data-overlay-answer="si">🙂 SÌ / DISPONIBILE</button>
        <button type="button" data-overlay-answer="no">✖ NO</button>
        <button type="button" data-overlay-answer="nonsa">❓ NON SA</button>
        <button type="button" data-overlay-answer="fretta">⏱ HA FRETTA</button>
        <button type="button" data-overlay-answer="diffidente">🛡 È DIFFIDENTE</button>
        <button type="button" data-overlay-answer="interessato">♥ È INTERESSATO</button>
      </div>
      <div class="sitActions"><button id="situationRegister" class="sitRegister" type="button">➕ REGISTRA CONTATTO</button><button id="situationBack" class="sitBack" type="button">← TORNA ALLA SCHERMATA PRINCIPALE</button></div>
    </div>`;
  document.body.appendChild(overlay);
}
function syncGuide(){if($('situationGuide')&&$('say'))$('situationGuide').textContent=$('say').textContent||''}
function setUnderlyingInert(on){for(const el of [document.querySelector('body>header'),document.querySelector('main')])if(el&&'inert'in el)el.inert=on}
function openOverlay(key){
  const meta=META[key];if(!meta)return;current=key;
  $('situationTopIcon').textContent=meta.icon;$('situationIcon').textContent=meta.icon;$('situationTitle').textContent=meta.title;$('situationHeroTitle').textContent=meta.title;
  const o=$('situationOverlay');o.dataset.situation=key;o.classList.add('open');o.setAttribute('aria-hidden','false');document.body.classList.add('situationOverlayOpen');setUnderlyingInert(true);syncGuide();o.scrollTop=0;setTimeout(()=>$('situationClose')?.focus(),30);
}
function closeOverlay(){const o=$('situationOverlay');if(!o)return;o.classList.remove('open');o.setAttribute('aria-hidden','true');delete o.dataset.situation;document.body.classList.remove('situationOverlayOpen');setUnderlyingInert(false);current=null}
function runSituation(button){const fn=button?.onclick;if(typeof fn==='function')fn.call(button);openOverlay(button.dataset.situation)}
function runAnswer(key){const core=[...document.querySelectorAll('.answers [data-answer]')].find(b=>b.dataset.answer===key);if(core&&typeof core.onclick==='function')core.onclick.call(core);syncGuide()}
function init(){
  installUI();
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-situation]');
    if(b&&!b.closest('#situationOverlay')){e.preventDefault();e.stopImmediatePropagation();runSituation(b);return}
    const a=e.target.closest?.('[data-overlay-answer]');if(a){e.preventDefault();runAnswer(a.dataset.overlayAnswer)}
  },true);
  $('situationClose')?.addEventListener('click',closeOverlay);$('situationBack')?.addEventListener('click',closeOverlay);$('situationRegister')?.addEventListener('click',()=>{closeOverlay();$('newContactBtn')?.click()});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('situationOverlay')?.classList.contains('open'))closeOverlay()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.AcqSituationOverlay={open:openOverlay,close:closeOverlay,getCurrent:()=>current};
})();
