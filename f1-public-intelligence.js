(function(){
'use strict';
const $=s=>document.querySelector(s);
const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
const enc=encodeURIComponent;
function ctx(){
  return {
    comune:clean($('#twComune')?.textContent).replace(/^—$/,''),
    zona:clean($('#twZona')?.textContent).replace(/^—$/,''),
    via:clean($('#twVia')?.textContent).replace(/^—$/,''),
    nome:clean($('#twNome')?.value),
    cognome:clean($('#twCognome')?.value),
    stage:clean($('#twStage')?.value),
    story:clean($('#twStory')?.value),
    next:clean($('#twNextAction')?.value),
    follow:clean($('#twFollowup')?.value),
    channel:clean($('#twChannel')?.value)
  };
}
function openUrl(url){ window.open(url,'_blank','noopener,noreferrer'); }
function googleSite(site,q){ openUrl('https://www.google.com/search?q='+enc('site:'+site+' '+q)); }
function territoryQuery(){const c=ctx();return [c.comune,c.zona,c.via].filter(Boolean).join(' ');}
function personQuery(){const c=ctx();return [c.nome,c.cognome,c.comune].filter(Boolean).join(' ');}
const actions={
  omi(){ openUrl('https://www.agenziaentrate.gov.it/portale/web/guest/aree-tematiche/osservatorio-del-mercato-immobiliare-omi'); },
  valori(){ googleSite('agenziaentrate.gov.it','"Valori immobiliari dichiarati" '+territoryQuery()); },
  pvp(){ openUrl('https://pvp.giustizia.it/pvp/it/homepage.page'); },
  istat(){ openUrl('https://demo.istat.it/app/?a=2026&i=POS&l=it'); },
  imprese(){ openUrl('https://www.registroimprese.it/'); },
  webperson(){ const q=personQuery(); if(q) openUrl('https://www.google.com/search?q='+enc('"'+[ctx().nome,ctx().cognome].filter(Boolean).join(' ')+'" '+ctx().comune)); },
  webbusiness(){ const q=personQuery(); if(q) googleSite('registroimprese.it',q); },
  maps(){ const q=territoryQuery(); if(q) openUrl('https://www.google.com/maps/search/?api=1&query='+enc(q)); }
};
function toast(msg){
  const t=$('#twToast'); if(!t)return;
  t.textContent=msg;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),2600);
}
function updateContext(){
  const c=ctx();
  document.querySelectorAll('[data-public-context]').forEach(el=>{el.textContent=[c.comune,c.zona,c.via].filter(Boolean).join(' · ')||'Seleziona una zona o un civico';});
  const person=[c.nome,c.cognome].filter(Boolean).join(' ');
  const b=$('#publicPersonName'); if(b)b.textContent=person||'persona corrente';
}
function whyContact(){
  const c=ctx(), out=$('#publicWhyOutput'); if(!out)return;
  if(c.follow==='NO'||c.channel==='NESSUNO'){
    out.innerHTML='<b>NON CONTATTARE.</b> Il follow-up non risulta autorizzato. Registra soltanto eventuali informazioni raccolte lecitamente e chiudi/archivia la scheda.';
    return;
  }
  const bits=[];
  if(c.story) bits.push('Hai un fatto da ricordare: “'+c.story.slice(0,180)+(c.story.length>180?'…':'')+'”.');
  if(c.stage) bits.push('La relazione è in fase <b>'+c.stage+'</b>.');
  if(c.next) bits.push('Prossimo passo già definito: <b>'+c.next+'</b>.');
  if(c.channel) bits.push('Canale indicato: <b>'+c.channel+'</b>.');
  if(!bits.length) bits.push('Prima di contattarla completa almeno il fatto utile, la fase della relazione e il prossimo passo.');
  bits.push('Obiettivo: continuare la relazione, non forzare una proposta commerciale.');
  out.innerHTML=bits.join(' ');
}
function boot(){
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-f1-public-action]'); if(!btn)return;
    const fn=actions[btn.dataset.f1PublicAction]; if(fn){e.preventDefault();fn();toast('Fonte pubblica aperta in una nuova scheda. Nulla viene salvato automaticamente.');}
  });
  ['twComune','twZona','twVia','twNome','twCognome','twStage','twStory','twNextAction','twFollowup','twChannel'].forEach(id=>{
    const el=document.getElementById(id); if(el){el.addEventListener('input',updateContext);el.addEventListener('change',updateContext);}
  });
  $('#publicWhyBtn')?.addEventListener('click',e=>{e.preventDefault();whyContact();});
  updateContext();
  new MutationObserver(updateContext).observe(document.body,{subtree:true,childList:true,characterData:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();