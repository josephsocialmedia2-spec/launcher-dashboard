(function(){
'use strict';

let DASH={tasks:[],leads:[],feed:{summary:{}},cfg:null,cloud:false,hotNews:[],sellerRadar:[]};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const up=v=>String(v||'').trim().toUpperCase();
const clean=v=>String(v||'').trim();
function openTask(t){return !['DONE','CANCELLED'].includes(up(t.status||'OPEN'))}
function taskCore(t){return up(t.core_category||t.metadata?.core_category||'')}
function leadHay(l){return [l.source_type,l.source,l.lead_reason,l.status,l.notes].join(' ').toUpperCase()}
function countStatus(leads,re){return leads.filter(l=>re.test(up(l.status||l.outcome||''))).length}
function setText(id,value){const el=$(id);if(el)el.textContent=value}
function safeUrl(url){try{const u=new URL(String(url||''),location.href);return ['http:','https:'].includes(u.protocol)?u.href:''}catch(_){return''}}
function actionHref(t){const type=up(t.task_type);if(type==='CALL')return'telefonate-oggi.html';if(type==='FIELD')return'ricerca-territoriale.html';if(['FOLLOW_UP','REFERRAL'].includes(type))return'crm.html';if(type==='CAMPAIGN')return'organizer-lunedi.html';return safeUrl(t.source_url)||'seller-radar-unico.html'}
function actionLabel(t){const type=up(t.task_type);return type==='CALL'?'APRI TELEFONATE':type==='FIELD'?'APRI TERRITORIO':type==='FOLLOW_UP'?'APRI CRM':type==='REFERRAL'?'APRI CRM':type==='CAMPAIGN'?'APRI CAMPAGNA':'VERIFICA'}
function dueDateValue(v){return String(v||'').slice(0,10)}
function statusFromOutcome(value){const v=up(value);if(v==='APPUNTAMENTO')return'APPUNTAMENTO';if(v==='NON_INTERESSATO')return'NON_INTERESSATO';return''}
function interactionType(task){const t=up(task?.task_type);if(t==='CALL')return'CALL';if(t==='FIELD')return'FIELD';if(t==='FOLLOW_UP')return'FOLLOW_UP';return'NOTE'}
function taskLead(t){return DASH.leads.find(l=>String(l.lead_id||'')===String(t.lead_id||''))||null}
function isDailySellerTask(t){return up(t.origin||t.metadata?.origin||'')==='DAILY_SELLER_50'}
function dedupeDisplayTasks(rows){
  const map=new Map();
  for(const t of rows){
    const key=isDailySellerTask(t)&&t.lead_id?'DAILY_SELLER_50|'+String(t.lead_id):'TASK|'+String(t.task_id||F1AcquisitionCore.taskIdentity(t));
    const old=map.get(key);
    if(!old){map.set(key,t);continue}
    const a=[Number(t.priority)||0,String(t.due_date||''),String(t.updated_at||t.created_at||'')];
    const b=[Number(old.priority)||0,String(old.due_date||''),String(old.updated_at||old.created_at||'')];
    if(a[0]>b[0]||(a[0]===b[0]&&(a[1]>b[1]||(a[1]===b[1]&&a[2]>b[2]))))map.set(key,t);
  }
  return [...map.values()];
}
function taskTitle(t,lead){
  if(isDailySellerTask(t)){
    const name=[lead?.nome,lead?.cognome].filter(Boolean).join(' ').trim();
    return name?('CHIAMA '+name):'CONTATTO SELLER DA LAVORARE';
  }
  return t.reason||t.lead_reason||lead?.lead_reason||'Task da lavorare';
}
function taskWhy(t,lead){
  if(isDailySellerTask(t))return t.selection_reason||t.lead_reason||lead?.lead_reason||'Segnale immobiliare da approfondire';
  return t.lead_reason||lead?.lead_reason||t.reason||'Segnale da verificare';
}
function taskDetail(t){
  return clean(t.call_reason_detail||t.signal_text||t.trigger_note||'');
}

function isHotCompany(a){
  if(!a||a.do_not_contact||up(a.processing_status)==='ESCLUSA_TERRITORIO')return false;
  const state=up(a.stato);
  const hotState=/^(INTERESSATA|APPUNTAMENTO|PROPOSTA_INVIATA|IN_TRATTATIVA|CLIENTE|EMAIL_INVIATA|DA_RICONTATTARE)$/;
  return hotState.test(state)||clean(a.interesse).length>0;
}
function hotPriority(a){
  const state=up(a.stato);
  if(state==='APPUNTAMENTO'||state==='IN_TRATTATIVA'||state==='PROPOSTA_INVIATA')return 100;
  if(state==='INTERESSATA'||state==='CLIENTE')return 95;
  if(state==='EMAIL_INVIATA')return 88;
  if(state==='DA_RICONTATTARE')return 82;
  return clean(a.interesse)?78:60;
}
async function loadHotNews(){
  if(!DASH.cloud)return[];
  const companyFields='id,ragione_sociale,comune,telefono,cellulare,email,stato,interesse,note,ultima_interazione,prossima_azione,data_prossima_azione,processing_status,do_not_contact,updated_at';
  const interactionFields='azienda_id,interaction_type,direction,occurred_at,outcome,note,next_action,next_action_date';
  const [companies,interactions]=await Promise.all([
    F1AcquisitionData.rest('aziende?select='+companyFields+'&order=updated_at.desc&limit=100').catch(()=>[]),
    F1AcquisitionData.rest('azienda_interactions?select='+interactionFields+'&order=occurred_at.desc&limit=150').catch(()=>[])
  ]);
  const latest=new Map();
  for(const i of interactions||[])if(!latest.has(String(i.azienda_id)))latest.set(String(i.azienda_id),i);
  const companyHot=(companies||[]).filter(isHotCompany).map(a=>({...a,_kind:'AZIENDA',_interaction:latest.get(String(a.id))||null,_priority:hotPriority(a)}));
  const leadHot=(DASH.leads||[]).filter(l=>{
    if(l.do_not_contact)return false;
    const s=up(l.status);
    return /INTERESSAT|APPUNTAMENTO|VALUTAZIONE|INCARICO|TRATTATIVA|RICHIAM|PROPOSTA/.test(s);
  }).map(l=>({...l,_kind:'LEAD',_priority:/APPUNTAMENTO|INCARICO|TRATTATIVA/.test(up(l.status))?96:84}));
  return [...companyHot,...leadHot].sort((a,b)=>(b._priority||0)-(a._priority||0)||String(b.updated_at||b.last_seen||'').localeCompare(String(a.updated_at||a.last_seen||''))).slice(0,20);
}
function hotNewsLabel(x){
  if(x._kind==='LEAD')return [x.nome,x.cognome].filter(Boolean).join(' ')||x.azienda||'Lead caldo';
  return x.ragione_sociale||'Azienda';
}
function hotNewsStatus(x){return x._kind==='LEAD'?(x.status||'LEAD'):(x.stato||'AZIENDA')}
function hotNewsReason(x){
  if(x._kind==='LEAD')return x.lead_reason||x.notes||'Contatto da seguire con priorità.';
  const i=x._interaction;
  return x.interesse||i?.note||x.note||'Contatto commerciale da seguire.';
}
function hotNewsNext(x){
  if(x._kind==='LEAD')return [x.next_action,x.next_action_date].filter(Boolean).join(' · ');
  const i=x._interaction;
  const next=x.prossima_azione||i?.next_action||'';
  const date=x.data_prossima_azione||i?.next_action_date||'';
  return [next,date].filter(Boolean).join(' · ');
}
function renderHotNews(){
  const rows=DASH.hotNews||[];
  setText('hotNewsCount',rows.length);
  const nav=document.querySelector('[data-hot-news-nav="1"] span');
  if(nav)nav.textContent=rows.length?'Notizie calde · '+rows.length:'Notizie calde';
  const box=$('hotNewsList');if(!box)return;
  if(!DASH.cloud){box.innerHTML='<div class="empty">Accedi al Cloud F1 per visualizzare le notizie calde.</div>';return}
  if(!rows.length){box.innerHTML='<div class="empty">Nessuna notizia calda aperta in questo momento.</div>';return}
  box.innerHTML=rows.map(x=>{
    const title=hotNewsLabel(x),status=hotNewsStatus(x),reason=hotNewsReason(x),next=hotNewsNext(x);
    const comune=x.comune||'',phone=x.telefono||x.cellulare||'',email=x.email||'';
    const urgent=(x._priority||0)>=90;
    const crm=x._kind==='AZIENDA'?'crm.html#aziende':'crm.html#contatti';
    return `<article class="hot-news-card ${urgent?'is-urgent':''}">
      <div class="hot-news-card-top"><div><div class="hot-news-title">${esc(title)}</div><div class="hot-news-meta">${esc([comune,status].filter(Boolean).join(' · '))}</div></div><span class="badge gold">${urgent?'MOLTO CALDA':'CALDA'}</span></div>
      <div class="hot-news-reason">${esc(reason).slice(0,520)}</div>
      ${next?`<div class="hot-news-next"><b>PROSSIMA AZIONE:</b> ${esc(next)}</div>`:''}
      <div class="hot-news-actions"><a class="btn" href="${crm}">APRI CRM</a>${phone?`<a class="btn alt" href="tel:${esc(phone.replace(/[^+\d]/g,''))}">CHIAMA</a>`:''}${email?`<a class="btn alt" href="mailto:${esc(email)}">EMAIL</a>`:''}</div>
    </article>`;
  }).join('');
}


const FRANCY_PHONE='393714246300';
const FRANCY_STORE_KEY='f1FrancySchedulesV1';
const FRANCY_REQUEST_MESSAGE="Ciao Francy, mi mandi per favore l'ORARIO di lavoro della prossima settimana? Scrivilo indicando i giorni e le fasce, per esempio: lun 9-13, mar 14-20, mer riposo. Grazie.";
const FRANCY_DAYS=[
  {key:'lun',label:'LUN',name:'Lunedì',aliases:['lunedi','lunedì','lun']},
  {key:'mar',label:'MAR',name:'Martedì',aliases:['martedi','martedì','mar']},
  {key:'mer',label:'MER',name:'Mercoledì',aliases:['mercoledi','mercoledì','mer']},
  {key:'gio',label:'GIO',name:'Giovedì',aliases:['giovedi','giovedì','gio']},
  {key:'ven',label:'VEN',name:'Venerdì',aliases:['venerdi','venerdì','ven']},
  {key:'sab',label:'SAB',name:'Sabato',aliases:['sabato','sab']},
  {key:'dom',label:'DOM',name:'Domenica',aliases:['domenica','dom']}
];
function francyNorm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function francyPad(n){return String(n).padStart(2,'0')}
function francyDateIso(d){return d.getFullYear()+'-'+francyPad(d.getMonth()+1)+'-'+francyPad(d.getDate())}
function francyRomeToday(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const v={};for(const p of parts)if(p.type!=='literal')v[p.type]=p.value;
  return new Date(Number(v.year),Number(v.month)-1,Number(v.day),12,0,0);
}
function francyTargetWeekStart(){
  const d=francyRomeToday(),dow=d.getDay();
  const delta=dow===0?1:1-dow;
  const m=new Date(d);m.setDate(d.getDate()+delta);return m;
}
function francyReadStore(){try{const v=JSON.parse(localStorage.getItem(FRANCY_STORE_KEY)||'{}');return v&&typeof v==='object'?v:{}}catch(_){return{}}}
function francyWriteStore(v){localStorage.setItem(FRANCY_STORE_KEY,JSON.stringify(v))}
function francyTimeToMin(h,m){return Number(h)*60+Number(m||0)}
function francyFmtMin(n){n=Math.max(0,Math.min(1440,n));return francyPad(Math.floor(n/60)%24)+':'+francyPad(n%60)}
function francyFreeFromWork(ranges,isRest){
  const agencyStart=8*60,agencyEnd=20*60;
  if(isRest)return[francyFmtMin(agencyStart)+'–'+francyFmtMin(agencyEnd)];
  if(!ranges.length)return[];
  const clipped=ranges
    .map(r=>[Math.max(agencyStart,r[0]),Math.min(agencyEnd,r[1])])
    .filter(r=>r[1]>r[0])
    .sort((a,b)=>a[0]-b[0]);
  if(!clipped.length)return[francyFmtMin(agencyStart)+'–'+francyFmtMin(agencyEnd)];
  const merged=[];
  for(const r of clipped){
    if(!merged.length||r[0]>merged[merged.length-1][1])merged.push(r.slice());
    else merged[merged.length-1][1]=Math.max(merged[merged.length-1][1],r[1]);
  }
  const out=[];
  if(merged[0][0]>agencyStart)out.push(francyFmtMin(agencyStart)+'–'+francyFmtMin(merged[0][0]));
  for(let i=0;i<merged.length-1;i++)if(merged[i][1]<merged[i+1][0])out.push(francyFmtMin(merged[i][1])+'–'+francyFmtMin(merged[i+1][0]));
  if(merged[merged.length-1][1]<agencyEnd)out.push(francyFmtMin(merged[merged.length-1][1])+'–'+francyFmtMin(agencyEnd));
  return out;
}
function francyExtractRanges(segment){
  let work=String(segment||'').replace(/\s+/g,' ').trim();
  const ranges=[];
  const add=(a,b)=>{
    a=Number(a);b=Number(b);
    if(Number.isFinite(a)&&Number.isFinite(b)&&b>a&&a>=0&&b<=24)ranges.push([a*60,b*60]);
  };

  // Formati espliciti: 8-13, 08:00-13:00, 8 alle 13.
  work=work.replace(/\b([01]?\d|2[0-3])(?:[:.]([0-5]\d))?\s*(?:-|–|—|\/|alle|a)\s*([01]?\d|2[0-3])(?:[:.]([0-5]\d))?\b/g,(all,h1,m1,h2,m2)=>{
    const a=francyTimeToMin(h1,m1||0),b=francyTimeToMin(h2,m2||0);
    if(b>a)ranges.push([a,b]);
    return ' ';
  });

  // Formato rapido usato da Francy: 8.13 = dalle 8 alle 13.
  // Non interpreta 8.00 come intervallo: quello resta una singola ora.
  work=work.replace(/\b([01]?\d|2[0-3])\.([01]?\d|2[0-3])\b/g,(all,h1,h2)=>{
    const a=Number(h1),b=Number(h2);
    if(h2!=='00'&&b>a){add(a,b);return ' '}
    return all;
  });

  // Ore rimaste in coppia: "14.00 20.00" => 14:00–20:00.
  const times=[];
  const re=/\b([01]?\d|2[0-3])(?:[:.]([0-5]\d))?\b/g;
  let m;
  while((m=re.exec(work))){
    const hour=Number(m[1]),minute=Number(m[2]||0);
    times.push(francyTimeToMin(hour,minute));
  }
  for(let i=0;i+1<times.length;i+=2){
    if(times[i+1]>times[i])ranges.push([times[i],times[i+1]]);
  }
  return ranges.sort((a,b)=>a[0]-b[0]);
}
function francyParseSchedule(text){
  const raw=String(text||'').trim(),norm=francyNorm(raw);
  if(!/\borario\b/.test(norm))throw new Error('Il messaggio deve contenere la parola ORARIO.');
  const found=[];
  for(let i=0;i<FRANCY_DAYS.length;i++){
    const d=FRANCY_DAYS[i],aliases=d.aliases.map(francyNorm);
    let pos=-1,matched='';
    for(const a of aliases){const re=new RegExp('\\b'+a+'\\b','i'),m=norm.match(re);if(m&&m.index!==undefined&&(pos<0||m.index<pos)){pos=m.index;matched=a}}
    if(pos<0)continue;
    let end=norm.length;
    for(const od of FRANCY_DAYS){
      for(const oa of od.aliases.map(francyNorm)){
        const re=new RegExp('\\b'+oa+'\\b','ig');let m;
        while((m=re.exec(norm))){if(m.index>pos&&m.index<end)end=m.index}
      }
    }
    const seg=norm.slice(pos+matched.length,end);
    const isRest=/\b(riposo|libera|libero|off|non lavoro|non lavora)\b/.test(seg);
    const ranges=isRest?[]:francyExtractRanges(seg);
    found.push({day:d.key,label:d.label,name:d.name,isRest,work:ranges,free:francyFreeFromWork(ranges,isRest)});
  }
  if(!found.length)throw new Error('Non riconosco giorni della settimana nel messaggio.');
  const incomplete=found.filter(x=>!x.isRest&&!x.work.length);
  if(incomplete.length)throw new Error('Non riesco a leggere l’orario di: '+incomplete.map(x=>x.name).join(', ')+'. Usa coppie come 8.00 13.00 oppure 8-13.');
  return found;
}
function renderFrancyCalendar(){
  const grid=$('francyWeekGrid');if(!grid)return;
  const week=francyTargetWeekStart(),weekKey=francyDateIso(week),store=francyReadStore(),data=store[weekKey]||null;
  const end=new Date(week);end.setDate(end.getDate()+6);
  const fmt=new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'2-digit'});
  setText('francyWeekLabel','Settimana '+fmt.format(week)+' – '+fmt.format(end));
  const wa=$('francyWhatsAppLink');if(wa)wa.href='https://wa.me/'+FRANCY_PHONE+'?text='+encodeURIComponent(FRANCY_REQUEST_MESSAGE);
  const today=francyRomeToday(),isSunday=today.getDay()===0;
  if($('francySundayAlert'))$('francySundayAlert').hidden=!isSunday;
  const byDay=new Map((data?.days||[]).map(x=>[x.day,x]));
  grid.innerHTML=FRANCY_DAYS.map((d,i)=>{
    const date=new Date(week);date.setDate(week.getDate()+i);
    const row=byDay.get(d.key);
    const free=row?.free||[];
    const body=!row?'<span class="francy-unknown">ORARIO NON COMUNICATO</span>':
      (!free.length?'<span class="francy-none">NESSUNA FASCIA LIBERA RILEVATA</span>':
      free.map(x=>'<span class="francy-free-slot">'+esc(x)+'</span>').join(''));
    return '<div class="francy-day '+(row?'has-data':'')+'"><div class="francy-day-head"><b>'+d.label+'</b><small>'+fmt.format(date)+'</small></div><div class="francy-day-free">'+body+'</div></div>';
  }).join('');
  if($('francyParseStatus'))$('francyParseStatus').textContent=data?'Ultimo orario salvato per questa settimana.':'Nessun orario salvato per questa settimana.';
}
function saveFrancyScheduleFromText(){
  const status=$('francyParseStatus');
  try{
    const text=$('francyScheduleText').value,days=francyParseSchedule(text),weekKey=francyDateIso(francyTargetWeekStart()),store=francyReadStore();
    store[weekKey]={raw:text,days,savedAt:new Date().toISOString()};
    francyWriteStore(store);if(status)status.textContent='Orario letto e calendario aggiornato.';renderFrancyCalendar();
  }catch(e){if(status)status.textContent=String(e?.message||e)}
}
function clearFrancySchedule(){
  const weekKey=francyDateIso(francyTargetWeekStart()),store=francyReadStore();delete store[weekKey];francyWriteStore(store);
  if($('francyScheduleText'))$('francyScheduleText').value='';renderFrancyCalendar();
}
function bindFrancyCalendar(){
  $('francyToggleImport')?.addEventListener('click',()=>{const box=$('francyImport');box.hidden=!box.hidden;if(!box.hidden)$('francyScheduleText')?.focus()});
  $('francyParseSave')?.addEventListener('click',saveFrancyScheduleFromText);
  $('francyClearSchedule')?.addEventListener('click',clearFrancySchedule);
  renderFrancyCalendar();
}


