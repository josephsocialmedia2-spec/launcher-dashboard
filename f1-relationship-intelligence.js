(function(){
'use strict';
const CFG_URL='config/relationship-intelligence.json';
let cfg=null;
const DAY=86400000;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clean=s=>String(s||'').trim();
const upper=s=>clean(s).toLocaleUpperCase('it-IT');
const daysSince=v=>{if(!v)return Infinity;const d=new Date(String(v).length<=10?v+'T12:00:00':v);return Number.isNaN(d.getTime())?Infinity:Math.max(0,Math.floor((Date.now()-d.getTime())/DAY))};
function baseIntel(){return{lastResearchAt:'',evidence:[]}}
function hydratePerson(p){if(!p)return p;p.publicIntelligence=p.publicIntelligence&&typeof p.publicIntelligence==='object'?p.publicIntelligence:baseIntel();p.publicIntelligence.evidence=Array.isArray(p.publicIntelligence.evidence)?p.publicIntelligence.evidence:[];return p}
function people(){try{return Array.isArray(db.people)?db.people:[]}catch(_){return[]}}
function relations(){try{return Array.isArray(db.relations)?db.relations:[]}catch(_){return[]}}
function personName(p){return upper([p?.name,p?.surname].filter(Boolean).join(' '))||'PERSONA'}
function touchCount(p){const h=p?.touchpointHistory&&typeof p.touchpointHistory==='object'?p.touchpointHistory:{};return Object.values(h).filter(x=>x&&x.done).length}
function relationshipScore(p){
 if(!p||p.id==='root')return 100;
 let s=12;
 if(p.firstContact)s+=8;if(p.lastContact)s+=10;if(p.phone||p.email)s+=8;if(p.town)s+=5;if(p.category)s+=5;if(p.source)s+=4;if(p.notes)s+=5;
 const contacts=Array.isArray(p.contactDates)?p.contactDates.length:0;s+=Math.min(18,contacts*3);s+=Math.min(12,touchCount(p)*2);
 const degree=relations().filter(r=>r&&(r.sourceId===p.id||r.targetId===p.id)).length;s+=Math.min(12,degree*3);
 if(p.influence)s+=5;
 const age=daysSince(p.lastContact);if(age<=30)s+=8;else if(age<=90)s+=4;else if(age>180)s-=6;
 return Math.max(0,Math.min(100,Math.round(s)));
}
function relationshipLabel(score){return score>=80?'FORTE':score>=55?'ATTIVA':score>=30?'DA COLTIVARE':'DA COSTRUIRE'}
function signalLevel(p){
 const active=Array.isArray(p?.lifeTriggers)?p.lifeTriggers.length:0;
 const status=p?.lifeTriggerStatus&&typeof p.lifeTriggerStatus==='object'?Object.values(p.lifeTriggerStatus):[];
 const pending=status.filter(x=>/RILEVATO|DA_VERIFICARE/i.test(String(x))).length;
 const stage=upper(p?.stage);
 if(/PROPRIETARIO|APPUNTAMENTO|INCARICO/.test(stage))return{level:'ALTO',count:Math.max(1,active+pending)};
 if(active+pending>0||/NOTIZIA|INFORMAZIONE/.test(stage))return{level:'MEDIO',count:active+pending};
 return{level:'NESSUNO',count:0};
}
function graphAdj(){
 const a=new Map();people().forEach(p=>a.set(p.id,new Set()));
 const add=(x,y)=>{if(!x||!y||x===y)return;if(!a.has(x))a.set(x,new Set());if(!a.has(y))a.set(y,new Set());a.get(x).add(y);a.get(y).add(x)};
 relations().forEach(r=>add(r.sourceId,r.targetId));
 people().forEach(p=>{if(p.id!=='root'&&p.parentId)add(p.id,p.parentId)});
 return a;
}
function shortestPath(targetId){
 if(!targetId||targetId==='root')return['root'];const adj=graphAdj(),q=['root'],prev=new Map([['root',null]]);
 while(q.length){const x=q.shift();for(const y of(adj.get(x)||[])){if(prev.has(y))continue;prev.set(y,x);if(y===targetId){q.length=0;break}q.push(y)}}
 if(!prev.has(targetId))return[];const out=[];let x=targetId;while(x){out.unshift(x);x=prev.get(x)}return out;
}
function pathText(p){const ids=shortestPath(p?.id);if(!ids.length)return'Percorso relazionale non ancora definito';const m=new Map(people().map(x=>[x.id,x]));return ids.map(id=>id==='root'?'IO':personName(m.get(id))).join(' → ')}
function meta(p){return p?._treeMeta&&typeof p._treeMeta==='object'?p._treeMeta:{}}
function canFollowUp(p){const m=meta(p),allowed=upper(m.followup_allowed),channel=upper(m.authorized_channel);return allowed!=='NO'&&channel!=='NESSUNO'}
function pendingEvidence(p){hydratePerson(p);return p.publicIntelligence.evidence.filter(e=>upper(e.status||'DA_VERIFICARE')==='DA_VERIFICARE').length}
function reasonFor(p){
 if(!p||p.id==='root')return'Parti dalle relazioni più vicine e sviluppa un nome alla volta.';
 const m=meta(p);if(!canFollowUp(p))return'Follow-up non autorizzato o canale impostato su NESSUNO: non avviare contatti commerciali; aggiorna solo la scheda se emergono informazioni lecite.';
 const today=new Date();today.setHours(12,0,0,0);
 if(p.nextContact){const d=new Date(p.nextContact+'T12:00:00');if(!Number.isNaN(d.getTime())&&d<=today)return'Ricontatto previsto oggi o già scaduto. Parti dalla relazione e dall’ultima conversazione, non da una proposta commerciale.'}
 const sig=signalLevel(p);if(sig.count>0)return'Esiste un cambiamento di vita o un’informazione già emersa: approfondiscila con una conversazione e trattala come segnale da verificare, non come intenzione di vendere.';
 const pending=pendingEvidence(p);if(pending)return pending+' evidenza/e pubblica/e sono ancora da verificare prima di usarle nel contesto della relazione.';
 const age=daysSince(p.lastContact);if(age>180&&p.lastContact)return'Sono passati oltre 180 giorni dall’ultimo contatto. Riattiva la relazione in modo naturale, se il follow-up è consentito.';
 if(age>90&&p.lastContact)return'Sono passati oltre 90 giorni dall’ultimo contatto. È un buon momento per mantenere viva la relazione, senza forzare un bisogno immobiliare.';
 if(!p.lastContact)return'La persona è nella rete ma non risulta ancora una conversazione registrata. Il prossimo passo è conoscerla meglio.';
 const research=daysSince(p.publicIntelligence?.lastResearchAt);if(research>180&&(p.category==='professionisti'||p.category==='lavoro'||p.influence))return'Il contesto pubblico/professionale non viene verificato da oltre 180 giorni. Puoi aggiornare solo ruolo, attività e informazioni pubbliche pertinenti.';
 return'Mantieni la relazione e registra ciò che emerge realmente. Non serve inventare un motivo immobiliare.';
}
function searchQuery(p,kind){
 const name=personName(p)==='PERSONA'?'':personName(p),town=clean(p?.town),companies=Array.isArray(p?.companies)?p.companies.join(' '):'';
 const base=[name,town].filter(Boolean).join(' ');
 const map={
  WEB:base,
  PROFESSIONE:[base,companies,'azienda professione'].filter(Boolean).join(' '),
  NOTIZIE:[base,'notizie'].filter(Boolean).join(' '),
  SOCIAL_PUBBLICO:[base,'site:linkedin.com/in OR site:facebook.com OR site:instagram.com'].filter(Boolean).join(' '),
  MAPPE_ATTIVITA:[companies||name,town].filter(Boolean).join(' '),
  REGISTRO_IMPRESE:[companies||name,town,'site:registroimprese.it'].filter(Boolean).join(' ')
 };
 return map[kind]||base;
}
function google(q){return'https://www.google.com/search?q='+encodeURIComponent(q)}
function openSearch(kind){
 const p=current();if(!p)return;
 let url='';
 if(kind==='MAPPE_ATTIVITA')url='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(searchQuery(p,kind));
 else if(kind==='OMI')url='https://www1.agenziaentrate.gov.it/servizi/geopoi_omi/index.php';
 else if(kind==='ISTAT')url='https://esploradati.istat.it/';
 else if(kind==='PVP')url='https://pvp.giustizia.it/pvp/';
 else if(kind==='TERRITORIO')url='ricerca-territoriale.html'+(p.id&&p.id!=='draft'?'?person='+encodeURIComponent(p.id)+(p.town?'&comune='+encodeURIComponent(p.town):''):'');
 else url=google(searchQuery(p,kind));
 window.open(url,'_blank','noopener,noreferrer');
}
function current(){try{return typeof currentDrawerPerson==='function'?currentDrawerPerson():null}catch(_){return null}}
function findStored(p){if(!p)return null;return people().find(x=>x.id===p.id)||null}
function persistPerson(p){
 const stored=findStored(p);if(!stored)return false;hydratePerson(stored);stored.updatedAt=new Date().toISOString();try{window.F1TreeCloud?.touchLocal?.(stored)}catch(_){}
 try{persist()}catch(_){return false}return true;
}
function markResearch(){
 const p=current(),stored=findStored(p);if(!stored)return toast?.('Salva prima la persona');
 hydratePerson(stored);stored.publicIntelligence.lastResearchAt=new Date().toISOString();persistPerson(stored);render(stored);try{toast('Ricerca pubblica registrata')}catch(_){}
}
function normalizeUrl(v){const s=clean(v);if(!s)return'';try{const u=new URL(s);return/^https?:$/.test(u.protocol)?u.href:''}catch(_){return''}}
function addEvidence(){
 const p=current(),stored=findStored(p);if(!stored)return toast?.('Salva prima la persona');
 const title=clean(document.getElementById('riEvTitle')?.value),url=normalizeUrl(document.getElementById('riEvUrl')?.value),note=clean(document.getElementById('riEvNote')?.value),type=clean(document.getElementById('riEvType')?.value)||'WEB';
 if(!title&&!url&&!note){try{toast('Inserisci titolo, fonte o nota')}catch(_){}return}
 hydratePerson(stored);stored.publicIntelligence.evidence.unshift({id:'ri_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),type,title:title||type,url,note,status:'DA_VERIFICARE',observedAt:new Date().toISOString()});
 stored.publicIntelligence.lastResearchAt=new Date().toISOString();persistPerson(stored);
 ['riEvTitle','riEvUrl','riEvNote'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});render(stored);try{toast('Evidenza salvata: da verificare')}catch(_){}
}
function setEvidenceStatus(id,status){
 const p=current(),stored=findStored(p);if(!stored)return;hydratePerson(stored);const e=stored.publicIntelligence.evidence.find(x=>x.id===id);if(!e)return;
 if(status==='VERIFICATO'&&!e.url){try{toast('Per verificare un’evidenza serve il link della fonte')}catch(_){}return}
 e.status=status;e.reviewedAt=new Date().toISOString();persistPerson(stored);render(stored);
}
function deleteEvidence(id){
 const p=current(),stored=findStored(p);if(!stored)return;hydratePerson(stored);stored.publicIntelligence.evidence=stored.publicIntelligence.evidence.filter(x=>x.id!==id);persistPerson(stored);render(stored);
}
function evidenceHtml(p){
 hydratePerson(p);const rows=p.publicIntelligence.evidence||[];if(!rows.length)return'<div class="ri-empty">Nessuna evidenza pubblica associata. Le ricerche non vengono salvate automaticamente: scegli tu cosa è pertinente.</div>';
 return rows.slice(0,20).map(e=>{const st=upper(e.status||'DA_VERIFICARE'),cls=st==='VERIFICATO'?'ok':st==='SCARTATO'?'no':'',when=e.observedAt?new Date(e.observedAt).toLocaleDateString('it-IT'):'';
 return '<div class="ri-evidence"><div class="ri-evidence-top"><div><b>'+esc(e.title||e.type||'EVIDENZA')+'</b><small>'+esc([e.type,when,e.note].filter(Boolean).join(' · '))+'</small></div><span class="ri-status '+cls+'">'+esc(st)+'</span></div><div class="ri-evidence-tools">'+(e.url?'<a href="'+esc(e.url)+'" target="_blank" rel="noopener">FONTE</a>':'')+(st!=='VERIFICATO'?'<button type="button" onclick="F1RelationshipIntel.setEvidenceStatus(\''+e.id+'\',\'VERIFICATO\')">VERIFICA</button>':'')+(st!=='SCARTATO'?'<button type="button" onclick="F1RelationshipIntel.setEvidenceStatus(\''+e.id+'\',\'SCARTATO\')">SCARTA</button>':'')+'<button type="button" onclick="F1RelationshipIntel.deleteEvidence(\''+e.id+'\')">ELIMINA</button></div></div>'}).join('');
}
function render(p){
 const box=document.getElementById('relationshipIntelligenceBox');if(!box)return;p=p||current();if(!p)return;hydratePerson(p);
 const score=relationshipScore(p),sig=signalLevel(p),path=pathText(p),reason=reasonFor(p),pending=pendingEvidence(p),research=p.publicIntelligence.lastResearchAt?new Date(p.publicIntelligence.lastResearchAt).toLocaleDateString('it-IT'):'mai';
 const put=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
 put('riRelationshipScore',score+'/100');put('riRelationshipLabel',relationshipLabel(score));put('riSignal',sig.level+(sig.count?' · '+sig.count:''));put('riPending',String(pending));
 const pathEl=document.getElementById('riPath');if(pathEl)pathEl.textContent=path;
 const reasonEl=document.getElementById('riReason');if(reasonEl)reasonEl.textContent=reason;
 const researched=document.getElementById('riLastResearch');if(researched)researched.textContent='Ultima ricerca registrata: '+research;
 const list=document.getElementById('riEvidenceList');if(list)list.innerHTML=evidenceHtml(p);
 const disabled=p.id==='root'||p.id==='draft';document.querySelectorAll('#relationshipIntelligenceBox [data-ri-person-required]').forEach(x=>x.disabled=disabled);
}
async function loadCfg(){try{const r=await fetch(CFG_URL,{cache:'no-store'});if(r.ok)cfg=await r.json()}catch(_){}}
loadCfg();
window.F1RelationshipIntel={hydratePerson,render,relationshipScore,relationshipLabel,signalLevel,shortestPath,pathText,reasonFor,openSearch,markResearch,addEvidence,setEvidenceStatus,deleteEvidence,get config(){return cfg}};
})();