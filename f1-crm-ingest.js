(function(){
'use strict';
const STREAMS=new Set(['CONCORRENZA','PRIVATI','INCARICHI_SCADUTI']);
function keyOf(t){return String(t.source_url||'').trim()||String(t.property_id||'').trim()||String(t.task_id||'').trim()}
function relevant(t){return !!t&&(t.crm_required===true||STREAMS.has(String(t.acquisition_stream||'').toUpperCase()))}
function existingLeadFor(t,leads){const url=String(t.source_url||'').trim(),pid=String(t.property_id||'').trim();return (leads||[]).find(l=>(url&&String(l.source_url||'').trim()===url)||(pid&&String(l.immobile_id||'').trim()===pid))}
function leadFromTask(t){const stream=String(t.acquisition_stream||'CONCORRENZA').toUpperCase(),now=new Date().toISOString();return{
 pillar:Number(t.pillar)||1,
 source_type:stream==='PRIVATI'&&String(t.core_category||'').toUpperCase()==='FSBO'?'FSBO':'MARKET_SIGNAL',
 source:t.source||'Seller Radar F1',source_url:t.source_url||'',created_at:t.created_at||now,first_seen:t.created_at||now,last_seen:now,
 comune:t.comune||'',via:t.via||'',civico:t.civico||'',zona:t.zona||'',immobile_id:t.property_id||'',competitor_agency:stream==='CONCORRENZA'?(t.source||''):'',
 lead_reason:t.reason||t.lead_reason||'Segnale Seller Radar da verificare',lead_score:Number(t.priority)||0,confidence:t.confidence||'MEDIUM',status:'DA_VERIFICARE',
 next_action:'Verificare evidenza, stato annuncio e prossima azione',next_action_date:t.due_date||'',notes:`AUTO CRM · ${stream} · ${t.territory_side||''} · hub ${t.territory_hub||'Villar Dora'}`,
 privacy_basis:'SEGNALE_PUBBLICO_DA_VERIFICARE',do_not_contact:false,rpo_status:'DA_VERIFICARE',created_by:'SELLER_RADAR_AUTO',updated_at:now,deleted:false
}}
async function reconcile(data){const A=window.F1AcquisitionData,C=window.F1AcquisitionCore;if(!A||!C||!A.cloudReady())return data;const publicTasks=(data.feed?.tasks||[]).filter(relevant),leads=[...(data.leads||[])],tasks=[...(data.tasks||[])],createdByKey=new Map();let createdLeads=0,linkedTasks=0;
 for(const t of publicTasks){let lead=existingLeadFor(t,leads)||createdByKey.get(keyOf(t));if(!lead){lead=await A.upsertLead(leadFromTask(t));leads.push(lead);createdByKey.set(keyOf(t),lead);createdLeads++}
  const eligible=C.contactEligible(lead);const wanted=String(t.task_type||'VERIFY').toUpperCase()==='CALL'&&!eligible?'VERIFY':(t.task_type||'VERIFY');
  const linked={...t,lead_id:lead.lead_id,task_type:wanted,reason:wanted==='VERIFY'&&String(t.task_type||'').toUpperCase()==='CALL'?`${t.reason||'FSBO'} · verifica contatto/RPO prima della chiamata`:t.reason,metadata:{...(t.metadata||{}),origin:'SELLER_RADAR_CRM_RECONCILIATION',acquisition_stream:t.acquisition_stream||'CONCORRENZA',territory_side:t.territory_side||'',crm_required:true}};
  await A.upsertTask(linked);linkedTasks++;}
 const freshLeads=createdLeads?await A.pullLeads().catch(()=>leads):leads;const freshTasks=linkedTasks?await A.pullTasks().catch(()=>tasks):tasks;
 return {...data,leads:freshLeads,tasks:C.mergeTasks(data.tasks||[],freshTasks),crmReconciliation:{required:publicTasks.length,createdLeads,linkedTasks,status:'SYNCED'}}}
function install(){const A=window.F1AcquisitionData;if(!A||A.__crmIngestWrapped)return;const original=A.loadDashboardData.bind(A);A.loadDashboardData=async function(){const data=await original();try{return await reconcile(data)}catch(e){console.error('F1 CRM reconciliation',e);return {...data,crmReconciliation:{status:'ERROR',message:e.message}}}};A.reconcileSellerRadarCRM=reconcile;A.__crmIngestWrapped=true}
install();
})();
