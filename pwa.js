(()=>{
  'use strict';

  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('./sw.js',{scope:'./'})
        .then(reg=>{
          document.documentElement.dataset.f1Sw='ready';
          if(reg.waiting) window.dispatchEvent(new CustomEvent('f1:sw-update-ready'));
        })
        .catch(err=>{
          document.documentElement.dataset.f1Sw='error';
          console.warn('F1 service worker non disponibile',err);
        });
    });
  }

  // Acquisition CRM enforcement. On authenticated pages that expose
  // F1AcquisitionData, every current Seller Radar signal belonging to the
  // mandatory streams is reconciled into a CRM lead and linked task.
  const A=window.F1AcquisitionData,C=window.F1AcquisitionCore;
  if(A&&C&&!A.__sellerRadarCrmWrapped){
    const STREAMS=new Set(['CONCORRENZA','PRIVATI','INCARICHI_SCADUTI']);
    const original=A.loadDashboardData.bind(A);
    const relevant=t=>!!t&&(t.crm_required===true||STREAMS.has(String(t.acquisition_stream||'').toUpperCase()));
    const keyOf=t=>String(t.source_url||'').trim()||String(t.property_id||'').trim()||String(t.task_id||'').trim();
    const findLead=(t,leads)=>{const url=String(t.source_url||'').trim(),pid=String(t.property_id||'').trim();return (leads||[]).find(l=>(url&&String(l.source_url||'').trim()===url)||(pid&&String(l.immobile_id||'').trim()===pid))};
    const fromTask=t=>{const stream=String(t.acquisition_stream||'CONCORRENZA').toUpperCase(),now=new Date().toISOString();return{pillar:Number(t.pillar)||1,source_type:stream==='PRIVATI'&&String(t.core_category||'').toUpperCase()==='FSBO'?'FSBO':'MARKET_SIGNAL',source:t.source||'Seller Radar F1',source_url:t.source_url||'',created_at:t.created_at||now,first_seen:t.created_at||now,last_seen:now,comune:t.comune||'',via:t.via||'',civico:t.civico||'',zona:t.zona||'',immobile_id:t.property_id||'',competitor_agency:stream==='CONCORRENZA'?(t.source||''):'',lead_reason:t.reason||t.lead_reason||'Segnale Seller Radar da verificare',lead_score:Number(t.priority)||0,confidence:t.confidence||'MEDIUM',status:'DA_VERIFICARE',next_action:'Verificare evidenza, stato annuncio e prossima azione',next_action_date:t.due_date||'',notes:`AUTO CRM · ${stream} · ${t.territory_side||''} · hub ${t.territory_hub||'Villar Dora'}`,privacy_basis:'SEGNALE_PUBBLICO_DA_VERIFICARE',do_not_contact:false,rpo_status:'DA_VERIFICARE',created_by:'SELLER_RADAR_AUTO',updated_at:now,deleted:false}};
    async function reconcile(data){
      if(!A.cloudReady())return data;
      const publicTasks=(data.feed?.tasks||[]).filter(relevant),leads=[...(data.leads||[])],created=new Map();let createdLeads=0,linkedTasks=0;
      for(const t of publicTasks){
        let lead=findLead(t,leads)||created.get(keyOf(t));
        if(!lead){lead=await A.upsertLead(fromTask(t));leads.push(lead);created.set(keyOf(t),lead);createdLeads++}
        const eligible=C.contactEligible(lead),wanted=String(t.task_type||'VERIFY').toUpperCase()==='CALL'&&!eligible?'VERIFY':(t.task_type||'VERIFY');
        await A.upsertTask({...t,lead_id:lead.lead_id,task_type:wanted,reason:wanted==='VERIFY'&&String(t.task_type||'').toUpperCase()==='CALL'?`${t.reason||'FSBO'} · verifica contatto/RPO prima della chiamata`:t.reason,metadata:{...(t.metadata||{}),origin:'SELLER_RADAR_CRM_RECONCILIATION',acquisition_stream:t.acquisition_stream||'CONCORRENZA',territory_side:t.territory_side||'',crm_required:true}});
        linkedTasks++;
      }
      return {...data,leads:createdLeads?await A.pullLeads().catch(()=>leads):leads,tasks:linkedTasks?C.mergeTasks(data.tasks||[],await A.pullTasks().catch(()=>data.tasks||[])):data.tasks,crmReconciliation:{required:publicTasks.length,createdLeads,linkedTasks,status:'SYNCED'}};
    }
    A.loadDashboardData=async()=>{const data=await original();try{return await reconcile(data)}catch(err){console.error('F1 CRM reconciliation',err);return{...data,crmReconciliation:{status:'ERROR',message:err.message}}}};
    A.reconcileSellerRadarCRM=reconcile;
    A.__sellerRadarCrmWrapped=true;
  }
})();
