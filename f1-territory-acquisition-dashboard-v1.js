(()=> {
'use strict';
const VERSION='20260921-notiziere-marketing-both-v7';
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
let lastOperationalPlan=null;
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
 .f1-basin-banner{border:2px solid #0b6f3d;border-radius:13px;background:#eaf8ef;padding:8px 10px;margin:0 0 7px;display:flex;align-items:center;justify-content:space-between;gap:8px;position:relative;z-index:3}
 .f1-basin-banner .label{font-size:8px;font-weight:950;color:#4f5e55;letter-spacing:.08em}.f1-basin-banner strong{display:block;font-size:15px;font-weight:950;color:#07502d;line-height:1.1}.f1-basin-banner small{font-size:8px;color:#526158;font-weight:800}
 .f1-ai-directive{border:2px solid #0b6f3d!important;background:#f4fbf7!important}.f1-ai-targets{display:flex;gap:6px;overflow-x:auto;margin-top:7px;padding-bottom:2px;scrollbar-width:none}.f1-ai-targets::-webkit-scrollbar{display:none}.f1-ai-target{flex:0 0 auto;border:1px solid #b9dfc9;border-radius:9px;padding:6px 8px;background:#fff;font-size:8px;font-weight:850}.f1-ai-target strong{display:block;color:#07502d;font-size:13px}
 .f1-ai-queue{display:grid;gap:5px;margin-top:7px}.f1-ai-task{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:7px;align-items:center;border-top:1px solid #dce9e1;padding-top:5px;font-size:8px}.f1-ai-task:first-child{border-top:0;padding-top:0}.f1-ai-task .num{width:22px;height:22px;border-radius:999px;background:#0b6f3d;color:#fff;display:grid;place-items:center;font-weight:950}.f1-ai-task strong{display:block;font-size:10px;line-height:1.2}.f1-ai-task small{display:block;color:var(--mut);font-weight:750;margin-top:2px}.f1-ai-task .goal{font-size:8px;font-weight:950;color:#07502d;text-align:right}
 .f1-acq-panel{padding:8px!important;border-radius:12px!important}.f1-acq-dashboard{gap:6px!important;margin-bottom:7px!important}.f1-acq-head h2{font-size:14px!important}.f1-acq-sub{font-size:8px!important}.f1-acq-grid5{gap:5px!important;margin-top:6px!important}.f1-acq-metric{padding:6px!important;border-radius:9px!important}.f1-acq-metric span{font-size:7px!important;min-height:18px!important}.f1-acq-metric strong{font-size:14px!important}.f1-acq-progress{margin-top:4px!important;height:4px!important}.f1-acq-next{padding:7px!important}.f1-acq-news-grid{gap:5px!important;margin-top:6px!important}.f1-acq-news-cat{min-height:0!important;padding:7px!important}.f1-acq-news-cat small{display:none!important}.f1-acq-news-count{height:18px!important;min-width:18px!important;margin-top:4px!important}.f1-acq-radar{gap:4px!important;margin-top:6px!important}.f1-acq-radar-row{padding-top:5px!important;gap:5px!important}.f1-acq-note{padding:7px!important;font-size:9px!important}
 .f1-home-dashboard-v1 .f1-home-tile{min-height:58px!important;padding:7px 9px!important}.f1-home-dashboard-v1 .f1-home-tile .ico{font-size:20px!important}.f1-home-dashboard-v1 .f1-home-tile strong{font-size:10px!important}.f1-home-dashboard-v1 .f1-home-tile small{font-size:7px!important}.f1-home-dashboard-v1 .f1-home-dash{gap:5px!important}.f1-home-dashboard-v1 .f1-home-idle-note{padding:7px 10px!important}.f1-home-dashboard-v1 .f1-seller-system-btn{min-height:44px!important;padding:8px 10px!important}
 .f1-notiziere-hero{border:2px solid #0b6f3d;border-radius:14px;background:#fff;padding:9px;margin:0 0 7px;box-shadow:0 6px 18px rgba(11,111,61,.08)}
 .f1-notiziere-today{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #dce9e1;padding-bottom:7px;margin-bottom:7px}.f1-notiziere-today h2{font-size:13px;margin:0;font-weight:950}.f1-notiziere-today small{font-size:8px;color:var(--mut);font-weight:800}
 .f1-current-action{border-radius:12px;background:#f2fbf6;padding:9px}.f1-action-top{display:flex;justify-content:space-between;gap:8px;align-items:center}.f1-action-counter{font-size:9px;font-weight:950;color:#07502d}.f1-action-kind{font-size:8px;font-weight:950;background:#fff;border:1px solid #b9dfc9;border-radius:999px;padding:4px 7px}
 .f1-action-place{font-size:17px;font-weight:950;line-height:1.15;margin:7px 0}.f1-action-name{font-size:10px;font-weight:900;color:#425148;margin-bottom:7px}.f1-action-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.f1-action-block{border:1px solid #cfe4d7;background:#fff;border-radius:9px;padding:7px}.f1-action-block span{display:block;font-size:7px;font-weight:950;color:#68766e;letter-spacing:.06em}.f1-action-block strong{display:block;font-size:10px;line-height:1.3;margin-top:2px}.f1-action-script{margin-top:6px;border-left:3px solid #0b6f3d;background:#fff;padding:7px;border-radius:7px;font-size:9px;line-height:1.4}.f1-action-script b{display:block;font-size:7px;color:#526158;letter-spacing:.06em;margin-bottom:3px}
 .f1-start-action{width:100%;min-height:45px;border:0;border-radius:10px;background:#08733e;color:#fff;font-weight:950;font-size:12px;margin-top:7px;cursor:pointer}.f1-start-action:disabled{opacity:.55}.f1-action-marketing{display:none;width:100%;min-height:43px;border:0;border-radius:10px;background:#c9141f;color:#fff;font-weight:950;font-size:10px;margin:0 0 7px;cursor:pointer}.f1-action-marketing.show{display:block}
 .f1-after{margin-top:7px}.f1-after-title{font-size:8px;font-weight:950;color:#526158;margin-bottom:4px}.f1-after-row{display:grid;grid-template-columns:20px minmax(0,1fr);gap:6px;align-items:center;padding:4px 0;border-top:1px solid #dce9e1}.f1-after-row:first-of-type{border-top:0}.f1-after-row i{width:20px;height:20px;border-radius:999px;background:#eaf8ef;color:#07502d;display:grid;place-items:center;font-style:normal;font-size:8px;font-weight:950}.f1-after-row strong{font-size:9px;display:block}.f1-after-row small{font-size:7px;color:var(--mut);display:block}
 .f1-secondary-tools{border:1px solid var(--line);border-radius:12px;background:#fff;margin-top:6px;overflow:hidden}.f1-secondary-tools>summary{cursor:pointer;list-style:none;padding:9px 10px;font-size:9px;font-weight:950;display:flex;justify-content:space-between;align-items:center}.f1-secondary-tools>summary::-webkit-details-marker{display:none}.f1-secondary-tools>summary:after{content:'⌄';font-size:16px}.f1-secondary-tools[open]>summary:after{content:'⌃'}.f1-secondary-inner{display:grid;gap:6px;padding:0 7px 7px}
 .f1-secondary-inner .f1-acq-panel{box-shadow:none!important;margin:0!important}.f1-secondary-inner .f1-acq-grid2{gap:6px!important}
 @media(max-width:520px){.f1-action-grid{grid-template-columns:1fr}.f1-ai-task .goal{display:none}}
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
 <section class="f1-notiziere-hero">
  <div class="f1-notiziere-today">
   <div><h2>OGGI DEVI OTTENERE</h2><small>Calcolato sul risultato reale e sui giorni operativi rimasti</small></div>
   <button id="f1AcqRefresh" class="f1-acq-btn" type="button">AGGIORNA</button>
  </div>
  <div id="f1AiTargets" class="f1-ai-targets"></div>
  <div class="f1-current-action">
   <div class="f1-action-top"><span id="f1ActionCounter" class="f1-action-counter">AZIONE 1</span><span id="f1ActionKind" class="f1-action-kind">—</span></div>
   <div id="f1ActionPlace" class="f1-action-place">Calcolo prossima azione…</div>
   <button id="f1ActionMarketingPlan" class="f1-action-marketing" type="button">📕 PIANO DI MARKETING · MOSTRA AL CLIENTE</button>
   <div id="f1ActionName" class="f1-action-name"></div>
   <div class="f1-action-grid">
    <div class="f1-action-block"><span>COSA FARE</span><strong id="f1ActionDo">—</strong></div>
    <div class="f1-action-block"><span>COSA DEVI OTTENERE</span><strong id="f1ActionGoal">—</strong></div>
   </div>
   <div id="f1ActionScriptWrap" class="f1-action-script" hidden><b>COSA DIRE</b><span id="f1ActionScript"></span></div>
   <button id="f1StartCurrentAction" class="f1-start-action" type="button">INIZIA QUESTA AZIONE</button>
   <div class="f1-after"><div class="f1-after-title">DOPO</div><div id="f1AiQueue"></div></div>
  </div>
 </section>

 <details class="f1-secondary-tools">
  <summary>DATI E STRUMENTI <span>apri solo se servono</span></summary>
  <div class="f1-secondary-inner">
   <section class="f1-acq-panel">
    <div class="f1-acq-head"><div><h2>🎯 OBIETTIVO 4 INCARICHI / MESE</h2><div class="f1-acq-sub">Dati di controllo, non decisioni da prendere.</div></div><div id="f1AcqMonth" class="ey">—</div></div>
    <div class="f1-acq-grid5">
     <div class="f1-acq-metric"><span>INCARICHI</span><strong id="f1Mmandates">— / 4</strong><div class="f1-acq-progress"><i id="f1Pmandates"></i></div></div>
     <div class="f1-acq-metric"><span>APPUNTAMENTI</span><strong id="f1Mappointments">— / 16</strong><div class="f1-acq-progress"><i id="f1Pappointments"></i></div></div>
     <div class="f1-acq-metric"><span>QUALIFICATI</span><strong id="f1Mqualified">— / 40</strong><div class="f1-acq-progress"><i id="f1Pqualified"></i></div></div>
     <div class="f1-acq-metric"><span>CONVERSAZIONI</span><strong id="f1Mconversations">— / 200</strong><div class="f1-acq-progress"><i id="f1Pconversations"></i></div></div>
     <div class="f1-acq-metric"><span>CONTATTI</span><strong id="f1Mattempts">— / 600</strong><div class="f1-acq-progress"><i id="f1Pattempts"></i></div></div>
    </div>
   </section>
   <div class="f1-acq-grid2">
    <section class="f1-acq-panel">
     <div class="f1-acq-head"><div><h2>📊 RISULTATI DI OGGI</h2></div><div class="ey">OGGI</div></div>
     <div class="f1-acq-grid5">
      <div class="f1-acq-metric"><span>CONTATTI</span><strong id="f1Dcontacts">—</strong></div>
      <div class="f1-acq-metric"><span>CONVERSAZIONI</span><strong id="f1Dconversations">—</strong></div>
      <div class="f1-acq-metric"><span>QUALIFICATI</span><strong id="f1Dqualified">—</strong></div>
      <div class="f1-acq-metric"><span>APPUNTAMENTI</span><strong id="f1Dappointments">—</strong></div>
      <div class="f1-acq-metric"><span>FOLLOW-UP</span><strong id="f1Dfollowups">—</strong></div>
     </div>
    </section>
    <section class="f1-acq-panel"><div class="f1-acq-head"><h2>📈 RITMO 4 INCARICHI</h2></div><div id="f1AcqPace" class="f1-acq-note">Caricamento…</div></section>
   </div>
   <section class="f1-acq-panel">
    <div class="f1-acq-head"><div><h2>📡 SELLER RADAR</h2><div class="f1-acq-sub">Il motore usa questi dati; aprili solo per controllo.</div></div><button id="f1AcqGps" class="f1-acq-btn" type="button">GPS</button></div>
    <div id="f1AcqGeoState" class="f1-acq-sub"></div><div id="f1AcqRadar" class="f1-acq-radar"></div>
   </section>
   <section class="f1-acq-panel">
    <div class="f1-acq-head"><div><h2>📰 NOTIZIE TERRITORIALI</h2></div><button id="f1AcqAddNews" class="f1-acq-btn primary" type="button">+ AGGIUNGI</button></div>
    <div id="f1AcqNewsGrid" class="f1-acq-news-grid"></div><div id="f1AcqNewsList" class="f1-acq-news-list"></div>
   </section>
   <div id="f1AcqNext" hidden></div>
  </div>
 </details>`
 basin.insertAdjacentElement('afterend',wrap);
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
 $('f1StartCurrentAction')?.addEventListener('click',startCurrentAction);
 $('f1ActionMarketingPlan')?.addEventListener('click',openMarketingForCurrentTask);
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
 for(const x of basinRows(crm.conversations||[])){const out=u(x.outcome),st=u(x.status);let score=0,action='',objective='';if(out==='POSSIBILE VENDITA'){score=145;action=txt(x.phone)?'CHIAMA ORA':'COMPLETA IL RECAPITO';objective='FISSA APPUNTAMENTO / VALUTAZIONE'}else if(out==='DA RICONTATTARE'||['RICHIAMO','FOLLOW_UP','DA_RICONTATTARE'].includes(st)){score=138;action=txt(x.phone)?'RICHIAMA ORA':'RECUPERA IL RECAPITO';objective='TRASFORMA IL FOLLOW-UP IN APPUNTAMENTO'}else if(out==='INFORMAZIONE UTILE'){score=128;action=txt(x.phone)?'QUALIFICA IL CONTATTO':'COMPLETA IL RECAPITO';objective='CAPIRE INTENZIONE E DEFINIRE IL PROSSIMO PASSO'}else if(out==='APPUNTAMENTO'){score=118;action='PREPARA E CONFERMA APPUNTAMENTO';objective='PORTA L’APPUNTAMENTO VERSO L’INCARICO'}else continue;if(txt(x.phone))score+=12;const due=x.next_action_at?new Date(x.next_action_at).getTime():NaN;if(Number.isFinite(due)&&due<=now)score+=30;tasks.push({kind:'CRM',id:x.conversation_id||'',score,name:txt(x.person_name||x.target_type)||'CONTATTO CRM',place:[x.comune,x.via,x.civico].filter(Boolean).join(' · '),phone:txt(x.phone),action,objective,source:'CRM',record:x})}
 for(const n of dedupeNews(basinRows(crm.news||[]))){if(u(n.status)==='CHIUSA'||u(n.office_status)==='RISOLTA')continue;const cat=catFor(n)||'NOTIZIA DA CLASSIFICARE';let score=taskCategoryWeight(cat);if(u(n.priority)==='ALTA')score+=18;if(txt(n.phone_normalized))score+=12;const due=n.next_action_at?new Date(n.next_action_at).getTime():NaN;if(Number.isFinite(due)&&due<=now)score+=25;const hasOwner=txt(n.person_name)||['SI','SÌ','CONFERMATO'].includes(u(n.owner_status));let action=txt(n.next_action)||'VERIFICA NOTIZIA',objective='IDENTIFICA PROPRIETARIO E RECAPITO';if(hasOwner&&txt(n.phone_normalized)){action='CHIAMA / QUALIFICA';objective='VERIFICA INTENZIONE E FISSA APPUNTAMENTO'}else if(hasOwner){action='TROVA / COMPLETA RECAPITO';objective='PORTA IL PROPRIETARIO A CONTATTO'}tasks.push({kind:'NEWS',id:n.observation_id||'',score,name:txt(n.person_name)||cat,category:cat,place:[n.comune,n.via,n.civico].filter(Boolean).join(' · '),phone:txt(n.phone_normalized),action,objective,source:'NOTIZIA',record:n})}
 for(const r of basinRows(seller.opportunities||[])){if(!['HOT','WARM'].includes(u(r.lead_status)))continue;let score=u(r.lead_status)==='HOT'?92:62;score+=Math.min(20,Math.round(Number(r.lead_score||0)/5));tasks.push({kind:'SELLER',id:r.id||r.source_url||'',score,name:'ANNUNCIO DA VERIFICARE',place:[r.comune,r.via,r.civico].filter(Boolean).join(' · '),action:'VERIFICA CHI STA PUBBLICANDO',objective:'CAPIRE SE È UN PRIVATO; SE SÌ, CREA IL CONTATTO',sourceUrl:r.source_url||'',source:'FONTE ONLINE',record:r})}
 tasks.sort((a,b)=>b.score-a.score);if(!tasks.length)tasks.push({kind:'TERRITORY',score:10,name:'GIRO TERRITORIALE',place:BASIN_LABEL,action:'APRI IL NOTIZIERE E LAVORA LA ZONA ASSEGNATA',objective:'GENERA NUOVE NOTIZIE E CONVERSAZIONI',source:'F1 TERRITORY'});
 return {basin:BASIN_LABEL,snapshot:snap,tasks};
}
function scriptForTask(t){
 if(!t)return'';
 if(t.kind==='CRM'){
  if(/RICHIAM/i.test(t.action||''))return'Buongiorno, la ricontatto come concordato. Vorrei capire se possiamo fissare un momento per approfondire la situazione dell’immobile.';
  if(/APPUNTAMENTO/i.test(t.objective||''))return'Buongiorno, la contatto per proseguire il confronto sull’immobile. Possiamo fissare un momento preciso per vederci e verificare i dati?';
 }
 const cat=u(t.category||'');
 if(cat==='RICHIESTA VALORE CASA')return'Buongiorno, la contatto in merito alla richiesta sul valore dell’immobile. Possiamo verificare insieme i dati e fissare un momento per una valutazione più precisa?';
 if(cat==='CARTELLO PRIVATO')return'Buongiorno, ho visto il cartello relativo all’immobile. Sto verificando direttamente le informazioni: è lei la persona corretta con cui parlare?';
 if(cat==='TRASFERIMENTO')return'Buongiorno, sto verificando alcune informazioni immobiliari della zona. Posso chiederle se il trasferimento comporta anche una decisione sull’immobile?';
 if(cat==='SUCCESSIONE')return'Buongiorno, sto verificando un’informazione relativa a questo immobile. Posso sapere chi è la persona corretta con cui parlare della proprietà?';
 if(cat==='APPARTAMENTO VUOTO')return'Buongiorno, sto verificando un’informazione relativa a questo immobile. Sa indicarmi chi è la persona corretta con cui parlare?';
 if(cat==='VECCHIO INCARICO SCADUTO')return'Buongiorno, sto verificando la situazione attuale dell’immobile. È ancora in vendita oppure la situazione è cambiata?';
 if(t.kind==='TERRITORY')return'Buongiorno, F1 Immobiliare. Sto lavorando specificamente questa zona. Sa se qualcuno qui vicino sta pensando di vendere nei prossimi mesi?';
 return'';
}
function taskKindLabel(t){if(!t)return'—';if(t.kind==='NEWS')return t.category||'NOTIZIA DA VERIFICARE';if(t.kind==='SELLER')return'FONTE DA VERIFICARE';if(t.kind==='CRM')return'CONTATTO / FOLLOW-UP';return'GIRO TERRITORIALE'}
function taskCivicRecord(t){
 const direct=txt(t?.record?.civic_record_id);
 if(direct){const r=(crm.civics||[]).find(x=>txt(x.civic_record_id)===direct);if(r)return r}
 const rr=t?.record||{},comune=normalizePlace(rr.comune||t?.comune),via=normalizePlace(rr.via||t?.via),civico=txt(rr.civico||t?.civico);
 if(!comune&&!via&&!civico)return null;
 return (crm.civics||[]).find(x=>normalizePlace(x.comune)===comune&&normalizePlace(x.via)===via&&txt(x.civico)===civico)||null;
}
function marketingContextForTask(t){
 const r=taskCivicRecord(t);if(!r)return null;
 const same=x=>txt(x?.civic_record_id)===txt(r.civic_record_id)||(normalizePlace(x?.comune)===normalizePlace(r.comune)&&normalizePlace(x?.via)===normalizePlace(r.via)&&txt(x?.civico)===txt(r.civico));
 const news=(crm.news||[]).filter(same),conversations=(crm.conversations||[]).filter(same),notes=(crm.notes||[]).filter(same),letters=(crm.letters||[]).filter(same);
 const market=news.find(n=>n.market_publisher||n.market_price||n.market_agency||n.market_time_on_market)||null,fsbo=news.find(n=>u(n.market_publisher)==='PRIVATO')||null;
 return {record:r,news,conversations,notes,letters,market,fsbo};
}
function openMarketingForCurrentTask(){
 const t=(lastOperationalPlan||operationalPlan()).tasks?.[0];if(!t)return;
 const context=marketingContextForTask(t);
 if(!context){alert('SCHEDA IMMOBILE NON ANCORA DISPONIBILE PER QUESTA AZIONE.');return}
 if(!window.F1PropertyMarketingPlan?.open){alert('PIANO DI MARKETING NON ANCORA PRONTO. RICARICA LA PAGINA.');return}
 window.F1PropertyMarketingPlan.open(context);
}
function startCurrentAction(){
 const p=lastOperationalPlan||operationalPlan(),t=p?.tasks?.[0];if(!t)return;
 if(window.F1GuidedAction?.open){window.F1GuidedAction.open(t);return}
 if(t.kind==='NEWS'&&t.id&&window.F1TerritoryOpenNews){window.F1TerritoryOpenNews(t.id);return}
 if(t.kind==='SELLER'&&t.sourceUrl){window.open(t.sourceUrl,'_blank','noopener');return}
 if(t.kind==='CRM'&&t.phone){location.href='tel:'+t.phone.replace(/\s+/g,'');return}
 if(t.kind==='CRM'){window.F1TerritoryShow?.('crm');document.querySelector('.topnav[data-screen="crm"]')?.click();return}
 window.F1TerritoryShow?.('terr');document.querySelector('.topnav[data-screen="terr"]')?.click();
}
function renderAIDirective(){
 const p=operationalPlan(),d=p.snapshot.daily,t=p.tasks[0];lastOperationalPlan=p;
 const targets=$('f1AiTargets'),queue=$('f1AiQueue');
 if(targets)targets.innerHTML=[['CONVERSAZIONI',d.conversations],['QUALIFICATI',d.qualified],['APPUNTAMENTI',d.appointments]].map(x=>'<div class="f1-ai-target"><span>'+x[0]+'</span><strong>'+x[1]+'</strong><span>oggi</span></div>').join('');
 if(!t)return;
 if($('f1ActionCounter'))$('f1ActionCounter').textContent='AZIONE 1 DI '+p.tasks.length;
 if($('f1ActionKind'))$('f1ActionKind').textContent=taskKindLabel(t);
 if($('f1ActionPlace'))$('f1ActionPlace').textContent=t.place||BASIN_LABEL;
 const mkt=$('f1ActionMarketingPlan');if(mkt)mkt.classList.toggle('show',!!taskCivicRecord(t)&&(t.kind==='CRM'||t.kind==='NEWS'));
 if($('f1ActionName'))$('f1ActionName').textContent=t.name||'';
 if($('f1ActionDo'))$('f1ActionDo').textContent=t.action||'VERIFICA';
 if($('f1ActionGoal'))$('f1ActionGoal').textContent=t.objective||'REGISTRA UN ESITO UTILE';
 const script=scriptForTask(t),sw=$('f1ActionScriptWrap');if(sw){sw.hidden=!script;if($('f1ActionScript'))$('f1ActionScript').textContent=script}
 const btn=$('f1StartCurrentAction');if(btn){btn.disabled=false;btn.textContent=t.kind==='SELLER'?'APRI E VERIFICA LA FONTE':t.kind==='CRM'&&t.phone?'CHIAMA ORA':'INIZIA QUESTA AZIONE'}
 if(queue)queue.innerHTML=p.tasks.slice(1,3).map((x,i)=>'<div class="f1-after-row"><i>'+(i+2)+'</i><div><strong>'+esc(x.place||x.name||BASIN_LABEL)+'</strong><small>'+esc(x.action)+'</small></div></div>').join('')||'<div class="f1-acq-sub">Nessuna seconda azione: completa quella attuale e F1 ricalcolerà.</div>';
}
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
function renderNextAction(){const box=$('f1AcqNext');if(!box)return;const t=(lastOperationalPlan||operationalPlan()).tasks[0];box.textContent=t?[t.place,t.action,t.objective].filter(Boolean).join(' · '):'';}
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