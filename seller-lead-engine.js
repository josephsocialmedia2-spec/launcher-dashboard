(()=>{
'use strict';
const DATA='./data/seller-lead-engine-public.json';
const COMMS='./data/communication-outbox.json';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=v=>v==null||v===''?'—':String(v);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const GEO_CACHE_KEY='f1_seller_geo_comuni_v1';
let geoCache={};
try{geoCache=JSON.parse(localStorage.getItem(GEO_CACHE_KEY)||'{}')||{}}catch(_){geoCache={}}

async function getJson(url){const r=await fetch(url+'?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error(url+': HTTP '+r.status);return r.json()}
function renderIntegrations(x={}){const labels={crm:'CRM',seller_radar:'SELLER RADAR',microzones:'MICROZONE',communication_scheduler:'SCHEDULER',postiz:'POSTIZ',email_channel:'EMAIL',whatsapp_channel:'WHATSAPP'};$('integrations').innerHTML=Object.entries(labels).map(([k,l])=>'<div class="status"><strong>'+esc(l)+'</strong>'+esc(fmt(x[k]))+'</div>').join('')}
function normComune(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function haversineKm(a,b,c,d){const R=6371,rad=x=>x*Math.PI/180;const dLat=rad(c-a),dLon=rad(d-b);const q=Math.sin(dLat/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
function distanceLabel(v){return Number.isFinite(v)?'≈ '+v.toLocaleString('it-IT',{minimumFractionDigits:v<10?1:0,maximumFractionDigits:1})+' km':'—'}
function sortRowsByDistance(rows=[]){return [...rows].sort((a,b)=>{const ad=Number.isFinite(a._distanceKm)?a._distanceKm:Infinity;const bd=Number.isFinite(b._distanceKm)?b._distanceKm:Infinity;if(ad!==bd)return ad-bd;return Number(b.lead_score||0)-Number(a.lead_score||0)})}
function renderRows(rows=[]){
 const sorted=sortRowsByDistance(rows);
 $('rows').innerHTML=sorted.length?sorted.slice(0,100).map(r=>'<tr><td><span class="distance">'+esc(distanceLabel(r._distanceKm))+'</span></td><td><span class="tag '+esc(r.lead_status)+'">'+esc(r.lead_status)+'</span><div class="mut">score '+esc(r.lead_score)+'</div></td><td><b>'+esc(fmt(r.comune))+'</b><div>'+esc(fmt(r.via))+(r.civico?' '+esc(r.civico):'')+'</div><div class="mut">raggio '+esc(r.radius_m)+' m</div></td><td>'+esc((r.signals||[]).join(' · ')||r.event_type||'—')+'</td><td>'+esc(fmt(r.campaign_type))+'</td><td><div>'+esc(fmt(r.email_status))+'</div><div>'+esc(fmt(r.whatsapp_status))+'</div><div class="mut">'+esc(fmt(r.marketing_status))+'</div></td><td>'+esc(fmt(r.next_action))+'</td><td>'+(r.source_url?'<a href="'+esc(r.source_url)+'" target="_blank" rel="noopener" style="color:#78c7ff">'+esc(fmt(r.source))+'</a>':esc(fmt(r.source)))+'</td></tr>').join(''):'<tr><td colspan="8" class="empty">Nessuna opportunità nel feed corrente.</td></tr>'
}
function setGeoStatus(text,state=''){const el=$('geoSortStatus');if(!el)return;el.textContent=text;el.classList.remove('ok','bad');if(state)el.classList.add(state)}
function getPosition(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error('Geolocalizzazione non disponibile'));navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),reject,{enableHighAccuracy:true,timeout:12000,maximumAge:60000})})}
async function geocodeComune(comune){
 const key=normComune(comune); const cached=geoCache[key];
 if(cached&&Number.isFinite(cached.lat)&&Number.isFinite(cached.lng))return cached;
 const q=encodeURIComponent(comune+', Torino, Piemonte, Italia');
 const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=it&q='+q;
 const r=await fetch(url,{headers:{'Accept':'application/json'}});
 if(!r.ok)throw new Error('Geocodifica '+comune+' HTTP '+r.status);
 const a=await r.json(); if(!a||!a[0])return null;
 const out={lat:Number(a[0].lat),lng:Number(a[0].lon),ts:Date.now()};
 if(Number.isFinite(out.lat)&&Number.isFinite(out.lng)){geoCache[key]=out;try{localStorage.setItem(GEO_CACHE_KEY,JSON.stringify(geoCache))}catch(_){}return out}
 return null
}
async function applyDistanceSort(rows=[]){
 setGeoStatus('📍 Autorizza la posizione per ordinare le priorità dalla più vicina alla più lontana.');
 let pos;
 try{pos=await getPosition()}catch(e){setGeoStatus('Posizione non disponibile: elenco mantenuto per priorità/score. Abilita la geolocalizzazione del browser per usare la distanza.','bad');renderRows(rows);return}
 setGeoStatus('📍 Posizione acquisita. Calcolo distanza dei Comuni…');
 const comuni=[...new Set(rows.map(r=>String(r.comune||'').trim()).filter(Boolean))];
 let done=0,found=0;
 for(const comune of comuni){
   let c=null;
   try{c=await geocodeComune(comune)}catch(_){}
   if(c){found++;for(const r of rows){if(normComune(r.comune)===normComune(comune))r._distanceKm=haversineKm(pos.lat,pos.lng,c.lat,c.lng)}}
   done++;
   setGeoStatus('📍 Ordinamento geografico: '+done+'/'+comuni.length+' Comuni elaborati…');
   renderRows(rows);
   if(done<comuni.length&&!geoCache[normComune(comuni[done])])await sleep(1050);
 }
 setGeoStatus('📍 Priorità ordinate per distanza dalla tua posizione · '+found+'/'+comuni.length+' Comuni localizzati · distanza stimata dal centro del Comune.','ok');
 renderRows(rows)
}
async function boot(){try{
 const [d,q]=await Promise.all([getJson(DATA),getJson(COMMS)]);
 const s=d.summary||{};
 $('kTotal').textContent=fmt(s.total);$('kHot').textContent=fmt(s.hot);$('kWarm').textContent=fmt(s.warm);$('kNurture').textContent=fmt(s.nurture);$('kQueue').textContent=fmt((q.items||[]).length);$('kRadius').textContent=((d.territory||{}).microzone_radius_m||1000)/1000+' km';
 renderIntegrations(d.integrations||{});
 const opportunities=d.opportunities||[];
 renderRows(opportunities);
 $('policy').textContent=(d.communication_policy||{}).rule||'Ogni invio deve superare il gate di eleggibilità del canale.';
 $('meta').textContent='Ultimo run: '+fmt(d.generated_at)+' · hub: '+fmt((d.territory||{}).reference_hub)+' · coda comunicazioni: '+fmt((q.items||[]).length)+' · feed pubblico privo di recapiti personali.';
 if(d.valuation&&d.valuation.url)$('valuationBtn').href=d.valuation.url;
 applyDistanceSort(opportunities);
}catch(e){$('rows').innerHTML='<tr><td colspan="8" class="empty">ERRORE · '+esc(e.message)+'</td></tr>';$('meta').textContent='Errore caricamento Sistema Acquisizione Venditori';setGeoStatus('Ordinamento geografico non disponibile.','bad')}}
document.addEventListener('DOMContentLoaded',boot);
})();
