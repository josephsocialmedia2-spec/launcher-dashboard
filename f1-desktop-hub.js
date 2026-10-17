(function(){
'use strict';

if(!window.F1_DESKTOP||!window.F1AcquisitionData)return;

const api=window.F1AcquisitionData;
const baseRest=api.rest.bind(api);
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const includes=(value,needle)=>!clean(needle)||norm(value).includes(norm(needle));

function contactMatches(row,search,filters){
  const hay=[
    row.nome,row.cognome,row.azienda,row.telefono,row.email,row.comune,row.via,row.civico,
    row.source_type,row.status,row.source,row.lead_reason,row.notes,
    row.market_data&&JSON.stringify(row.market_data)
  ].filter(Boolean).join(' ');
  if(search&&!includes(hay,search))return false;
  if(!includes(row.telefono,filters.telefono))return false;
  if(!includes(row.nome,filters.nome))return false;
  if(!includes(row.cognome,filters.cognome))return false;
  if(!includes(row.comune,filters.comune))return false;
  if(filters.tipologia&&!includes([row.source_type,row.market_data&&JSON.stringify(row.market_data)].filter(Boolean).join(' '),filters.tipologia))return false;
  const type=String(row.source_type||'').toUpperCase();
  if(filters.privato&&!['FSBO','FSBO_CANDIDATE','SELLER','TERRITORY'].includes(type))return false;
  if(filters.vendita&&type==='BUYER')return false;
  if(filters.ricerca&&!['BUYER','WEBSITE','REFERRAL'].includes(type))return false;
  return true;
}

async function hubPage(body){
  body=body&&typeof body==='object'?body:{};
  const section=String(body.p_section||'CONTATTI').toUpperCase();
  const offset=Math.max(0,Number(body.p_offset)||0);
  const limit=Math.max(1,Math.min(100,Number(body.p_limit)||50));
  const search=clean(body.p_search);
  const filters=body.p_filters&&typeof body.p_filters==='object'?body.p_filters:{};

  if(section==='CONTATTI'||section==='TRATTATIVE'){
    const all=await api.pullLeads();
    let filtered=all.filter(row=>contactMatches(row,search,filters));
    if(section==='TRATTATIVE'){
      filtered=filtered.filter(row=>!['DA_ANALIZZARE','NUOVO','ARCHIVIATO','SCARTATO'].includes(String(row.status||'').toUpperCase()));
    }
    return{rows:filtered.slice(offset,offset+limit),filtered:filtered.length,total:all.length,offline:true};
  }

  if(section==='ATTIVITA'){
    const all=await api.pullTasks();
    let filtered=all.filter(row=>{
      const hay=[row.task_type,row.reason,row.status,row.outcome,row.lead_id,row.property_id].filter(Boolean).join(' ');
      if(search&&!includes(hay,search))return false;
      if(clean(filters.stato)&&String(row.status||'').toUpperCase()!==String(filters.stato).toUpperCase())return false;
      return true;
    });
    return{rows:filtered.slice(offset,offset+limit),filtered:filtered.length,total:all.length,offline:true};
  }

  return{rows:[],filtered:0,total:0,offline:true};
}

api.rest=async function(path,opt={}){
  path=String(path||'');
  if(path.startsWith('rpc/f1_crm_hub_page_v1')){
    let body={};try{body=JSON.parse(opt.body||'{}')}catch(_){}
    return hubPage(body);
  }
  if(path.startsWith('rpc/f1_crm_companies_page_v1'))return{rows:[],filtered:0,total:0,offline:true};
  if(path.startsWith('rpc/f1_company_import_stats_v1'))return{
    aziende:0,da_arricchire:0,arricchite:0,con_telefono:0,con_email:0,con_pec:0,con_sito:0,
    con_referente:0,da_chiamare:0,email_da_inviare:0,richiami:0,errori:0
  };
  if(path.startsWith('azienda_import_jobs?'))return[];
  return baseRest(path,opt);
};

window.F1DesktopHub={hubPage};
})();