(function(){
'use strict';
const marks=new Set();
function mark(name){try{if(!marks.has(name)){performance.mark(name);marks.add(name)}}catch(_){}}
function measure(name,start,end){try{performance.measure(name,start,end);const xs=performance.getEntriesByName(name,'measure');return xs.length?xs[xs.length-1].duration:null}catch(_){return null}}
function duration(name){const xs=performance.getEntriesByName(name,'measure');return xs.length?xs[xs.length-1].duration:null}
function report(){const rows=[
  {FASE:'AUTH',MS:duration('AUTH')},
  {FASE:'FIRST DATA',MS:duration('FIRST DATA')},
  {FASE:'RENDER',MS:duration('RENDER')},
  {FASE:'TIME TO USABLE',MS:duration('TIME TO USABLE')}
].map(x=>({...x,MS:x.MS==null?'NON MISURATO':Math.round(x.MS*10)/10}));
try{console.table(rows)}catch(_){console.log('F1 PERFORMANCE',rows)}
return rows}
function instrumentAuth(){const Sync=window.F1Sync;if(!Sync||Sync.__f1PerfEnsure||typeof Sync.ensureSession!=='function')return;const original=Sync.ensureSession.bind(Sync);Sync.ensureSession=async function(...args){const out=await original(...args);mark('AUTH_COMPLETE');measure('AUTH','F1_BOOT_START','AUTH_COMPLETE');return out};Sync.__f1PerfEnsure=true}
function instrumentData(){const Data=window.F1AcquisitionData;if(!Data||Data.__f1PerfData)return;const names=['pullLeads','pullTasks','pullInteractions'],done=new Set();for(const name of names){if(typeof Data[name]!=='function')continue;const original=Data[name].bind(Data);Data[name]=async function(...args){if(!marks.has('FIRST_DATA_START'))mark('FIRST_DATA_START');try{return await original(...args)}finally{done.add(name);if(done.size===names.length&&!marks.has('FIRST_DATA_END')){mark('FIRST_DATA_END');measure('FIRST DATA','FIRST_DATA_START','FIRST_DATA_END');mark('FIRST_RENDER_START')}}}}Data.__f1PerfData=true}
function onRendered(){if(!marks.has('FIRST_RENDER_END')){mark('FIRST_RENDER_END');measure('RENDER','FIRST_RENDER_START','FIRST_RENDER_END');mark('CRM_USABLE');measure('TIME TO USABLE','F1_BOOT_START','CRM_USABLE');report()}}
mark('F1_BOOT_START');instrumentAuth();instrumentData();window.addEventListener('f1-crm-rendered',onRendered);
window.F1Perf={mark,measure,report,duration,marks};
})();
