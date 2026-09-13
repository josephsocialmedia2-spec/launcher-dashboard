(()=>{
'use strict';
const root=document.getElementById('program90Widget');if(!root)return;
const $=id=>document.getElementById(id),PROGRAM='F1_90_DAY_PROGRAM',DAY='F1_90_DAY_DAY',NO_APPT_ORIGIN='F1_90_NO_APPOINTMENT_FSBO_EXPIRED';
const dateKey=x=>x?new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(x)):'';
const dayMs=d=>Date.parse(String(d).slice(0,10)+'T12:00:00Z'),days=(a,b)=>Math.floor((dayMs(b)-dayMs(a))/86400000);
const fmt=s=>{s=Math.max(0,Math.floor(+s||0));const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h?`${h}h ${String(m).padStart(2,'0')}m`:`${m}m`};
function load(src,test){if(test())return Promise.resolve();return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(Error('Errore caricamento '+src));document.head.appendChild(s)})}
function elapsed(b){let s=Number(b?.elapsed_seconds)||0;if(b?.started_at)s+=Math.max(0,(Date.now()-Date.parse(b.started_at))/1000);return Math.round(s)}
function goal(n){return n<=10?10:n<=20?15:20}
function openTask(t){return!['DONE','CANCELLED'].includes(String(t?.status||'OPEN').toUpperCase())}
async function boot(){try{
  await load('supabase-config.js?v=20260913-auth2',()=>!!window.F1_SUPABASE);await load('supabase-sync.js?v=20260913-auth2',()=>!!window.F1Sync);await load('f1-acquisition-core.js',()=>!!window.F1AcquisitionCore);await load('f1-acquisition-data.js?v=20260913-auth2',()=>!!window.F1AcquisitionData);
  if(!F1Sync.ready()||!await F1Sync.ensureSession()){$('p90Stage').textContent='ACCESSO CRM RICHIESTO';return}
  const today=F1AcquisitionCore.todayRome(),[campaigns,events,interactions,tasks,leads]=await Promise.all([
    F1AcquisitionData.rest('campaigns?select=*&order=created_at.desc&limit=1000'),F1AcquisitionData.rest('events?select=*&order=occurred_at.desc&limit=3000'),F1AcquisitionData.pullInteractions(),F1AcquisitionData.pullTasks(),F1AcquisitionData.pullLeads()
  ]),program=(campaigns||[]).find(c=>c.campaign_type===PROGRAM&&String(c.status||'').toUpperCase()==='ACTIVE');
  if(!program){$('p90Stage').textContent='PROGRAMMA DA INIZIALIZZARE';$('p90Day').textContent='— / 90';return}
  const n=Math.max(1,Math.min(90,days(dateKey(program.starts_at),today)+1)),day=(campaigns||[]).find(c=>c.campaign_type===DAY&&c.territory_key===today),blocks=day?.metadata?.blocks||{},completed=Object.values(blocks).filter(b=>b?.status==='COMPLETED').length,total=Object.values(blocks).reduce((s,b)=>s+elapsed(b),0),followIds=new Set((tasks||[]).filter(t=>String(t.task_type||'').toUpperCase()==='FOLLOW_UP').map(t=>String(t.task_id))),ints=(interactions||[]).filter(i=>dateKey(i.occurred_at)===today),pros=ints.filter(i=>String(i.interaction_type||'').toUpperCase()==='CALL'&&String(i.direction||'OUTBOUND').toUpperCase()==='OUTBOUND'&&!followIds.has(String(i.task_id||''))).length,preview=new Set((events||[]).filter(e=>e.event_type==='MARKET_PREVIEW_VISIONED'&&dateKey(e.occurred_at)===today).map(e=>e.property_id).filter(Boolean)).size,follow=new Set(ints.filter(i=>followIds.has(String(i.task_id||''))).map(i=>String(i.task_id))).size,scheduled=(tasks||[]).some(t=>openTask(t)&&(!t.due_date||dateKey(t.due_date)>=today)&&/APPUNT|SOPRALLUOGO|VALUTAZIONE/i.test([t.task_type,t.reason,t.outcome].join(' ')))||(leads||[]).some(l=>!l.deleted&&!l.do_not_contact&&l.next_action_date&&dateKey(l.next_action_date)>=today&&/APPUNT|SOPRALLUOGO|VALUTAZIONE/i.test(String(l.next_action||'')))||ints.some(i=>/APPUNT/i.test(String(i.outcome||''))),rescue=new Set(ints.filter(i=>i.metadata?.origin===NO_APPT_ORIGIN&&String(i.outcome||'').toUpperCase()!=='NON_TROVATO').map(i=>String(i.lead_id))).size;
  $('p90Day').textContent=`${n} / 90`;$('p90Completed').textContent=`${completed} / 4`;$('p90Time').textContent=`${fmt(total)} / 6h 30m`;$('p90Prospecting').textContent=`${pros} / ${goal(n)}`;$('p90Preview').textContent=`${preview} / 5–7`;$('p90Followup').textContent=`${follow} / 10`;$('p90Stage').textContent=day&&String(day.status).toUpperCase()==='CLOSED'?`GIORNATA CHIUSA · ${day.metadata?.close_status||''}`:n>=8&&!scheduled?`FINE GIORNATA · ${rescue}/2 FSBO / EXPIRED SE NESSUN APPUNTAMENTO`:'OGGI · LAVORO PREVISTO AUTOMATICAMENTE';$('p90Progress').style.width=Math.min(100,n/90*100)+'%';
}catch(e){$('p90Stage').textContent='PROGRAMMA NON DISPONIBILE · '+String(e.message||e)}}
boot();
})();