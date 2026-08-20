(()=>{
if(window.__acqPianoPubblicazione)return;window.__acqPianoPubblicazione=true;
const KEY='acqPublicationPlan';
const defaults=[
 {name:'Sito F1 Immobiliare — scheda immobile / landing',type:'Sito',planned:true},
 {name:'Immobiliare.it',type:'Portale immobiliare',planned:true},
 {name:'Facebook — pagina F1 Immobiliare',type:'Social',planned:true},
 {name:'Instagram — profilo F1 Immobiliare',type:'Social',planned:true},
 {name:'Reel Facebook + Instagram',type:'Video social',planned:true},
 {name:'Gruppi Facebook locali della microzona',type:'Gruppi territoriali',planned:true},
 {name:'Database / CRM acquirenti compatibili',type:'Database',planned:true},
 {name:'WhatsApp — contatti compatibili già presenti nel database',type:'Contatto diretto',planned:true},
 {name:'Meta Ads geolocalizzata sulla zona e sul target',type:'Pubblicità',planned:true},
 {name:'Volantini nella microzona',type:'Territorio',planned:true},
 {name:'Vetrina / materiale in agenzia',type:'Territorio',planned:true},
 {name:'Cartello sull’immobile, quando previsto e autorizzato',type:'Territorio',planned:false},
 {name:'Rete di professionisti / segnalatori',type:'Rete locale',planned:true},
 {name:'Open House e relativa promozione, quando previsto',type:'Evento',planned:false}
];
function fresh(){return {property:'',address:'',owner:'',launchDate:'',notes:'',channels:defaults.map((x,i)=>({...x,id:'c'+i,date:'',time:'',status:'DA PROGRAMMARE',url:'',note:''}))};}
function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||'null');return x&&Array.isArray(x.channels)?x:fresh()}catch(e){return fresh()}}
let P=load(),clientMode=false;
function save(){localStorage.setItem(KEY,JSON.stringify(P));render();}
const css=document.createElement('style');css.textContent=`
#pubPlanDialog{width:96%;max-width:850px;border:0;border-radius:16px;padding:0}#pubPlanDialog::backdrop{background:#071524aa}
.ppHead{background:#102844;color:white;padding:14px;display:flex;justify-content:space-between;align-items:center;font-weight:950}.ppBody{padding:14px;max-height:80vh;overflow:auto;background:#f4f7fb}
.ppHero{background:white;border:1px solid #d9e1eb;border-radius:14px;padding:14px;margin-bottom:10px}.ppHero h2{margin:0 0 6px;color:#102844}.ppGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ppGrid input,.ppGrid textarea{width:100%;padding:10px;border:1px solid #cfd8e4;border-radius:9px}.ppToolbar{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:10px 0}.ppToolbar button{border:0;border-radius:10px;padding:12px;font-weight:900}.ppClient{background:#102844;color:white}.ppSave{background:#1f9d50;color:white}.ppAdd{background:#2879c8;color:white}.ppSummary{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0}.ppSummary div{background:white;border:1px solid #d9e1eb;border-radius:10px;padding:9px;text-align:center}.ppSummary b{display:block;font-size:19px;color:#102844}.ppCard{background:white;border:1px solid #d9e1eb;border-left:6px solid #2879c8;border-radius:12px;padding:11px;margin:9px 0}.ppCard.off{opacity:.55;border-left-color:#999}.ppTop{display:flex;gap:8px;align-items:flex-start;justify-content:space-between}.ppName{font-weight:950;font-size:16px}.ppType{font-size:11px;color:#66778a;margin-top:2px}.ppFields{display:grid;grid-template-columns:1.1fr .8fr 1fr;gap:6px;margin-top:8px}.ppFields input,.ppFields select,.ppCard textarea{width:100%;padding:9px;border:1px solid #d4dce6;border-radius:8px}.ppLink{display:inline-block;margin-top:8px;padding:8px 10px;background:#eaf4ff;border-radius:8px;text-decoration:none;color:#0e4f88;font-weight:900}.ppStatus{display:inline-block;padding:5px 8px;border-radius:999px;font-size:11px;font-weight:950;background:#edf1f6}.ppPublished{background:#dff6e7;color:#146332}.ppScheduled{background:#fff3cf;color:#7a5500}.ppNotPlanned{background:#eee;color:#666}.ppClientView .ppEditOnly{display:none!important}.ppClientView .ppCard{font-size:16px}.ppClientView .ppName{font-size:18px}.ppClientView .ppHero{font-size:16px}.ppExplain{background:#eef6ff;border:1px solid #bcd9f4;border-radius:12px;padding:12px;margin:10px 0;line-height:1.45}.ppPointBtn{display:block;width:100%;border:0;border-radius:10px;margin-top:8px;padding:10px;background:#102844;color:white;font-weight:900}
@media(max-width:620px){.ppGrid,.ppToolbar,.ppFields{grid-template-columns:1fr}.ppSummary{grid-template-columns:1fr 1fr}}
`;document.head.appendChild(css);
const d=document.createElement('dialog');d.id='pubPlanDialog';document.body.appendChild(d);
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function statusClass(s){if(s==='PUBBLICATO'||s==='AGGIORNATO')return 'ppPublished';if(s==='PROGRAMMATO')return 'ppScheduled';if(s==='NON PREVISTO')return 'ppNotPlanned';return ''}
function counts(){const a=P.channels.filter(c=>c.planned);return {tot:a.length,pub:a.filter(c=>['PUBBLICATO','AGGIORNATO'].includes(c.status)).length,prog:a.filter(c=>c.status==='PROGRAMMATO').length,wait:a.filter(c=>c.status==='DA PROGRAMMARE').length}}
function render(){
 const C=counts();
 d.classList.toggle('ppClientView',clientMode);
 d.innerHTML=`<div class="ppHead"><span>${clientMode?'PIANO DI PUBBLICAZIONE DEL TUO IMMOBILE':'PIANO PUBBLICAZIONE — GESTIONE'}</span><button id="ppClose" style="font-size:22px">✕</button></div><div class="ppBody">
 <div class="ppHero"><h2>${clientMode?(esc(P.property)||'Il tuo immobile'):'Trasparenza totale: dove pubblichiamo'}</h2>
 ${clientMode?`<div><b>${esc(P.address)}</b></div><p>Qui puoi vedere esattamente <b>dove</b> verrà promosso l’immobile, <b>quando</b> è prevista ogni attività e, dopo la pubblicazione, il <b>link diretto</b> per verificarla.</p>`:
 `<div class="ppGrid ppEditOnly"><input id="ppProperty" placeholder="Nome immobile" value="${esc(P.property)}"><input id="ppAddress" placeholder="Indirizzo" value="${esc(P.address)}"><input id="ppOwner" placeholder="Proprietario / riferimento" value="${esc(P.owner)}"><input id="ppLaunch" type="date" value="${esc(P.launchDate)}"></div>`}
 </div>
 <div class="ppSummary"><div><b>${C.tot}</b>CANALI PREVISTI</div><div><b>${C.prog}</b>PROGRAMMATI</div><div><b>${C.pub}</b>PUBBLICATI</div><div><b>${C.wait}</b>DA PROGRAMMARE</div></div>
 ${clientMode?'<div class="ppExplain"><b>Niente formule generiche.</b> Ogni riga indica il canale realmente previsto. Quando una pubblicazione è online compare il link che puoi aprire direttamente da questo telefono.</div>':'<div class="ppExplain ppEditOnly"><b>Regola:</b> lascia attivi soltanto i canali realmente previsti per questo immobile. Inserisci data, ora, stato e link reale. Quello che salvi qui è ciò che mostrerai al proprietario.</div>'}
 <div id="ppChannels">${P.channels.map((c,i)=>card(c,i)).join('')}</div>
 <div class="ppToolbar ppEditOnly"><button id="ppSave" class="ppSave">✓ SALVA PIANO</button><button id="ppAdd" class="ppAdd">＋ AGGIUNGI CANALE</button><button id="ppClient" class="ppClient">👁 MODALITÀ CLIENTE</button></div>
 ${clientMode?'<div class="ppToolbar"><button id="ppEdit" class="ppClient">← TORNA A GESTIONE</button><button id="ppClose2" class="ppSave">✓ CHIUDI</button></div>':''}
 </div>`;
 bind();
}
function card(c,i){const st=c.planned?c.status:'NON PREVISTO';return `<div class="ppCard ${c.planned?'':'off'}">
 <div class="ppTop"><div><div class="ppName">${esc(c.name)}</div><div class="ppType">${esc(c.type||'Canale')}</div></div><span class="ppStatus ${statusClass(st)}">${esc(st)}</span></div>
 ${clientMode?`${c.date||c.time?`<p><b>Calendario:</b> ${esc(c.date||'data da definire')} ${esc(c.time||'')}</p>`:'<p><b>Calendario:</b> da definire</p>'}${c.note?`<p>${esc(c.note)}</p>`:''}${c.url?`<a class="ppLink" href="${esc(c.url)}" target="_blank" rel="noopener">APRI PUBBLICAZIONE ↗</a>`:''}`:
 `<div class="ppEditOnly"><label style="display:block;margin-top:7px"><input type="checkbox" data-plan="${i}" ${c.planned?'checked':''}> CANALE PREVISTO</label><div class="ppFields"><input data-name="${i}" value="${esc(c.name)}" placeholder="Nome esatto canale"><input data-date="${i}" type="date" value="${esc(c.date)}"><input data-time="${i}" type="time" value="${esc(c.time)}"><select data-status="${i}"><option ${c.status==='DA PROGRAMMARE'?'selected':''}>DA PROGRAMMARE</option><option ${c.status==='PROGRAMMATO'?'selected':''}>PROGRAMMATO</option><option ${c.status==='PUBBLICATO'?'selected':''}>PUBBLICATO</option><option ${c.status==='AGGIORNATO'?'selected':''}>AGGIORNATO</option></select><input data-url="${i}" value="${esc(c.url)}" placeholder="Link reale annuncio/post"><input data-type="${i}" value="${esc(c.type||'')}" placeholder="Tipo canale"></div><textarea data-note="${i}" placeholder="Nota visibile al cliente">${esc(c.note)}</textarea></div>`}</div>`}
