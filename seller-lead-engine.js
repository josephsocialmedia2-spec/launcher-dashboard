(()=>{
'use strict';
const DATA='./data/seller-lead-engine-public.json';
const COMMS='./data/communication-outbox.json';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=v=>v==null||v===''?'—':String(v);
async function getJson(url){const r=await fetch(url+'?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error(url+': HTTP '+r.status);return r.json()}
function renderIntegrations(x={}){const labels={crm:'CRM',seller_radar:'SELLER RADAR',microzones:'MICROZONE',communication_scheduler:'SCHEDULER',postiz:'POSTIZ',email_channel:'EMAIL',whatsapp_channel:'WHATSAPP'};$('integrations').innerHTML=Object.entries(labels).map(([k,l])=>'<div class="status"><strong>'+esc(l)+'</strong>'+esc(fmt(x[k]))+'</div>').join('')}
function renderRows(rows=[]){$('rows').innerHTML=rows.length?rows.slice(0,100).map(r=>'<tr><td><span class="tag '+esc(r.lead_status)+'">'+esc(r.lead_status)+'</span><div class="mut">score '+esc(r.lead_score)+'</div></td><td><b>'+esc(fmt(r.comune))+'</b><div>'+esc(fmt(r.via))+(r.civico?' '+esc(r.civico):'')+'</div><div class="mut">raggio '+esc(r.radius_m)+' m</div></td><td>'+esc((r.signals||[]).join(' · ')||r.event_type||'—')+'</td><td>'+esc(fmt(r.campaign_type))+'</td><td><div>'+esc(fmt(r.email_status))+'</div><div>'+esc(fmt(r.whatsapp_status))+'</div><div class="mut">'+esc(fmt(r.marketing_status))+'</div></td><td>'+esc(fmt(r.next_action))+'</td><td>'+(r.source_url?'<a href="'+esc(r.source_url)+'" target="_blank" rel="noopener" style="color:#78c7ff">'+esc(fmt(r.source))+'</a>':esc(fmt(r.source)))+'</td></tr>').join(''):'<tr><td colspan="7" class="empty">Nessuna opportunità nel feed corrente.</td></tr>'}
async function boot(){try{
 const [d,q]=await Promise.all([getJson(DATA),getJson(COMMS)]);
 const s=d.summary||{};
 $('kTotal').textContent=fmt(s.total);$('kHot').textContent=fmt(s.hot);$('kWarm').textContent=fmt(s.warm);$('kNurture').textContent=fmt(s.nurture);$('kQueue').textContent=fmt((q.items||[]).length);$('kRadius').textContent=((d.territory||{}).microzone_radius_m||1000)/1000+' km';
 renderIntegrations(d.integrations||{});renderRows(d.opportunities||[]);
 $('policy').textContent=(d.communication_policy||{}).rule||'Ogni invio deve superare il gate di eleggibilità del canale.';
 $('meta').textContent='Ultimo run: '+fmt(d.generated_at)+' · hub: '+fmt((d.territory||{}).reference_hub)+' · coda comunicazioni: '+fmt((q.items||[]).length)+' · feed pubblico privo di recapiti personali.';
 if(d.valuation&&d.valuation.url)$('valuationBtn').href=d.valuation.url
}catch(e){$('rows').innerHTML='<tr><td colspan="7" class="empty">ERRORE · '+esc(e.message)+'</td></tr>';$('meta').textContent='Errore caricamento Seller Lead Engine'}}
document.addEventListener('DOMContentLoaded',boot);
})();
