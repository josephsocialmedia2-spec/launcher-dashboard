(()=>{'use strict';
const STORAGE_KEY='f1:prospecting:susa:v1';
const DATA_URL='./susa-prospecting-data.json';
const SVG_NS='http://www.w3.org/2000/svg';
const $=id=>document.getElementById(id);
let data=null;
let dataPromise=null;
let progress=loadProgress();
let gpsWatch=null;
let gpsPoint=null;
let resizeTimer=null;

function defaultProgress(){return{dayIndex:0,stepByDay:{},statuses:{},updatedAt:null}}
function loadProgress(){try{return{...defaultProgress(),...JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}}catch{return defaultProgress()}}
function saveProgress(){progress.updatedAt=new Date().toISOString();try{localStorage.setItem(STORAGE_KEY,JSON.stringify(progress))}catch{}}
function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
function statusKey(dayIndex,stepIndex){return`${dayIndex}:${stepIndex}`}
function currentDay(){return data?.days?.[progress.dayIndex]||null}
function currentStepIndex(){const day=currentDay();if(!day)return 0;return clamp(Number(progress.stepByDay[progress.dayIndex]||0),0,Math.max(0,day.runs.length-1))}
function currentRun(){return currentDay()?.runs?.[currentStepIndex()]||null}
function loadData(){
  if(data)return Promise.resolve(data);
  if(!dataPromise)dataPromise=fetch(DATA_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Dati percorso non disponibili');return r.json()}).then(x=>{if(!Array.isArray(x.days)||x.days.length!==20)throw Error('Percorso Susa incompleto');data=x;return data}).catch(e=>{dataPromise=null;throw e});
  return dataPromise;
}
function setUnderlyingInert(on){for(const el of [document.querySelector('body>header'),document.querySelector('main')])if(el&&'inert'in el)el.inert=on}
function installUI(){
  if($('susaProspectingOverlay'))return;
  const overlay=document.createElement('div');
  overlay.id='susaProspectingOverlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-hidden','true');overlay.setAttribute('aria-labelledby','spTitle');
  overlay.innerHTML=`
    <div class="spTop"><div id="spTitle" class="spTopTitle">🗺️ PROSPECTING SUSA<small>TUTTE LE VIE · NAVIGATORE OPERATIVO F1</small></div><button id="spClose" class="spClose" type="button" aria-label="Chiudi">×</button></div>
    <div class="spWrap">
      <section class="spSummary">
        <label class="spDayLabel">GIORNATA<select id="spDaySelect" class="spDaySelect" aria-label="Seleziona giornata"></select></label>
        <div class="spMetrics"><div class="spMetric"><b id="spDays">20</b>GIORNATE DA 6 ORE</div><div class="spMetric"><b id="spKm">145,3</b>KM OPERATIVI</div><div class="spMetric"><b id="spStreets">0/134</b>VIE LAVORATE</div></div>
        <div class="spProgress" aria-label="Avanzamento totale"><i id="spProgressBar"></i></div>
      </section>
      <section class="spMapCard">
        <svg id="spMap" class="spMap" viewBox="0 0 700 520" role="img" aria-label="Percorso stradale della giornata selezionata"></svg>
        <div class="spGps"><span id="spGpsStatus">GPS pronto all'apertura del percorso.</span><button id="spGpsBtn" type="button">📍 AGGIORNA GPS</button></div>
      </section>
      <section class="spInstruction" aria-live="polite"><div id="spStep" class="spStep">CARICAMENTO…</div><div id="spDirection" class="spDirection">Preparo il percorso.</div><span id="spRunState" class="spState">DA FARE</span></section>
      <div class="spOutcomeActions"><button id="spDone" class="spDone" type="button">✓ FATTA</button><button id="spReturn" class="spReturn" type="button">↩ DA TORNARE</button><button id="spContact" class="spContact" type="button">👤 CONTATTO TROVATO</button></div>
      <div class="spNav"><button id="spPrev" type="button">← INDIETRO</button><button id="spNext" class="spNext" type="button">PROSSIMA SVOLTA →</button></div>
      <div class="spAttribution">Dati stradali © OpenStreetMap contributors · avanzamento salvato sul telefono</div>
    </div>`;
  document.body.appendChild(overlay);
  $('spClose').addEventListener('click',closeOverlay);
  $('spDaySelect').addEventListener('change',()=>{progress.dayIndex=Number($('spDaySelect').value)||0;saveProgress();render()});
  $('spPrev').addEventListener('click',()=>move(-1));
  $('spNext').addEventListener('click',()=>move(1));
  $('spDone').addEventListener('click',()=>markRun('FATTA'));
  $('spReturn').addEventListener('click',()=>markRun('RITORNO'));
  $('spContact').addEventListener('click',contactFound);
  $('spGpsBtn').addEventListener('click',startGps);
}
function openOverlay(){
  installUI();
  const overlay=$('susaProspectingOverlay');overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');document.body.classList.add('susaProspectingOpen');setUnderlyingInert(true);
  $('spStep').textContent='CARICAMENTO PERCORSO';$('spDirection').textContent='Preparo tutte le vie di Susa…';
  loadData().then(()=>{normaliseProgress();populateDays();render();startGps();setTimeout(()=>$('spClose')?.focus(),30)}).catch(e=>{$('spStep').textContent='ERRORE';$('spDirection').textContent=String(e.message||e)});
}
function closeOverlay(){const overlay=$('susaProspectingOverlay');if(!overlay)return;overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');document.body.classList.remove('susaProspectingOpen');setUnderlyingInert(false);stopGps();saveProgress()}
function normaliseProgress(){progress.dayIndex=clamp(Number(progress.dayIndex||0),0,data.days.length-1);if(!progress.stepByDay||typeof progress.stepByDay!=='object')progress.stepByDay={};if(!progress.statuses||typeof progress.statuses!=='object')progress.statuses={}}
function populateDays(){
  const select=$('spDaySelect');if(select.options.length===data.days.length){select.value=String(progress.dayIndex);return}
  select.innerHTML='';for(const [index,day]of data.days.entries()){const option=document.createElement('option');option.value=String(index);option.textContent=`Giorno ${day.day} · circa 6 ore · ${(day.length_m/1000).toFixed(1).replace('.',',')} km · ${day.streets.length} vie`;select.appendChild(option)}select.value=String(progress.dayIndex);
}
function namedRoad(day,index){
  const run=day.runs[index];if(run?.name&&run.name!=='Collegamento')return run.name;
  for(let offset=1;offset<day.runs.length;offset++){for(const candidate of [index-offset,index+offset]){const name=day.runs[candidate]?.name;if(name&&name!=='Collegamento')return name}}
  return'Susa';
}
function totalRunCount(){return data.days.reduce((sum,day)=>sum+day.runs.length,0)}
function completedRunCount(){return Object.values(progress.statuses).filter(Boolean).length}
function completedStreetCount(){
  const names=new Set();for(const [key,value]of Object.entries(progress.statuses)){if(!value)continue;const parts=key.split(':').map(Number);const day=data.days[parts[0]],run=day?.runs?.[parts[1]];if(run?.target&&run.name&&run.name!=='Collegamento')names.add(run.name)}return names.size;
}
function render(){
  if(!data)return;normaliseProgress();const day=currentDay(),index=currentStepIndex(),run=currentRun();if(!day||!run)return;
  $('spDaySelect').value=String(progress.dayIndex);$('spDays').textContent=String(data.days.length);$('spKm').textContent=(data.route_length_m/1000).toFixed(1).replace('.',',');$('spStreets').textContent=`${completedStreetCount()}/134`;
  $('spProgressBar').style.width=`${Math.round(100*completedRunCount()/Math.max(1,totalRunCount()))}%`;
  $('spStep').textContent=`GIORNO ${day.day} · PASSAGGIO ${index+1} DI ${day.runs.length}`;
  const metres=Math.max(1,Math.round(run.length_m/5)*5),road=run.name==='Collegamento'?'il collegamento tra le vie':run.name;$('spDirection').textContent=`${run.turn} su ${road} · ${metres} m`;
  const state=progress.statuses[statusKey(progress.dayIndex,index)]||'';const badge=$('spRunState');badge.className='spState';if(state==='FATTA'){badge.textContent='✓ FATTA';badge.classList.add('done')}else if(state==='RITORNO'){badge.textContent='↩ DA TORNARE';badge.classList.add('return')}else if(state==='CONTATTO'){badge.textContent='👤 CONTATTO TROVATO';badge.classList.add('contact')}else badge.textContent='DA FARE';
  $('spPrev').disabled=progress.dayIndex===0&&index===0;$('spNext').disabled=progress.dayIndex===data.days.length-1&&index===day.runs.length-1;renderMap();
}
function move(delta){
  if(!data)return;let dayIndex=progress.dayIndex,step=currentStepIndex();if(delta>0){if(step<data.days[dayIndex].runs.length-1)step++;else if(dayIndex<data.days.length-1){dayIndex++;step=Number(progress.stepByDay[dayIndex]||0)}}else{if(step>0)step--;else if(dayIndex>0){dayIndex--;step=data.days[dayIndex].runs.length-1}}
  progress.dayIndex=dayIndex;progress.stepByDay[dayIndex]=step;saveProgress();render();
}
function markRun(value){if(!data)return;const dayIndex=progress.dayIndex,index=currentStepIndex();progress.statuses[statusKey(dayIndex,index)]=value;progress.stepByDay[dayIndex]=index;saveProgress();move(1)}
function contactFound(){
  if(!data)return;const day=currentDay(),index=currentStepIndex(),address=`${namedRoad(day,index)}, Susa`;progress.statuses[statusKey(progress.dayIndex,index)]='CONTATTO';saveProgress();closeOverlay();
  setTimeout(()=>{$('newContactBtn')?.click();setTimeout(()=>{if($('mcAddress'))$('mcAddress').value=address;if($('mcNote')&&!$('mcNote').value)$('mcNote').value=`Circle prospecting · Giorno ${day.day} · passaggio ${index+1}`;if($('mcSource'))$('mcSource').value='Giro zona'},60)},40);
}
function allDaySegments(day){return day.runs.flatMap(run=>run.segments)}
function mapBounds(day){
  const points=allDaySegments(day).flat();let minLat=Infinity,maxLat=-Infinity,minLon=Infinity,maxLon=-Infinity;for(const p of points){minLat=Math.min(minLat,p[0]);maxLat=Math.max(maxLat,p[0]);minLon=Math.min(minLon,p[1]);maxLon=Math.max(maxLon,p[1])}
  const latPad=Math.max((maxLat-minLat)*.08,.00035),lonPad=Math.max((maxLon-minLon)*.08,.00035);return{minLat:minLat-latPad,maxLat:maxLat+latPad,minLon:minLon-lonPad,maxLon:maxLon+lonPad};
}
function projector(bounds){
  const width=700,height=520,pad=22,meanLat=(bounds.minLat+bounds.maxLat)/2,cos=Math.cos(meanLat*Math.PI/180);const minX=bounds.minLon*cos,maxX=bounds.maxLon*cos,spanX=Math.max(maxX-minX,.00001),spanY=Math.max(bounds.maxLat-bounds.minLat,.00001),scale=Math.min((width-2*pad)/spanX,(height-2*pad)/spanY),usedX=spanX*scale,usedY=spanY*scale,offX=(width-usedX)/2,offY=(height-usedY)/2;
  return point=>[offX+(point[1]*cos-minX)*scale,offY+(bounds.maxLat-point[0])*scale];
}
function overlaps(coords,bounds){for(const p of coords)if(p[0]>=bounds.minLat&&p[0]<=bounds.maxLat&&p[1]>=bounds.minLon&&p[1]<=bounds.maxLon)return true;return false}
function addPath(svg,coords,project,className){if(!coords?.length)return;const path=document.createElementNS(SVG_NS,'path');path.setAttribute('class',className);path.setAttribute('d',coords.map((point,index)=>{const p=project(point);return`${index?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`}).join(' '));svg.appendChild(path)}
function addCircle(svg,point,project,className,radius){const p=project(point),circle=document.createElementNS(SVG_NS,'circle');circle.setAttribute('class',className);circle.setAttribute('cx',p[0]);circle.setAttribute('cy',p[1]);circle.setAttribute('r',radius);svg.appendChild(circle)}
function renderMap(){
  const day=currentDay(),run=currentRun(),svg=$('spMap');if(!day||!run||!svg)return;const bounds=mapBounds(day),project=projector(bounds);svg.replaceChildren();
  for(const way of data.target_ways)if(overlaps(way.coordinates,bounds))addPath(svg,way.coordinates,project,'spStreet');
  for(const segment of allDaySegments(day))addPath(svg,segment,project,'spRoute');for(const segment of run.segments)addPath(svg,segment,project,'spCurrent');addCircle(svg,day.start,project,'spStart',7);
  const label=document.createElementNS(SVG_NS,'text'),start=project(day.start);label.setAttribute('class','spMapLabel');label.setAttribute('x',start[0]+10);label.setAttribute('y',start[1]-9);label.textContent=`PARTENZA G${day.day}`;svg.appendChild(label);
  if(gpsPoint&&gpsPoint[0]>=bounds.minLat&&gpsPoint[0]<=bounds.maxLat&&gpsPoint[1]>=bounds.minLon&&gpsPoint[1]<=bounds.maxLon)addCircle(svg,gpsPoint,project,'spPosition',8);
}
function startGps(){
  if(!navigator.geolocation){$('spGpsStatus').textContent='GPS non disponibile su questo dispositivo.';return}stopGps();$('spGpsStatus').textContent='Cerco la tua posizione…';
  gpsWatch=navigator.geolocation.watchPosition(position=>{gpsPoint=[position.coords.latitude,position.coords.longitude];$('spGpsStatus').textContent=`GPS attivo · precisione ${Math.round(position.coords.accuracy||0)} m`;renderMap()},error=>{$('spGpsStatus').textContent=error.code===1?'Permesso GPS non concesso.':'Posizione non disponibile.'},{enableHighAccuracy:true,timeout:15000,maximumAge:10000});
}
function stopGps(){if(gpsWatch!==null&&navigator.geolocation){navigator.geolocation.clearWatch(gpsWatch);gpsWatch=null}}
function init(){
  installUI();$('prospectingBtn')?.addEventListener('click',openOverlay);window.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('susaProspectingOverlay')?.classList.contains('open'))closeOverlay()});window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if($('susaProspectingOverlay')?.classList.contains('open'))renderMap()},120)});loadData().catch(()=>{});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.F1SusaProspecting={open:openOverlay,close:closeOverlay,getProgress:()=>JSON.parse(JSON.stringify(progress))};
})();