function sync(){
 const q=id=>d.querySelector(id); if(q('#ppProperty'))P.property=q('#ppProperty').value;if(q('#ppAddress'))P.address=q('#ppAddress').value;if(q('#ppOwner'))P.owner=q('#ppOwner').value;if(q('#ppLaunch'))P.launchDate=q('#ppLaunch').value;
 P.channels.forEach((c,i)=>{const get=a=>d.querySelector(`[data-${a}="${i}"]`);const p=get('plan');if(p)c.planned=p.checked;const n=get('name');if(n)c.name=n.value;const dt=get('date');if(dt)c.date=dt.value;const tm=get('time');if(tm)c.time=tm.value;const st=get('status');if(st)c.status=st.value;const u=get('url');if(u)c.url=u.value;const t=get('type');if(t)c.type=t.value;const no=get('note');if(no)c.note=no.value;});
}
function bind(){d.querySelector('#ppClose').onclick=()=>d.close();const close2=d.querySelector('#ppClose2');if(close2)close2.onclick=()=>d.close();const saveB=d.querySelector('#ppSave');if(saveB)saveB.onclick=()=>{sync();save();alert('Piano di pubblicazione salvato')};const add=d.querySelector('#ppAdd');if(add)add.onclick=()=>{sync();P.channels.push({id:'c'+Date.now(),name:'Nuovo canale — inserire nome esatto',type:'Canale',planned:true,date:'',time:'',status:'DA PROGRAMMARE',url:'',note:''});save()};const cli=d.querySelector('#ppClient');if(cli)cli.onclick=()=>{sync();localStorage.setItem(KEY,JSON.stringify(P));clientMode=true;render()};const edit=d.querySelector('#ppEdit');if(edit)edit.onclick=()=>{clientMode=false;render()};}
function openPlan(){P=load();clientMode=false;render();d.showModal()}
function enhancePoint5(){const list=document.getElementById('strategyList');if(!list)return;const items=list.querySelectorAll('.str');if(items.length<5)return;const p5=items[4];p5.innerHTML='<b>5. Dove pubblichiamo e calendario</b><br><span style="font-weight:400">Mostra al proprietario canali precisi, date, stato e link reali delle pubblicazioni.</span><button class="ppPointBtn" type="button">VEDI DOVE PUBBLICHIAMO →</button>';p5.querySelector('button').onclick=openPlan;}
const observer=new MutationObserver(()=>enhancePoint5());observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhancePoint5);else enhancePoint5();
window.openPublicationPlan=openPlan;
})();