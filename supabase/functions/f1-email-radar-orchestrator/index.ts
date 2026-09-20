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
 const ri=!!env.REGISTRO_IMPRESE_API_BASE&&!!env.REGISTRO_IMPRESE_SEARCH_PATH&&!!env.REGISTRO_IMPRESE_API_KEY&&!!env.REGISTRO_IMPRESE_API_KEY_HEADER&&!!env.REGISTRO_IMPRESE_RESPONSE_ITEMS_PATH&&!!env.REGISTRO_IMPRESE_FIELD_DENOMINATION;
 return [
  {key:"OSM_DIRECTORY",label:"OpenStreetMap / Overpass",status:"PENDING",provider_class:"REQUIRED_AUTOMATABLE",sort_order:10},
  {key:"FONTI_LOCALI",label:"Fonti locali / Comune",status:"PENDING",provider_class:"REQUIRED_AUTOMATABLE",sort_order:20},
  {key:"SITI_UFFICIALI",label:"Siti ufficiali",status:"PENDING",provider_class:"REQUIRED_AUTOMATABLE",sort_order:30},
  {key:"ATECO_ANALYSIS",label:"Analisi copertura ATECO",status:"PENDING",provider_class:"REQUIRED_AUTOMATABLE",sort_order:40},
  {key:"SEARCH_PROVIDER",label:"Brave Search enrichment",status:brave?"OPTIONAL_CONFIGURED":"OPTIONAL_NOT_CONFIGURED",provider_class:brave?"OPTIONAL_CONFIGURED":"OPTIONAL_NOT_CONFIGURED",sort_order:60},
  {key:"GOOGLE_PLACES",label:"Google Places enrichment",status:gp?"OPTIONAL_CONFIGURED":"OPTIONAL_NOT_CONFIGURED",provider_class:gp?"OPTIONAL_CONFIGURED":"OPTIONAL_NOT_CONFIGURED",sort_order:70},
  {key:"REGISTRO_IMPRESE",label:"Registro Imprese / InfoCamere",status:ri?"OPTIONAL_CONFIGURED":"OPTIONAL_NOT_CONFIGURED",provider_class:ri?"OPTIONAL_CONFIGURED":"OPTIONAL_NOT_CONFIGURED",sort_order:80},
  {key:"ALBI_PROFESSIONALI",label:"Ordini e albi professionali",status:"INTERACTIVE_NOT_REQUIRED",provider_class:"INTERACTIVE_NOT_REQUIRED",sort_order:90},
  {key:"INI_PEC",label:"INI-PEC",status:"INTERACTIVE_NOT_REQUIRED",provider_class:"INTERACTIVE_NOT_REQUIRED",sort_order:100},
  {key:"INAD",label:"INAD",status:"INTERACTIVE_NOT_REQUIRED",provider_class:"INTERACTIVE_NOT_REQUIRED",sort_order:110}
 ];
}
async function crawlPage(url:string){
 const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),9000);
 try{
  const r=await fetch(url,{redirect:"follow",signal:ctl.signal,headers:{"User-Agent":"F1-Email-Radar/3.0 (+https://josephsocialmedia2-spec.github.io/launcher-dashboard/f1-email-radar.html)","Accept":"text/html,application/xhtml+xml"}});
  if(!r.ok||!(r.headers.get("content-type")||"").includes("text/html"))return null;
  const html=(await r.text()).slice(0,1500000);
  const title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
  const textSample=html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").slice(0,300000);
  const emails=uniq((html.match(EMAIL_RE)||[]).map(x=>x.toLowerCase()).filter(x=>!/(png|jpg|jpeg|gif|webp|svg)$/i.test(x)));
  const tels=uniq(Array.from(html.matchAll(/href=["']tel:([^"'?#]+)/gi)).map(m=>m[1].replace(/%20/g," ").trim()));
  const vats=uniq(Array.from(html.matchAll(VAT_RE)).map(m=>m[1]));
  const allLinks=uniq(Array.from(html.matchAll(/href=["']([^"'#]+)["']/gi)).map(m=>m[1].trim()).filter(Boolean)).slice(0,500);
  const links=allLinks.filter(h=>/(contatt|contact|chi-siamo|about|privacy|legal|dove-siamo|where|azienda|staff|sedi)/i.test(h)).slice(0,12);
  const jsonld:any[]=[];
  for(const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{
      const v=JSON.parse(m[1].trim());
      const push=(x:any)=>{if(Array.isArray(x))x.forEach(push);else if(x&&typeof x==="object"){if(Array.isArray(x["@graph"]))x["@graph"].forEach(push);else jsonld.push(x)}};
      push(v);
    }catch{}
  }
  const metas:Record<string,string>={};
  for(const m of html.matchAll(/<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']*)["'][^>]*>/gi))metas[String(m[1]).toLowerCase()]=m[2];
  for(const m of html.matchAll(/<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']([^"']+)["'][^>]*>/gi))metas[String(m[2]).toLowerCase()]=m[1];
  return {finalUrl:r.url,title,textSample,emails,tels,vats,links,allLinks,jsonld,metas};
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
 const batch=await atecoBatch(dbUrl,service,String(run.checkpoint?.google_last_ateco_code||""),3);let subjects=0,emails=0,pecs=0,phones=0,duplicates=0;
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

function getPath(obj:any,path:string){
 if(!path)return obj;
 return path.split(".").filter(Boolean).reduce((v:any,k:string)=>v==null?undefined:v[k],obj);
}
function renderRiValue(v:string,run:any){
 return String(v||"").replaceAll("{{comune}}",String(run.comune||"")).replaceAll("{{provincia}}","TO");
}
async function registroImpreseDiscovery(dbUrl:string,service:string,run:any,actor:string){
 const env:any=Deno.env.toObject();
 const required=["REGISTRO_IMPRESE_API_BASE","REGISTRO_IMPRESE_SEARCH_PATH","REGISTRO_IMPRESE_API_KEY","REGISTRO_IMPRESE_API_KEY_HEADER","REGISTRO_IMPRESE_RESPONSE_ITEMS_PATH","REGISTRO_IMPRESE_FIELD_DENOMINATION"];
 const missing=required.filter(k=>!env[k]);if(missing.length)throw new Error("REGISTRO_IMPRESE_CONFIG_REQUIRED:"+missing.join(","));
 const method=String(env.REGISTRO_IMPRESE_HTTP_METHOD||"POST").toUpperCase();
 if(!["GET","POST"].includes(method))throw new Error("REGISTRO_IMPRESE_HTTP_METHOD_NOT_ALLOWED");
 const base=String(env.REGISTRO_IMPRESE_API_BASE), rawPath=renderRiValue(String(env.REGISTRO_IMPRESE_SEARCH_PATH),run);
 const endpoint=new URL(rawPath,base);
 const headers:Record<string,string>={"Accept":"application/json",[String(env.REGISTRO_IMPRESE_API_KEY_HEADER)]:String(env.REGISTRO_IMPRESE_API_KEY)};
 const init:RequestInit={method,headers};
 if(method==="POST"){
   headers["Content-Type"]="application/json";
   let body:any={comune:run.comune,provincia:"TO"};
   if(env.REGISTRO_IMPRESE_REQUEST_TEMPLATE){
     try{
       const rendered=renderRiValue(String(env.REGISTRO_IMPRESE_REQUEST_TEMPLATE),run);
       body=JSON.parse(rendered);
     }catch{throw new Error("REGISTRO_IMPRESE_REQUEST_TEMPLATE_INVALID")}
   }
   init.body=JSON.stringify(body);
 }
 const rr=await fetch(endpoint,init);if(!rr.ok)throw new Error("REGISTRO_IMPRESE_HTTP_"+rr.status);
 const data=await rr.json();const items=getPath(data,String(env.REGISTRO_IMPRESE_RESPONSE_ITEMS_PATH));
 if(!Array.isArray(items))throw new Error("REGISTRO_IMPRESE_ITEMS_PATH_INVALID");
 let subjects=0,emails=0,pecs=0,phones=0,duplicates=0;
 const field=(x:any,key:string)=>norm(getPath(x,String(env[key]||"")));
 for(const x of items.slice(0,250)){
   const denomination=field(x,"REGISTRO_IMPRESE_FIELD_DENOMINATION");if(!denomination)continue;
   const comune=field(x,"REGISTRO_IMPRESE_FIELD_COMUNE")||run.comune;
   if(comune && comune.toLowerCase()!==String(run.comune).toLowerCase())continue;
   const payload:any={
     subject_type:"AZIENDA",denomination,legal_name:field(x,"REGISTRO_IMPRESE_FIELD_LEGAL_NAME"),
     category:"",profession:"",comune:run.comune,frazione:"",indirizzo:field(x,"REGISTRO_IMPRESE_FIELD_ADDRESS"),
     civico:field(x,"REGISTRO_IMPRESE_FIELD_CIVICO"),cap:field(x,"REGISTRO_IMPRESE_FIELD_CAP"),provincia:"TO",
     ateco_code:field(x,"REGISTRO_IMPRESE_FIELD_ATECO_CODE"),ateco_title:field(x,"REGISTRO_IMPRESE_FIELD_ATECO_TITLE"),
     phone:field(x,"REGISTRO_IMPRESE_FIELD_PHONE"),mobile:"",email:field(x,"REGISTRO_IMPRESE_FIELD_EMAIL").toLowerCase(),
     email_type:"EMAIL_NON_VERIFICATA",pec:field(x,"REGISTRO_IMPRESE_FIELD_PEC").toLowerCase(),
     website:field(x,"REGISTRO_IMPRESE_FIELD_WEBSITE"),vat_number:field(x,"REGISTRO_IMPRESE_FIELD_VAT"),
     primary_source_type:"REGISTRO_IMPRESE",primary_source_url:String(env.REGISTRO_IMPRESE_API_BASE),
     verification_status:"VERIFICATO",confidence_score:100,activity_status:field(x,"REGISTRO_IMPRESE_FIELD_STATUS")||"DA_VERIFICARE",
     marketing_status:"DA_VALUTARE",notes:"Dato acquisito tramite connettore Registro Imprese / InfoCamere autorizzato."
   };
   const up=await jfetch(dbUrl,service,"rpc/f1_email_radar_service_upsert_entity",{method:"POST",body:JSON.stringify({p_actor:actor,p_payload:payload})});
   const id=up?.entity_id||"";if(!id)continue;
   await jfetch(dbUrl,service,"f1_email_radar_sources",{method:"POST",body:JSON.stringify({
     entity_id:id,created_by:actor,source_type:"REGISTRO_IMPRESE",source_url:String(env.REGISTRO_IMPRESE_API_BASE),
     source_name:"Registro Imprese / InfoCamere autorizzato",
     fields_found:{vat_number:!!payload.vat_number,ateco_code:!!payload.ateco_code,email:!!payload.email,pec:!!payload.pec,phone:!!payload.phone},
     evidence:[],access_status:"OK",verified_at:new Date().toISOString()
   }),prefer:"resolution=ignore-duplicates,return=minimal"}).catch(()=>{});
   subjects++;if(payload.email)emails++;if(payload.pec)pecs++;if(payload.phone)phones++;if(up?.merged)duplicates++;
 }
 return {subjects_found:subjects,emails_found:emails,pec_found:pecs,phones_found:phones,duplicates};
}


function firstJsonLd(page:any){
 const nodes=(page?.jsonld||[]).filter((x:any)=>x&&typeof x==="object");
 const score=(x:any)=>{
   const t=Array.isArray(x["@type"])?x["@type"].join(" "):String(x["@type"]||"");
   return /LocalBusiness|Organization|ProfessionalService|Store|Restaurant|Hotel|MedicalBusiness|LegalService|AccountingService|RealEstateAgent|Person/i.test(t)?2:0;
 };
 return nodes.sort((a:any,b:any)=>score(b)-score(a))[0]||null;
}
function ldAddress(x:any){
 const a=x?.address;if(!a)return {address:"",civico:"",cap:""};
 if(typeof a==="string")return {address:a,civico:"",cap:""};
 return {address:[a.streetAddress,a.addressLocality].filter(Boolean).join(", "),civico:"",cap:String(a.postalCode||"")};
}
function inferAtecoFromOsm(t:any){
 const shop=String(t.shop||""),office=String(t.office||""),amenity=String(t.amenity||""),tourism=String(t.tourism||""),craft=String(t.craft||""),health=String(t.healthcare||"");
 if(shop)return {code:"47",status:"ATECO_INFERRED"};
 if(/restaurant|cafe|bar|fast_food|pub|ice_cream/.test(amenity))return {code:"56",status:"ATECO_INFERRED"};
 if(/hotel|guest_house|hostel|motel|apartment/.test(tourism))return {code:"55",status:"ATECO_INFERRED"};
 if(/lawyer|accountant|tax_advisor/.test(office))return {code:"69",status:"ATECO_INFERRED"};
 if(/architect|engineer|surveyor/.test(office))return {code:"71",status:"ATECO_INFERRED"};
 if(/estate_agent/.test(office))return {code:"68",status:"ATECO_INFERRED"};
 if(/doctor|dentist|clinic|pharmacy|hospital/.test(amenity+" "+health))return {code:"86",status:"ATECO_INFERRED"};
 if(/bank|financial/.test(amenity+" "+office))return {code:"64",status:"ATECO_INFERRED"};
 if(craft)return {code:"32",status:"ATECO_INFERRED"};
 return {code:"",status:"UNKNOWN"};
}
async function providerState(dbUrl:string,service:string,key:string){
 const x=await jfetch(dbUrl,service,"f1_email_radar_providers?select=*&provider_key=eq."+encodeURIComponent(key)+"&limit=1");
 return x?.[0]||null;
}
async function providerSuccess(dbUrl:string,service:string,key:string){
 await jfetch(dbUrl,service,"f1_email_radar_providers?provider_key=eq."+encodeURIComponent(key),{method:"PATCH",body:JSON.stringify({circuit_state:"CLOSED",failure_count:0,last_success_at:new Date().toISOString(),last_failure_at:null,next_retry_at:null,updated_at:new Date().toISOString()}),prefer:"return=minimal"});
}
async function providerFailure(dbUrl:string,service:string,key:string,error:any){
 const p=await providerState(dbUrl,service,key);const n=Number(p?.failure_count||0)+1;
 const delay=Math.min(3600000,30000*Math.pow(2,Math.min(n-1,7)));
 await jfetch(dbUrl,service,"f1_email_radar_providers?provider_key=eq."+encodeURIComponent(key),{method:"PATCH",body:JSON.stringify({circuit_state:n>=3?"OPEN":"CLOSED",failure_count:n,last_failure_at:new Date().toISOString(),next_retry_at:new Date(Date.now()+delay).toISOString(),notes:String(p?.notes||"")+" | Last error: "+String(error).slice(0,240),updated_at:new Date().toISOString()}),prefer:"return=minimal"});
 return delay;
}
async function osmDiscovery(dbUrl:string,service:string,run:any,actor:string){
 const state=await providerState(dbUrl,service,"OSM_DIRECTORY");
 if(state?.next_retry_at&&Date.parse(state.next_retry_at)>Date.now())return {cooldown:true,retry_at:state.next_retry_at};
 const wd=await wikidataMunicipality(run.comune);
 if(!wd?.qid)throw new Error("WIKIDATA_MUNICIPALITY_NOT_FOUND");
 const q=`[out:json][timeout:25];
 area["wikidata"="${wd.qid}"]->.a;
 (
  nwr(area.a)["name"]["shop"];
  nwr(area.a)["name"]["office"];
  nwr(area.a)["name"]["craft"];
  nwr(area.a)["name"]["amenity"~"restaurant|cafe|bar|pub|fast_food|pharmacy|clinic|doctors|dentist|bank|fuel|marketplace"];
  nwr(area.a)["name"]["tourism"~"hotel|guest_house|hostel|motel|apartment"];
  nwr(area.a)["name"]["healthcare"];
  nwr(area.a)["name"]["industrial"];
 );
 out center tags;`;
 const endpoints=[
   "https://overpass-api.de/api/interpreter",
   "https://overpass.private.coffee/api/interpreter",
   "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
 ];
 let data:any=null,lastError:any=null,usedEndpoint="";
 for(const endpoint of endpoints){
  const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),32000);
  try{
   const rr=await fetch(endpoint,{method:"POST",signal:ctl.signal,headers:{"Content-Type":"application/x-www-form-urlencoded","User-Agent":"F1-Email-Radar/3.1 (+https://josephsocialmedia2-spec.github.io/launcher-dashboard/f1-email-radar.html)"},body:"data="+encodeURIComponent(q)});
   if(!rr.ok){lastError=new Error("OVERPASS_"+rr.status+"_"+endpoint);continue}
   data=await rr.json();usedEndpoint=endpoint;break;
  }catch(e){lastError=e}finally{clearTimeout(timer)}
 }
 if(!data){const delay=await providerFailure(dbUrl,service,"OSM_DIRECTORY",lastError||"OVERPASS_ALL_FAILED");throw new Error(String((lastError as any)?.message||lastError||"OVERPASS_ALL_FAILED")+"; retry_ms="+delay)}
 let subjects=0,emails=0,pecs=0,phones=0,duplicates=0;
 const titleRows=await jfetch(dbUrl,service,"f1_ateco_2025?select=code,title_it&level=eq.2");
 const titles=new Map((titleRows||[]).map((x:any)=>[String(x.code),String(x.title_it)]));
 for(const el of (data?.elements||[]).slice(0,500)){
  const t=el.tags||{},name=norm(t.name);if(!name)continue;
  const lat=Number(el.lat??el.center?.lat),lon=Number(el.lon??el.center?.lon);
  const email=norm(t.email||t["contact:email"]).toLowerCase();
  const pec=pecLike(email)?email:norm(t.pec||t["contact:pec"]).toLowerCase();
  const ordinary=pecLike(email)?"":email;
  const phone=norm(t.phone||t["contact:phone"]||t.mobile);
  const website=norm(t.website||t["contact:website"]||t.url);
  const addr=[t["addr:street"],t["addr:housenumber"]].filter(Boolean).join(" ");
  const inferred=inferAtecoFromOsm(t);
  const category=norm(t.shop||t.office||t.craft||t.amenity||t.tourism||t.healthcare||t.industrial);
  const sourceUid="osm:"+String(el.type)+":"+String(el.id);
  const osmUrl="https://www.openstreetmap.org/"+String(el.type)+"/"+String(el.id);
  const payload:any={subject_type:"AZIENDA",denomination:name,legal_name:"",category,profession:"",comune:run.comune,frazione:"",
   indirizzo:addr,civico:norm(t["addr:housenumber"]),cap:norm(t["addr:postcode"]),provincia:"TO",
   latitude:Number.isFinite(lat)?lat:null,longitude:Number.isFinite(lon)?lon:null,
   geocoder:"OSM_ELEMENT",geocoded_at:new Date().toISOString(),geocode_precision:el.type==="node"?"POI_POINT":"OSM_CENTER",
   phone,mobile:"",email:ordinary,email_type:ordinary?"EMAIL_GENERICA_AZIENDALE":"EMAIL_NON_VERIFICATA",pec,website,vat_number:"",
   ateco_code:inferred.code,ateco_title:titles.get(inferred.code)||"",ateco_status:inferred.status,
   primary_source_type:"OSM_DIRECTORY",primary_source_url:osmUrl,source_uid:sourceUid,
   verification_status:"PARZIALMENTE_VERIFICATO",confidence_score:60,activity_status:"DA_VERIFICARE",marketing_status:"DA_VALUTARE",
   field_provenance:{osm:{source_url:osmUrl,provider:"OpenStreetMap",overpass_endpoint:usedEndpoint,license:"ODbL",observed_at:new Date().toISOString()}},
   notes:"Discovery OpenStreetMap/Overpass. Dati OSM sotto ODbL; fonte di discovery, non prova camerale."};
  const up=await jfetch(dbUrl,service,"rpc/f1_email_radar_service_upsert_entity",{method:"POST",body:JSON.stringify({p_actor:actor,p_payload:payload})});
  const id=up?.entity_id;if(!id)continue;
  await jfetch(dbUrl,service,"f1_email_radar_sources",{method:"POST",body:JSON.stringify({entity_id:id,created_by:actor,source_type:"OSM_DIRECTORY",source_url:osmUrl,source_name:"OpenStreetMap",fields_found:{name:true,address:!!addr,email:!!ordinary,pec:!!pec,phone:!!phone,website:!!website,geo:Number.isFinite(lat)&&Number.isFinite(lon)},evidence:[{osm_type:el.type,osm_id:el.id,tags:t,license:"ODbL",overpass_endpoint:usedEndpoint}],access_status:"OK",verified_at:new Date().toISOString()}),prefer:"resolution=ignore-duplicates,return=minimal"}).catch(()=>{});
  subjects++;if(ordinary)emails++;if(pec)pecs++;if(phone)phones++;if(up?.merged)duplicates++;
 }
 await providerSuccess(dbUrl,service,"OSM_DIRECTORY");
 return {subjects_found:subjects,emails_found:emails,pec_found:pecs,phones_found:phones,duplicates,overpass_endpoint:usedEndpoint,wikidata_qid:wd.qid};
}
async function wikidataMunicipality(comune:string){
 const api=new URL("https://www.wikidata.org/w/api.php");api.searchParams.set("action","wbsearchentities");api.searchParams.set("search",comune);api.searchParams.set("language","it");api.searchParams.set("format","json");api.searchParams.set("origin","*");api.searchParams.set("limit","8");
 const r=await fetch(api,{headers:{"User-Agent":"F1-Email-Radar/3.0 (+https://josephsocialmedia2-spec.github.io/launcher-dashboard/f1-email-radar.html)","Accept":"application/json"}});if(!r.ok)return null;
 const b=await r.json();const hit=(b.search||[]).find((x:any)=>String(x.label||"").toLowerCase()===comune.toLowerCase()&&/comune|municipality|italia|italian/i.test(String(x.description||"")))||(b.search||[])[0];if(!hit?.id)return null;
 const e=await fetch("https://www.wikidata.org/wiki/Special:EntityData/"+hit.id+".json",{headers:{"User-Agent":"F1-Email-Radar/3.0"}});if(!e.ok)return null;const j=await e.json();const ent=j.entities?.[hit.id];const site=ent?.claims?.P856?.[0]?.mainsnak?.datavalue?.value||"";
 return {qid:hit.id,website:String(site||""),url:"https://www.wikidata.org/wiki/"+hit.id};
}
async function localSourcesDiscovery(dbUrl:string,service:string,run:any,actor:string){
 const wd=await wikidataMunicipality(run.comune);let found=0;
 if(!wd?.website)return {subjects_found:0,emails_found:0,pec_found:0,phones_found:0,local_sources:0};
 let origin:string;try{origin=new URL(wd.website).origin}catch{return {subjects_found:0,emails_found:0,pec_found:0,phones_found:0,local_sources:0}}
 const saveLocal=async(type:string,url:string,parser:string,confidence=80)=>{
  await jfetch(dbUrl,service,"f1_email_radar_local_sources?on_conflict=comune,url",{method:"POST",body:JSON.stringify({comune:run.comune,source_type:type,url,provider_key:"FONTI_LOCALI",status:"DISCOVERED",parser_type:parser,confidence,license:"",last_checked:new Date().toISOString()}),headers:{Prefer:"resolution=merge-duplicates,return=minimal"},prefer:"resolution=merge-duplicates,return=minimal"}).catch(()=>{});found++;
 };
 await saveLocal("COMUNE_UFFICIALE",wd.website,"WIKIDATA_P856",85);
 const home=await crawlPage(wd.website);
 const candidates=new Set<string>();
 if(home){for(const h of home.allLinks||[]){try{const u=new URL(h,home.finalUrl);if(u.origin===origin&&/(commerc|attivit|impres|suap|mercat|albo|turism|associa|distrett|negoz|serviz|profession)/i.test(u.pathname+" "+h))candidates.add(u.href)}catch{}}}
 const robot=await fetch(origin+"/robots.txt",{headers:{"User-Agent":"F1-Email-Radar/3.0"}}).then(r=>r.ok?r.text():"").catch(()=>"");
 const sitemaps=uniq([...Array.from(robot.matchAll(/^\s*Sitemap:\s*(\S+)/gim)).map(m=>m[1]),origin+"/sitemap.xml",origin+"/sitemap_index.xml"]).slice(0,4);
 for(const sm of sitemaps){
   const xml=await fetch(sm,{headers:{"User-Agent":"F1-Email-Radar/3.0","Accept":"application/xml,text/xml,*/*"}}).then(r=>r.ok?r.text():"").catch(()=>"");
   for(const m of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)){const u=m[1].replace(/&amp;/g,"&");if(/commerc|attivit|impres|suap|mercat|albo|turism|associa|distrett|negoz|serviz|profession/i.test(u))candidates.add(u)}
 }
 for(const u of [...candidates].slice(0,30))await saveLocal("FONTE_TERRITORIALE",u,"SITEMAP_OR_LINK",75);
 return {subjects_found:0,emails_found:0,pec_found:0,phones_found:0,local_sources:found};
}
async function atecoAnalysis(dbUrl:string,service:string,run:any){
 const divs=await jfetch(dbUrl,service,"f1_ateco_2025?select=code,title_it&level=eq.2&order=code.asc");
 const entities=await jfetch(dbUrl,service,"f1_email_radar_entities?select=ateco_code&comune=eq."+encodeURIComponent(run.comune)+"&limit=5000");
 const rows=(divs||[]).map((d:any)=>{const n=(entities||[]).filter((e:any)=>String(e.ateco_code||"").startsWith(String(d.code))).length;return {run_id:run.run_id,division_code:d.code,division_title:d.title_it,status:n>0?"ANALYZED_WITH_RESULTS":"ANALYZED_NO_RESULTS",entities_count:n,analyzed_at:new Date().toISOString()}});
 if(rows.length)await jfetch(dbUrl,service,"f1_email_radar_ateco_progress?on_conflict=run_id,division_code",{method:"POST",body:JSON.stringify(rows),headers:{Prefer:"resolution=merge-duplicates,return=minimal"},prefer:"resolution=merge-duplicates,return=minimal"});
 await jfetch(dbUrl,service,"f1_email_radar_runs?run_id=eq."+run.run_id,{method:"PATCH",body:JSON.stringify({ateco_total:rows.length,ateco_analyzed:rows.length,last_ateco_code:rows.at(-1)?.division_code||"",ateco_coverage_basis:"87_DIVISIONI_ANALIZZATE_SU_SOGGETTI_SCOPERTI",updated_at:new Date().toISOString()}),prefer:"return=minimal"});
 return {subjects_found:0,emails_found:0,pec_found:0,phones_found:0,divisions:rows.length,with_results:rows.filter((x:any)=>x.entities_count>0).length};
}

async function processWebsites(url:string,service:string,run:any,actor:string){
 const entities=await jfetch(url,service,"f1_email_radar_entities?select=*&comune=eq."+encodeURIComponent(run.comune)+"&website=not.eq.&or=(last_verified_at.is.null,last_verified_at.lt."+encodeURIComponent(new Date(Date.now()-30*86400000).toISOString())+")&order=updated_at.asc&limit=12");
 let done=0,emails=0,pecs=0,phones=0;
 for(const e of entities||[]){
   let base:string;try{base=new URL(/^https?:/i.test(e.website)?e.website:"https://"+e.website).href}catch{continue}
   const first=await crawlPage(base); if(!first) continue;
   const pages:any[]=[{url:first.finalUrl,data:first}];
   const ld=firstJsonLd(first);
   let origin="";try{origin=new URL(first.finalUrl).origin}catch{}
   for(const h of first.links.slice(0,5)){try{const u=new URL(h,first.finalUrl);if(u.origin!==origin)continue;const d=await crawlPage(u.href);if(d)pages.push({url:u.href,data:d})}catch{}}
   const allEmails=uniq(pages.flatMap(p=>p.data.emails||[])), allTels=uniq(pages.flatMap(p=>p.data.tels||[])), vats=uniq(pages.flatMap(p=>p.data.vats||[]));
   if(ld?.email)allEmails.unshift(String(ld.email).replace(/^mailto:/i,"").toLowerCase());
   if(ld?.telephone)allTels.unshift(String(ld.telephone));
   if(ld?.vatID||ld?.taxID)vats.unshift(String(ld.vatID||ld.taxID).replace(/\D/g,""));
   const pec=allEmails.find(pecLike)||"", email=allEmails.find(x=>!pecLike(x))||"";
   const a=ldAddress(ld);const geo=ld?.geo||{};
   const patch:any={updated_at:new Date().toISOString(),last_verified_at:new Date().toISOString(),verification_status:"VERIFICATO",confidence_score:Math.max(Number(e.confidence_score||0),90),field_provenance:{...(e.field_provenance||{}),official_site:{url:first.finalUrl,verified_at:new Date().toISOString(),confidence:90}}};
   if(!e.indirizzo&&a.address)patch.indirizzo=a.address;if(!e.cap&&a.cap)patch.cap=a.cap;
   if(!e.latitude&&geo.latitude&&geo.longitude){patch.latitude=Number(geo.latitude);patch.longitude=Number(geo.longitude);patch.geocoder="JSON_LD";patch.geocoded_at=new Date().toISOString();patch.geocode_precision="STRUCTURED_DATA"}
   if(!e.email&&email){patch.email=email;patch.email_type="EMAIL_GENERICA_AZIENDALE";emails++}
   if(!e.pec&&pec){patch.pec=pec;pecs++}
   if(!e.phone&&!e.mobile&&allTels[0]){patch.phone=allTels[0];phones++}
   if(!e.vat_number&&vats[0])patch.vat_number=vats[0];
   await jfetch(url,service,"f1_email_radar_entities?entity_id=eq."+e.entity_id,{method:"PATCH",body:JSON.stringify(patch),prefer:"return=minimal"});
   const evidence=pages.map(p=>({url:p.url,emails:p.data.emails,tels:p.data.tels,vats:p.data.vats}));
   await jfetch(url,service,"f1_email_radar_sources",{method:"POST",body:JSON.stringify({entity_id:e.entity_id,created_by:actor,source_type:"SITO_UFFICIALE",source_url:first.finalUrl,source_name:"Website crawler",fields_found:{email:!!email,pec:!!pec,phone:!!allTels[0],vat_number:!!vats[0]},evidence,access_status:"OK",verified_at:new Date().toISOString()}),prefer:"resolution=ignore-duplicates,return=minimal"}).catch(()=>{});
   done++;
 }
 const remaining=await jfetch(url,service,"f1_email_radar_entities?select=entity_id&comune=eq."+encodeURIComponent(run.comune)+"&website=not.eq.&or=(last_verified_at.is.null,last_verified_at.lt."+encodeURIComponent(new Date(Date.now()-30*86400000).toISOString())+")&limit=1");
 return {subjects_found:done,emails_found:emails,pec_found:pecs,phones_found:phones,remaining:(remaining||[]).length};
}
async function startRun(url:string,service:string,actor:string,comune:string){
 const rows=await jfetch(url,service,"f1_email_radar_runs",{method:"POST",body:JSON.stringify({created_by:actor,comune,status:"RUNNING",ateco_total:87,ateco_coverage_basis:"87_DIVISIONI_ANALIZZATE_SU_SOGGETTI_SCOPERTI",started_at:new Date().toISOString(),checkpoint:{phase:"providers",provider_index:0}})});
 const run=rows[0],env:any=Deno.env.toObject(),sources=sourceTemplates(env);
 await jfetch(url,service,"f1_email_radar_source_progress",{method:"POST",body:JSON.stringify(sources.map(s=>({run_id:run.run_id,created_by:actor,source_key:s.key,source_label:s.label,status:s.status,provider_class:s.provider_class,sort_order:s.sort_order}))),prefer:"return=minimal"});
 return run;
}

async function updateProgress(url:string,service:string,runId:string,key:string,status:string,stats:any={},error=""){
 const terminal=["COMPLETED","NON_APPLICABILE","OPTIONAL_NOT_CONFIGURED","INTERACTIVE_NOT_REQUIRED"];
 await jfetch(url,service,"f1_email_radar_source_progress?run_id=eq."+runId+"&source_key=eq."+key,{method:"PATCH",body:JSON.stringify({status,...stats,error,completed_at:terminal.includes(status)?new Date().toISOString():null,updated_at:new Date().toISOString()}),prefer:"return=minimal"});
}

async function recalc(url:string,service:string,runId:string){return await jfetch(url,service,"rpc/f1_email_radar_recalc_run",{method:"POST",body:JSON.stringify({p_run_id:runId})})}
async function finalizeIfIdle(url:string,service:string,runId:string){
 const progress=await jfetch(url,service,"f1_email_radar_source_progress?select=*&run_id=eq."+runId+"&order=sort_order.asc");
 const fresh=await recalc(url,service,runId);
 const required=(progress||[]).filter((p:any)=>p.provider_class==="REQUIRED_AUTOMATABLE");
 const pendingRequired=required.filter((p:any)=>!["COMPLETED","NON_APPLICABILE"].includes(p.status));
 const complete=pendingRequired.length===0&&Number(fresh?.ateco_coverage||0)>=100;
 const status=complete?"COMPLETED":((progress||[]).some((p:any)=>p.status==="FAILED")?"FAILED":"INCOMPLETE");
 await jfetch(url,service,"f1_email_radar_runs?run_id=eq."+runId,{method:"PATCH",body:JSON.stringify({status,completed_at:complete?new Date().toISOString():null,updated_at:new Date().toISOString()}),prefer:"return=minimal"});
 const rows=await jfetch(url,service,"f1_email_radar_runs?select=*&run_id=eq."+runId+"&limit=1");const run=rows?.[0]||fresh;
 if(complete){
   await jfetch(url,service,"f1_email_radar_municipality_queue?comune=eq."+encodeURIComponent(run.comune),{method:"PATCH",body:JSON.stringify({status:"DONE",last_run_id:run.run_id,last_run_at:new Date().toISOString(),updated_at:new Date().toISOString()}),prefer:"return=minimal"}).catch(()=>{});
   if(String(run.comune).toLowerCase()==="avigliana")await jfetch(url,service,"f1_email_radar_municipality_queue?status=eq.WAITING_PILOT",{method:"PATCH",body:JSON.stringify({status:"READY",updated_at:new Date().toISOString()}),prefer:"return=minimal"}).catch(()=>{});
 }
 return run;
}


async function prepareResumeProviders(url:string,service:string,run:any,forceWebsite=false){
 const now=Date.now();const progress=await jfetch(url,service,"f1_email_radar_source_progress?select=*&run_id=eq."+run.run_id+"&order=sort_order.asc");
 for(const p of progress||[]){
  let requeue=false;
  if(p.provider_class==="REQUIRED_AUTOMATABLE"&&["INCOMPLETE","FAILED","COOLDOWN"].includes(p.status)){
    if(!p.next_retry_at||Date.parse(p.next_retry_at)<=now)requeue=true;
  }
  if(p.source_key==="SITI_UFFICIALI"&&p.status==="COMPLETED"&&forceWebsite)requeue=true;
  if(requeue)await jfetch(url,service,"f1_email_radar_source_progress?progress_id=eq."+p.progress_id,{method:"PATCH",body:JSON.stringify({status:"PENDING",error:"",completed_at:null,updated_at:new Date().toISOString()}),prefer:"return=minimal"});
 }
 await jfetch(url,service,"f1_email_radar_runs?run_id=eq."+run.run_id,{method:"PATCH",body:JSON.stringify({status:"RUNNING",requested_action:"",updated_at:new Date().toISOString()}),prefer:"return=minimal"});
 const rr=await jfetch(url,service,"f1_email_radar_runs?select=*&run_id=eq."+run.run_id+"&limit=1");return rr?.[0]||run;
}

async function processRun(url:string,service:string,run:any,actor:string){
 if(run.requested_action==="PAUSE"||run.status==="PAUSED")return run;
 if(run.requested_action==="STOP"){await jfetch(url,service,"f1_email_radar_runs?run_id=eq."+run.run_id,{method:"PATCH",body:JSON.stringify({status:"STOPPED",updated_at:new Date().toISOString()}),prefer:"return=minimal"});return {...run,status:"STOPPED"}}
 const prog=await jfetch(url,service,"f1_email_radar_source_progress?select=*&run_id=eq."+run.run_id+"&order=sort_order.asc");
 const next=(prog||[]).find((p:any)=>p.provider_class==="REQUIRED_AUTOMATABLE"&&p.status==="PENDING");
 if(!next)return await finalizeIfIdle(url,service,run.run_id);
 await updateProgress(url,service,run.run_id,next.source_key,"RUNNING",{last_started_at:new Date().toISOString()});
 try{
  if(next.source_key==="OSM_DIRECTORY"){
   const s=await osmDiscovery(url,service,run,actor);
   if(s.cooldown)await updateProgress(url,service,run.run_id,next.source_key,"COOLDOWN",{next_retry_at:s.retry_at},"Circuit breaker / rate limit");
   else await updateProgress(url,service,run.run_id,next.source_key,"COMPLETED",s);
  }else if(next.source_key==="FONTI_LOCALI"){
   const s=await localSourcesDiscovery(url,service,run,actor);await updateProgress(url,service,run.run_id,next.source_key,"COMPLETED",s);
  }else if(next.source_key==="SITI_UFFICIALI"){
   const s=await processWebsites(url,service,run,actor);await updateProgress(url,service,run.run_id,next.source_key,s.remaining?"INCOMPLETE":"COMPLETED",s,s.remaining?"Restano siti da riverificare nel prossimo ciclo.":"");
  }else if(next.source_key==="ATECO_ANALYSIS"){
   const s=await atecoAnalysis(url,service,run);await updateProgress(url,service,run.run_id,next.source_key,"COMPLETED",s);
  }else await updateProgress(url,service,run.run_id,next.source_key,"NON_APPLICABILE",{},"Provider non richiesto dal completion engine zero-credential.");
 }catch(e){
   const p=await jfetch(url,service,"f1_email_radar_source_progress?select=failure_count&run_id=eq."+run.run_id+"&source_key=eq."+next.source_key+"&limit=1");
   const n=Number(p?.[0]?.failure_count||0)+1,delay=Math.min(3600000,30000*Math.pow(2,Math.min(n-1,7)));
   await updateProgress(url,service,run.run_id,next.source_key,n>=3?"COOLDOWN":"FAILED",{failure_count:n,last_failure_at:new Date().toISOString(),next_retry_at:new Date(Date.now()+delay).toISOString()},String((e as any)?.message||e));
 }
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
   else if(latest?.status==="COMPLETED")run=await startRun(url,service,actor.id,comune);
   else run=await startRun(url,service,actor.id,comune);
   run=await processRun(url,service,run,actor.id);
   await jfetch(url,service,"f1_email_radar_municipality_queue?comune=eq."+encodeURIComponent(comune),{method:"PATCH",body:JSON.stringify({last_run_id:run.run_id,last_run_at:new Date().toISOString(),updated_at:new Date().toISOString()}),prefer:"return=minimal"}).catch(()=>{});
  }
  const progress=run?await jfetch(url,service,"f1_email_radar_source_progress?select=*&run_id=eq."+run.run_id+"&order=sort_order.asc"):[];
  return reply({ok:true,action,run,progress,provider_runtime:{osm_zero_credential:true,local_sources_zero_credential:true,official_sites:true,ateco_analysis:true,google_places:!!Deno.env.get("GOOGLE_MAPS_API_KEY"),search:!!Deno.env.get("BRAVE_SEARCH_API_KEY"),registro_imprese:!!Deno.env.get("REGISTRO_IMPRESE_API_BASE")&&!!Deno.env.get("REGISTRO_IMPRESE_API_KEY")}});
 }catch(e){return reply({ok:false,error:"UNEXPECTED",detail:String((e as any)?.message||e)},500)}
});