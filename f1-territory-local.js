(function(){
'use strict';
const KEY='f1TerritoryLocalPeopleV1', $=id=>document.getElementById(id), txt=v=>String(v??'').trim();
let people=[];
function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');people=Array.isArray(x)?x:[]}catch(_){people=[]}}
function write(){localStorage.setItem(KEY,JSON.stringify(people))}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function toast(msg,bad=false){const e=$('twToast');if(!e)return;e.textContent=msg;e.classList.toggle('bad',bad);e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),3000)}
function render(){
  const list=$('twPeopleList'); if(!list)return;
  list.innerHTML=people.length?people.slice().sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||''))).map(p=>`<div class="person-row"><div><strong>${esc([p.nome,p.cognome].filter(Boolean).join(' '))}</strong><small>${esc([p.comune,p.via,p.civico].filter(Boolean).join(' · ')||'Scheda locale')}</small><small><b>RACCONTO:</b> ${esc((p.story||'').slice(0,120))}</small><small><b>DOPO:</b> ${esc(p.next_action||'')}</small></div><button class="os-btn" type="button" data-local-edit="${esc(p.id)}">APRI</button></div>`).join(''):'<div class="empty">Nessuna scheda locale. Puoi inserirne una qui a sinistra; resterà salvata su questo browser finché non colleghi il cloud.</div>';
  list.querySelectorAll('[data-local-edit]').forEach(b=>b.addEventListener('click',()=>edit(b.dataset.localEdit)));
  if($('twKpiContacts'))$('twKpiContacts').textContent=people.length;
}
function reset(){
  ['twContactId','twLegacyId','twNome','twCognome','twTelefono','twEmail','twFonte','twStory','twNextAction','twNextDate','twNotes'].forEach(id=>{if($(id))$(id).value=''});
  if($('twRelazione'))$('twRelazione').value='';
  if($('twStage'))$('twStage').value='Nome';
  if($('twAbs'))$('twAbs').value='';
  if($('twFollowup'))$('twFollowup').value='';
  if($('twChannel'))$('twChannel').value='';
}
function edit(id){
  const p=people.find(x=>x.id===id);if(!p)return;
  $('twContactId').value=p.id;$('twNome').value=p.nome||'';$('twCognome').value=p.cognome||'';$('twTelefono').value=p.telefono||'';$('twEmail').value=p.email||'';$('twRelazione').value=p.relazione||'';$('twFonte').value=p.fonte||'';$('twStage').value=p.stage||'Nome';$('twAbs').value=p.abs||'';$('twStory').value=p.story||'';$('twFollowup').value=p.followup||'';$('twChannel').value=p.channel||'';$('twNextAction').value=p.next_action||'';$('twNextDate').value=p.next_date||'';$('twNotes').value=p.notes||'';
  $('twNome')?.focus();
}
function save(e){
  e.preventDefault();
  const nome=txt($('twNome')?.value),story=txt($('twStory')?.value),next=txt($('twNextAction')?.value),follow=txt($('twFollowup')?.value),channel=txt($('twChannel')?.value);
  if(!nome||!story||!next){toast('Compila nome, racconto e cosa succede dopo.',true);return}
  if(follow==='NO'&&channel&&channel!=='NESSUNO'){toast('Follow-up NO: imposta il canale su NESSUNO.',true);return}
  const id=txt($('twContactId')?.value)||('local_'+crypto.randomUUID()), old=people.find(x=>x.id===id)||{};
  const row={...old,id,nome,cognome:txt($('twCognome')?.value),telefono:txt($('twTelefono')?.value),email:txt($('twEmail')?.value),relazione:txt($('twRelazione')?.value),fonte:txt($('twFonte')?.value),stage:txt($('twStage')?.value)||'Nome',abs:txt($('twAbs')?.value),story,followup:follow,channel,next_action:next,next_date:txt($('twNextDate')?.value),notes:txt($('twNotes')?.value),updated_at:new Date().toISOString()};
  const i=people.findIndex(x=>x.id===id); if(i>=0)people[i]=row;else people.push(row); write();render();reset();toast('Scheda salvata in modalità locale.');
}
function setup(){
  read();
  if($('twCloud'))$('twCloud').textContent='MODALITÀ LOCALE';
  if($('twRealtime'))$('twRealtime').textContent='CLOUD NON COLLEGATO';
  if($('twTerritoryStatus'))$('twTerritoryStatus').textContent='LOCALE';
  if($('twActionTitle'))$('twActionTitle').textContent='Radar e schede locali disponibili';
  if($('twActionDetail'))$('twActionDetail').textContent='Puoi lavorare subito. Collega il cloud solo quando vuoi sincronizzare dati e rete su più dispositivi.';
  if($('twCrumbs'))$('twCrumbs').textContent='DATI SALVATI SU QUESTO BROWSER';
  const a=$('twOpenAction');if(a){a.textContent='COLLEGA CLOUD';a.href='setup-cloud.html?return=ricerca-territoriale.html'}
  $('twPersonForm')?.addEventListener('submit',save);
  $('twResetPerson')?.addEventListener('click',reset);
  render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();