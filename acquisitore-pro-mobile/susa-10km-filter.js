(()=>{'use strict';
const MAX_KM=10;
const DISTANCES_KM={
  'susa':0,
  'mompantero':1.4,
  'meana di susa':1.9,
  'gravere':3.2,
  'giaglione':3.5,
  'venaus':4.3,
  'mattie':5.2,
  'chiomonte':5.8,
  'novalesa':6.8,
  'bussoleno':7.2,
  'chianocco':9.1,
  'moncenisio':9.2,
  'san giorio di susa':9.8,
  'usseaux':10.1,
  'exilles':10.8
};
const CACHE_KEYS=['f1SellerSignalCacheV3','f1SellerSignalCacheV2'];
const TARGET_KEY='f1VaiZonaTargets';
const originalFetch=window.fetch.bind(window);
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘`´]/g,"'").replace(/\s+/g,' ').trim().toLowerCase();
function distanceFor(comune){const key=norm(comune);return Object.prototype.hasOwnProperty.call(DISTANCES_KM,key)?DISTANCES_KM[key]:null}
function isAllowedComune(comune){const d=distanceFor(comune);return Number.isFinite(d)&&d<=MAX_KM}
function filterRecords(list,field='comune'){
  if(!Array.isArray(list))return[];
  return list.filter(row=>isAllowedComune(row?.[field]??row?.COMUNE??row?.paese));
}
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
  if(!rows.length)return{headers:[],records:[]};
  const headers=rows.shift().map(x=>String(x||'').trim());
  const records=rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
  return{headers,records};
}
function csvCell(v){const s=String(v??'');return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function toCSV(headers,records){return [headers,...records.map(r=>headers.map(h=>r[h]??''))].map(row=>row.map(csvCell).join(',')).join('\n')}
function cloneResponse(response,body,contentType){const headers=new Headers(response.headers);if(contentType)headers.set('content-type',contentType);headers.set('x-f1-radius-filter','Susa-10km');return new Response(body,{status:response.status,statusText:response.statusText,headers})}
function sanitizeCaches(){
  for(const key of CACHE_KEYS){
    try{const x=JSON.parse(localStorage.getItem(key)||'null');if(Array.isArray(x?.records)){const before=x.records.length;x.records=filterRecords(x.records);if(x.records.length!==before)localStorage.setItem(key,JSON.stringify(x))}}catch{}
  }
  try{const rows=JSON.parse(localStorage.getItem(TARGET_KEY)||'[]');if(Array.isArray(rows)){const clean=filterRecords(rows,'paese');if(clean.length!==rows.length)localStorage.setItem(TARGET_KEY,JSON.stringify(clean))}}catch{}
}
window.fetch=async function(input,init){
  const url=String(input?.url||input||'');
  const response=await originalFetch(input,init);
  if(!response.ok)return response;
  try{
    if(url.includes('/seller_radar_auto/data/giro_acquisizione.csv')){
      const text=await response.clone().text(),parsed=parseCSV(text),clean=filterRecords(parsed.records,'COMUNE');
      return cloneResponse(response,toCSV(parsed.headers,clean),'text/csv; charset=utf-8');
    }
    if(/seller-segnalati\.json(?:\?|$)/i.test(url)){
      const json=await response.clone().json();
      if(Array.isArray(json?.records))return cloneResponse(response,JSON.stringify({...json,records:filterRecords(json.records)}),'application/json; charset=utf-8');
    }
  }catch(error){console.warn('F1 filtro Susa 10 km: risposta non filtrata per errore di parsing',error)}
  return response;
};
sanitizeCaches();
window.addEventListener('storage',e=>{if(CACHE_KEYS.includes(e.key)||e.key===TARGET_KEY)sanitizeCaches()});
window.F1Susa10kmFilter={MAX_KM,DISTANCES_KM,distanceFor,isAllowedComune,filterRecords,sanitizeCaches};
})();
