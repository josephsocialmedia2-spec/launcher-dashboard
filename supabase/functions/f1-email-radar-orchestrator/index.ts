import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-f1-cron-token","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const reply=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:CORS});
const norm=(s:any)=>String(s??"").trim();
const EMAIL_RE=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const VAT_RE=/(?:P\.?\s*IVA|Partita\s*IVA|VAT)\s*[:#]?\s*([0-9]{11})/gi;
function uniq<T>(a:T[]){return [...new Set(a)]}
function pecLike(e:string){return /(^|[.@])(pec|legalmail|postacert|geopec|pecmail)([.@]|$)/i.test(e)}
async function sha256(s:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,"0")).join("")}
async function jfetch(url:string,service:string,path:string,opt:any={}){const r=await fetch(url+"/rest/v1/"+path,{...opt,headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json",Prefer:opt.prefer||"return=representation",...(opt.headers||{})}});const t=await r.text();if(!r.ok)throw new Error("DB "+r.status+" "+t);return t?JSON.parse(t):null}
async function authUser(req:Request,url:string,anon:string,service:string){
 const auth=req.headers.get("authorization")||"";
 if(auth){
  const u=await fetch(url+"/auth/v1/user",{headers:{apikey:anon,Authorization:auth}});
  if(u.ok){const user=await u.json();if(user?.id){const rows=await jfetch(url,service,"f1_staff_profiles?select=user_id,role,status&user_id=eq."+encodeURIComponent(user.id)+"&status=eq.ACTIVE&limit=1");if(rows?.[0])return {id:user.id,role:rows[0].role,cron:false}}}
 }
 const token=req.headers.get("x-f1-cron-token")||"";
 if(token){
  const rows=await jfetch(url,service,"f1_email_radar_runtime_config?select=value&key=eq.cron_token_sha256&limit=1");
  if(rows?.[0]?.value && await sha256(token)===rows[0].value){
   const owners=await jfetch(url,service,"f1_staff_profiles?select=user_id,role&status=eq.ACTIVE&role=eq.TITOLARE&limit=1");
   if(owners?.[0])return {id:owners[0].user_id,role:"CRON",cron:true};
  }
 }
 return null;
}
function sourceTemplates(env:any){
 const gp=!!env.GOOGLE_MAPS_API_KEY, brave=!!env.BRAVE_SEARCH_API_KEY;
 const ri=!!env.REGISTRO_IMPRESE_API_BASE&&!!env.REGISTRO_IMPRESE_SEARCH_PATH&&!!env.REGISTRO_IMPRESE_API_KEY&&!!env.REGISTRO_IMPRESE_API_KEY_HEADER;
 return [
 {key:"REGISTRO_IMPRESE",label:"Registro Imprese / InfoCamere",status:ri?"PENDING":"CREDENTIALS_REQUIRED"},
 {key:"INI_PEC",label:"INI-PEC",status:"ACCESSO_NON_DISPONIBILE"},
 {key:"INAD",label:"INAD",status:"ACCESSO_NON_DISPONIBILE"},
 {key:"ALBI_PROFESSIONALI",label:"Ordini e albi professionali",status:"INCOMPLETE"},
 {key:"SITI_UFFICIALI",label:"Siti ufficiali",status:"PENDING"},
 {key:"SEARCH_PROVIDER",label:"Search Provider",status:brave?"PENDING":"CREDENTIALS_REQUIRED"},
 {key:"GOOGLE_PLACES",label:"Google Places API (New)",status:gp?"PENDING":"CREDENTIALS_REQUIRED"},
 {key:"FONTI_LOCALI",label:"Fonti locali",status:"INCOMPLETE"}
 ];
}
async function crawlPage(url:string){
 const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),9000);
 try{
  const r=await fetch(url,{redirect:"follow",signal:ctl.signal,headers:{"User-Agent":"F1-Email-Radar/2.0 (+territorial-public-contact-verification)","Accept":"text/html,application/xhtml+xml"}});
  if(!r.ok||!(r.headers.get("content-type")||"").includes("text/html"))return null;
  const html=(await r.text()).slice(0,1500000);
  const title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
  const textSample=html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/\s+/g," ").slice(0,300000);
  const emails=uniq((html.match(EMAIL_RE)||[]).map(x=>x.toLowerCase()).filter(x=>!/(png|jpg|jpeg|gif|webp|svg)$/i.test(x)));
  const tels=uniq(Array.from(html.matchAll(/href=["']tel:([^"'?#]+)/gi)).map(m=>m[1].replace(/%20/g," ").trim()));
  const vats=uniq(Array.from(html.matchAll(VAT_RE)).map(m=>m[1]));
  const links=Array.from(html.matchAll(/href=["']([^"'#]+)["']/gi)).map(m=>m[1]).filter(h=>/(contatt|contact|chi-siamo|about|privacy|legal|dove-siamo|where)/i.test(h));
  return {finalUrl:r.url,title,textSample,emails,tels,vats,links:uniq(links).slice(0,8)};
 }catch{return null}finally{clearTimeout(timer)}
}

async function officialSiteCandidate(dbUrl:string,service:string,actor:string,run:any,website:string,ateco:any,discoveryProvider:string){
 let base:string;try{base=new URL(/^https?:/i.test(website)?website:"https://"+website).href}catch{return {saved:false}}
 const first=await crawlPage(base);if(!first)return {saved:false};
 const pages:any[]=[{url:first.finalUrl,data:first}];let origin="";
 try{origin=new URL(first.finalUrl).origin}catch{}
 for(const h of first.links.slice(0,5)){
  try{
   const u=new URL(h,first.finalUrl);if(u.origin!==origin)continue;
   const d=await crawlPage(u.href);if(d)pages.push({url:u.href,data:d});
  }catch{}
 }
 const combinedText=pages.map(p=>p.data.textSample||"").join(" ").toLowerCase();
 if(!combinedText.includes(String(run.comune||"").toLowerCase()))return {saved:false};
 const allEmails=uniq(pages.flatMap(p=>p.data.emails||[]));
 const allTels=uniq(pages.flatMap(p=>p.data.tels||[]));
 const vats=uniq(pages.flatMap(p=>p.data.vats||[]));
 const pec=allEmails.find(pecLike)||"",email=allEmails.find(x=>!pecLike(x))||"";
 if(!email&&!pec&&!allTels[0]&&!vats[0])return {saved:false};
 const site=new URL(first.finalUrl).origin;
 const denom=(first.title||site.replace(/^https?:\/\/(www\.)?/,"")).split(/[|–—]/)[0].trim().slice(0,180);
 const payload:any={
   subject_type:"AZIENDA",denomination:denom||site,legal_name:"",category:"",profession:"",
   comune:run.comune,frazione:"",indirizzo:"",civico:"",cap:"",provincia:"TO",
   ateco_code:ateco?.code||"",ateco_title:ateco?.title_it||"",
   latitude:null,longitude:null,mobile:"",website:site,email,email_type:email?"EMAIL_GENERICA_AZIENDALE":"EMAIL_NON_VERIFICATA",
   pec,phone:allTels[0]||"",vat_number:vats[0]||"",activity_status:"DA_VERIFICARE",
   primary_source_type:"SITO_UFFICIALE",primary_source_url:first.finalUrl,verification_status:"PARZIALMENTE_VERIFICATO",
   confidence_score:75,marketing_status:"DA_VALUTARE",
   notes:"Scoperto da "+discoveryProvider+"; contatti salvati solo dopo verifica sul sito ufficiale."
 };
 const up=await jfetch(dbUrl,service,"rpc/f1_email_radar_service_upsert_entity",{method:"POST",body:JSON.stringify({p_actor:actor,p_payload:payload})});
 const entityId=up?.entity_id||"";
 const wasExisting=!!up?.merged;
 const rows=entityId?await jfetch(dbUrl,service,"f1_email_radar_entities?select=*&entity_id=eq."+encodeURIComponent(entityId)+"&limit=1"):[];
 let e=rows?.[0]||null;
 if(e?.entity_id){
   await jfetch(dbUrl,service,"f1_email_radar_sources",{method:"POST",body:JSON.stringify({
     entity_id:e.entity_id,created_by:actor,source_type:"SITO_UFFICIALE",source_url:first.finalUrl,
     source_name:"Website verified after "+discoveryProvider,
     fields_found:{email:!!email,pec:!!pec,phone:!!allTels[0],vat_number:!!vats[0],discovery_provider:discoveryProvider},
     evidence:pages.map(p=>({url:p.url,emails:p.data.emails,tels:p.data.tels,vats:p.data.vats})),
     access_status:"OK",verified_at:new Date().toISOString()
   }),prefer:"resolution=ignore-duplicates,return=minimal"}).catch(()=>{});
 }
 return {saved:true,newEntity:!wasExisting,duplicate:wasExisting,email:!!email,pec:!!pec,phone:!!allTels[0]};
}
async function atecoBatch(dbUrl:string,service:string,lastCode:string,limit=5){
 let path="f1_ateco_2025?select=code,title_it&level=eq.6&order=code.asc&limit="+limit;
 if(lastCode)path+="&code=gt."+encodeURIComponent(lastCode);
 return await jfetch(dbUrl,service,path);
}
async function braveDiscovery(dbUrl:string,service:string,run:any,actor:string){
 const key=Deno.env.get("BRAVE_SEARCH_API_KEY");if(!key)throw new Error("BRAVE_SEARCH_API_KEY non configurata");
 const batch=await atecoBatch(dbUrl,service,run.last_ateco_code||"",5);let subjects=0,emails=0,pecs=0,phones=0,duplicates=0;
 for(const a of batch||[]){
  const q='"'+a.title_it+'" "'+run.comune+'" contatti';
  const u=new URL("https://api.search.brave.com/res/v1/web/search");
  u.searchParams.set("q",q);u.searchParams.set("country","it");u.searchParams.set("search_lang","it");u.searchParams.set("count","10");
  const r=await fetch(u,{headers:{"Accept":"application/json","X-Subscription-Token":key}});
  if(!r.ok)throw new Error("BRAVE "+r.status);
  const b=await r.json();
  for(const hit of (b?.web?.results||[]).slice(0,10)){
   if(!hit?.url)continue;
   const x=await officialSiteCandidate(dbUrl,service,actor,run,hit.url,a,"BRAVE_SEARCH");
   if(x.saved){subjects++;if(x.email)emails++;if(x.pec)pecs++;if(x.phone)phones++;if(x.duplicate)duplicates++}
  }
  run.last_ateco_code=a.code;run.ateco_analyzed=Number(run.ateco_analyzed||0)+1;
  await jfetch(dbUrl,service,"f1_email_radar_runs?run_id=eq."+run.run_id,{method:"PATCH",body:JSON.stringify({
    last_ateco_code:a.code,ateco_analyzed:run.ateco_analyzed,checkpoint:{phase:"search",provider:"SEARCH_PROVIDER",last_ateco_code:a.code},updated_at:new Date().toISOString()
  }),prefer:"return=minimal"});
 }
 return {subjects_found:subjects,emails_found:emails,pec_found:pecs,phones_found:phones,duplicates,batch:(batch||[]).length};
}
async function googlePlacesDiscovery(dbUrl:string,service:string,run:any,actor:string){
 const key=Deno.env.get("GOOGLE_MAPS_API_KEY");if(!key)throw new Error("GOOGLE_MAPS_API_KEY non configurata");
 const batch=await atecoBatch(dbUrl,service,String(run.checkpoint?.google_last_ateco_code||""),3);let subjects=0,emails=0,pecs=0,phones=0;
 for(const a of batch||[]){
  const r=await fetch("https://places.googleapis.com/v1/places:searchText",{
   method:"POST",
   headers:{"Content-Type":"application/json","X-Goog-Api-Key":key,"X-Goog-FieldMask":"places.id,places.websiteUri"},
   body:JSON.stringify({textQuery:a.title_it+" "+run.comune+" TO Italia",languageCode:"it",regionCode:"IT",maxResultCount:10})
  });
  if(!r.ok)throw new Error("GOOGLE_PLACES "+r.status);
  const b=await r.json();
  for(const p of b?.places||[]){
   if(!p?.websiteUri)continue;
   const x=await officialSiteCandidate(dbUrl,service,actor,run,p.websiteUri,a,"GOOGLE_PLACES");
   if(x.saved){subjects++;if(x.email)emails++;if(x.pec)pecs++;if(x.phone)phones++;if(x.duplicate)duplicates++}
  }
  run.checkpoint={...(run.checkpoint||{}),phase:"google_places",google_last_ateco_code:a.code};
  await jfetch(dbUrl,service,"f1_email_radar_runs?run_id=eq."+run.run_id,{method:"PATCH",body:JSON.stringify({checkpoint:run.checkpoint,updated_at:new Date().toISOString()}),prefer:"return=minimal"});
 }
 return {subjects_found:subjects,emails_found:emails,pec_found:pecs,phones_found:phones,duplicates,batch:(batch||[]).length};
}
async function processWebsites(url:string,service:string,run:any,actor:string){
 const entities=await jfetch(url,service,"f1_email_radar_entities?select=*&comune=eq."+encodeURIComponent(run.comune)+"&website=not.eq.&order=updated_at.asc&limit=20");
 let done=0,emails=0,pecs=0,phones=0;
 for(const e of entities||[]){
   let base:string;try{base=new URL(/^https?:/i.test(e.website)?e.website:"https://"+e.website).href}catch{continue}
   const first=await crawlPage(base); if(!first) continue;
   const pages:any[]=[{url:first.finalUrl,data:first}];
   let origin="";try{origin=new URL(first.finalUrl).origin}catch{}
   for(const h of first.links.slice(0,5)){try{const u=new URL(h,first.finalUrl);if(u.origin!==origin)continue;const d=await crawlPage(u.href);if(d)pages.push({url:u.href,data:d})}catch{}}
   const allEmails=uniq(pages.flatMap(p=>p.data.emails||[])), allTels=uniq(pages.flatMap(p=>p.data.tels||[])), vats=uniq(pages.flatMap(p=>p.data.vats||[]));
   const pec=allEmails.find(pecLike)||"", email=allEmails.find(x=>!pecLike(x))||"";
   const patch:any={updated_at:new Date().toISOString(),last_verified_at:new Date().toISOString(),verification_status:"VERIFICATO",confidence_score:Math.max(Number(e.confidence_score||0),90)};
   if(!e.email&&email){patch.email=email;patch.email_type="EMAIL_GENERICA_AZIENDALE";emails++}
   if(!e.pec&&pec){patch.pec=pec;pecs++}
   if(!e.phone&&!e.mobile&&allTels[0]){patch.phone=allTels[0];phones++}
   if(!e.vat_number&&vats[0])patch.vat_number=vats[0];
   await jfetch(url,service,"f1_email_radar_entities?entity_id=eq."+e.entity_id,{method:"PATCH",body:JSON.stringify(patch),prefer:"return=minimal"});
   const evidence=pages.map(p=>({url:p.url,emails:p.data.emails,tels:p.data.tels,vats:p.data.vats}));
   await jfetch(url,service,"f1_email_radar_sources",{method:"POST",body:JSON.stringify({entity_id:e.entity_id,created_by:actor,source_type:"SITO_UFFICIALE",source_url:first.finalUrl,source_name:"Website crawler",fields_found:{email:!!email,pec:!!pec,phone:!!allTels[0],vat_number:!!vats[0]},evidence,access_status:"OK",verified_at:new Date().toISOString()}),prefer:"resolution=ignore-duplicates,return=minimal"}).catch(()=>{});
   done++;
 }
 return {subjects_found:done,emails_found:emails,pec_found:pecs,phones_found:phones};
}
async function startRun(url:string,service:string,actor:string,comune:string){
 const atecoTotal=await jfetch(url,service,"rpc/f1_email_radar_ateco_leaf_count",{method:"POST",body:"{}"});
 const rows=await jfetch(url,service,"f1_email_radar_runs",{method:"POST",body:JSON.stringify({created_by:actor,comune,status:"RUNNING",ateco_total:Number(atecoTotal||0),started_at:new Date().toISOString(),checkpoint:{phase:"providers",provider_index:0}})});
 const run=rows[0]; const env:any=Deno.env.toObject(); const sources=sourceTemplates(env);
 await jfetch(url,service,"f1_email_radar_source_progress",{method:"POST",body:JSON.stringify(sources.map(s=>({run_id:run.run_id,created_by:actor,source_key:s.key,source_label:s.label,status:s.status}))),prefer:"return=minimal"});
 return run;
}
async function updateProgress(url:string,service:string,runId:string,key:string,status:string,stats:any={},error=""){
 await jfetch(url,service,"f1_email_radar_source_progress?run_id=eq."+runId+"&source_key=eq."+key,{method:"PATCH",body:JSON.stringify({status,...stats,error,completed_at:["COMPLETED","ACCESSO_NON_DISPONIBILE"].includes(status)?new Date().toISOString():null,updated_at:new Date().toISOString()}),prefer:"return=minimal"});
}
async function recalc(url:string,service:string,runId:string){return await jfetch(url,service,"rpc/f1_email_radar_recalc_run",{method:"POST",body:JSON.stringify({p_run_id:runId})})}
async function finalizeIfIdle(url:string,service:string,runId:string){
 const progress=await jfetch(url,service,"f1_email_radar_source_progress?select=*&run_id=eq."+runId+"&order=source_key.asc");
 const fresh=await recalc(url,service,runId);
 if((progress||[]).some((p:any)=>p.status==="PENDING"||p.status==="RUNNING"))return fresh;
 const unresolved=(progress||[]).filter((p:any)=>!["COMPLETED","ACCESSO_NON_DISPONIBILE","NON_APPLICABILE"].includes(p.status));
 const complete=unresolved.length===0 && Number(fresh?.ateco_coverage||0)>=100;
 await jfetch(url,service,"f1_email_radar_runs?run_id=eq."+runId,{method:"PATCH",body:JSON.stringify({
   status:complete?"COMPLETED":"INCOMPLETE",
   completed_at:complete?new Date().toISOString():null,
   updated_at:new Date().toISOString()
 }),prefer:"return=minimal"});
 const rows=await jfetch(url,service,"f1_email_radar_runs?select=*&run_id=eq."+runId+"&limit=1");
 return rows?.[0]||fresh;
}

async function prepareResumeProviders(url:string,service:string,run:any,forceWebsite=false){
 const now=Date.now();
 const progress=await jfetch(url,service,"f1_email_radar_source_progress?select=*&run_id=eq."+run.run_id+"&order=source_key.asc");
 for(const p of progress||[]){
  let requeue=false;
  if(p.source_key==="SEARCH_PROVIDER"&&Deno.env.get("BRAVE_SEARCH_API_KEY")&&["CREDENTIALS_REQUIRED","INCOMPLETE"].includes(p.status))requeue=true;
  if(p.source_key==="GOOGLE_PLACES"&&Deno.env.get("GOOGLE_MAPS_API_KEY")&&["CREDENTIALS_REQUIRED","INCOMPLETE"].includes(p.status))requeue=true;
  if(p.source_key==="SITI_UFFICIALI"&&p.status==="COMPLETED"){
   const last=p.last_started_at?Date.parse(p.last_started_at):0;
   if(forceWebsite||!last||now-last>20*60*60*1000)requeue=true;
  }
  if(requeue)await jfetch(url,service,"f1_email_radar_source_progress?progress_id=eq."+p.progress_id,{method:"PATCH",body:JSON.stringify({status:"PENDING",error:"",completed_at:null,updated_at:new Date().toISOString()}),prefer:"return=minimal"});
 }
 await jfetch(url,service,"f1_email_radar_runs?run_id=eq."+run.run_id,{method:"PATCH",body:JSON.stringify({status:"RUNNING",requested_action:"",updated_at:new Date().toISOString()}),prefer:"return=minimal"});
 const rr=await jfetch(url,service,"f1_email_radar_runs?select=*&run_id=eq."+run.run_id+"&limit=1");
 return rr?.[0]||run;
}
async function processRun(url:string,service:string,run:any,actor:string){
 if(run.requested_action==="PAUSE"||run.status==="PAUSED")return run;
 if(run.requested_action==="STOP"){await jfetch(url,service,"f1_email_radar_runs?run_id=eq."+run.run_id,{method:"PATCH",body:JSON.stringify({status:"STOPPED",updated_at:new Date().toISOString()}),prefer:"return=minimal"});return {...run,status:"STOPPED"}}
 const prog=await jfetch(url,service,"f1_email_radar_source_progress?select=*&run_id=eq."+run.run_id+"&order=source_key.asc");
 const next=(prog||[]).find((p:any)=>p.status==="PENDING");
 if(!next)return await finalizeIfIdle(url,service,run.run_id);
 await updateProgress(url,service,run.run_id,next.source_key,"RUNNING",{last_started_at:new Date().toISOString()});
 try{
  if(next.source_key==="SITI_UFFICIALI"){const s=await processWebsites(url,service,run,actor);await updateProgress(url,service,run.run_id,next.source_key,"COMPLETED",s)}
  else if(next.source_key==="GOOGLE_PLACES"){
    if(!Deno.env.get("GOOGLE_MAPS_API_KEY"))await updateProgress(url,service,run.run_id,next.source_key,"CREDENTIALS_REQUIRED",{},"GOOGLE_MAPS_API_KEY non configurata");
    else {const s=await googlePlacesDiscovery(url,service,run,actor);await updateProgress(url,service,run.run_id,next.source_key,"INCOMPLETE",s,"Batch discovery eseguito; provider resta incompleto finché tutte le categorie applicabili non sono attraversate.")}
  } else if(next.source_key==="SEARCH_PROVIDER"){
    if(!Deno.env.get("BRAVE_SEARCH_API_KEY"))await updateProgress(url,service,run.run_id,next.source_key,"CREDENTIALS_REQUIRED",{},"BRAVE_SEARCH_API_KEY non configurata");
    else {const s=await braveDiscovery(url,service,run,actor);await updateProgress(url,service,run.run_id,next.source_key,"INCOMPLETE",s,"Batch ATECO eseguito; riprendere dal checkpoint fino a copertura categorie.")}
  } else if(next.source_key==="REGISTRO_IMPRESE"){
    await updateProgress(url,service,run.run_id,next.source_key,"CREDENTIALS_REQUIRED",{},"Configurare endpoint/contratto Web Services autorizzato InfoCamere.");
  } else await updateProgress(url,service,run.run_id,next.source_key,"INCOMPLETE",{},"Provider richiede adapter specifico o consultazione autorizzata.");
 }catch(e){await updateProgress(url,service,run.run_id,next.source_key,"FAILED",{},String((e as any)?.message||e))}
 return await finalizeIfIdle(url,service,run.run_id);
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
 if(req.method!=="POST")return reply({ok:false,error:"METHOD_NOT_ALLOWED"},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!anon||!service)return reply({ok:false,error:"SERVER_CONFIG_MISSING"},500);
  const actor=await authUser(req,url,anon,service);if(!actor)return reply({ok:false,error:"F1_AUTH_REQUIRED"},401);
  const b=await req.json().catch(()=>({}));const action=String(b.action||"STATUS").toUpperCase();let run:any=null;
  if(b.run_id){const rr=await jfetch(url,service,"f1_email_radar_runs?select=*&run_id=eq."+encodeURIComponent(b.run_id)+"&limit=1");run=rr?.[0]}
  if(!run&&b.comune){const rr=await jfetch(url,service,"f1_email_radar_runs?select=*&comune=eq."+encodeURIComponent(b.comune)+"&order=created_at.desc&limit=1");run=rr?.[0]}
  if(action==="START"){if(!b.comune)return reply({ok:false,error:"COMUNE_REQUIRED"},400);run=await startRun(url,service,actor.id,String(b.comune));run=await processRun(url,service,run,actor.id)}
  else if(action==="PAUSE"&&run){await jfetch(url,service,"f1_email_radar_runs?run_id=eq."+run.run_id,{method:"PATCH",body:JSON.stringify({status:"PAUSED",requested_action:"PAUSE",updated_at:new Date().toISOString()}),prefer:"return=minimal"});run={...run,status:"PAUSED"}}
  else if(action==="STOP"&&run){await jfetch(url,service,"f1_email_radar_runs?run_id=eq."+run.run_id,{method:"PATCH",body:JSON.stringify({requested_action:"STOP",updated_at:new Date().toISOString()}),prefer:"return=minimal"});run=await processRun(url,service,{...run,requested_action:"STOP"},actor.id)}
  else if((action==="RESUME"||action==="RETRY")&&run){
   if(action==="RETRY")await jfetch(url,service,"f1_email_radar_source_progress?run_id=eq."+run.run_id+"&status=eq.FAILED",{method:"PATCH",body:JSON.stringify({status:"PENDING",error:"",updated_at:new Date().toISOString()}),prefer:"return=minimal"});
   run=await prepareResumeProviders(url,service,run,false);
   if(action==="RETRY")await jfetch(url,service,"f1_email_radar_runs?run_id=eq."+run.run_id,{method:"PATCH",body:JSON.stringify({retry_count:Number(run.retry_count||0)+1,updated_at:new Date().toISOString()}),prefer:"return=minimal"});
   run=await processRun(url,service,run,actor.id)
  }
  else if(action==="CRON"){
   let comune=String(b.comune||"");
   if(!comune){const q=await jfetch(url,service,"rpc/f1_email_radar_queue_next",{method:"POST",body:"{}"});comune=String(q||"Avigliana")}
   const prev=await jfetch(url,service,"f1_email_radar_runs?select=*&comune=eq."+encodeURIComponent(comune)+"&order=created_at.desc&limit=1");
   const latest=prev?.[0];
   if(latest&&["INCOMPLETE","PAUSED","FAILED","RUNNING"].includes(latest.status))run=await prepareResumeProviders(url,service,latest,false);
   else run=await startRun(url,service,actor.id,comune);
   run=await processRun(url,service,run,actor.id);
   await jfetch(url,service,"f1_email_radar_municipality_queue?comune=eq."+encodeURIComponent(comune),{method:"PATCH",body:JSON.stringify({last_run_id:run.run_id,last_run_at:new Date().toISOString(),updated_at:new Date().toISOString()}),prefer:"return=minimal"}).catch(()=>{});
  }
  const progress=run?await jfetch(url,service,"f1_email_radar_source_progress?select=*&run_id=eq."+run.run_id+"&order=source_key.asc"):[];
  return reply({ok:true,action,run,progress,provider_runtime:{google_places:!!Deno.env.get("GOOGLE_MAPS_API_KEY"),search:!!Deno.env.get("BRAVE_SEARCH_API_KEY"),registro_imprese:!!Deno.env.get("REGISTRO_IMPRESE_API_BASE")&&!!Deno.env.get("REGISTRO_IMPRESE_API_KEY")}});
 }catch(e){return reply({ok:false,error:"UNEXPECTED",detail:String((e as any)?.message||e)},500)}
});