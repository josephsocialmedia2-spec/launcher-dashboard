(()=>{
  const DECISION_KEY='f1ApprovalDecisionsV1';
  const SELLER_STORE='f1_territory_contacts_v1';
  let acquisitionTasks=null;

  function readJson(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch(_){return fallback}}
  function writeJson(key,value){localStorage.setItem(key,JSON.stringify(value))}
  function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
  function splitAddress(raw){let via=String(raw||'').trim(),civico='';if(!via)via='INDIRIZZO DA VERIFICARE';if(!/da verificare|non disponibile|n\.d\./i.test(via)){const m=via.match(/\s+(\d+[A-Za-z]?(?:[\/-][A-Za-z0-9]+)?)$/);if(m){civico=m[1];via=via.slice(0,m.index).trim()}}return{via,civico}}
  function inferType(title){const s=norm(title),rules=[['villa bifamiliare','Villa bifamiliare'],['villa unifamiliare','Villa unifamiliare'],['casa indipendente','Casa indipendente'],['casa semindipendente','Casa semindipendente'],['attivita commerciale','Attività commerciale'],['locale commerciale','Locale commerciale'],['appartamento','Appartamento'],['capannone','Capannone'],['terratetto','Terratetto'],['rustico','Rustico'],['negozio','Negozio'],['villa','Villa']];for(const [k,v] of rules)if(s.includes(k))return v;return''}
  function archivePrice(v){const raw=String(v||'').trim();if(!raw)return'';if(/^\d+(?:\.0+)?$/.test(raw)){const n=Number(raw);if(Number.isFinite(n))return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n)}return raw}
  async function tasks(){if(acquisitionTasks)return acquisitionTasks;try{const r=await fetch('data/acquisition-public.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();acquisitionTasks=Array.isArray(d.tasks)?d.tasks:[]}catch(_){acquisitionTasks=[]}return acquisitionTasks}
  async function sourceTask(x){const a=await tasks();return a.find(t=>String(t.task_id||'')===String(x.task_id||x.approval_id||''))||a.find(t=>x.property_id&&String(t.property_id||'')===String(x.property_id))||a.find(t=>x.source_url&&String(t.source_url||'')===String(x.source_url))||x}
  async function importSeller(x){const t=await sourceTask(x),sourceUrl=String(t.source_url||x.source_url||''),token='[CENTRALE:'+String(x.approval_id)+']',rows=readJson(SELLER_STORE,[]);if(rows.some(r=>String(r.note||'').includes(token)||(sourceUrl&&String(r.note||'').includes(sourceUrl))))return'ALREADY_PRESENT';const addr=splitAddress(t.via||x.metadata?.via||''),subject=t.immobile||x.subject||'',note=['APPROVATO DA CENTRALE RISULTATI',token,subject?'IMMOBILE: '+subject:'',x.result?'MOTIVO: '+x.result:'',sourceUrl?'LINK ANNUNCIO: '+sourceUrl:'',x.property_id?'PROPERTY_ID: '+x.property_id:''].filter(Boolean).join(' | ');rows.unshift({data_annuncio:'',in_vendita_da:'',comune:t.comune||x.comune||'',nome:'',cognome:'',via:addr.via,civico:addr.civico,prezzo:archivePrice(t.prezzo||x.metadata?.prezzo||''),tipologia:inferType(subject),composta:'',telefono:'',email:'',facebook:'',instagram:'',tiktok:'',youtube:'',fonte:t.source||x.platform||'',note,stato:'DA LAVORARE'});writeJson(SELLER_STORE,rows);return'INSERTED'}
  function markTransfer(id,result){const d=readJson(DECISION_KEY,{}),k=String(id),prev=d[k]||{};d[k]={...prev,status:'DONE',outcome:'APPROVATO',seller_transfer:result,updated_at:new Date().toISOString()};writeJson(DECISION_KEY,d)}

  const originalDecide=window.decide;
  if(typeof originalDecide==='function'){
    window.decide=async function(id,status){
      let x=null;try{x=(typeof queue!=='undefined'?queue:[]).find(r=>String(r.approval_id)===String(id))}catch(_){}
      if(status==='DONE'&&x&&x.module==='SELLER_RADAR'){
        try{const result=await importSeller(x);originalDecide(id,status);markTransfer(id,result);x.seller_transfer=result;if(typeof render==='function')render();return}catch(e){alert('Inserimento Seller Radar non riuscito: '+e.message);return}
      }
      return originalDecide(id,status)
    }
  }

  async function backfill(attempt=0){let a=[];try{a=typeof queue!=='undefined'?queue:[]}catch(_){}if(!a.length&&attempt<20){setTimeout(()=>backfill(attempt+1),500);return}const d=readJson(DECISION_KEY,{}),approved=a.filter(x=>x.module==='SELLER_RADAR'&&(d[String(x.approval_id)]||{}).status==='DONE');let changed=false;for(const x of approved){const old=d[String(x.approval_id)]||{};if(old.seller_transfer)continue;try{const result=await importSeller(x);markTransfer(x.approval_id,result);x.seller_transfer=result;changed=true}catch(e){console.warn('Seller backfill',x.approval_id,e)}}if(changed&&typeof render==='function')render()}
  window.addEventListener('load',()=>setTimeout(()=>backfill(),300));
})();