function sellerHay(t){return up([
  t?.origin,t?.metadata?.origin,t?.reason,t?.lead_reason,t?.event_type,t?.task_type,
  t?.core_category,t?.metadata?.core_category,t?.market_category,t?.seller_signal,
  t?.source,t?.source_url,t?.contact_source_url,t?.linked_property_source
].join(' '))}
function isSyntheticSellerContact(t){
  const h=sellerHay(t),u=String(t?.source_url||t?.contact_source_url||'').toLowerCase();
  return isDailySellerTask(t)
    || /CONTATTO SELLER DA LAVORARE/.test(h)
    || /PAGINEBIANCHE|PAGINE BIANCHE|PAGINEGIALLE|PAGINE GIALLE/.test(h)
    || /paginebianche\.it|paginegialle\.it/.test(u)
    || (/POSSIBILE VENDITORE/.test(h)&&/IMMOBILE\/I IN VENDITA NELLA STESSA VIA|STESSA VIA/.test(h));
}
function isSellerRadarProperty(t){
  if(!t||isSyntheticSellerContact(t))return false;
  const h=sellerHay(t),type=up(t.task_type),pillar=Number(t.pillar)||0;
  const hasProperty=!!clean(t.immobile||t.via||t.property_id||t.linked_property_url||t.source_url);
  const market=/MARKET_LISTING|COMPETITOR_LISTING|FSBO|EXPIRED|PROPERTY_|POSSIBILE_SCADUTO|SCADUT|RIBASS|CAMBIO AGENZIA|RELIST|ANNUNCIO/.test(h);
  return hasProperty && (pillar===1 || market || ['VERIFY','MONITOR'].includes(type));
}
function isSellerRadarOperationalNoise(t){
  return isSyntheticSellerContact(t)||isSellerRadarProperty(t);
}
function cleanOperationalTasks(){
  return (DASH.tasks||[]).filter(t=>!isSellerRadarOperationalNoise(t));
}
function sellerRadarKey(t){
  const u=clean(t.source_url||t.linked_property_url);
  if(u)return u.toLowerCase();
  return [up(t.comune),up(t.via),up(t.civico),up(t.immobile)].join('|');
}
function buildSellerRadarResults(rows){
  const map=new Map();
  for(const t of rows||[]){
    if(!isSellerRadarProperty(t))continue;
    const key=sellerRadarKey(t);if(!key)continue;
    const old=map.get(key);
    if(!old || (Number(t.priority)||0)>(Number(old.priority)||0))map.set(key,t);
  }
  return [...map.values()].sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0)||String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||'')));
}
function sellerPrice(v){
  const n=Number(String(v||'').replace(/[^0-9]/g,''));
  return n?new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n):'';
}
function sellerTitle(t){
  return clean(t.immobile)||clean(t.title)||clean(t.tipologia)||clean(t.tipo)||clean(t.via)||'Immobile da verificare';
}
function sellerSignal(t){
  return clean(t.seller_signal)||clean(t.lead_reason)||clean(t.reason)||clean(t.market_category)||'Segnale immobiliare';
}
function renderSellerRadar(){
  const all=DASH.sellerRadar||[],sel=$('sellerRadarComune'),box=$('sellerRadarList');if(!box)return;
  const comuni=[...new Set(all.map(x=>clean(x.comune)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it'));
  if(sel){
    const current=sel.value;
    sel.innerHTML='<option value="">TUTTI I COMUNI</option>'+comuni.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
    if(comuni.includes(current))sel.value=current;
  }
  const comune=sel?.value||'';
  const rows=(comune?all.filter(x=>clean(x.comune)===comune):all).slice(0,12);
  setText('sellerRadarCount',all.length);
  if(!rows.length){box.innerHTML='<div class="empty">Nessun segnale immobiliare Seller Radar disponibile.</div>';return}
  box.innerHTML=rows.map(t=>{
    const src=safeUrl(t.source_url||t.linked_property_url);
    const address=[t.via,t.civico,t.comune].filter(Boolean).join(' · ');
    const price=sellerPrice(t.prezzo||t.price);
    const priority=Number(t.priority)||0;
    const category=clean(t.market_category||t.core_category||t.metadata?.core_category||t.event_type);
    return '<article class="seller-radar-card">'+
      '<div class="seller-radar-card-top"><div><div class="seller-radar-title">'+esc(sellerTitle(t))+'</div>'+
      '<div class="seller-radar-meta">'+esc([address,t.source,category].filter(Boolean).join(' · '))+'</div></div>'+
      '<div class="seller-radar-side">'+(price?'<b>'+esc(price)+'</b>':'')+'<span>PRIORITÀ '+esc(priority)+'</span></div></div>'+
      '<div class="seller-radar-signal"><b>SEGNALE:</b> '+esc(sellerSignal(t))+'</div>'+
      '<div class="seller-radar-actions">'+
      (src?'<a class="btn" href="'+esc(src)+'" target="_blank" rel="noopener">APRI ANNUNCIO</a>':'')+
      '<a class="btn alt" href="seller-radar-unico.html">VEDI NEL RADAR</a>'+
      '</div></article>';
  }).join('');
}

function renderHeader(){
  const territory=DASH.cfg?.territory||{};
  const communes=window.F1AcquisitionCore?.territoryCommunes?.(territory)||[];
  $('today').textContent=new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date());
  $('statusPills').innerHTML=`<span class="pill">CENTRO: ${esc(territory.reference_hub||'—')}</span><span class="pill">${esc(territory.policy||'TERRITORIO')}</span><span class="pill">${communes.length} COMUNI</span><span class="pill ${DASH.cloud?'blue':'gold'}">${DASH.cloud?'● CLOUD CONNESSO':'● FEED PUBBLICO'}</span>`;
}
function renderStats(){
  const open=cleanOperationalTasks().filter(openTask),leads=DASH.leads;
  setText('sNew',(DASH.sellerRadar||[]).length);
  setText('sCall',open.filter(t=>up(t.task_type)==='CALL'&&F1AcquisitionCore.isDue(t)).length);
  setText('sCallback',open.filter(t=>/CALLBACK|RICHIAM/.test(up([t.reason,t.event_type].join(' ')))).length+countStatus(leads,/RICHIAMO|DA_RICONTATTARE/));
  setText('sAppointments',countStatus(leads,/APPUNTAMENTO/));setText('sValuations',countStatus(leads,/VALUTAZIONE/));setText('sListings',countStatus(leads,/INCARICO|ACQUISITO/));
}
function renderCore(){
  const tasks=cleanOperationalTasks().filter(openTask),leads=DASH.leads;
  setText('cPast',tasks.filter(t=>taskCore(t)==='PAST_CLIENT').length+leads.filter(l=>/CLIENTE PASSAT/.test(leadHay(l))).length);
  setText('cCoi',tasks.filter(t=>taskCore(t)==='COI').length+leads.filter(l=>/CENTRO DI INFLUENZA|\bCOI\b/.test(leadHay(l))).length);
  setText('cExpired',tasks.filter(t=>taskCore(t)==='EXPIRED_OR_POSSIBLE_EXPIRED').length+leads.filter(l=>/SCADUT|RITIRAT|NON PIU RILEVAT|CAMBIO AGENZIA/.test(leadHay(l))).length);
  setText('cFsbo',tasks.filter(t=>taskCore(t)==='FSBO').length+leads.filter(l=>/FSBO|PRIVAT|NO AGENZI/.test(leadHay(l))).length);
}
function renderPillars(){
  const engine=DASH.cfg?.engine||{},open=cleanOperationalTasks().filter(openTask);
  $('pillarCards').innerHTML=(engine.pillars||[]).map(p=>{let n;if(Number(p.id)===5)n=open.filter(t=>taskCore(t)).length;else n=open.filter(t=>Number(t.pillar)===Number(p.id)).length+DASH.leads.filter(l=>Number(l.pillar)===Number(p.id)&&!/SCARTATO|PERSO|NON_INTERESSATO/.test(up(l.status))).length;return `<div class="card"><span class="badge">PILASTRO ${esc(p.id)}</span><div class="n">${n}</div><strong>${esc(p.label)}</strong><div class="small">${esc(p.description)}</div></div>`}).join('');
}
function renderCompetitor(){const s=DASH.feed.summary||{};setText('ciSignals',s.signals||0);setText('ciPrice',s.price_changes||0);setText('ciAgency',s.agency_changes||0);setText('ciExit',(s.possible_expired||0)+(s.relisted||0))}
function renderTerritory(){const t=DASH.cfg?.territory||{};setText('territoryTitle',`Centro ${t.reference_hub||'—'}`);setText('territoryMeta',`${t.description||''} · versione ${t.version||'—'} · ${t.policy||''}`);setText('territoryLeft',(t.sinistra||[]).join(' · '));setText('territoryRight',(t.destra||[]).join(' · '))}
function renderFunnel(){const f=F1AcquisitionCore.funnelFromLeads(DASH.leads);for(const [id,k] of [['fLead','LEAD'],['fContact','CONTATTO'],['fAppointment','APPUNTAMENTO'],['fValuation','VALUTAZIONE'],['fListing','INCARICO'],['fSold','VENDUTO']])setText(id,f[k])}

function renderTasks(){
  const filter=$('taskFilter').value;
  const due=cleanOperationalTasks().filter(t=>openTask(t)&&F1AcquisitionCore.isDue(t)&&(!filter||up(t.task_type)===filter));
  const rows=dedupeDisplayTasks(due).sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0)||String(a.due_date||'').localeCompare(String(b.due_date||''))).slice(0,18);
  if(!rows.length){$('taskList').innerHTML='<div class="empty">Nessun task aperto per questo filtro.</div>';return}
  $('taskList').innerHTML=rows.map(t=>{
    const lead=taskLead(t),target=actionHref(t);
    const src=safeUrl(t.source_url||t.contact_source_url||t.linked_property_url||lead?.source_url);
    const where=[t.comune||lead?.comune,t.via||lead?.via,t.civico||lead?.civico].filter(Boolean).join(' — ');
    const source=t.source||lead?.source||t.linked_property_source||'—';
    const confidence=t.confidence||lead?.confidence||'—';
    const detail=taskDetail(t);
    return `<article class="task" data-task="${esc(t.task_id)}"><div class="taskTop"><div><div class="taskReason">${esc(taskTitle(t,lead))}</div><div class="taskMeta">PILASTRO ${esc(t.pillar)} · ${esc(t.task_type)}${taskCore(t)?' · CORE '+esc(taskCore(t)):''}${where?' · '+esc(where):''}</div></div><div class="score">PRIORITÀ ${esc(t.priority||0)}</div></div><div class="taskWhy"><b>PERCHÉ:</b> ${esc(taskWhy(t,lead))}${detail?'<br>'+esc(detail):''}<br><span class="meta">Fonte: ${esc(source)} · confidenza: ${esc(confidence)}</span></div><div class="actions"><a class="btn" href="${esc(target)}"${/^https?:/.test(target)?' target="_blank" rel="noopener"':''}>${actionLabel(t)}</a>${src?`<a class="btn alt" href="${esc(src)}" target="_blank" rel="noopener">FONTE</a>`:''}<button class="btn gold" type="button" data-outcome="${esc(t.task_id)}">REGISTRA ESITO</button></div></article>`;
  }).join('');
  document.querySelectorAll('[data-outcome]').forEach(b=>b.addEventListener('click',()=>openOutcome(b.dataset.outcome)));
}

