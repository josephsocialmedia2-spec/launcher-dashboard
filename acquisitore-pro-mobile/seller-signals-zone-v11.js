(()=>{'use strict';
const MANUAL='../seller-segnalati.json';
const AUTO='https://josephsocialmedia2-spec.github.io/immobili-in-zona/seller_radar_auto/data/giro_acquisizione.csv';
const ARCHIVE='../seller-segnalati.html';
const CACHE_KEY='f1SellerSignalCacheV3';
const LEGACY_CACHE_KEY='f1SellerSignalCacheV2';
const TARGET_KEY='f1VaiZonaTargets';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]||m));
let records=[],position=0,loading=false,lastError='';

function parseCSV(text){
  text=String(text||'').replace(/^\uFEFF/,'');
  const rows=[];let row=[],cell='',quote=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quote){if(c==='"'&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')quote=false;else cell+=c}
    else if(c==='"')quote=true;
    else if(c===','){row.push(cell);cell=''}
    else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell=''}
    else if(c!=='\r')cell+=c;
  }
  if(cell||row.length){row.push(cell);rows.push(row)}
  if(rows.length<2)return[];
  const h=rows.shift().map(x=>x.trim());
  return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(h.map((k,i)=>[k,(r[i]||'').trim()])));
}
function hash(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
function normalizeSignals(value){
  let list=Array.isArray(value)?value:String(value||'').split(/\s*\+\s*|\s*\|\s*/).filter(Boolean);
  list=list.map(x=>String(x).trim()).filter(Boolean).flatMap(s=>{
    if(s==='NON_DETERMINATO')return['DA VERIFICARE'];
    if(s==='INDIZIO_PRIVATO')return['PRIVATO'];
    if(s==='INDIZIO_AGENZIA')return['AGENZIA','DA VERIFICARE'];
    return[s];
  });
  if(!list.length)list=['DA VERIFICARE'];
  return[...new Set(list)];
}
function autoMap(x){
  return{
    id:'auto-'+hash(x.URL||[x.COMUNE,x.DOVE_ANDRE,x.PREZZO].join('|')),
    comune:x.COMUNE||'',indirizzo:x.DOVE_ANDRE||'INDIRIZZO DA VERIFICARE',
    cosa_cerco:x.COSA_CERCO||'',prezzo_attuale:x.PREZZO||'PREZZO DA VERIFICARE',
    prezzo_precedente:'',ribasso:'',seller_signal:normalizeSignals(x.SELLER_SIGNAL),
    score:Number(x.SCORE||0),priorita:x.PRIORITA||'',fonte:x.FONTE||'Radar F1',
    url:x.URL||'',prima_rilevazione_f1:'',origine:'Radar automatico'
  };
}
function normalizeRecord(r){
  if(!r||typeof r!=='object')return null;
  return{...r,id:r.id||('manual-'+hash(JSON.stringify(r))),seller_signal:normalizeSignals(r.seller_signal||r.segnale),score:Number(r.score||0)};
}
function key(r){
  const addr=String(r.indirizzo||'').toLowerCase().replace(/\s+/g,' ').trim();
  const city=String(r.comune||'').toLowerCase().trim();
  const price=String(r.prezzo_attuale||'').toLowerCase().trim();
  return addr?[city,addr,price].join('|'):String(r.url||[city,price].join('|')).toLowerCase();
}
function dedupe(arr){
  const m=new Map();
  for(const raw of arr){const r=normalizeRecord(raw);if(!r)continue;const k=key(r);if(!k)continue;if(!m.has(k)||signalRank(r)>signalRank(m.get(k))||Number(r.score||0)>Number(m.get(k).score||0))m.set(k,r)}
  return[...m.values()];
}
function status(id){try{return localStorage.getItem('f1:seller:'+id)||'DA LAVORARE'}catch{return'DA LAVORARE'}}
function setStatus(id,value){try{localStorage.setItem('f1:seller:'+id,value)}catch{}}
function signalRank(r){
  const s=normalizeSignals(r?.seller_signal).join(' ').toUpperCase();
  if(/NO AGENZIE|PRIVATO/.test(s))return 5;
  if(/RIBASSO|INVENDUTO|RIPUBBLICATO/.test(s))return 4;
  if(/NUOVO/.test(s))return 3;
  if(/AGENZIA/.test(s))return 0;
  return 1;
}
function active(){
  return records.filter(r=>status(r.id)==='DA LAVORARE').sort((a,b)=>
    signalRank(b)-signalRank(a)||Number(b.score||0)-Number(a.score||0)||String(a.comune||'').localeCompare(String(b.comune||''),'it')
  );
}
function splitAddress(r){
  const raw=String(r.indirizzo||'').trim();if(!raw)return{via:'',civico:''};
  if(/CIVICO DA VERIFICARE/i.test(raw))return{via:raw.replace(/\s*[·-]?\s*CIVICO DA VERIFICARE.*$/i,'').trim(),civico:''};
  const m=raw.match(/^(.*?)[,\s]+(\d+[A-Za-z]?(?:\/[A-Za-z0-9]+)?)$/);
  return m?{via:m[1].trim(),civico:m[2]}:{via:raw,civico:''};
}
function syncTargets(){
  const rows=active().map(r=>{const a=splitAddress(r);return{paese:r.comune||'',via:a.via,civico:a.civico,cosa:r.cosa_cerco||'Opportunità immobiliare',prezzo:r.prezzo_attuale||'',segnale:normalizeSignals(r.seller_signal).join(' + '),seller_id:r.id||'',score:Number(r.score||0),priorita:r.priorita||'',fonte:r.fonte||'',url:r.url||''}});
  try{localStorage.setItem(TARGET_KEY,JSON.stringify(rows))}catch{}
  return rows;
}
function saveCache(){try{localStorage.setItem(CACHE_KEY,JSON.stringify({ts:new Date().toISOString(),records}))}catch{}}
function loadCache(){
  for(const k of[CACHE_KEY,LEGACY_CACHE_KEY]){try{const x=JSON.parse(localStorage.getItem(k)||'null');if(Array.isArray(x?.records)&&x.records.length)return x.records}catch{}}
  return[];
}
function legacyFallback(){
  try{const a=JSON.parse(localStorage.getItem(TARGET_KEY)||'[]');if(!Array.isArray(a))return[];return a.map((x,i)=>({id:x.seller_id||('legacy-'+i+'-'+hash(JSON.stringify(x))),comune:x.paese||'',indirizzo:[x.via,x.civico].filter(Boolean).join(' '),cosa_cerco:x.cosa||'',prezzo_attuale:x.prezzo||'',prezzo_precedente:'',ribasso:'',seller_signal:normalizeSignals(x.segnale),score:Number(x.score||0),priorita:x.priorita||'',fonte:x.fonte||'Cache telefono',url:x.url||'',origine:'Destinazioni salvate sul telefono'}))}catch{return[]}
}
function mapUrl(r){if(!r.indirizzo||/DA VERIFICARE/i.test(r.indirizzo))return'';return'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(r.indirizzo+', '+(r.comune||'')+', TO, Italia')}
function sigClass(s){return/NO AGENZIE|PRIVATO/i.test(s)?'hot':/RIBASSO|INVENDUTO|RIPUBBLICATO/i.test(s)?'warn':/DA VERIFICARE|AGENZIA/i.test(s)?'check':''}
function installUI(){
  if($('sellerZoneOverlay'))return;
  const style=document.createElement('style');style.textContent=`
body.sellerZoneOpen{overflow:hidden!important}#sellerZoneOverlay{display:none;position:fixed;inset:0;z-index:2147483200;background:#f3f6fa;color:#102844;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;min-height:100dvh}#sellerZoneOverlay.open{display:block}
#sellerZoneOverlay .szTop{position:sticky;top:0;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:calc(12px + env(safe-area-inset-top)) 14px 12px;background:#102844;color:#fff;box-shadow:0 4px 16px #10284433}#sellerZoneOverlay .szTop b{font-size:19px;line-height:1.15}.szClose{width:48px;height:48px;flex:0 0 48px;border:0;border-radius:14px;background:#fff;color:#102844;font-size:30px;font-weight:900}
#sellerZoneOverlay .szWrap{width:min(100%,720px);margin:auto;padding:14px 14px calc(28px + env(safe-area-inset-bottom))}.szIntro{background:#fff;border:1px solid #dae2ea;border-radius:18px;padding:14px;margin-bottom:12px}.szIntro strong{display:block;font-size:20px}.szIntro small{display:block;margin-top:5px;color:#627181;font-weight:700;line-height:1.35}.szCounts{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.szCount{background:#eef3f7;border-radius:999px;padding:6px 9px;font-size:12px;font-weight:900}
.szCard{background:#fff;border:2px solid #f28a1e;border-radius:20px;padding:16px;box-shadow:0 8px 24px #10284412}.szRank{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.szRank .place{font-size:23px;font-weight:950;line-height:1.15}.szScore{white-space:nowrap;background:#102844;color:#fff;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:950}.szAddr{font-size:21px;font-weight:950;margin:9px 0 14px;line-height:1.2}.szField{margin:10px 0;font-size:15px;line-height:1.4}.szField span{display:block;color:#6b7785;font-size:11px;font-weight:950;letter-spacing:.04em;margin-bottom:2px}.szSignals{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}.szSignal{display:inline-block;border-radius:999px;padding:7px 9px;background:#eaf7ef;color:#126936;border:1px solid #b7dfc5;font-size:12px;font-weight:950}.szSignal.hot{background:#ffeaea;color:#a31818;border-color:#efb7b7}.szSignal.warn{background:#fff6df;color:#855d00;border-color:#ecd79a}.szSignal.check{background:#eef3f7;color:#50606f;border-color:#cfd9e2}
.szActions{display:grid;grid-template-columns:1fr;gap:9px;margin-top:14px}.szActions button,.szActions a{min-height:54px;border:0;border-radius:14px;padding:12px;text-align:center;text-decoration:none;font-size:16px;font-weight:950;display:flex;align-items:center;justify-content:center}.szNext{background:#287fca;color:#fff}.szDone{background:#20a653;color:#fff}.szDiscard{background:#d73c35;color:#fff}.szSource{background:#102844;color:#fff}.szMap{background:#eef3f7;color:#102844;border:1px solid #cfd9e2!important}.szArchive{background:#fff;color:#102844;border:2px solid #102844!important}.szRefresh{background:#f28a1e;color:#fff}.szEmpty,.szLoading{background:#fff;border:1px solid #dae2ea;border-radius:18px;padding:20px;font-size:17px;font-weight:800;line-height:1.45}.szMeta{margin:10px 2px;color:#657485;font-size:12px;font-weight:800}@media(min-width:620px){.szActions{grid-template-columns:1fr 1fr}}@media(max-width:380px){#sellerZoneOverlay .szWrap{padding-left:9px;padding-right:9px}.szAddr{font-size:19px}.szRank .place{font-size:20px}}`;
  document.head.appendChild(style);
  const o=document.createElement('div');o.id='sellerZoneOverlay';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-hidden','true');
  o.innerHTML='<div class="szTop"><b>📍 VAI IN ZONA · SELLER SIGNAL</b><button id="sellerZoneClose" class="szClose" type="button" aria-label="Chiudi">×</button></div><div class="szWrap"><div class="szIntro"><strong>Seller da lavorare</strong><small>Tutti i risultati Radar sono visibili. I segnali forti vengono prima; quelli non ancora classificati sono indicati DA VERIFICARE.</small><div id="sellerZoneCounts" class="szCounts"></div></div><div id="sellerZoneBody" class="szLoading">Caricamento Seller Signal…</div></div>';
  document.body.appendChild(o);$('sellerZoneClose').onclick=closeOverlay;
}
function renderCounts(a){
  const el=$('sellerZoneCounts');if(!el)return;
  const strong=a.filter(r=>signalRank(r)>=3).length,verify=a.filter(r=>normalizeSignals(r.seller_signal).includes('DA VERIFICARE')).length;
  el.innerHTML=`<span class="szCount">${a.length} DA LAVORARE</span><span class="szCount">${strong} SEGNALI FORTI</span><span class="szCount">${verify} DA VERIFICARE</span>`;
}
function render(){
  const body=$('sellerZoneBody');if(!body)return;const a=active();syncTargets();renderCounts(a);
  if(!a.length){body.className='szEmpty';body.innerHTML=`<b>Nessun Seller DA LAVORARE.</b><br><span style="font-weight:600">${lastError?'Aggiornamento rete non disponibile: controllata anche la cache del telefono.':'Tutti i seller caricati risultano lavorati o scartati.'}</span><div class="szActions"><button id="sellerRefresh" class="szRefresh">↻ AGGIORNA SELLER SIGNAL</button><a class="szArchive" href="${ARCHIVE}" target="_blank" rel="noopener">ARCHIVIO SELLER</a></div>`;$('sellerRefresh').onclick=()=>loadSignals(true);return}
  if(position>=a.length)position=0;const r=a[position],signals=normalizeSignals(r.seller_signal),map=mapUrl(r),prev=r.prezzo_precedente?`${esc(r.prezzo_precedente)}${r.ribasso?' · '+esc(r.ribasso):''}`:'';
  body.className='';body.innerHTML=`<div class="szMeta">SELLER ${position+1} DI ${a.length} DA LAVORARE</div><article class="szCard" data-seller-id="${esc(r.id)}"><div class="szRank"><div class="place">${esc(r.comune||'Zona da verificare')}</div><div class="szScore">${Number(r.score||0)} · ${esc(r.priorita||'DA VALUTARE')}</div></div><div class="szAddr">${esc(r.indirizzo||'INDIRIZZO DA VERIFICARE')}</div><div class="szField"><span>COSA CERCO</span>${esc(r.cosa_cerco||'DA VERIFICARE')}</div><div class="szField"><span>PREZZO</span>${esc(r.prezzo_attuale||'PREZZO DA VERIFICARE')}</div>${prev?`<div class="szField"><span>PREZZO PRECEDENTE / RIBASSO</span>${prev}</div>`:''}<div class="szSignals">${signals.map(s=>`<span class="szSignal ${sigClass(s)}">${esc(s)}</span>`).join('')}</div><div class="szField"><span>FONTE</span>${esc(r.fonte||'Radar F1')}${r.origine?' · '+esc(r.origine):''}</div><div class="szActions">${r.url?`<a class="szSource" href="${esc(r.url)}" target="_blank" rel="noopener">APRI FONTE</a>`:''}${map?`<a class="szMap" href="${esc(map)}" target="_blank" rel="noopener">📍 APRI MAPPA</a>`:''}<button id="sellerDone" class="szDone">✓ LAVORATO</button><button id="sellerDiscard" class="szDiscard">SCARTA</button><button id="sellerNext" class="szNext">→ PROSSIMO SELLER</button><button id="sellerRefresh" class="szRefresh">↻ AGGIORNA</button><a class="szArchive" href="${ARCHIVE}" target="_blank" rel="noopener">ARCHIVIO SELLER</a></div></article>`;
  $('sellerDone').onclick=()=>{setStatus(r.id,'LAVORATO');position=0;render()};$('sellerDiscard').onclick=()=>{setStatus(r.id,'SCARTATO');position=0;render()};$('sellerNext').onclick=()=>{position=(position+1)%a.length;render()};$('sellerRefresh').onclick=()=>loadSignals(true);
}
async function loadSignals(){
  if(loading)return;loading=true;lastError='';const body=$('sellerZoneBody');if(body){body.className='szLoading';body.textContent='Aggiorno Seller Signal…'}
  let manual=[],auto=[];
  const [m,a]=await Promise.allSettled([
    fetch(MANUAL+'?v='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('manual '+r.status);return r.json()}).then(j=>Array.isArray(j.records)?j.records:[]),
    fetch(AUTO+'?v='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('auto '+r.status);return r.text()}).then(t=>parseCSV(t).map(autoMap))
  ]);
  if(m.status==='fulfilled')manual=m.value;if(a.status==='fulfilled')auto=a.value;if(m.status==='rejected'&&a.status==='rejected')lastError='network';
  let merged=dedupe([...manual,...auto]);if(!merged.length)merged=dedupe(loadCache());if(!merged.length)merged=dedupe(legacyFallback());records=merged;position=0;if(records.length)saveCache();syncTargets();loading=false;render();
}
function openOverlay(){installUI();const o=$('sellerZoneOverlay');o.classList.add('open');o.setAttribute('aria-hidden','false');document.body.classList.add('sellerZoneOpen');o.scrollTop=0;render();loadSignals()}
function closeOverlay(){const o=$('sellerZoneOverlay');if(!o)return;o.classList.remove('open');o.setAttribute('aria-hidden','true');document.body.classList.remove('sellerZoneOpen')}
function init(){installUI();document.addEventListener('click',e=>{const b=e.target.closest?.('#zoneOpenBtn');if(!b)return;e.preventDefault();e.stopImmediatePropagation();openOverlay()},true);window.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('sellerZoneOverlay')?.classList.contains('open'))closeOverlay()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.F1SellerSignalsZone={open:openOverlay,close:closeOverlay,refresh:loadSignals,getRecords:()=>records.slice(),getActive:()=>active().slice()};
})();
