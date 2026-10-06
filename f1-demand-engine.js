(()=>{'use strict';
const URL='https://nqnmlsmeiynxbdojeyjt.supabase.co',KEY='sb_publishable_Clz5qPTkTtvwV0rqWTcfMQ_sCDSRgnu',SESSION='f1SupabaseSession',PROMPT_URL='prompts/f1-richieste-acquirenti-prequalifica.md';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let S={leads:[],requests:[],matches:[],opps:0,user:null,prompt:''};
function sess(){try{return JSON.parse(localStorage.getItem(SESSION)||'null')}catch{return null}}
async function token(){let s=sess();if(!s)throw Error('ACCESSO F1 NECESSARIO');if(s.access_token&&(!s.expires_at||Date.now()<Number(s.expires_at)-60000)){S.user=s.user;return s.access_token}if(!s.refresh_token)throw Error('SESSIONE SCADUTA');let r=await fetch(URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});if(!r.ok)throw Error('SESSIONE SCADUTA');let j=await r.json();s={access_token:j.access_token,refresh_token:j.refresh_token||s.refresh_token,expires_at:Date.now()+Number(j.expires_in||3600)*1000,user:j.user||s.user};localStorage.setItem(SESSION,JSON.stringify(s));S.user=s.user;return s.access_token}
async function api(path,opt={}){let t=await token(),r=await fetch(URL+'/rest/v1/'+path,{...opt,headers:{apikey:KEY,Authorization:'Bearer '+t,'Content-Type':'application/json',Prefer:opt.prefer||'return=representation',...(opt.headers||{})}});if(!r.ok)throw Error('HTTP '+r.status+' · '+await r.text());let x=await r.text();return x?JSON.parse(x):[]}
const num=id=>{let v=$(id).value;return v===''?null:Number(v)},money=v=>v==null?'—':new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v));
function val(id){return $(id)?.value?.trim?.()||''}
function listVal(id){return val(id).split(',').map(x=>x.trim()).filter(Boolean)}
function requestClass(d){
 const mode=val('modalitaAcquisto'),mort=val('mutuoStato'),selling=$('deveVendere')?.checked;
 if(!val('comune')||!num('budgetMax')||!mode)return 'INFORMAZIONI_INSUFFICIENTI';
 if(selling||mode==='VENDITA_COLLEGATA')return 'RICERCA_SUBORDINATA_ALLA_VENDITA';
 if((mode==='MUTUO'||mode==='MISTO')&&!['PREVALUTAZIONE','DELIBERA_DICHIARATA'].includes(mort))return 'RICERCA_SUBORDINATA_ALLA_VERIFICA_DEL_FINANZIAMENTO';
 return 'RICERCA_AVVIABILE_SULLA_BASE_DELLE_INFORMAZIONI_RACCOLTE';
}
function classLabel(v){return ({
 RICERCA_AVVIABILE_SULLA_BASE_DELLE_INFORMAZIONI_RACCOLTE:'Ricerca avviabile sulla base delle informazioni raccolte',
 RICERCA_SUBORDINATA_ALLA_VERIFICA_DEL_FINANZIAMENTO:'Ricerca subordinata alla verifica del finanziamento',
 RICERCA_SUBORDINATA_ALLA_VENDITA:'Ricerca subordinata alla vendita dell’immobile attuale',
 INFORMAZIONI_INSUFFICIENTI:'Informazioni insufficienti'
})[v]||v}
function updateClassPreview(){
 const c=requestClass();
 const el=$('prequalClassPreview');if(el)el.innerHTML='<b>CLASSIFICAZIONE:</b> '+esc(classLabel(c))+'. Non equivale a un giudizio di solvibilità.';
}
async function promptTemplate(){
 if(S.prompt)return S.prompt;
 const r=await fetch(PROMPT_URL+'?v='+Date.now(),{cache:'no-store'});
 if(!r.ok)throw Error('Prompt F1 non disponibile');
 S.prompt=await r.text();return S.prompt;
}
function draftContext(){
 const lead=S.leads.find(x=>String(x.lead_id)===String(val('leadId')));
 return [
  'CLIENTE: '+([lead?.nome,lead?.cognome].filter(Boolean).join(' ')||'da selezionare'),
  'COMUNE/CENTRO RICERCA: '+val('comune'),
  'RAGGIO MASSIMO: 10 km',
  'ZONE ACCETTATE: '+listVal('zone').join(', '),
  'ZONE ESCLUSE: '+listVal('zoneEscluse').join(', '),
  'TIPOLOGIA: '+val('tipologia'),
  'BUDGET IMMOBILE: '+[val('budgetMin'),val('budgetMax')].filter(Boolean).join(' - '),
  'LIQUIDITÀ DICHIARATA: '+val('liquidita'),
  'SPESE/LAVORI SEPARATI: '+val('budgetAccessori'),
  'MODALITÀ ACQUISTO: '+val('modalitaAcquisto'),
  'STATO MUTUO DICHIARATO: '+val('mutuoStato'),
  'IMPORTO MUTUO INDICATIVO: '+val('mutuoImporto'),
  'DEVE VENDERE: '+($('deveVendere')?.checked?'SÌ':'NO / DA VERIFICARE'),
  'VENDITA COLLEGATA: '+val('venditaCollegata'),
  'STATO VENDITA: '+val('venditaStato'),
  'PREZZO ATTESO DICHIARATO: '+val('venditaPrezzoAtteso'),
  'REQUISITI INDISPENSABILI: '+val('indispensabili'),
  'PREFERENZE: '+val('preferenze'),
  'INFORMAZIONI DA VERIFICARE: '+val('infoVerificare'),
  'PROSSIMA AZIONE: '+val('prossimaAzione'),
  'CLASSIFICAZIONE OPERATIVA: '+classLabel(requestClass()),
  '',
  'PREQUALIFICA ORIGINALE:',
  val('prequalificaRaw')||val('note')
 ].join('\n');
}
async function copyPrompt(text){
 try{
  const base=await promptTemplate(),full=base.replace('[INCOLLA QUI APPUNTI, SCHEDA O CONVERSAZIONE]',text||draftContext());
  await navigator.clipboard.writeText(full);
  const st=$('promptStatus');if(st){st.className='status ok';st.textContent='Prompt F1 copiato con i dati della richiesta.'}
 }catch(e){const st=$('promptStatus');if(st){st.className='status err';st.textContent=e.message}}
}
async function copyRequestPrompt(id){
 const r=S.requests.find(x=>String(x.request_id)===String(id));if(!r)return;
 const l=S.leads.find(x=>String(x.lead_id)===String(r.lead_id)),m=r.metadata||{};
 const text=[
  'CLIENTE: '+([l?.nome,l?.cognome].filter(Boolean).join(' ')||r.lead_id),
  'COMUNE/CENTRO RICERCA: '+(r.comune||''),
  'RAGGIO MASSIMO: '+(m.search_radius_km||10)+' km',
  'ZONE ACCETTATE: '+((r.zone||[]).join(', ')),
  'ZONE ESCLUSE: '+((m.zone_escluse||[]).join(', ')),
  'TIPOLOGIA: '+(r.tipologia||''),
  'BUDGET: '+[r.budget_min,r.budget_max].filter(x=>x!=null).join(' - '),
  'LIQUIDITÀ DICHIARATA: '+(m.liquidita_dichiarata||''),
  'SPESE/LAVORI SEPARATI: '+(m.budget_accessori_lavori||''),
  'MODALITÀ ACQUISTO: '+(m.modalita_acquisto||r.mutuo||''),
  'STATO MUTUO DICHIARATO: '+(m.mutuo_stato||''),
  'DEVE VENDERE: '+(m.deve_vendere?'SÌ':'NO / DA VERIFICARE'),
  'VENDITA COLLEGATA: '+(m.vendita_collegata||''),
  'REQUISITI INDISPENSABILI: '+(m.indispensabili||''),
  'PREFERENZE: '+(m.preferenze||''),
  'INFORMAZIONI DA VERIFICARE: '+(m.info_da_verificare||''),
  'PROSSIMA AZIONE: '+(m.prossima_azione||''),
  'CLASSIFICAZIONE OPERATIVA: '+classLabel(m.percorso_operativo||'INFORMAZIONI_INSUFFICIENTI'),
  '',
  'NOTE / PREQUALIFICA ORIGINALE:',
  m.prequalifica_raw||r.note||''
 ].join('\n');
 await copyPrompt(text);
}
window.copyRequestPrompt=copyRequestPrompt;
async function load(){
 try{
  const [leads,req,matches,opps]=await Promise.all([
   api('leads?deleted=eq.false&select=lead_id,nome,cognome,telefono,email,comune,source_type,status&order=updated_at.desc&limit=500'),
   api('f1_crm_requests?request_status=eq.ACTIVE&select=*&order=updated_at.desc&limit=300'),
   api('f1_crm_match_scores?select=*&match_score=gte.60&order=match_score.desc&limit=100'),
   api('f1_market_opportunities?stato_annuncio=eq.ATTIVO&select=id',{headers:{Prefer:'count=exact'}}).catch(()=>[])
  ]);
  S.leads=leads;S.requests=req;S.matches=matches;S.opps=opps.length;
  render();
 }catch(e){$('matchList').innerHTML='<div class="status err">'+esc(e.message)+'</div>';if(/ACCESSO|SESSIONE/.test(e.message))setTimeout(()=>location.href='setup-cloud.html?return=f1-demand-engine.html',700)}
}
function render(){
 $('kReq').textContent=S.requests.length;$('kMatch').textContent=S.matches.length;$('kHot').textContent=S.matches.filter(x=>Number(x.match_score)>=85).length;$('kOpp').textContent=S.opps;
 $('leadId').innerHTML='<option value="">Seleziona contatto CRM…</option>'+S.leads.map(l=>'<option value="'+esc(l.lead_id)+'">'+esc(([l.nome,l.cognome].filter(Boolean).join(' ')||'Senza nome')+' · '+(l.telefono||l.email||l.comune||l.source_type||''))+'</option>').join('');
 $('matchList').innerHTML=S.matches.length?S.matches.map(m=>'<article class="match '+(Number(m.match_score)>=85?'hot':'')+'"><div><span class="score">'+esc(m.match_score)+'%</span> · <b>'+esc(m.nome||'Cliente')+'</b> → '+esc(m.opportunity_comune)+'</div><div class="meta">Richiesta: '+esc(m.target_comune)+' · '+esc(m.richiesta_tipologia||'tipologia aperta')+' · budget '+esc(money(m.budget_max))+'<br>Opportunità: '+esc(m.raw_title||m.opportunity_tipologia||'immobile')+' · '+esc(m.indirizzo_zona||'')+' · '+esc(money(m.prezzo))+'</div><div class="actions">'+(m.telefono?'<a class="btn primary" href="tel:'+esc(m.telefono)+'">CHIAMA CLIENTE</a>':'')+(m.source_url?'<a class="btn" target="_blank" rel="noopener" href="'+esc(m.source_url)+'">ANNUNCIO</a>':'')+'<a class="btn" href="crm.html?q='+encodeURIComponent(m.telefono||m.nome||'')+'#contatti">CRM</a></div></article>').join(''):'<div class="meta">Nessun match ≥60. Inserisci o qualifica una richiesta.</div>';
 $('requestList').innerHTML=S.requests.length?S.requests.map(r=>{const m=r.metadata||{};return '<article class="req"><div><b>'+esc(r.comune)+' · '+esc(r.tipologia||'Tipologia aperta')+'</b> <span class="reqClass">'+esc(classLabel(m.percorso_operativo||'INFORMAZIONI_INSUFFICIENTI'))+'</span></div><div class="meta">Budget '+esc(money(r.budget_min))+' → '+esc(money(r.budget_max))+' · '+esc(r.mq_min||'—')+' mq min · '+esc(r.camere??'—')+' camere · raggio '+esc(m.search_radius_km||10)+' km</div><div class="requestMetaGrid"><span><b>ACQUISTO</b><br>'+esc(m.modalita_acquisto||r.mutuo||'da verificare')+'</span><span><b>VENDITA COLLEGATA</b><br>'+esc(m.deve_vendere?'SÌ':'no / da verificare')+'</span><span><b>PROSSIMA AZIONE</b><br>'+esc(m.prossima_azione||'da definire')+'</span></div><div class="actions"><a class="btn" href="crm.html?q='+encodeURIComponent(r.lead_id)+'#contatti">APRI CLIENTE</a><button class="btn gold" type="button" onclick="copyRequestPrompt(\''+esc(r.request_id)+'\')">COPIA PROMPT F1</button></div></article>'}).join(''):'<div class="meta">Nessuna richiesta CRM attiva.</div>';
}
async function save(e){e.preventDefault();let st=$('saveStatus');st.className='status';st.textContent='Salvataggio…';try{
 await token();const lead=$('leadId').value;if(!lead)throw Error('Seleziona un contatto CRM');
 const percorso=requestClass();
 const body={user_id:S.user.id,lead_id:lead,comune:val('comune'),zone:listVal('zone'),tipologia:val('tipologia'),budget_min:num('budgetMin'),budget_max:num('budgetMax'),mq_min:num('mqMin'),camere:num('camere'),bagni:num('bagni'),box:$('box').checked,giardino:$('giardino').checked,ascensore:$('ascensore').checked,terrazzo:$('terrazzo').checked,posto_auto:$('postoAuto').checked,mutuo:val('modalitaAcquisto'),urgenza:val('urgenza'),note:val('note'),request_status:'ACTIVE',metadata:{source:'F1_DEMAND_ENGINE',workflow:'F1_BUYER_PREQUALIFICATION_V1',prompt_path:PROMPT_URL,search_radius_km:10,zone_escluse:listVal('zoneEscluse'),modalita_acquisto:val('modalitaAcquisto'),liquidita_dichiarata:num('liquidita'),budget_accessori_lavori:num('budgetAccessori'),mutuo_stato:val('mutuoStato'),mutuo_importo_indicativo:num('mutuoImporto'),deve_vendere:$('deveVendere').checked,vendita_stato:val('venditaStato'),vendita_prezzo_atteso:num('venditaPrezzoAtteso'),vendita_valutazione:val('venditaValutazione'),vendita_collegata:val('venditaCollegata'),indispensabili:val('indispensabili'),preferenze:val('preferenze'),info_da_verificare:val('infoVerificare'),prossima_azione:val('prossimaAzione'),percorso_operativo:percorso,prequalifica_raw:val('prequalificaRaw'),financial_note:'Informazioni dichiarate: non equivalgono a verifica di solvibilità o garanzia di mutuo.'}};
 await api('f1_crm_requests',{method:'POST',body:JSON.stringify(body)});
 try{await api('f1_contact_roles?on_conflict=lead_id,role_type',{method:'POST',prefer:'resolution=ignore-duplicates,return=minimal',body:JSON.stringify({lead_id:lead,role_type:'ACQUIRENTE',role_status:'ACTIVE',pipeline_stage:'RICERCA_ATTIVA',source:'DEMAND_ENGINE'})})}catch(_){}
 st.className='status ok';st.textContent='Richiesta salvata. Match ricalcolati.';e.target.reset();await load();
 }catch(err){st.className='status err';st.textContent=err.message}}
document.addEventListener('DOMContentLoaded',()=>{
 $('requestForm').addEventListener('submit',save);
 $('copyPromptBtn')?.addEventListener('click',()=>copyPrompt(draftContext()));
 ['comune','budgetMax','modalitaAcquisto','mutuoStato','deveVendere'].forEach(id=>$(id)?.addEventListener('input',updateClassPreview));
 ['modalitaAcquisto','mutuoStato','deveVendere'].forEach(id=>$(id)?.addEventListener('change',updateClassPreview));
 updateClassPreview();load();
});
})();