function openOutcome(taskId){
  const task=DASH.tasks.find(x=>String(x.task_id)===String(taskId));if(!task)return;
  $('outcomeTaskId').value=taskId;$('outcomeValue').value='';$('outcomeNote').value='';$('outcomeNext').value='';$('outcomeDate').value='';$('outcomeError').textContent='';
  const dlg=$('outcomeDialog');if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');
}
function closeOutcome(){const dlg=$('outcomeDialog');if(typeof dlg.close==='function')dlg.close();else dlg.removeAttribute('open')}
async function saveOutcome(ev){
  ev.preventDefault();
  const taskId=$('outcomeTaskId').value,task=DASH.tasks.find(x=>String(x.task_id)===String(taskId));if(!task)return;
  const outcome=up($('outcomeValue').value),note=clean($('outcomeNote').value),nextAction=clean($('outcomeNext').value),date=dueDateValue($('outcomeDate').value),closed=['CHIUSO','NON_INTERESSATO'].includes(outcome);
  const err=$('outcomeError');err.textContent='';
  if(!outcome||!note){err.textContent='Indica esito e che cosa è successo.';return}
  if(!closed&&!nextAction){err.textContent='Indica cosa succede dopo.';return}
  if(nextAction&&!date){err.textContent='Per una prossima azione serve una data.';return}
  if(!DASH.cloud){err.textContent='Accedi al Cloud F1 per registrare un esito operativo.';return}
  const btn=$('outcomeSave');btn.disabled=true;btn.textContent='SALVATAGGIO…';
  try{
    const nextIso=date?date+'T09:00:00Z':'';
    if(task.lead_id){
      await F1AcquisitionData.recordOutcome({leadId:task.lead_id,propertyId:task.property_id||'',taskId:task.task_id,interactionType:interactionType(task),direction:'OUTBOUND',outcome,note,status:statusFromOutcome(outcome),nextAction,nextActionDate:nextIso});
    }else{
      await F1AcquisitionData.setTaskStatus(task.task_id,'DONE',outcome);
      if(nextIso&&nextAction)await F1AcquisitionData.upsertTask({...task,task_id:crypto.randomUUID(),task_type:'FOLLOW_UP',reason:nextAction,due_date:nextIso,status:'OPEN',completed_at:null,outcome:'',metadata:{...(task.metadata||{}),origin:'F1_OS_OUTCOME',previous_task_id:task.task_id}});
    }
    DASH.tasks=DASH.tasks.map(x=>String(x.task_id)===String(task.task_id)?{...x,status:'DONE',outcome}:x);
    closeOutcome();renderTasks();renderStats();
  }catch(e){err.textContent=String(e?.message||e)}finally{btn.disabled=false;btn.textContent='SALVA ESITO'}
}

