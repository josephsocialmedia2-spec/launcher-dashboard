(()=>{'use strict';
const VERSION='20260916-mobile-live1';
let client=null,channel=null,starting=null,status='IDLE';
const TABLES=[
  ['f1_territory_progress','user_id',true],
  ['f1_territory_observations','user_id',true],
  ['f1_territory_sessions','user_id',true],
  ['f1_mobile_presence','user_id',true],
  ['tasks','user_id',true],
  ['f1_real_estate_news','user_id',true],
  ['leads','created_by_user_id',false]
];
const emit=(name,detail={})=>window.dispatchEvent(new CustomEvent(name,{detail:{...detail,version:VERSION,status}}));
function setStatus(next,detail={}){status=next;emit('f1:realtime-status',detail)}
function loadSdk(){
  if(window.supabase?.createClient)return Promise.resolve(window.supabase);
  if(!navigator.onLine)return Promise.reject(new Error('OFFLINE'));
  return new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-f1-supabase-realtime]');
    if(existing){existing.addEventListener('load',()=>resolve(window.supabase),{once:true});existing.addEventListener('error',()=>reject(new Error('SDK_REALTIME_NON_DISPONIBILE')),{once:true});return}
    const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.async=true;s.dataset.f1SupabaseRealtime='1';s.onload=()=>resolve(window.supabase);s.onerror=()=>reject(new Error('SDK_REALTIME_NON_DISPONIBILE'));document.head.appendChild(s);
  });
}
async function start(){
  if(starting)return starting;
  starting=(async()=>{
    if(!navigator.onLine){setStatus('OFFLINE');return false}
    if(!window.F1Sync?.configured?.()||!await F1Sync.ensureSession()){setStatus('NO_SESSION');return false}
    const profile=await window.F1StaffData?.me?.();if(!profile?.user_id){setStatus('NO_PROFILE');return false}
    const sdk=await loadSdk();
    if(!sdk?.createClient)throw new Error('SDK_REALTIME_NON_DISPONIBILE');
    const cfg=window.F1_SUPABASE||{},token=await F1Sync.authToken();
    client=sdk.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    try{client.realtime.setAuth(token)}catch(_){ }
    if(channel)try{await client.removeChannel(channel)}catch(_){ }
    const isOwner=String(profile.role||'').toUpperCase()==='TITOLARE';
    channel=client.channel('f1-notiziere-'+profile.user_id,{config:{broadcast:{self:false}}});
    for(const [table,key,teamVisible] of TABLES){
      const cfg={event:'*',schema:'public',table};
      if(!(isOwner&&teamVisible))cfg.filter=`${key}=eq.${profile.user_id}`;
      channel=channel.on('postgres_changes',cfg,payload=>emit('f1:realtime-change',{table,eventType:payload.eventType,new:payload.new,old:payload.old,team:isOwner&&teamVisible}));
    }
    channel.subscribe(s=>{
      if(s==='SUBSCRIBED')setStatus('LIVE');
      else if(s==='CHANNEL_ERROR'||s==='TIMED_OUT')setStatus('DEGRADED',{reason:s});
      else if(s==='CLOSED')setStatus('CLOSED');
    });
    return true;
  })().catch(e=>{console.warn('[F1 realtime]',e);setStatus('DEGRADED',{error:String(e?.message||e)});return false}).finally(()=>{starting=null});
  return starting;
}
async function stop(){if(client&&channel)try{await client.removeChannel(channel)}catch(_){ }channel=null;client=null;setStatus('CLOSED')}
window.addEventListener('online',()=>start());window.addEventListener('offline',()=>setStatus('OFFLINE'));
window.F1Realtime={version:VERSION,start,stop,status:()=>status};
})();
