(function(){
'use strict';

const SCOPE='albero_fonti_notizie';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const txt=v=>String(v??'').trim();
const norm=v=>txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
let profile=null,state=null,territory=null,people=[];

function todayRome(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function updateClock(){const now=new Date();$('twClock').textContent=new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit'}).format(now)}
function toast(message,bad=false){const el=$('twToast');if(!el)return;el.textContent=message;el.classList.toggle('bad',bad);el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),3600)}
function setBusy(on){document.body.classList.toggle('os-loading',!!on)}
function currentProgress(){return territory?.progress||null}
function currentContext(){const p=currentProgress()||{};return{comune:txt(p.comune),zona:txt(p.zona),via:txt(p.via),civico:txt(p.next_civic||p.last_civic)}}
function routeLabel(){const c=currentContext();return[c.comune,c.zona,c.via,c.civico&&('civico '+c.civico)].filter(Boolean).join(' › ')}
function progressPercent(p){const seq=Array.isArray(p?.civic_sequence)?p.civic_sequence.filter(Boolean):[],last=txt(p?.last_civic);if(!seq.length||!last)return 0;const i=seq.indexOf(last);return i<0?0:Math.round((i+1)/seq.length*100)}
function currentInstruction(){return state?.instruction||window.F1NotiziereEngine?.instructionFrom?.(state)||{kind:'LOADING',title:'Caricamento…',detail:'Recupero il prossimo ordine operativo.',cta:'ATTENDI',href:'#',nextTitle:'—'}}

function renderTerritory(){
  const p=currentProgress(),s=territory?.summary||{},pending=territory?.pending_news||[],ins=currentInstruction(),ctx=currentContext();
  $('twTerritoryStatus').textContent=p?txt(p.status||'IN CORSO').replaceAll('_',' '):'DA ASSEGNARE';$('twTerritoryStatus').classList.toggle('ok',!!p);
  $('twActionTitle').textContent=ins.title||'Prossima attività';$('twActionDetail').textContent=ins.detail||'Segui la prossima azione utile.';$('twCrumbs').textContent=routeLabel()||'NESSUN GIRO TERRITORIALE ATTIVO';
  const a=$('twOpenAction');a.textContent=ins.cta||'APRI ATTIVITÀ';a.href=ins.href&&ins.href!=='#'?ins.href:(p?'territory-mobile.html':'territory-control.html');
  $('twComune').textContent=ctx.comune||'—';$('twZona').textContent=ctx.zona||'—';$('twVia').textContent=ctx.via||'—';$('twNextCivic').textContent=txt(p?.next_civic)||'—';$('twCivicStart').textContent=txt(p?.civic_start)||'—';$('twCivicEnd').textContent=txt(p?.civic_end)||txt((p?.civic_sequence||[]).slice(-1)[0])||'—';$('twProgressBar').style.width=Math.max(0,Math.min(100,progressPercent(p)))+'%';
  $('twKpiCivics').textContent=Number(s.civics||0);$('twKpiContacts').textContent=Number(s.contacts||0);$('twKpiNews').textContent=Number(s.news||0);$('twKpiActivities').textContent=Number(s.activities||0);
  $('twPendingList').innerHTML=pending.length?pending.slice(0,6).map(n=>{const label=txt(n.news_type||n.observation_type||'NOTIZIA').replaceAll('_',' '),loc=[n.via,n.civico&&('civico '+n.civico)].filter(Boolean).join(' · '),href='crm.html?territory_observation='+encodeURIComponent(n.observation_id||'')+'#territory-news';return `<div class="pending-item"><strong>${esc(label)}</strong><span>${esc(loc||n.detail||'Dato territoriale da verificare')}</span><a class="os-btn" style="margin-top:7px" href="${esc(href)}">PORTA NEL CRM</a></div>`}).join(''):'<div class="empty">Nessuna notizia pendente: il territorio è allineato al CRM.</div>';
}

function personMeta(row){return row?.tree_meta&&typeof row.tree_meta==='object'?row.tree_meta:{}}
function rowTerritory(row){const m=personMeta(row),t=m.territory_context&&typeof m.territory_context==='object'?m.territory_context:{};return{comune:txt(row.comune||t.comune),zona:txt(t.zona),via:txt(t.via),civico:txt(t.civico)}}
function sameAreaScore(row){const c=currentContext(),r=rowTerritory(row);let score=0;if(c.comune&&norm(c.comune)===norm(r.comune))score+=4;if(c.via&&r.via&&norm(c.via)===norm(r.via))score+=4;if(c.zona&&r.zona&&norm(c.zona)===norm(r.zona))score+=2;if(c.civico&&r.civico&&norm(c.civico)===norm(r.civico))score+=2;return score}
function formatPerson(row){return [row.nome,row.cognome].filter(Boolean).join(' ').trim()||'Persona'}
function renderPeople(){
  const ctx=currentContext(),rows=people.map(r=>({r,score:sameAreaScore(r)})).filter(x=>!ctx.comune||x.score>0||norm(x.r.comune)===norm(ctx.comune)).sort((a,b)=>b.score-a.score||String(b.r.updated_at||'').localeCompare(String(a.r.updated_at||''))).slice(0,60);
  $('twPeopleList').innerHTML=rows.length?rows.map(({r,score})=>{const m=personMeta(r),rt=rowTerritory(r),story=txt(m.what_told_me),after=txt(r.azione_successiva),date=txt(r.data_prossimo_contatto),channel=txt(m.authorized_channel),badges=[r.stato_contatto,(r.tipo_rapporto||[])[0],m.abs&&('ABS '+m.abs),channel].filter(Boolean);return `<div class="person-row"><div><strong>${esc(formatPerson(r))}</strong><small>${esc([rt.comune,rt.via,rt.civico].filter(Boolean).join(' · '))}${score?` · affinità zona ${score}`:''}</small>${story?`<small><b>RACCONTO:</b> ${esc(story.slice(0,120))}</small>`:''}${after?`<small><b>DOPO:</b> ${esc(after)}${date?' · '+esc(date):''}</small>`:''}<div class="person-badges">${badges.map(x=>`<span class="person-badge">${esc(x)}</span>`).join('')}</div></div><button class="os-btn" type="button" data-edit-contact="${esc(r.contact_id)}">APRI</button></div>`}).join(''):'<div class="empty">Nessuna persona collegata a questa zona. Inserisci la prima scheda qui a sinistra.</div>';
  document.querySelectorAll('[data-edit-contact]').forEach(b=>b.addEventListener('click',()=>editPerson(b.dataset.editContact)));
}
async function loadPeople(){
  try{people=await F1StaffData.rest('network_contacts?deleted=eq.false&app_scope=eq.'+encodeURIComponent(SCOPE)+'&select=*&order=updated_at.desc&limit=500')||[];renderPeople()}catch(e){$('twPeopleList').innerHTML=`<div class="empty">Rete non disponibile: ${esc(e?.message||e)}</div>`}
}

function resetForm(){
  $('twContactId').value='';$('twLegacyId').value='';$('twNome').value='';$('twCognome').value='';$('twTelefono').value='';$('twEmail').value='';$('twRelazione').value='';$('twFonte').value='';$('twStage').value='Nome';$('twAbs').value='';$('twStory').value='';$('twFollowup').value='';$('twChannel').value='';$('twNextAction').value='';$('twNextDate').value='';$('twNotes').value='';
  const c=currentContext();if(c.comune&&$('twFonte'))$('twFonte').placeholder='Es. incontro in '+[c.via,c.civico].filter(Boolean).join(' ');
}
function editPerson(id){
  const r=people.find(x=>String(x.contact_id)===String(id));if(!r)return;const m=personMeta(r);
  $('twContactId').value=r.contact_id||'';$('twLegacyId').value=r.legacy_id||'';$('twNome').value=r.nome||'';$('twCognome').value=r.cognome||'';$('twTelefono').value=r.telefono||'';$('twEmail').value=r.email||'';$('twRelazione').value=(r.tipo_rapporto||[])[0]||m.category||'';$('twFonte').value=r.come_lo_conosco||r.tree_source||m.source||'';$('twStage').value=r.stato_contatto||m.stage||'Nome';$('twAbs').value=m.abs||'';$('twStory').value=m.what_told_me||'';$('twFollowup').value=m.followup_allowed||'';$('twChannel').value=m.authorized_channel||'';$('twNextAction').value=r.azione_successiva||'';$('twNextDate').value=r.data_prossimo_contatto||'';$('twNotes').value=r.note||'';
  $('twNome').focus();window.scrollTo({top:document.querySelector('#twPersonForm').getBoundingClientRect().top+window.scrollY-100,behavior:'smooth'});
}
function duplicateOf(payload){const phone=norm(payload.telefono),email=norm(payload.email),name=norm(payload.nome+' '+payload.cognome),comune=norm(payload.comune);return people.find(r=>{if(payload.contact_id&&String(r.contact_id)===String(payload.contact_id))return false;const phoneMatch=phone&&norm(r.telefono)===phone,emailMatch=email&&norm(r.email)===email,nameMatch=name&&norm((r.nome||'')+' '+(r.cognome||''))===name&&(!comune||norm(r.comune)===comune);return phoneMatch||emailMatch||nameMatch})||null}
function needsDate(action){const a=norm(action);return !!a&&!/(archivia|chiud|nessuna|non contattare|fine relazione|nessun seguito)/.test(a)}
function contactDates(existing){const arr=Array.isArray(existing?.contact_dates)?existing.contact_dates.slice():[],today=todayRome();if(!arr.includes(today))arr.push(today);return arr.slice(-80)}

async function savePerson(ev){
  ev.preventDefault();
  if(!profile?.user_id){toast('Profilo F1 non disponibile',true);return}
  const ctx=currentContext(),contactId=txt($('twContactId').value),existing=people.find(x=>String(x.contact_id)===String(contactId))||null,name=txt($('twNome').value),surname=txt($('twCognome').value),story=txt($('twStory').value),next=txt($('twNextAction').value),date=txt($('twNextDate').value),follow=txt($('twFollowup').value),channel=txt($('twChannel').value),relation=txt($('twRelazione').value),source=txt($('twFonte').value),stage=txt($('twStage').value)||'Nome',abs=txt($('twAbs').value),notes=txt($('twNotes').value);
  if(!name||!story||!next){toast('Compila nome, racconto e cosa succede dopo.',true);return}
  if(needsDate(next)&&!date){toast('Questa prossima azione richiede una data.',true);return}
  if(follow==='NO'&&channel&&channel!=='NESSUNO'){toast('Follow-up NO: imposta il canale su NESSUNO.',true);return}
  const previousMeta=personMeta(existing),legacy=txt($('twLegacyId').value)||existing?.legacy_id||('territory_'+crypto.randomUUID());
  const treeMeta={...previousMeta,category:relation||previousMeta.category||'',source:source||previousMeta.source||'TERRITORIO',stage,what_told_me:story,abs,followup_allowed:follow,authorized_channel:channel,territory_context:{...ctx,captured_at:new Date().toISOString()},territory_last_story_at:new Date().toISOString(),updatedAt:new Date().toISOString()};
  const row={
    contact_id:existing?.contact_id||undefined,user_id:profile.user_id,app_scope:SCOPE,legacy_id:legacy,parent_contact_id:existing?.parent_contact_id||null,
    nome:name.toLocaleUpperCase('it-IT'),cognome:surname.toLocaleUpperCase('it-IT'),telefono:txt($('twTelefono').value),email:txt($('twEmail').value),comune:ctx.comune||existing?.comune||'',professione:existing?.professione||'',azienda:existing?.azienda||'',
    come_lo_conosco:source,tipo_rapporto:relation?[relation]:[],livello_conoscenza:existing?.livello_conoscenza||'C',ultima_interazione:new Date().toISOString(),stato_contatto:stage,potenziale_relazionale:existing?.potenziale_relazionale||'',azione_successiva:next,note:notes,priorita:existing?.priorita||'C',
    tree_source:source||'TERRITORIO',data_primo_contatto:existing?.data_primo_contatto||todayRome(),data_prossimo_contatto:date||null,centro_influenza:/centro di influenza/i.test(relation),contact_dates:contactDates(existing),tree_meta:treeMeta,updated_at:new Date().toISOString(),deleted:false
  };
  const dupe=duplicateOf({...row,contact_id:existing?.contact_id});
  const target=existing||dupe;
  setBusy(true);$('twSavePerson').disabled=true;
  try{
    let saved=[];
    if(target){
      const patch={...row,contact_id:undefined,legacy_id:target.legacy_id||legacy,parent_contact_id:target.parent_contact_id||null,tree_meta:{...personMeta(target),...treeMeta}};delete patch.contact_id;Object.keys(patch).forEach(k=>patch[k]===undefined&&delete patch[k]);
      saved=await F1StaffData.rest('network_contacts?contact_id=eq.'+encodeURIComponent(target.contact_id),{method:'PATCH',body:JSON.stringify(patch),prefer:'return=representation'})||[];
    }else{
      delete row.contact_id;Object.keys(row).forEach(k=>row[k]===undefined&&delete row[k]);
      saved=await F1StaffData.rest('network_contacts?on_conflict=user_id,app_scope,legacy_id',{method:'POST',body:JSON.stringify([row]),prefer:'resolution=merge-duplicates,return=representation'})||[];
    }
    toast(target?'Scheda aggiornata. Prossimo passo registrato.':'Persona salvata. Prossimo passo registrato.');resetForm();await loadPeople();
  }catch(e){toast(String(e?.message||e),true)}finally{setBusy(false);$('twSavePerson').disabled=false}
}

async function loadState(force=false){
  if(!window.F1NotiziereEngine?.ready?.())return;
  try{state=await F1NotiziereEngine.load({force});territory=state.territory||{progress:null,summary:{},pending_news:[]};renderTerritory();$('twCloud').textContent='CLOUD OPERATIVO';await loadPeople()}catch(e){$('twCloud').textContent='CLOUD NON DISPONIBILE';toast(String(e?.message||e),true)}
}
async function init(){
  updateClock();setInterval(updateClock,1000);
  try{profile=await F1StaffData.me();$('twUser').textContent=[profile.first_name,profile.last_name].filter(Boolean).join(' ')||profile.role||'F1'}catch(e){toast('Profilo F1 non disponibile',true)}
  resetForm();$('twPersonForm').addEventListener('submit',savePerson);$('twResetPerson').addEventListener('click',resetForm);
  window.addEventListener('focus',()=>loadState(true));document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadState(true)});
  window.addEventListener('f1:realtime-change',()=>loadState(true));window.addEventListener('f1:realtime-status',e=>{const s=txt(e.detail?.status);$('twRealtime').textContent=s==='LIVE'?'REALTIME ATTIVO':s||'REALTIME';$('twRealtime').classList.toggle('ok',s==='LIVE')});
  window.F1Realtime?.start?.();await loadState(true);setInterval(()=>loadState(true),120000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