async function renderRelationsDue(){
  if(!DASH.cloud){$('relationsDue').innerHTML='<div class="empty">Accedi al Cloud F1 per visualizzare i follow-up relazionali.</div>';return}
  try{
    const today=F1AcquisitionCore.todayRome();
    const q='network_contacts?deleted=eq.false&app_scope=eq.albero_fonti_notizie&data_prossimo_contatto=lte.'+encodeURIComponent(today)+'&select=contact_id,legacy_id,nome,cognome,comune,stato_contatto,azione_successiva,data_prossimo_contatto,tipo_rapporto,tree_meta&order=data_prossimo_contatto.asc&limit=30';
    const rows=await F1AcquisitionData.rest(q)||[];
    if(!rows.length){$('relationsDue').innerHTML='<div class="empty">Nessun follow-up relazionale scaduto o previsto oggi.</div>';return}
    $('relationsDue').innerHTML=rows.map(r=>{
      const tm=r.tree_meta&&typeof r.tree_meta==='object'?r.tree_meta:{},name=[r.nome,r.cognome].filter(Boolean).join(' ')||'Persona',rel=(r.tipo_rapporto||[]).join(', '),channel=tm.authorized_channel||'',after=r.azione_successiva||'Definire prossimo passo';
      return `<div class="relation-due"><div><strong>${esc(name)}</strong><small>${esc([r.comune,rel,r.stato_contatto].filter(Boolean).join(' · '))}</small><small><b>DOPO:</b> ${esc(after)} · ${esc(r.data_prossimo_contatto||'')}</small>${channel?`<span class="badge">${esc(channel)}</span>`:''}</div><a class="btn alt" href="albero-fonti-notizie.html">APRI RELAZIONE</a></div>`;
    }).join('');
  }catch(e){$('relationsDue').innerHTML=`<div class="empty">Rete relazionale non disponibile: ${esc(e?.message||e)}</div>`}
}

function renderAll(){renderHeader();renderHotNews();renderSellerRadar();renderStats();renderCore();renderPillars();renderCompetitor();renderTerritory();renderFunnel();renderTasks()}
async function load(){
  try{
    const data=await F1AcquisitionData.loadDashboardData();
    DASH={...data,hotNews:[],sellerRadar:buildSellerRadarResults(data.feed?.tasks||[])};
    DASH.hotNews=await loadHotNews();
    renderAll();await renderRelationsDue();
  }catch(e){$('taskList').innerHTML=`<div class="empty">Command Center non inizializzato: ${esc(e?.message||e)}</div>`}
}

function bind(){
  $('taskFilter')?.addEventListener('change',renderTasks);$('sellerRadarComune')?.addEventListener('change',renderSellerRadar);$('refreshBtn')?.addEventListener('click',load);$('outcomeForm')?.addEventListener('submit',saveOutcome);$('outcomeCancel')?.addEventListener('click',closeOutcome);
  let installPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installBtn').hidden=false});$('installBtn')?.addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installBtn').hidden=true});
  window.addEventListener('focus',()=>{if(document.visibilityState==='visible')load()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{bind();bindFrancyCalendar();load()},{once:true});else{bind();bindFrancyCalendar();load()}
})();
