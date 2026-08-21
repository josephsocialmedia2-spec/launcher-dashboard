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
