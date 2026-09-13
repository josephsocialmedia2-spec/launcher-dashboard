(()=>{
'use strict';
if(!/\/crm\.html$/i.test(location.pathname))return;
const Sync=window.F1Sync,Data=window.F1AcquisitionData;
if(!Sync||!Data)return;
const LOGIN='setup-cloud.html?return=crm.html';
const originals={pullLeads:Data.pullLeads.bind(Data),pullTasks:Data.pullTasks.bind(Data),pullInteractions:Data.pullInteractions.bind(Data)};
let resolved=false,authenticated=false,lastError='';
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function authError(){const e=new Error('ACCESSO CRM RICHIESTO');e.code='AUTH_REQUIRED';return e}
function gateHtml(){const detail=lastError?`<div style="margin:8px 0;color:#f4c95d">${esc(lastError)}</div>`:'';return `<section id="crmAuthRequired" style="max-width:620px;margin:42px auto;padding:24px;border:1px solid #66552a;border-radius:16px;background:#17140d;text-align:center"><div style="font-size:11px;color:#f4c95d;font-weight:900;letter-spacing:.12em">F1 ACQUISITION ENGINE · CRM UNIFICATO</div><h2 style="margin:12px 0 8px">ACCESSO CRM RICHIESTO</h2><p style="color:#c6cec8;line-height:1.55">Il CRM usa esclusivamente Supabase come source of truth. Accedi per utilizzare Lead, Interazioni e Task.</p>${detail}<a id="crmLoginBtn" class="btn primary" href="${LOGIN}" style="display:inline-flex;margin-top:8px">ACCEDI AL CRM</a></section>`}
function showGate(){if(authenticated)return;const list=document.getElementById('list');if(list&&!list.querySelector('#crmAuthRequired'))list.innerHTML=gateHtml();const cloud=document.getElementById('cloudStatus');if(cloud){cloud.textContent='CLOUD: ACCESSO CRM RICHIESTO';cloud.className='cloud'}for(const id of ['newBtn','syncBtn','excelImportBtn']){const b=document.getElementById(id);if(b)b.disabled=true}}
function unlock(){const cloud=document.getElementById('cloudStatus');if(cloud){cloud.textContent='CLOUD: SUPABASE AUTENTICATO · SOURCE OF TRUTH';cloud.className='cloud on'}for(const id of ['newBtn','syncBtn','excelImportBtn']){const b=document.getElementById(id);if(b)b.disabled=false}}
async function validate(){try{if(!Sync.configured()){lastError='Configurazione Supabase non disponibile.';return false}if(!Sync.ready())return false;const ok=await Sync.ensureSession();if(!ok)return false;return true}catch(e){lastError='Verifica sessione non riuscita: '+String(e?.message||e);return false}finally{resolved=true}}
const validation=validate().then(ok=>{authenticated=ok;if(ok)unlock();else showGate();return ok});
for(const name of Object.keys(originals))Data[name]=async function(...args){const ok=await validation;if(!ok){showGate();throw authError()}return originals[name](...args)};
window.F1CRMAuthGuard={ready:()=>authenticated,validated:()=>resolved,ensure:async()=>{const ok=await validation;if(!ok){showGate();throw authError()}return true},show:showGate,loginUrl:LOGIN};
if(!Sync.ready())showGate();
const list=document.getElementById('list');if(list)new MutationObserver(()=>{if(resolved&&!authenticated&&!list.querySelector('#crmAuthRequired'))showGate()}).observe(list,{childList:true});
document.addEventListener('click',e=>{if(authenticated)return;const target=e.target?.closest?.('#newBtn,#syncBtn,#excelImportBtn,#saveLeadBtn,#saveOutcomeBtn,#confirmImportBtn');if(!target)return;e.preventDefault();e.stopImmediatePropagation();showGate()},{capture:true});
window.addEventListener('storage',e=>{if(e.key==='f1SupabaseSession'&&e.newValue)location.reload()});
})();
