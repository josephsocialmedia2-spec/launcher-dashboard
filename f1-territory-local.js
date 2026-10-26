(function(){
'use strict';

const KEY='f1TerritoryLocalPeopleV1';
const DESKTOP_SOURCE='RICERCA_TERRITORIALE_LOCALE';
const $=id=>document.getElementById(id);
const txt=v=>String(v??'').trim();
let people=[];

function isDesktop(){return !!(window.F1_DESKTOP&&window.F1AcquisitionData)}
function legacyRead(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch(_){return[]}}
function legacyWrite(){try{localStorage.setItem(KEY,JSON.stringify(people))}catch(_){}}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function toast(msg,bad=false){const e=$('twToast');if(!e)return;e.textContent=msg;e.classList.toggle('bad',bad);e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),3000)}
function context(){return{comune:txt($('twComune')?.textContent).replace(/^—$/,''),via:txt($('twVia')?.textContent).replace(/^—$/,''),civico:txt($('twNextCivic')?.textContent).replace(/^—$/,'')}}
function toLocalShape(l){
  const m=l.market_data&&typeof l.market_data==='object'?l.market_data:{};
  return{
    id:l.lead_id,nome:l.nome||'',cognome:l.cognome||'',telefono:l.telefono||'',email:l.email||'',
    relazione:m.relazione||l.lead_reason||'',fonte:m.fonte||l.source||'',stage:m.stage||l.status||'Nome',
    abs:m.abs||'',story:m.story||l.notes||'',followup:m.followup||'',channel:m.channel||'',
    next_action:l.next_action||'',next_date:l.next_action_date||'',notes:m.notes||'',
    comune:l.comune||'',via:l.via||'',civico:l.civico||'',updated_at:l.updated_at||''
  };
}
async function read(){
  if(isDesktop()){
    try{
      const rows=await F1AcquisitionData.pullLeads();
      people=rows.filter(x=>String(x.source||'')===DESKTOP_SOURCE).map(toLocalShape);
      return;
    }catch(e){console.warn('Territory SQLite read',e)}
  }
  people=legacyRead();
}
function render(){
  const list=$('twPeopleList');if(!list)return;
  const rows=people.slice().sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||'')));
  list.innerHTML=rows.length?rows.map(p=>'<div class="person-row"><div><strong>'+esc([p.nome,p.cognome].filter(Boolean).join(' '))+'</strong><small>'+esc([p.comune,p.via,p.civico].filter(Boolean).join(' · ')||(isDesktop()?'Scheda CRM locale':'Scheda locale'))+'</small><small><b>RACCONTO:</b> '+esc((p.story||'').slice(0,120))+'</small><small><b>DOPO:</b> '+esc(p.next_action||'')+'</small></div><button class="os-btn" type="button" data-local-edit="'+esc(p.id)+'">APRI</button></div>').join(''):'<div class="empty">Nessuna scheda locale. Puoi inserirne una qui a sinistra.</div>';
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
  const p=people.find(x=>String(x.id)===String(id));if(!p)return;
  $('twContactId').value=p.id;$('twNome').value=p.nome||'';$('twCognome').value=p.cognome||'';$('twTelefono').value=p.telefono||'';$('twEmail').value=p.email||'';$('twRelazione').value=p.relazione||'';$('twFonte').value=p.fonte||'';$('twStage').value=p.stage||'Nome';$('twAbs').value=p.abs||'';$('twStory').value=p.story||'';$('twFollowup').value=p.followup||'';$('twChannel').value=p.channel||'';$('twNextAction').value=p.next_action||'';$('twNextDate').value=p.next_date||'';$('twNotes').value=p.notes||'';
  $('twNome')?.focus();
}
async function saveDesktop(row,old){
  const now=new Date().toISOString(),ctx=context();
  const lead={
    lead_id:row.id,pillar:2,source_type:'TERRITORY',source:DESKTOP_SOURCE,source_url:'',
    created_at:old?.created_at||now,first_seen:old?.created_at||now,last_seen:now,
    nome:row.nome,cognome:row.cognome,azienda:'',telefono:row.telefono,email:row.email,
    comune:ctx.comune||row.comune||'',via:ctx.via||row.via||'',civico:ctx.civico||row.civico||'',
    zona:[ctx.via||row.via||'',ctx.civico||row.civico||''].filter(Boolean).join(' '),
    immobile_id:'',competitor_agency:'',lead_reason:row.relazione||'TERRITORY',lead_score:50,
    confidence:'MEDIUM',status:row.stage||'DA_ANALIZZARE',last_contact:now,
    next_action:row.next_action,next_action_date:row.next_date||'',assigned_to:'desktop-local',
    notes:row.story,privacy_basis:'TERRITORY_LOCAL_ENTRY',do_not_contact:false,rpo_status:'DA_VERIFICARE',
    market_data:{relazione:row.relazione,fonte:row.fonte,stage:row.stage,abs:row.abs,story:row.story,followup:row.followup,channel:row.channel,notes:row.notes},
    created_by:'territory_local',updated_at:now,deleted:false
  };
  const saved=await F1AcquisitionData.upsertLead(lead);
  await F1AcquisitionData.addInteraction({
    lead_id:saved.lead_id,interaction_type:'NOTE',direction:'INBOUND',occurred_at:now,
    outcome:'TERRITORY_NOTE',note:[row.story,row.notes].filter(Boolean).join(' · '),
    next_action:row.next_action,next_action_date:row.next_date||'',
    metadata:{origin:'ricerca-territoriale',relation:row.relazione,followup:row.followup,channel:row.channel}
  });
  if(row.next_date){
    await F1AcquisitionData.upsertTask({
      lead_id:saved.lead_id,pillar:2,task_type:'FOLLOW_UP',reason:row.next_action||'Ricontatto territoriale',
      priority:50,due_date:row.next_date,status:'OPEN',metadata:{origin:'RICERCA_TERRITORIALE_LOCALE'}
    });
  }
  return saved;
}
async function save(e){
  e.preventDefault();
  const nome=txt($('twNome')?.value),story=txt($('twStory')?.value),next=txt($('twNextAction')?.value),follow=txt($('twFollowup')?.value),channel=txt($('twChannel')?.value);
  if(!nome||!story||!next){toast('Compila nome, racconto e cosa succede dopo.',true);return}
  if(follow==='NO'&&channel&&channel!=='NESSUNO'){toast('Follow-up NO: imposta il canale su NESSUNO.',true);return}
  const id=txt($('twContactId')?.value)||(isDesktop()?crypto.randomUUID():('local_'+crypto.randomUUID()));
  const old=people.find(x=>String(x.id)===String(id))||{};
  const ctx=context();
  const row={...old,id,nome,cognome:txt($('twCognome')?.value),telefono:txt($('twTelefono')?.value),email:txt($('twEmail')?.value),relazione:txt($('twRelazione')?.value),fonte:txt($('twFonte')?.value),stage:txt($('twStage')?.value)||'Nome',abs:txt($('twAbs')?.value),story,followup:follow,channel,next_action:next,next_date:txt($('twNextDate')?.value),notes:txt($('twNotes')?.value),comune:ctx.comune||old.comune||'',via:ctx.via||old.via||'',civico:ctx.civico||old.civico||'',updated_at:new Date().toISOString()};
  try{
    if(isDesktop())await saveDesktop(row,old);
    else{const i=people.findIndex(x=>String(x.id)===String(id));if(i>=0)people[i]=row;else people.push(row);legacyWrite()}
    await read();render();reset();toast(isDesktop()?'Scheda salvata nel CRM SQLite locale.':'Scheda salvata in modalità locale.');
  }catch(err){toast('Salvataggio non riuscito: '+String(err?.message||err),true)}
}
async function setup(){
  await read();
  if($('twCloud'))$('twCloud').textContent=isDesktop()?'SQLITE LOCALE':'MODALITÀ LOCALE';
  if($('twRealtime'))$('twRealtime').textContent='OFFLINE';
  if($('twTerritoryStatus'))$('twTerritoryStatus').textContent='LOCALE';
  if($('twActionTitle'))$('twActionTitle').textContent='Radar e schede locali disponibili';
  if($('twActionDetail'))$('twActionDetail').textContent=isDesktop()?'I contatti vengono salvati nel CRM SQLite del PC e inclusi nei backup locali.':'Puoi lavorare subito anche senza rete.';
  if($('twCrumbs'))$('twCrumbs').textContent=isDesktop()?'CRM SQLITE LOCALE':'DATI SALVATI SU QUESTO BROWSER';
  const a=$('twOpenAction');if(a){a.textContent=isDesktop()?'APRI CRM':'COLLEGA CLOUD';a.href=isDesktop()?'crm.html':'setup-cloud.html?return=ricerca-territoriale.html'}
  $('twPersonForm')?.addEventListener('submit',save);
  $('twResetPerson')?.addEventListener('click',reset);
  render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setup().catch(e=>toast(String(e),true)),{once:true});else setup().catch(e=>toast(String(e),true));
})();