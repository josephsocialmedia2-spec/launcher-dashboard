(()=> {
'use strict';
const VERSION='20260920-needs-radar-v1';
const ROUTE=[
 {key:'CONDOVE',label:'Condove',search:'Condove'},
 {key:'CAPRIE',label:'Caprie',search:'Caprie'},
 {key:'VILLAR DORA',label:'Villar Dora',search:'Villar Dora'},
 {key:'ALMESE',label:'Almese',search:'Almese'},
 {key:'RIVERA DI ALMESE',label:'Rivera di Almese',search:'Rivera di Almese'}
];
const OFFICIAL={
 'CONDOVE':'https://comune.condove.to.it/it-it/home',
 'CAPRIE':'https://www.comune.caprie.to.it/it-it/home',
 'VILLAR DORA':'https://www.comune.villardora.to.it/',
 'ALMESE':'https://comune.almese.to.it/',
 'RIVERA DI ALMESE':'https://comune.almese.to.it/'
};
const CLUSTERS=[
 {side:'VENDO CASA',label:'Quanto vale casa',phrases:['quanto vale casa mia','valutazione casa','prezzo al metro quadro','quanto posso chiedere per casa']},
 {side:'VENDO CASA',label:'Casa ereditata',phrases:['cosa fare con casa ereditata','vendere casa ereditata','casa ereditata tra fratelli']},
 {side:'VENDO CASA',label:'Casa vuota / inutilizzata',phrases:['appartamento vuoto cosa fare','seconda casa inutilizzata','casa vuota costa troppo']},
 {side:'VENDO CASA',label:'Vendere o affittare',phrases:['conviene vendere o affittare','meglio vendere o affittare seconda casa','affitto rende poco']},
 {side:'VENDO CASA',label:'Trasferimento',phrases:['mi trasferisco cosa fare con casa','trasferimento lavoro casa di proprietà','trasferimento altra città casa']},
 {side:'VENDO CASA',label:'Casa troppo grande',phrases:['casa troppo grande cosa fare','casa troppo grande per due persone','figli andati via casa grande']},
 {side:'VENDO CASA',label:'Mutuo / costi',phrases:['rata mutuo troppo alta','non riesco più a pagare mutuo','posso vendere casa con mutuo']},
 {side:'VENDO CASA',label:'Ristrutturare o vendere',phrases:['ristrutturare o vendere casa','casa da ristrutturare conviene vendere','quanto costa ristrutturare casa']},
 {side:'VENDO CASA',label:'Separazione / comproprietà',phrases:['separazione casa di proprietà','divorzio chi tiene la casa','vendere casa cointestata']},
 {side:'CERCO CASA',label:'Più spazio',phrases:['casa troppo piccola con figli','casa con una stanza in più','trilocale quattro locali']},
 {side:'CERCO CASA',label:'Giardino / terrazzo',phrases:['casa con giardino','trilocale con giardino','casa con terrazzo']},
 {side:'CERCO CASA',label:'Accessibilità',phrases:['casa piano terra senza scale','casa con ascensore','casa senza barriere architettoniche']},
 {side:'CERCO CASA',label:'Budget / mutuo',phrases:['quanto posso spendere per casa','mutuo prima casa','casa economica']},
 {side:'CERCO CASA',label:'Vicino a servizi',phrases:['casa vicino scuola','casa vicino stazione','casa vicino lavoro']}
];
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function style(){
 if($('f1NeedsRadarStyle'))return;
 const s=document.createElement('style');s.id='f1NeedsRadarStyle';s.textContent=`
 .f1-needs-panel{border:1px solid #c9ded2;border-radius:16px;background:#fff;padding:12px;box-shadow:0 6px 20px rgba(11,111,61,.06)}
 .f1-needs-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-wrap:wrap}.f1-needs-head h2{font-size:17px;font-weight:950;margin:0}.f1-needs-sub{font-size:9px;color:var(--mut);font-weight:800;margin-top:3px}.f1-needs-route{margin-top:4px;font-size:9px;color:#07502d;font-weight:950}
 .f1-needs-controls{display:grid;grid-template-columns:1fr 1fr auto;gap:7px;margin-top:10px}.f1-needs-controls select,.f1-needs-controls button{min-height:38px;border:1px solid var(--line);border-radius:9px;background:#fff;padding:7px;font:inherit;font-size:9px;font-weight:950}.f1-needs-controls button{background:var(--g);color:#fff;border-color:var(--g);cursor:pointer}
 .f1-needs-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.f1-need-card{border:1px solid var(--line);border-radius:12px;background:#f8fbf9;padding:10px;display:grid;gap:7px}.f1-need-card strong{font-size:11px}.f1-need-side{display:inline-flex;width:max-content;padding:4px 7px;border-radius:999px;background:#eef9f2;color:#07502d;font-size:8px;font-weight:950}.f1-need-side.sell{background:#fff0ee;color:#b42318}.f1-need-query{font-size:10px;line-height:1.35;font-weight:900}.f1-need-actions{display:flex;gap:5px;flex-wrap:wrap}.f1-need-actions button{min-height:31px;border:1px solid var(--line);border-radius:8px;background:#fff;padding:5px 7px;font:inherit;font-size:8px;font-weight:950;cursor:pointer}.f1-need-actions button.primary{background:var(--g);border-color:var(--g);color:#fff}
 .f1-needs-directive{margin-top:10px;border:2px solid #0b6f3d;border-radius:12px;background:#eef9f2;padding:10px;font-size:10px;line-height:1.45;font-weight:850}.f1-needs-directive strong{display:block;margin-bottom:4px}
 @media(max-width:720px){.f1-needs-controls{grid-template-columns:1fr 1fr}.f1-needs-controls button{grid-column:1/-1}.f1-needs-grid{grid-template-columns:1fr}}
 `;document.head.appendChild(s);
}
function build(){
 const acq=$('f1AcqDashboard');if(!acq)return false;if($('f1NeedsRadar'))return true;style();
 const panels=[...acq.querySelectorAll('.f1-acq-panel')];
 const news=panels.find(p=>/NOTIZIE TERRITORIALI/i.test(p.textContent||''))||panels[panels.length-1];
 const p=document.createElement('section');p.id='f1NeedsRadar';p.className='f1-needs-panel';
 p.innerHTML=`<div class="f1-needs-head"><div><h2>🔎 RADAR BISOGNI IMMOBILIARI</h2><div class="f1-needs-sub">CERCO CASA / VENDO CASA · Google Dork, community, portali, Trends, Ubersuggest e fonti comunali.</div><div class="f1-needs-route">CONDOVE → CAPRIE → VILLAR DORA → ALMESE → RIVERA DI ALMESE</div></div></div>
 <div class="f1-needs-controls"><select id="f1NeedsComune">${ROUTE.map(x=>'<option value="'+x.key+'">'+x.label+'</option>').join('')}</select><select id="f1NeedsSide"><option value="ALL">CERCO + VENDO</option><option value="VENDO CASA">VENDO CASA</option><option value="CERCO CASA">CERCO CASA</option></select><button id="f1NeedsGps" type="button">📍 USA GPS</button></div>
 <div id="f1NeedsGrid" class="f1-needs-grid"></div><div id="f1NeedsDirective" class="f1-needs-directive"></div>`;
 news.insertAdjacentElement('afterend',p);
 $('f1NeedsComune').addEventListener('change',render);$('f1NeedsSide').addEventListener('change',render);$('f1NeedsGps').addEventListener('click',useGps);render();return true;
}
function selectedComune(){const key=$('f1NeedsComune')?.value||'CONDOVE';return ROUTE.find(x=>x.key===key)||ROUTE[0]}
function makeQuery(cluster,place){return '"'+cluster.phrases[0]+'" "'+place.search+'"'}
function open(kind,q,place){
 let url='';const enc=encodeURIComponent(q);
 if(kind==='google')url='https://www.google.com/search?q='+enc;
 if(kind==='community')url='https://www.google.com/search?q='+encodeURIComponent(q+' (site:reddit.com OR site:immobilio.it OR site:quora.com)');
 if(kind==='portals')url='https://www.google.com/search?q='+encodeURIComponent(q+' (site:immobiliare.it OR site:idealista.it OR site:casa.it OR site:subito.it)');
 if(kind==='trends')url='https://trends.google.com/trends/explore?geo=IT&q='+enc;
 if(kind==='ubersuggest'){url='https://app.neilpatel.com/en/keyword-ideas';navigator.clipboard?.writeText(q).catch(()=>{})}
 if(kind==='official')url=OFFICIAL[place.key];
 if(url)window.open(url,'_blank','noopener');
}
function render(){
 const grid=$('f1NeedsGrid'),dir=$('f1NeedsDirective');if(!grid||!dir)return;const place=selectedComune(),side=$('f1NeedsSide')?.value||'ALL',list=CLUSTERS.filter(x=>side==='ALL'||x.side===side);
 grid.innerHTML=list.map((x,i)=>`<div class="f1-need-card"><div><span class="f1-need-side ${x.side==='VENDO CASA'?'sell':''}">${esc(x.side)}</span> <strong>${esc(x.label)}</strong></div><div class="f1-need-query">${esc(makeQuery(x,place))}</div><div class="f1-need-actions"><button class="primary" data-i="${i}" data-k="google">GOOGLE / DORK</button><button data-i="${i}" data-k="community">REDDIT / FORUM</button><button data-i="${i}" data-k="portals">PORTALI</button><button data-i="${i}" data-k="trends">TRENDS</button><button data-i="${i}" data-k="ubersuggest">UBERSUGGEST</button><button data-i="${i}" data-k="official">COMUNE / ALBO</button></div></div>`).join('');
 grid.querySelectorAll('[data-i]').forEach(b=>b.addEventListener('click',()=>{const x=list[Number(b.dataset.i)];if(x)open(b.dataset.k,makeQuery(x,place),place)}));
 const focus=list.slice(0,5).map(x=>x.label.toLowerCase()).join(', ');
 dir.innerHTML='<strong>DIRETTIVA AL FUNZIONARIO · '+esc(place.label.toUpperCase())+'</strong>Verifica Seller Radar e Notizie Territoriali; poi cerca segnali online collegati a '+esc(focus)+'. Collega ogni segnale a Comune, via o immobile quando possibile. Se emerge un bisogno concreto, trasformalo in azione CRM. Obiettivo finale: contatto qualificato e appuntamento, non semplice conversazione.';
}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
async function useGps(){
 const b=$('f1NeedsGps');if(!b)return;b.disabled=true;b.textContent='GPS…';
 try{
  if(!navigator.geolocation)throw Error('GPS non disponibile');
  const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:12000,maximumAge:60000}));
  const u='https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat='+encodeURIComponent(pos.coords.latitude)+'&lon='+encodeURIComponent(pos.coords.longitude);
  const r=await fetch(u,{headers:{'Accept-Language':'it'}});if(!r.ok)throw Error('Geocodifica non disponibile');const j=await r.json(),a=j.address||{},blob=norm([a.village,a.town,a.city,a.municipality,a.suburb,j.display_name].filter(Boolean).join(' '));
  let key='';if(blob.includes('rivera'))key='RIVERA DI ALMESE';else if(blob.includes('villar dora'))key='VILLAR DORA';else if(blob.includes('caprie')||blob.includes('novaretto'))key='CAPRIE';else if(blob.includes('condove'))key='CONDOVE';else if(blob.includes('almese'))key='ALMESE';
  if(key&&$('f1NeedsComune')){$('f1NeedsComune').value=key;render();b.textContent='📍 '+ROUTE.find(x=>x.key===key).label.toUpperCase()}else b.textContent='📍 FUORI BACINO';
 }catch(e){b.textContent='📍 GPS NON DISPONIBILE'}finally{setTimeout(()=>{b.disabled=false;if(!/^📍 (CONDOVE|CAPRIE|VILLAR|ALMESE|RIVERA)/.test(b.textContent))b.textContent='📍 USA GPS'},1800)}
}
function boot(){let n=0;const t=setInterval(()=>{n++;if(build()||n>200)clearInterval(t)},50)}
window.F1TerritoryNeedsRadar={version:VERSION,render};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();