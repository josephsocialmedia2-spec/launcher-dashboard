(()=>{'use strict';
const URL='https://nqnmlsmeiynxbdojeyjt.supabase.co',KEY='sb_publishable_Clz5qPTkTtvwV0rqWTcfMQ_sCDSRgnu',SESSION='f1SupabaseSession';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let S={leads:[],requests:[],matches:[],opps:0,user:null};
function sess(){try{return JSON.parse(localStorage.getItem(SESSION)||'null')}catch{return null}}
async function token(){let s=sess();if(!s)throw Error('ACCESSO F1 NECESSARIO');if(s.access_token&&(!s.expires_at||Date.now()<Number(s.expires_at)-60000)){S.user=s.user;return s.access_token}if(!s.refresh_token)throw Error('SESSIONE SCADUTA');let r=await fetch(URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});if(!r.ok)throw Error('SESSIONE SCADUTA');let j=await r.json();s={access_token:j.access_token,refresh_token:j.refresh_token||s.refresh_token,expires_at:Date.now()+Number(j.expires_in||3600)*1000,user:j.user||s.user};localStorage.setItem(SESSION,JSON.stringify(s));S.user=s.user;return s.access_token}
async function api(path,opt={}){let t=await token(),r=await fetch(URL+'/rest/v1/'+path,{...opt,headers:{apikey:KEY,Authorization:'Bearer '+t,'Content-Type':'application/json',Prefer:opt.prefer||'return=representation',...(opt.headers||{})}});if(!r.ok)throw Error('HTTP '+r.status+' · '+await r.text());let x=await r.text();return x?JSON.parse(x):[]}
const num=id=>{let v=$(id).value;return v===''?null:Number(v)},money=v=>v==null?'—':new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v));
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
 $('requestList').innerHTML=S.requests.length?S.requests.map(r=>'<article class="req"><b>'+esc(r.comune)+' · '+esc(r.tipologia||'Tipologia aperta')+'</b><div class="meta">Budget '+esc(money(r.budget_min))+' → '+esc(money(r.budget_max))+' · '+esc(r.mq_min||'—')+' mq min · '+esc(r.camere??'—')+' camere · '+esc(r.urgenza||'nessuna urgenza')+'</div><div class="actions"><a class="btn" href="crm.html?q='+encodeURIComponent(r.lead_id)+'#contatti">APRI CLIENTE</a></div></article>').join(''):'<div class="meta">Nessuna richiesta CRM attiva.</div>';
}
async function save(e){e.preventDefault();let st=$('saveStatus');st.className='status';st.textContent='Salvataggio…';try{
 await token();const lead=$('leadId').value;if(!lead)throw Error('Seleziona un contatto CRM');
 const body={user_id:S.user.id,lead_id:lead,comune:$('comune').value.trim(),zone:$('zone').value.split(',').map(x=>x.trim()).filter(Boolean),tipologia:$('tipologia').value.trim(),budget_min:num('budgetMin'),budget_max:num('budgetMax'),mq_min:num('mqMin'),camere:num('camere'),bagni:num('bagni'),box:$('box').checked,giardino:$('giardino').checked,ascensore:$('ascensore').checked,terrazzo:$('terrazzo').checked,posto_auto:$('postoAuto').checked,urgenza:$('urgenza').value,note:$('note').value.trim(),request_status:'ACTIVE',metadata:{source:'F1_DEMAND_ENGINE'}};
 await api('f1_crm_requests',{method:'POST',body:JSON.stringify(body)});
 try{await api('f1_contact_roles?on_conflict=lead_id,role_type',{method:'POST',prefer:'resolution=ignore-duplicates,return=minimal',body:JSON.stringify({lead_id:lead,role_type:'ACQUIRENTE',role_status:'ACTIVE',pipeline_stage:'RICERCA_ATTIVA',source:'DEMAND_ENGINE'})})}catch(_){}
 st.className='status ok';st.textContent='Richiesta salvata. Match ricalcolati.';e.target.reset();await load();
 }catch(err){st.className='status err';st.textContent=err.message}}
document.addEventListener('DOMContentLoaded',()=>{$('requestForm').addEventListener('submit',save);load()});
})();