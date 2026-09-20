(()=> {
'use strict';
const VERSION='20260920-acquisition-dashboard-v3';
const DATA_URL='./data/seller-lead-engine-public.json';
const GEO_CACHE_KEY='f1_seller_geo_comuni_v1';
const CATEGORIES=[
  {key:'SUCCESSIONE',desc:'Immobile/proprietà proveniente da successione.'},
  {key:'TRASFERIMENTO',desc:'Proprietario che si sta trasferendo o prevede di farlo.'},
  {key:'APPARTAMENTO VUOTO',desc:'Immobile apparentemente non abitato o inutilizzato.'},
  {key:'RICHIESTA VALORE CASA',desc:'Qualcuno che ha chiesto quanto vale il proprio immobile.'},
  {key:'CARTELLO PRIVATO',desc:'Privato che ha esposto un cartello di vendita.'},
  {key:'VECCHIO INCARICO SCADUTO',desc:'Immobile precedentemente affidato a un intermediario con incarico terminato.'}
];
const TARGETS={mandates:4,appointments:16,qualified:40,conversations:200,attempts:600,contactsDay:30,conversationsDay:10,qualifiedDay:2,appointmentsDay:1,followupsDay:20};
const BASIN_LABEL='CONDOVE → RIVERA DI ALMESE';
const BASIN_COMUNI=new Set(['condove','caprie','villar dora','almese','rivera di almese','rivera']);
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const txt=v=>String(v??'').trim();
let crm={civics:[],conversations:[],news:[],territory_leads:[],letters:[]};
let seller={opportunities:[]};
let currentPosition=null;
let geoCache={};
try{geoCache=JSON.parse(localStorage.getItem(GEO_CACHE_KEY)||'{}')||{}}catch(_){geoCache={}}

function injectStyle(){
 if($('f1AcqDashStyle'))return;
 const s=document.createElement('style');
 s.id='f1AcqDashStyle';
 s.textContent=`
 .f1-acq-dashboard{display:grid;gap:10px;margin:0 0 12px}
 .f1-acq-panel{border:1px solid #c9ded2;border-radius:16px;background:#fff;padding:12px;box-shadow:0 6px 20px rgba(11,111,61,.06)}
 .f1-acq-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap}
 .f1-acq-head h2{font-size:17px;font-weight:950;margin:0}.f1-acq-sub{font-size:9px;color:var(--mut);font-weight:800;margin-top:3px}
 .f1-acq-grid5{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:10px}
 .f1-acq-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
 .f1-acq-metric{min-width:0;border:1px solid var(--line);border-radius:12px;background:#f9fbfa;padding:9px;text-align:center}
 .f1-acq-metric span{display:block;min-height:24px;font-size:8px;font-weight:950;color:#48544d;line-height:1.25}.f1-acq-metric strong{display:block;font-size:16px;color:#b42318;margin-top:2px}
 .f1-acq-progress{height:6px;border-radius:999px;background:#e9eeeb;margin-top:7px;overflow:hidden}.f1-acq-progress i{display:block;height:100%;background:var(--g);width:0}
 .f1-acq-note{border:1px solid #efb5af;background:#fff4f2;color:#7a271a;border-radius:11px;padding:10px;font-size:10px;font-weight:850;line-height:1.45}
 .f1-acq-next{display:grid;gap:6px;border:1px solid var(--line);border-radius:12px;padding:10px;background:#f8fbf9}.f1-acq-next strong{font-size:13px}.f1-acq-next small{font-size:9px;color:var(--mut);font-weight:800}
 .f1-acq-actions{display:flex;gap:6px;flex-wrap:wrap}.f1-acq-btn{min-height:34px;border:1px solid var(--line);border-radius:9px;background:#fff;color:var(--ink);padding:6px 9px;font:inherit;font-size:9px;font-weight:950;cursor:pointer}.f1-acq-btn.primary{background:var(--g);color:#fff;border-color:var(--g)}.f1-acq-btn.red{background:#fff4f2;color:#b42318;border-color:#efb5af}
 .f1-acq-radar{display:grid;gap:6px;margin-top:9px}.f1-acq-radar-row{display:grid;grid-template-columns:70px 70px minmax(0,1fr) minmax(120px,.85fr);gap:7px;align-items:start;border-top:1px solid var(--line);padding-top:7px;font-size:9px}.f1-acq-radar-row:first-child{border-top:0;padding-top:0}.f1-acq-priority{font-weight:950}.f1-acq-priority.HOT{color:#b42318}.f1-acq-priority.WARM{color:#b54708}.f1-acq-priority.NURTURE{color:#067647}.f1-acq-distance{font-weight:950}.f1-acq-source a{color:#07502d;word-break:break-all;font-weight:800}
 .f1-acq-news-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}.f1-acq-news-cat{min-height:92px;border:1px solid var(--line);border-radius:12px;background:#fff;padding:9px;text-align:left;cursor:pointer}.f1-acq-news-cat strong{display:block;font-size:10px;font-weight:950;line-height:1.2}.f1-acq-news-cat small{display:block;margin-top:5px;font-size:8px;color:var(--mut);font-weight:750;line-height:1.35}.f1-acq-news-count{display:inline-flex;min-width:22px;height:22px;align-items:center;justify-content:center;border-radius:999px;background:#eef9f2;color:#07502d;font-size:9px;font-weight:950;margin-top:7px}
 .f1-acq-news-list{display:grid;gap:6px;margin-top:10px}.f1-acq-news-row{border:1px solid var(--line);border-radius:10px;padding:8px;background:#f8fbf9;font-size:9px;line-height:1.4}.f1-acq-news-row strong{display:block;font-size:10px}
 .f1-acq-modal{position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.55);display:none;align-items:flex-end;justify-content:center}.f1-acq-modal.open{display:flex}.f1-acq-sheet{width:min(100%,760px);max-height:92dvh;overflow:auto;background:#fff;border-radius:18px 18px 0 0;padding:12px}.f1-acq-form{display:grid;grid-template-columns:1fr 1fr;gap:8px}.f1-acq-field{display:grid;gap:4px}.f1-acq-field.full{grid-column:1/-1}.f1-acq-field label{font-size:9px;font-weight:950;color:var(--mut)}.f1-acq-field input,.f1-acq-field select,.f1-acq-field textarea{width:100%;border:1px solid var(--line);border-radius:9px;padding:9px;font:inherit;font-size:12px;background:#fff}.f1-acq-field textarea{min-height:76px;resize:vertical}.f1-acq-msg{font-size:9px;font-weight:900;color:var(--g);margin-top:7px}.f1-acq-msg.bad{color:var(--red)}
 @media(max-width:720px){.f1-acq-grid5{display:flex!important;overflow-x:auto;scrollbar-width:none}.f1-acq-grid5::-webkit-scrollbar{display:none}.f1-acq-grid5 .f1-acq-metric{flex:0 0 92px}.f1-acq-grid2{grid-template-columns:1fr}.f1-acq-news-grid{display:flex!important;overflow-x:auto;scrollbar-width:none}.f1-acq-news-grid::-webkit-scrollbar{display:none}.f1-acq-news-cat{flex:0 0 132px}.f1-acq-radar-row{grid-template-columns:62px 62px minmax(0,1fr)}.f1-acq-source{grid-column:1/-1}.f1-acq-form{grid-template-columns:1fr}}
 `;
 document.head.appendChild(s);
}

function build(){
 const screen=$('municipalities');
 const stack=screen?.querySelector('.stack')||screen;
 const card=stack?.querySelector('.card');
 if(!screen||!stack||!card)return false;
 if($('f1AcqDashboard'))return true;
 injectStyle();
 const basin=document.createElement('div');
 basin.id='f1BasinBanner';
 basin.className='f1-basin-banner';
 basin.innerHTML='<div><span class="label">BACINO OPERATIVO ATTUALE</span><strong>'+BASIN_LABEL+'</strong><small>Ogni priorità, Seller Radar, notizia e ordine operativo viene filtrato su questo bacino.</small></div><span style="font-size:20px">◎</span>';
 stack.prepend(basin);
 const wrap=document.createElement('div');
 wrap.id='f1AcqDashboard';
 wrap.className='f1-acq-dashboard';
 wrap.innerHTML=`
 <section class="f1-acq-panel f1-ai-directive">
  <div class="f1-acq-head"><div><h2>🤖 DIRETTIVA OPERATIVA · COSA FARE ADESSO</h2><div class="f1-acq-sub">KPI, CRM, Notizie Territoriali e Seller Radar del bacino ${BASIN_LABEL}.</div></div><button id="f1AiOpenTerritory" class="f1-acq-btn primary" type="button">APRI NOTIZIERE</button></div>
  <div id="f1AiTargets" class="f1-ai-targets"></div>
  <div id="f1AiQueue" class="f1-ai-queue"><div class="f1-acq-sub">Calcolo priorità operative…</div></div>
 </section>
 <section class="f1-acq-panel">
  <div class="f1-acq-head"><div><h2>🎯 OBIETTIVO 4 INCARICHI / MESE</h2><div class="f1-acq-sub">KPI reali dal CRM F1 · target operativo mensile</div></div><div id="f1AcqMonth" class="ey">—</div></div>
  <div class="f1-acq-grid5">
   <div class="f1-acq-metric"><span>INCARICHI</span><strong id="f1Mmandates">— / 4</strong><div class="f1-acq-progress"><i id="f1Pmandates"></i></div></div>
   <div class="f1-acq-metric"><span>APPUNTAMENTI</span><strong id="f1Mappointments">— / 16</strong><div class="f1-acq-progress"><i id="f1Pappointments"></i></div></div>
   <div class="f1-acq-metric"><span>PROPRIETARI QUALIFICATI</span><strong id="f1Mqualified">— / 40</strong><div class="f1-acq-progress"><i id="f1Pqualified"></i></div></div>
   <div class="f1-acq-metric"><span>CONVERSAZIONI</span><strong id="f1Mconversations">— / 200</strong><div class="f1-acq-progress"><i id="f1Pconversations"></i></div></div>
   <div class="f1-acq-metric"><span>TENTATIVI DI CONTATTO</span><strong id="f1Mattempts">— / 600</strong><div class="f1-acq-progress"><i id="f1Pattempts"></i></div></div>
  </div>
 </section>
 <div class="f1-acq-grid2">
  <section class="f1-acq-panel">
   <div class="f1-acq-head"><div><h2>📊 KPI GIORNALIERI</h2><div class="f1-acq-sub">Le azioni registrate oggi nel CRM.</div></div><div class="ey">OGGI</div></div>
   <div class="f1-acq-grid5">
    <div class="f1-acq-metric"><span>CONTATTI</span><strong id="f1Dcontacts">— / 30</strong></div>
    <div class="f1-acq-metric"><span>CONVERSAZIONI</span><strong id="f1Dconversations">— / 10</strong></div>
    <div class="f1-acq-metric"><span>QUALIFICATI</span><strong id="f1Dqualified">— / 2</strong></div>
    <div class="f1-acq-metric"><span>APPUNTAMENTI</span><strong id="f1Dappointments">— / 1</strong></div>
    <div class="f1-acq-metric"><span>FOLLOW-UP</span><strong id="f1Dfollowups">— / 20</strong></div>
   </div>
  </section>
  <section class="f1-acq-panel">
   <div class="f1-acq-head"><div><h2>📈 RITMO 4 INCARICHI</h2><div class="f1-acq-sub">Confronto tra target e risultati reali.</div></div></div>
   <div id="f1AcqPace" class="f1-acq-note">Caricamento KPI…</div>
  </section>
 </div>
 <div class="f1-acq-grid2">
  <section class="f1-acq-panel">
   <div class="f1-acq-head"><div><h2>⚡ PROSSIMA AZIONE</h2><div class="f1-acq-sub">Priorità da CRM, follow-up e notizie.</div></div><button id="f1AcqRefresh" class="f1-acq-btn" type="button">AGGIORNA</button></div>
   <div id="f1AcqNext" class="f1-acq-next" style="margin-top:9px"><small>Caricamento…</small></div>
  </section>
  <section class="f1-acq-panel">
   <div class="f1-acq-head"><div><h2>📡 SELLER RADAR — VICINO A ME</h2><div class="f1-acq-sub">Ordine: PRIORITÀ · DISTANZA · COMUNE/VIA · FONTE</div></div><button id="f1AcqGps" class="f1-acq-btn primary" type="button">USA GPS</button></div>
   <div id="f1AcqGeoState" class="f1-acq-sub" style="margin-top:7px">Attiva GPS per ordinare i risultati dalla zona più vicina.</div>
   <div id="f1AcqRadar" class="f1-acq-radar"></div>
  </section>
 </div>
 <section class="f1-acq-panel">
  <div class="f1-acq-head"><div><h2>📰 NOTIZIE TERRITORIALI</h2><div class="f1-acq-sub">Le sei categorie sono autonome e collegate al CRM.</div></div><button id="f1AcqAddNews" class="f1-acq-btn primary" type="button">+ AGGIUNGI NOTIZIA</button></div>
  <div id="f1AcqNewsGrid" class="f1-acq-news-grid"></div>
  <div id="f1AcqNewsList" class="f1-acq-news-list"></div>
 </section>`;
 stack.insertBefore(wrap,card);
 buildModal();
 bind();
 renderCategoryButtons();
 return true;
}

function buildModal(){
 if($('f1AcqNewsModal'))return;
 const m=document.createElement('div');
 m.id='f1AcqNewsModal';m.className='f1-acq-modal';
 m.innerHTML=`<div class="f1-acq-sheet">
  <div class="f1-acq-head"><div><div class="ey">NOTIZIA TERRITORIALE</div><h2>AGGIUNGI NOTIZIA</h2></div><button id="f1AcqCloseNews" class="f1-acq-btn" type="button">×</button></div>
  <form id="f1AcqNewsForm" style="margin-top:10px">
   <div class="f1-acq-form">
    <div class="f1-acq-field full"><label>CATEGORIA</label><select id="f1AcqCategory">${CATEGORIES.map(c=>'<option value="'+esc(c.key)+'">'+esc(c.key)+'</option>').join('')}</select></div>
    <div class="f1-acq-field"><label>COMUNE</label><input id="f1AcqComune" required></div>
    <div class="f1-acq-field"><label>VIA</label><input id="f1AcqVia" required></div>
    <div class="f1-acq-field"><label>CIVICO</label><input id="f1AcqCivico"></div>
    <div class="f1-acq-field"><label>FONTE / LINK</label><input id="f1AcqSourceUrl" inputmode="url"></div>
    <div class="f1-acq-field"><label>PROPRIETARIO / CONTATTO</label><input id="f1AcqPerson"></div>
    <div class="f1-acq-field"><label>TELEFONO</label><input id="f1AcqPhone" inputmode="tel"></div>
    <div class="f1-acq-field full"><label>NOTE / DETTAGLIO</label><textarea id="f1AcqDetail"></textarea></div>
   </div>
   <div class="f1-acq-actions" style="margin-top:9px"><button id="f1AcqGeoFill" class="f1-acq-btn" type="button">📍 GEOLOCALIZZA E COMPILA</button><button class="f1-acq-btn primary" type="submit">SALVA NEL CRM</button></div>
   <div id="f1AcqFormMsg" class="f1-acq-msg"></div>
  </form>
 </div>`;
 document.body.appendChild(m);
}

function bind(){
 $('f1AcqRefresh')?.addEventListener('click',()=>loadData(true));
 $('f1AiOpenTerritory')?.addEventListener('click',()=>document.querySelector('.topnav[data-screen="terr"]')?.click());
 $('f1AcqGps')?.addEventListener('click',activateGps);
 $('f1AcqAddNews')?.addEventListener('click',()=>openNewsForm());
 $('f1AcqCloseNews')?.addEventListener('click',()=>closeNewsForm());
 $('f1AcqNewsModal')?.addEventListener('click',e=>{if(e.target===$('f1AcqNewsModal'))closeNewsForm()});
 $('f1AcqGeoFill')?.addEventListener('click',geoFillForm);
 $('f1AcqNewsForm')?.addEventListener('submit',saveCategorizedNews);
}

function renderCategoryButtons(){
 const box=$('f1AcqNewsGrid');if(!box)return;
 box.innerHTML=CATEGORIES.map(c=>`<button type="button" class="f1-acq-news-cat" data-f1-news-cat="${esc(c.key)}"><strong>${esc(c.key)}</strong><small>${esc(c.desc)}</small><span class="f1-acq-news-count" id="f1Cat_${c.key.replace(/[^A-Z0-9]+/g,'_')}">0</span></button>`).join('');
 box.querySelectorAll('[data-f1-news-cat]').forEach(b=>b.addEventListener('click',()=>renderNewsList(b.dataset.f1NewsCat)));
}

function normalizePlace(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim()}
function inBasin(x){const n=typeof x==='string'?{comune:x}:x||{},cc=normalizePlace(n.comune),z=normalizePlace(n.zona||n.quartiere||'');if(BASIN_COMUNI.has(cc))return true;return cc==='almese'&&(/rivera/.test(z)||!z)}
function basinRows(rows=[]){return (rows||[]).filter(inBasin)}
function dedupeNews(rows=[]){const seen=new Set(),out=[];for(const n of [...rows].sort((a,b)=>String(b.updated_at||b.observed_at||'').localeCompare(String(a.updated_at||a.observed_at||'')))){const key=[normalizePlace(n.comune),normalizePlace(n.via),txt(n.civico),catFor(n)||u(n.news_type||n.observation_type),normalizePlace(n.person_name)].join('|');if(seen.has(key))continue;seen.add(key);out.push(n)}return out}
function workingDaysRemaining(){const now=new Date(),end=new Date(now.getFullYear(),now.getMonth()+1,0),d=new Date(now.getFullYear(),now.getMonth(),now.getDate());let n=0;for(;d<=end;d.setDate(d.getDate()+1)){const day=d.getDay();if(day!==0)n++}return Math.max(1,n)}
function kpiSnapshot(){
 const conv=basinRows(Array.isArray(crm.conversations)?crm.conversations:[]),news=basinRows(Array.isArray(crm.news)?crm.news:[]),leads=basinRows(Array.isArray(crm.territory_leads)?crm.territory_leads:[]);
 const today=nowKey(),month=today.slice(0,7),convToday=conv.filter(x=>dateKey(x.created_at||x.updated_at)===today),convMonth=conv.filter(x=>monthKey(x.created_at||x.updated_at)===month),newsToday=news.filter(x=>dateKey(x.observed_at||x.created_at||x.updated_at)===today),newsMonth=news.filter(x=>monthKey(x.observed_at||x.created_at||x.updated_at)===month),leadMonth=leads.filter(x=>monthKey(x.created_at||x.updated_at)===month);
 const unique=new Set(convToday.map(x=>txt(x.phone)||[txt(x.person_name),txt(x.comune),txt(x.via),txt(x.civico)].join('|')).filter(Boolean)),dQualified=convToday.filter(isQualified).length+newsToday.filter(isQualified).length,mQualified=convMonth.filter(isQualified).length+newsMonth.filter(isQualified).length,dAppointments=convToday.filter(x=>u(x.outcome)==='APPUNTAMENTO').length,mAppointments=convMonth.filter(x=>u(x.outcome)==='APPUNTAMENTO').length,dFollow=convToday.filter(x=>u(x.outcome)==='DA RICONTATTARE'||['RICHIAMO','FOLLOW_UP','DA_RICONTATTARE'].includes(u(x.status))).length,mMandates=[...convMonth,...newsMonth,...leadMonth].filter(isMandate).length,days=workingDaysRemaining(),need=(target,actual)=>Math.max(0,Math.ceil((target-actual)/days));
 return {today,month,days,convToday,convMonth,newsToday,newsMonth,leadMonth,unique,dQualified,mQualified,dAppointments,mAppointments,dFollow,mMandates,daily:{attempts:need(TARGETS.attempts,convMonth.length),conversations:need(TARGETS.conversations,convMonth.length),qualified:need(TARGETS.qualified,mQualified),appointments:need(TARGETS.appointments,mAppointments),followups:TARGETS.followupsDay}};
}
function taskCategoryWeight(category){return ({'RICHIESTA VALORE CASA':115,'VECCHIO INCARICO SCADUTO':108,'CARTELLO PRIVATO':102,'TRASFERIMENTO':96,'SUCCESSIONE':90,'APPARTAMENTO VUOTO':82})[category]||68}
function operationalPlan(){
 const snap=kpiSnapshot(),tasks=[],now=Date.now();
 for(const x of basinRows(crm.conversations||[])){const out=u(x.outcome),st=u(x.status);let score=0,action='',objective='';if(out==='POSSIBILE VENDITA'){score=145;action=txt(x.phone)?'CHIAMA ORA':'COMPLETA IL RECAPITO';objective='FISSA APPUNTAMENTO / VALUTAZIONE'}else if(out==='DA RICONTATTARE'||['RICHIAMO','FOLLOW_UP','DA_RICONTATTARE'].includes(st)){score=138;action=txt(x.phone)?'RICHIAMA ORA':'RECUPERA IL RECAPITO';objective='TRASFORMA IL FOLLOW-UP IN APPUNTAMENTO'}else if(out==='APPUNTAMENTO'){score=118;action='PREPARA E CONFERMA APPUNTAMENTO';objective='PORTA L’APPUNTAMENTO VERSO L’INCARICO'}else continue;if(txt(x.phone))score+=12;const due=x.next_action_at?new Date(x.next_action_at).getTime():NaN;if(Number.isFinite(due)&&due<=now)score+=30;tasks.push({kind:'CRM',score,name:txt(x.person_name||x.target_type)||'CONTATTO CRM',place:[x.comune,x.via,x.civico].filter(Boolean).join(' · '),phone:txt(x.phone),action,objective,source:'CRM'})}
 for(const n of dedupeNews(basinRows(crm.news||[]))){if(u(n.status)==='CHIUSA'||u(n.office_status)==='RISOLTA')continue;const cat=catFor(n)||'NOTIZIA DA CLASSIFICARE';let score=taskCategoryWeight(cat);if(u(n.priority)==='ALTA')score+=18;if(txt(n.phone_normalized))score+=12;const due=n.next_action_at?new Date(n.next_action_at).getTime():NaN;if(Number.isFinite(due)&&due<=now)score+=25;const hasOwner=txt(n.person_name)||['SI','SÌ','CONFERMATO'].includes(u(n.owner_status));let action=txt(n.next_action)||'VERIFICA NOTIZIA',objective='IDENTIFICA PROPRIETARIO E RECAPITO';if(hasOwner&&txt(n.phone_normalized)){action='CHIAMA / QUALIFICA';objective='VERIFICA INTENZIONE E FISSA APPUNTAMENTO'}else if(hasOwner){action='TROVA / COMPLETA RECAPITO';objective='PORTA IL PROPRIETARIO A CONTATTO'}tasks.push({kind:'NEWS',score,name:txt(n.person_name)||cat,category:cat,place:[n.comune,n.via,n.civico].filter(Boolean).join(' · '),phone:txt(n.phone_normalized),action,objective,source:'NOTIZIA'})}
 for(const r of basinRows(seller.opportunities||[])){if(!['HOT','WARM'].includes(u(r.lead_status)))continue;let score=u(r.lead_status)==='HOT'?92:62;score+=Math.min(20,Math.round(Number(r.lead_score||0)/5));tasks.push({kind:'SELLER',score,name:(r.lead_status||'SELLER RADAR')+' · '+(r.source||'FONTE'),place:[r.comune,r.via,r.civico].filter(Boolean).join(' · '),action:'VERIFICA FONTE E CHI PUBBLICA',objective:'SE È PRIVATO, CREA CONTATTO E QUALIFICA',sourceUrl:r.source_url||'',source:'SELLER RADAR'})}
 tasks.sort((a,b)=>b.score-a.score);if(!tasks.length)tasks.push({kind:'TERRITORY',score:10,name:'GIRO TERRITORIALE',place:BASIN_LABEL,action:'APRI IL NOTIZIERE E LAVORA LA ZONA ASSEGNATA',objective:'GENERA NUOVE NOTIZIE E CONVERSAZIONI',source:'F1 TERRITORY'});
 return {basin:BASIN_LABEL,snapshot:snap,tasks};
}
function renderAIDirective(){const box=$('f1AiQueue'),targets=$('f1AiTargets');if(!box||!targets)return;const p=operationalPlan(),d=p.snapshot.daily;targets.innerHTML=[['AZIONI CONTATTO',d.attempts],['CONVERSAZIONI',d.conversations],['QUALIFICATI',d.qualified],['APPUNTAMENTI',d.appointments],['FOLLOW-UP',d.followups]].map(x=>'<div class="f1-ai-target"><span>'+x[0]+'</span><strong>'+x[1]+'</strong><span>oggi</span></div>').join('');box.innerHTML=p.tasks.slice(0,3).map((t,i)=>'<div class="f1-ai-task"><span class="num">'+(i+1)+'</span><div><strong>'+esc(t.name)+'</strong><small>'+esc(t.place||BASIN_LABEL)+' · '+esc(t.action)+'</small></div><div class="goal">'+esc(t.objective)+'</div></div>').join('')}
function dateKey(v){
 if(!v)return'';
 const d=new Date(v);if(Number.isNaN(d.getTime()))return'';
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
}
function nowKey(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function monthKey(v){return dateKey(v).slice(0,7)}
function u(v){return txt(v).toUpperCase()}
function isQualified(x){return ['QUALIFICATO','QUALIFICATA','QUALIFIED'].includes(u(x?.status))||['QUALIFICATO','QUALIFICATA','QUALIFIED'].includes(u(x?.workflow_state))}
function isMandate(x){const vals=[u(x?.status),u(x?.workflow_state),u(x?.stage)];return vals.some(v=>['INCARICO','INCARICO_PRESO','INCARICO_ACQUISITO','MANDATO','MANDATE'].includes(v))}
function catFor(n){
 const raw=u(n?.news_type||n?.observation_type||n?.detail);
 if(raw.includes('SUCCESS'))return'SUCCESSIONE';
 if(raw.includes('TRASFER'))return'TRASFERIMENTO';
 if(raw.includes('APPARTAMENTO VUOTO')||raw.includes('IMMOBILE NON UTILIZZATO')||raw.includes('SFITTO'))return'APPARTAMENTO VUOTO';
 if(raw.includes('RICHIESTA VALORE')||raw.includes('VALUTAZIONE')||raw.includes('VALORE CASA'))return'RICHIESTA VALORE CASA';
 if(raw.includes('CARTELLO PRIVATO')||raw.includes('CARTELLO VENDITA')||u(n?.market_publisher)==='PRIVATO')return'CARTELLO PRIVATO';
 if(raw.includes('INCARICO SCADUTO')||raw.includes('VECCHIO INCARICO'))return'VECCHIO INCARICO SCADUTO';
 return'';
}
function pct(n,t){return Math.max(0,Math.min(100,Math.round((Number(n||0)/t)*100)))}
function setMetric(id,n,t,pid){const el=$(id);if(el)el.textContent=`${n} / ${t}`;if(pid&&$(pid))$(pid).style.width=pct(n,t)+'%'}
function renderKpis(){const s=kpiSnapshot();setMetric('f1Dcontacts',s.unique.size,s.daily.attempts);setMetric('f1Dconversations',s.convToday.length,s.daily.conversations);setMetric('f1Dqualified',s.dQualified,s.daily.qualified);setMetric('f1Dappointments',s.dAppointments,s.daily.appointments);setMetric('f1Dfollowups',s.dFollow,s.daily.followups);setMetric('f1Mmandates',s.mMandates,TARGETS.mandates,'f1Pmandates');setMetric('f1Mappointments',s.mAppointments,TARGETS.appointments,'f1Pappointments');setMetric('f1Mqualified',s.mQualified,TARGETS.qualified,'f1Pqualified');setMetric('f1Mconversations',s.convMonth.length,TARGETS.conversations,'f1Pconversations');setMetric('f1Mattempts',s.convMonth.length,TARGETS.attempts,'f1Pattempts');if($('f1AcqMonth'))$('f1AcqMonth').textContent=new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric',timeZone:'Europe/Rome'}).format(new Date()).toUpperCase();const missing=Math.max(0,TARGETS.appointments-s.mAppointments);$('f1AcqPace').innerHTML='<strong>'+missing+' appuntamenti mancanti al target mensile.</strong><br>'+s.days+' giornate operative rimaste · obiettivo da oggi: '+s.daily.appointments+' appuntamenti/giorno.';renderAIDirective();}
function renderNextAction(){const t=operationalPlan().tasks[0],box=$('f1AcqNext');if(!box)return;if(!t){box.innerHTML='<small>Nessuna azione prioritaria disponibile.</small>';return}box.innerHTML='<span class="priority">PRIORITÀ OPERATIVA</span><strong>'+esc(t.name)+'</strong><small>'+esc(t.place||BASIN_LABEL)+' · '+esc(t.source||'F1')+'</small><div><b>AZIONE:</b> '+esc(t.action)+'</div><div><b>OBIETTIVO:</b> '+esc(t.objective)+'</div><div class="f1-acq-actions">'+(t.phone?'<a class="f1-acq-btn primary" href="tel:'+esc(t.phone.replace(/\\s+/g,''))+'">CHIAMA ORA</a>':'')+(t.sourceUrl?'<a class="f1-acq-btn" href="'+esc(t.sourceUrl)+'" target="_blank" rel="noopener">APRI FONTE</a>':'')+'<button id="f1AcqOpenTerr" class="f1-acq-btn" type="button">APRI NOTIZIERE</button></div>';$('f1AcqOpenTerr')?.addEventListener('click',()=>document.querySelector('.topnav[data-screen="terr"]')?.click());}
function renderNewsCounts(){
 const news=dedupeNews(basinRows(Array.isArray(crm.news)?crm.news:[]));
 const open=news.filter(n=>u(n.status)!=='CHIUSA'&&u(n.office_status)!=='RISOLTA');
 for(const c of CATEGORIES){
  const n=open.filter(x=>catFor(x)===c.key).length;
  const id='f1Cat_'+c.key.replace(/[^A-Z0-9]+/g,'_');if($(id))$(id).textContent=String(n);
 }
}
function renderNewsList(category){
 const list=$('f1AcqNewsList');if(!list)return;
 const rows=dedupeNews(basinRows(crm.news||[])).filter(n=>catFor(n)===category&&u(n.status)!=='CHIUSA').sort((a,b)=>String(b.updated_at||b.observed_at||'').localeCompare(String(a.updated_at||a.observed_at||''))).slice(0,8);
 list.innerHTML=rows.length?`<div class="ey">${esc(category)} · NOTIZIE APERTE</div>`+rows.map(n=>`<div class="f1-acq-news-row"><strong>${esc([n.comune,n.via,n.civico].filter(Boolean).join(' · ')||'Posizione non disponibile')}</strong>${n.person_name?esc(n.person_name)+' · ':''}${esc(n.next_action||'VERIFICA NOTIZIA')}${n.market_source_url?'<br><a href="'+esc(n.market_source_url)+'" target="_blank" rel="noopener">FONTE</a>':''}</div>`).join(''):`<div class="f1-acq-news-row">Nessuna notizia aperta nella categoria <strong>${esc(category)}</strong>.</div>`;
}
function openNewsForm(category=''){if(category&&CATEGORIES.some(c=>c.key===category))$('f1AcqCategory').value=category;$('f1AcqFormMsg').textContent='';$('f1AcqNewsModal').classList.add('open')}
function closeNewsForm(){$('f1AcqNewsModal')?.classList.remove('open')}

async function geoFillForm(){
 const msg=$('f1AcqFormMsg');msg.className='f1-acq-msg';msg.textContent='Acquisizione posizione…';
 try{
  const p=await getPosition();currentPosition=p;
  const url='https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat='+encodeURIComponent(p.lat)+'&lon='+encodeURIComponent(p.lng);
  const r=await fetch(url,{headers:{'Accept-Language':'it'}});if(!r.ok)throw Error('Geocodifica non disponibile');
  const j=await r.json(),a=j.address||{};
  $('f1AcqComune').value=a.town||a.city||a.village||a.municipality||'';
  $('f1AcqVia').value=a.road||a.pedestrian||a.residential||'';
  $('f1AcqCivico').value=a.house_number||'';
  msg.textContent='✓ Posizione acquisita. Controlla Comune, Via e Civico prima di salvare.';
 }catch(e){msg.className='f1-acq-msg bad';msg.textContent='GPS non disponibile: '+(e.message||e)}
}

async function saveCategorizedNews(e){
 e.preventDefault();
 const msg=$('f1AcqFormMsg');msg.className='f1-acq-msg';msg.textContent='Salvataggio nel CRM…';
 const payload={
  p_category:$('f1AcqCategory').value,
  p_comune:txt($('f1AcqComune').value),
  p_via:txt($('f1AcqVia').value),
  p_civico:txt($('f1AcqCivico').value),
  p_source:'F1 TERRITORY · NOTIZIE TERRITORIALI',
  p_source_url:txt($('f1AcqSourceUrl').value),
  p_person_name:txt($('f1AcqPerson').value),
  p_phone:txt($('f1AcqPhone').value),
  p_detail:txt($('f1AcqDetail').value),
  p_latitude:currentPosition?.lat??null,
  p_longitude:currentPosition?.lng??null,
  p_gps_accuracy:currentPosition?.accuracy??null
 };
 if(!payload.p_comune||!payload.p_via){msg.className='f1-acq-msg bad';msg.textContent='Comune e Via sono obbligatori.';return}
 if(!inBasin(payload.p_comune)){msg.className='f1-acq-msg bad';msg.textContent='Comune fuori dal bacino operativo '+BASIN_LABEL+'.';return}
 try{
  await window.F1StaffData.rpc('f1_territory_add_categorized_news_v1',payload);
  msg.textContent='✓ Notizia salvata nel CRM.';
  $('f1AcqNewsForm').reset();currentPosition=null;
  await loadData(true);
  setTimeout(closeNewsForm,450);
 }catch(err){msg.className='f1-acq-msg bad';msg.textContent='Errore: '+(err?.message||err)}
}

async function fetchSeller(){
 try{const r=await fetch(DATA_URL+'?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);seller=await r.json()}catch(e){seller={opportunities:[]};if($('f1AcqGeoState'))$('f1AcqGeoState').textContent='Seller Radar non disponibile: '+(e.message||e)}
}
function renderRadar(rows){
 const box=$('f1AcqRadar');if(!box)return;
 const list=basinRows(rows||[]).slice(0,3);
 box.innerHTML=list.length?list.map(r=>`<div class="f1-acq-radar-row"><div class="f1-acq-priority ${esc(u(r.lead_status))}">${esc(r.lead_status||'—')}</div><div class="f1-acq-distance">${Number.isFinite(r._distanceKm)?'≈ '+r._distanceKm.toLocaleString('it-IT',{minimumFractionDigits:r._distanceKm<10?1:0,maximumFractionDigits:1})+' km':'—'}</div><div><strong>${esc(r.comune||'—')}</strong><br>${esc([r.via,r.civico].filter(Boolean).join(' ')||'Indirizzo da verificare')}</div><div class="f1-acq-source">${r.source_url?'<a href="'+esc(r.source_url)+'" target="_blank" rel="noopener">'+esc(r.source||'FONTE')+'</a>':'—'}</div></div>`).join(''):'<div class="f1-acq-news-row">Nessun risultato Seller Radar disponibile.</div>';
}
function normComune(v){return txt(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function haversineKm(a,b,c,d){const R=6371,rad=x=>x*Math.PI/180,dLat=rad(c-a),dLon=rad(d-b),q=Math.sin(dLat/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
function getPosition(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(Error('Geolocalizzazione non disponibile'));navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),reject,{enableHighAccuracy:true,timeout:12000,maximumAge:60000})})}
async function geocodeComune(comune){
 const key=normComune(comune),cached=geoCache[key];if(cached&&Number.isFinite(cached.lat)&&Number.isFinite(cached.lng))return cached;
 const q=encodeURIComponent(comune+', Torino, Piemonte, Italia'),r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=it&q='+q,{headers:{'Accept-Language':'it'}});
 if(!r.ok)return null;const a=await r.json();if(!a?.[0])return null;const out={lat:Number(a[0].lat),lng:Number(a[0].lon),ts:Date.now()};if(Number.isFinite(out.lat)&&Number.isFinite(out.lng)){geoCache[key]=out;try{localStorage.setItem(GEO_CACHE_KEY,JSON.stringify(geoCache))}catch(_){}return out}return null
}
function sellerPrioritySort(rows){return [...rows].sort((a,b)=>Number(b.lead_score||0)-Number(a.lead_score||0))}
async function activateGps(){
 const st=$('f1AcqGeoState'),btn=$('f1AcqGps');btn.disabled=true;st.textContent='Acquisizione GPS…';
 try{
  currentPosition=await getPosition();st.textContent='GPS acquisito. Calcolo distanza dei Comuni Seller Radar…';
  const rows=sellerPrioritySort(basinRows(seller.opportunities||[]));
  const comuni=[...new Set(rows.map(r=>txt(r.comune)).filter(Boolean))];
  let done=0;
  for(const comune of comuni){
   let c=null;try{c=await geocodeComune(comune)}catch(_){}
   if(c)for(const r of rows)if(normComune(r.comune)===normComune(comune))r._distanceKm=haversineKm(currentPosition.lat,currentPosition.lng,c.lat,c.lng);
   done++;st.textContent='GPS · '+done+'/'+comuni.length+' Comuni elaborati';
   if(done<comuni.length&&!geoCache[normComune(comuni[done])])await new Promise(r=>setTimeout(r,1050));
  }
  rows.sort((a,b)=>{const ad=Number.isFinite(a._distanceKm)?a._distanceKm:Infinity,bd=Number.isFinite(b._distanceKm)?b._distanceKm:Infinity;if(ad!==bd)return ad-bd;return Number(b.lead_score||0)-Number(a.lead_score||0)});
  renderRadar(rows);
  st.textContent='✓ Ordinato per distanza GPS stimata dal centro del Comune; a parità vale la priorità Seller Radar.';
 }catch(e){st.textContent='GPS non disponibile: '+(e.message||e);renderRadar(sellerPrioritySort(seller.opportunities||[]))}
 finally{btn.disabled=false}
}

async function loadData(force=false){
 if(!window.F1StaffData?.rpc)return;
 try{crm=await window.F1StaffData.rpc('f1_territory_mobile_crm_v5',{p_limit:700})||crm}catch(e){console.warn('F1 Acquisition KPI CRM',e)}
 await fetchSeller();
 renderKpis();renderNextAction();renderNewsCounts();
 renderRadar(sellerPrioritySort(basinRows(seller.opportunities||[])));
}

function boot(){
 let tries=0;
 const t=setInterval(()=>{
  tries++;
  if(build()){
   clearInterval(t);
   loadData(true);
   window.addEventListener('focus',()=>loadData(true),{passive:true});
   setInterval(()=>loadData(false),30000);
  }else if(tries>180)clearInterval(t);
 },50);
}
window.addEventListener('f1:crm-updated',e=>{if(e.detail){crm=e.detail;renderKpis();renderNextAction();renderNewsCounts();renderAIDirective()}});window.F1TerritoryAcquisitionDashboard={version:VERSION,refresh:()=>loadData(true),openNews:openNewsForm,getOperationalPlan:operationalPlan,isInBasin:inBasin,basin:BASIN_LABEL};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();