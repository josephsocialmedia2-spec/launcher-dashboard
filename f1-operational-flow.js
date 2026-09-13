(function(){
'use strict';
const STORE='f1OperationalFlowV1';
const STEPS=[
  {id:'research',label:'RICERCA'},
  {id:'results',label:'RISULTATI'},
  {id:'verify',label:'VERIFICA'},
  {id:'crm',label:'CRM'},
  {id:'contact',label:'CONTATTO'},
  {id:'script',label:'SCRIPT'},
  {id:'outcome',label:'ESITO'},
  {id:'followup',label:'FOLLOW-UP'}
];
const $=id=>document.getElementById(id);
function safeParse(v,f){try{return JSON.parse(v)}catch(_){return f}}
function load(){const raw=safeParse(localStorage.getItem(STORE)||'{}',{});return{currentId:raw.currentId||'',opportunities:Array.isArray(raw.opportunities)?raw.opportunities:[]}}
function save(s){localStorage.setItem(STORE,JSON.stringify(s));return s}
function uid(){return 'opp-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}
function current(){const s=load();return s.opportunities.find(x=>x.id===s.currentId)||null}
function normalizeType(v){return ['VENDITA','SCADUTO','FSBO','SEGNALAZIONE','ALTRO'].includes(v)?v:'VENDITA'}
function createOpportunity(data){const s=load(),now=new Date().toISOString(),op={id:uid(),created_at:now,updated_at:now,type:normalizeType(data.type),comune:String(data.comune||'').trim(),via:String(data.via||'').trim(),civico:String(data.civico||'').trim(),source_url:String(data.source_url||'').trim(),note:String(data.note||'').trim(),current_step:0,completed_steps:[],status:'ATTIVA'};s.opportunities.unshift(op);s.currentId=op.id;save(s);return op}
function setCurrent(id){const s=load();if(s.opportunities.some(x=>x.id===id)){s.currentId=id;save(s)}return current()}
function updateCurrent(patch){const s=load(),i=s.opportunities.findIndex(x=>x.id===s.currentId);if(i<0)return null;s.opportunities[i]={...s.opportunities[i],...patch,updated_at:new Date().toISOString()};save(s);return s.opportunities[i]}
function completeStep(index){const op=current();if(!op)return null;const done=new Set(op.completed_steps||[]);done.add(index);return updateCurrent({completed_steps:[...done].sort((a,b)=>a-b),current_step:Math.min(index+1,STEPS.length-1)})}
function setStep(index){index=Math.max(0,Math.min(STEPS.length-1,Number(index)||0));return updateCurrent({current_step:index})}
function fullAddress(op){return [op.via,op.civico].filter(Boolean).join(' ').trim()}
function localUrl(base,op){const u=new URL(base,location.href);if(op?.id)u.searchParams.set('flowOpportunity',op.id);return u.href}
function stepUrl(op,index){if(!op)return'nuova-opportunita.html';switch(index){case 0:return localUrl(op.type==='SCADUTO'?'seller-radar-unico.html?view=scaduti':'seller-radar-unico.html?view=vendita',op);case 1:return localUrl('centrale-risultati.html',op);case 2:return localUrl('address-intelligence.html',op);case 3:return localUrl('crm.html',op);case 4:return localUrl('telefonate-oggi.html',op);case 5:return localUrl('script-operativo.html',op);case 6:return localUrl('crm.html?flowMode=outcome',op);case 7:return localUrl('oggi.html#tasks',op);default:return localUrl('index.html',op)}}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function opportunityLabel(op){if(!op)return'Nessuna opportunità';return [op.comune,fullAddress(op),op.type].filter(Boolean).join(' · ')}
function prefillFrame(frame,op,index){let d,w;try{w=frame.contentWindow;d=frame.contentDocument}catch(_){return}if(!d||!op)return;
  try{
    if(index===0){const sel=d.getElementById('workCommune');if(sel&&op.comune){const option=[...sel.options].find(o=>String(o.value).toLowerCase()===op.comune.toLowerCase());if(option){sel.value=option.value;sel.dispatchEvent(new Event('change',{bubbles:true}))}}}
    if(index===1){const q=d.getElementById('q');if(q){q.value=[op.comune,fullAddress(op)].filter(Boolean).join(' ');q.dispatchEvent(new Event('input',{bubbles:true}))}const mod=d.getElementById('module');if(mod&&[...mod.options].some(o=>o.value==='SELLER_RADAR')){mod.value='SELLER_RADAR';mod.dispatchEvent(new Event('change',{bubbles:true}))}}
    if(index===2){const map={comune:op.comune,via:op.via,civico:op.civico,raw:[op.note,op.source_url].filter(Boolean).join('\n')};for(const [id,v] of Object.entries(map)){const el=d.getElementById(id);if(el&&v&&!el.value)el.value=v}const analyze=d.getElementById('analyze');if(analyze&&op.comune)analyze.click()}
    if(index===3||index===6){const q=d.getElementById('q');if(q){q.value=[op.comune,fullAddress(op)].filter(Boolean).join(' ');q.dispatchEvent(new Event('input',{bubbles:true}))}}
  }catch(e){console.warn('F1 flow prefill',e)}
}
function renderFlow(){const op=current(),frame=$('flowFrame'),stage=$('stageTitle'),ctx=$('activeContext'),steps=$('flowSteps');if(!frame||!steps)return;if(!op){location.href='nuova-opportunita.html';return}const index=Math.max(0,Math.min(STEPS.length-1,Number(op.current_step)||0));ctx.textContent=opportunityLabel(op);stage.textContent=STEPS[index].label;steps.innerHTML=STEPS.map((s,i)=>`<button class="flow-step ${i===index?'active':''} ${(op.completed_steps||[]).includes(i)?'done':''}" data-step="${i}"><span>${i+1}</span>${s.label}</button>`).join('');steps.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{setStep(Number(b.dataset.step));renderFlow()});frame.src=stepUrl(op,index);frame.onload=()=>prefillFrame(frame,op,index);$('prevStep').disabled=index===0;$('nextStep').textContent=index===STEPS.length-1?'CHIUDI FLUSSO':'SEGNA FATTO E AVANTI';$('prevStep').onclick=()=>{setStep(index-1);renderFlow()};$('nextStep').onclick=()=>{if(index===STEPS.length-1){const s=load(),i=s.opportunities.findIndex(x=>x.id===op.id);if(i>=0){s.opportunities[i]={...s.opportunities[i],status:'COMPLETATA',completed_steps:[...Array(STEPS.length).keys()],updated_at:new Date().toISOString()};save(s)}location.href='index.html';return}completeStep(index);renderFlow()};$('openFull').onclick=()=>window.open(stepUrl(op,index),'_blank','noopener')}
function bindCreatePage(){const form=$('opportunityForm');if(!form)return;const active=current();const resume=$('resumeBtn');if(active){resume.hidden=false;resume.textContent='RIPRENDI · '+opportunityLabel(active);resume.onclick=()=>{$('workspace').hidden=false;$('creator').hidden=true;renderFlow()}}form.addEventListener('submit',e=>{e.preventDefault();createOpportunity({type:$('opType').value,comune:$('opComune').value,via:$('opVia').value,civico:$('opCivico').value,source_url:$('opSource').value,note:$('opNote').value});$('creator').hidden=true;$('workspace').hidden=false;renderFlow()});const newBtn=$('newOpportunityBtn');if(newBtn)newBtn.onclick=()=>{$('workspace').hidden=true;$('creator').hidden=false;form.reset()};if(new URLSearchParams(location.search).get('resume')==='1'&&active){$('creator').hidden=true;$('workspace').hidden=false;renderFlow()}}
function bindIndex(){const host=$('flowResume');if(!host)return;const op=current();if(!op){host.innerHTML='<a class="flow-main-btn" href="nuova-opportunita.html">+ NUOVA OPPORTUNITÀ</a>';return}host.innerHTML=`<a class="flow-main-btn" href="nuova-opportunita.html">+ NUOVA OPPORTUNITÀ</a><a class="flow-resume-btn" href="nuova-opportunita.html?resume=1">RIPRENDI · ${esc(opportunityLabel(op))}</a>`}
function bindScriptPage(){const op=current(),el=$('scriptContext');if(el)el.textContent=opportunityLabel(op);const type=$('suggestedScript');if(type&&op){const map={SCADUTO:'INCARICHI SCADUTI',FSBO:'VENDITORI PRIVATI',SEGNALAZIONE:'PROSPECTING / SEGNALAZIONI',VENDITA:'PROSPECTING / ACQUISIZIONE',ALTRO:'PRESENTAZIONE F1'};type.textContent=map[op.type]||'PROSPECTING'} }
window.F1OperationalFlow={STORE,STEPS,load,current,createOpportunity,setCurrent,updateCurrent,setStep,completeStep,stepUrl,opportunityLabel};
window.addEventListener('DOMContentLoaded',()=>{bindIndex();bindCreatePage();bindScriptPage()});
})();
