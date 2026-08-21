(()=>{'use strict';
const KEY='acqProV25',SNAP='acqProV25Snapshot';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function state(){try{return window.AcquisitorePro?.getState?.()||JSON.parse(localStorage.getItem(KEY)||'null')||{contacts:[]}}catch{return{contacts:[]}}}
function persist(s,reason){
  s.events=Array.isArray(s.events)?s.events:[];s.events.push({ts:new Date().toISOString(),type:reason});
  if(s.events.length>300)s.events=s.events.slice(-300);
  const raw=JSON.stringify(s);localStorage.setItem(KEY,raw);localStorage.setItem(SNAP,JSON.stringify({ts:new Date().toISOString(),state:s}));
  const contacts=Array.isArray(s.contacts)?s.contacts:[];
  const conversations=Number(s.counters?.conversations||0),news=Number(s.counters?.news||0);
  const appointments=contacts.filter(c=>['Appuntamento','Valutazione'].includes(c.outcome)).length;
  const properties=contacts.filter(c=>['Nuovo immobile','Possibile vendita'].includes(c.outcome)).length;
  localStorage.setItem('acqProMobile',JSON.stringify({contacts,stats:{c:contacts.length,v:conversations,a:appointments,i:properties}}));
  localStorage.setItem('f1Performance',JSON.stringify({news,goals:{v:s.goals?.conversations??100,news:s.goals?.news??20,a:s.goals?.appointments??5,i:s.goals?.properties??3}}));
}
function options(values,current){return values.map(v=>`<option${v===current?' selected':''}>${esc(v)}</option>`).join('')}
const SOURCES=['Giro zona','Cartello','Annuncio','Segnalazione','Professionista / collaboratore','Persona che ci ha contattato'];
const OUTCOMES=['Da richiamare','Possibile vendita','Interessato','Appuntamento','Valutazione','Segnalazione','Nuovo immobile','Non interessato','Da ripassare'];
function openEditor(contact=null){
  const c=contact||{id:'',name:'',phone:'',address:'',source:'Giro zona',note:'',outcome:'Da richiamare',next:'',date:''};
  const editing=!!contact;
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
  const dlg=$('genericDialog');if(!dlg.open)dlg.showModal();
  setTimeout(()=>$('mcName')?.focus(),80);
  $('mcSave').onclick=()=>{
    const s=state();s.contacts=Array.isArray(s.contacts)?s.contacts:[];
    const next={id:editing?String(c.id):('c'+Date.now()),name:$('mcName').value.trim(),phone:$('mcPhone').value.trim(),address:$('mcAddress').value.trim(),source:$('mcSource').value,note:$('mcNote').value.trim(),outcome:$('mcOutcome').value,next:$('mcNext').value.trim(),date:$('mcDate').value,ts:editing?(c.ts||new Date().toISOString()):new Date().toISOString()};
    if(!next.name&&!next.phone&&!next.address&&!next.note){$('mcError').textContent='Inserisci almeno un dato del contatto.';return}
    if(editing){const i=s.contacts.findIndex(x=>String(x.id)===String(c.id));if(i<0){$('mcError').textContent='Contatto non trovato. Riapri la lista e riprova.';return}s.contacts[i]=next}else{s.contacts.unshift(next)}
    persist(s,editing?'contact-edit-mobile':'contact-add-mobile');
    sessionStorage.setItem('acqMobileOpenContacts','1');location.reload();
  };
}
function selectedContact(id){const s=state();return (s.contacts||[]).find(c=>String(c.id)===String(id))||null}
function init(){
  $('newContactBtn')?.addEventListener('click',()=>openEditor(null));
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-contact-edit]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const c=selectedContact(b.dataset.contactEdit);if(c)openEditor(c)},true);
  if(sessionStorage.getItem('acqMobileOpenContacts')==='1'){sessionStorage.removeItem('acqMobileOpenContacts');setTimeout(()=>$('contactsBtn')?.click(),120)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
