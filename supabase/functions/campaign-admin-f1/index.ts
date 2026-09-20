import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://josephsocialmedia2-spec.github.io",
  "https://f1immobiliare.com",
  "https://www.f1immobiliare.com"
]);
const ADMIN_EMAIL = "f1immobiliaresusa@outlook.it";
const PROJECT_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SERVICE = createClient(PROJECT_URL, SERVICE_KEY, {auth:{persistSession:false}});
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cors(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}
function json(origin:string|null, body:unknown, status=200){
  return new Response(JSON.stringify(body),{status,headers:{...cors(origin),"Content-Type":"application/json; charset=utf-8"}});
}
function norm(v:unknown){ return String(v ?? "").trim().toLowerCase(); }
function graphConfigured(){
  return Boolean(
    Deno.env.get("MS_GRAPH_CLIENT_ID") &&
    Deno.env.get("MS_GRAPH_CLIENT_SECRET") &&
    Deno.env.get("MS_GRAPH_REFRESH_TOKEN")
  );
}
async function authorize(req:Request){
  const auth=req.headers.get("authorization") ?? "";
  if(!auth.toLowerCase().startsWith("bearer ")) throw new Error("UNAUTHORIZED");
  const client=createClient(PROJECT_URL,ANON_KEY,{auth:{persistSession:false},global:{headers:{Authorization:auth}}});
  const {data,error}=await client.auth.getUser();
  if(error || !data.user || norm(data.user.email)!==ADMIN_EMAIL) throw new Error("FORBIDDEN");
  return data.user;
}
async function campaignByKey(key:string){
  const {data,error}=await SERVICE.from("email_campaigns").select("*").eq("brand","f1").eq("campaign_key",key).eq("is_test",false).maybeSingle();
  if(error) throw error;
  if(!data) throw new Error("CAMPAIGN_NOT_FOUND");
  return data;
}
async function refreshCounts(campaignId:string){
  const statuses = ["pending","not_authorized","suppressed","queued","sending","sent","delivered","opened","clicked","replied","bounced","hard_bounce","failed","unsubscribed","lead"];
  const counts:Record<string,number>={};
  for(const s of statuses){
    const {count}=await SERVICE.from("email_campaign_recipients").select("id",{count:"exact",head:true}).eq("campaign_id",campaignId).eq("status",s);
    counts[s]=count ?? 0;
  }
  const total=Object.values(counts).reduce((a,b)=>a+b,0);
  const authorized = counts.pending+counts.queued+counts.sending+counts.sent+counts.delivered+counts.opened+counts.clicked+counts.replied+counts.bounced+counts.failed+counts.lead;
  const excluded = counts.not_authorized+counts.suppressed+counts.hard_bounce+counts.unsubscribed;
  const sent = counts.sent+counts.delivered+counts.opened+counts.clicked+counts.replied+counts.bounced+counts.hard_bounce+counts.unsubscribed+counts.lead;
  const delivered = counts.delivered+counts.opened+counts.clicked+counts.replied+counts.unsubscribed+counts.lead;
  const opened = counts.opened+counts.clicked+counts.replied+counts.lead;
  const clicked = counts.clicked+counts.lead;
  const bounced = counts.bounced+counts.hard_bounce;
  const unsub = counts.unsubscribed;
  const leads = counts.lead;
  await SERVICE.from("email_campaigns").update({
    total_recipients:total,authorized_count:authorized,excluded_count:excluded,
    sent_count:sent,delivered_count:delivered,bounce_count:bounced,
    open_count:opened,click_count:clicked,unsubscribe_count:unsub,lead_count:leads,
    updated_at:new Date().toISOString()
  }).eq("id",campaignId);
  return {total,authorized,excluded,sent,delivered,opened,clicked,bounced,unsubscribed:unsub,leads,counts};
}
async function graphAccessToken(){
  const clientId=Deno.env.get("MS_GRAPH_CLIENT_ID") ?? "";
  const secret=Deno.env.get("MS_GRAPH_CLIENT_SECRET") ?? "";
  const refresh=Deno.env.get("MS_GRAPH_REFRESH_TOKEN") ?? "";
  if(!clientId || !secret || !refresh) throw new Error("MICROSOFT_NOT_CONFIGURED");
  const body=new URLSearchParams({
    client_id:clientId,
    client_secret:secret,
    grant_type:"refresh_token",
    refresh_token:refresh,
    scope:"offline_access Mail.Send openid profile"
  });
  const r=await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok || !data.access_token) throw new Error("MICROSOFT_TOKEN_ERROR");
  return String(data.access_token);
}
function render(template:string, vars:Record<string,string>){
  let out=template;
  for(const [k,v] of Object.entries(vars)) out=out.split("{{"+k+"}}").join(v);
  return out;
}
async function sendOne(accessToken:string,campaign:any,recipient:any){
  const token=String(recipient.unsubscribe_token);
  const base=PROJECT_URL+"/functions/v1";
  // Privacy-by-default: CTA direct to the requested service form.
  // Individual open-pixel tracking is disabled unless a future consent mechanism
  // explicitly covers it and supports granular withdrawal.
  const click="https://josephsocialmedia2-spec.github.io/DIGITALSTRATEGIST/campagna-email-f1/valutazione.html?cr="+encodeURIComponent(token);
  const unsub=base+"/campaign-unsubscribe-f1?t="+encodeURIComponent(token);
  const greeting=recipient.first_name ? "Buongiorno "+recipient.first_name+"," : "Buongiorno,";
  const vars={CLICK_URL:click,UNSUBSCRIBE_URL:unsub,OPEN_PIXEL_URL:"",GREETING:greeting};
  const html=render(campaign.html_content,vars);
  const text=render(campaign.text_content,vars);
  const clientRequestId=crypto.randomUUID();
  const r=await fetch("https://graph.microsoft.com/v1.0/me/sendMail",{
    method:"POST",
    headers:{
      "Authorization":"Bearer "+accessToken,
      "Content-Type":"application/json",
      "client-request-id":clientRequestId,
      "return-client-request-id":"true"
    },
    body:JSON.stringify({
      message:{
        subject:campaign.subject,
        body:{contentType:"HTML",content:html},
        toRecipients:[{emailAddress:{address:recipient.email}}],
        internetMessageHeaders:[{name:"X-F1-Campaign",value:campaign.campaign_key}]
      },
      saveToSentItems:true
    })
  });
  if(!r.ok){
    const detail=(await r.text()).slice(0,1200);
    const e:any=new Error("GRAPH_SEND_FAILED");
    e.status=r.status; e.detail=detail; e.retryAfter=r.headers.get("retry-after");
    throw e;
  }
  return {clientRequestId,text};
}

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS"){
    if(!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null,{status:403});
    return new Response("ok",{headers:cors(origin)});
  }
  if(req.method!=="POST") return json(origin,{error:"Metodo non consentito"},405);
  if(!origin || !ALLOWED_ORIGINS.has(origin)) return json(origin,{error:"Origine non consentita"},403);

  let user:any;
  try{ user=await authorize(req); }
  catch(e){ return json(origin,{error:String((e as Error).message)},403); }

  let p:any={};
  try{ p=await req.json(); }catch{ return json(origin,{error:"JSON non valido"},400); }
  const action=String(p.action||"");
  const campaignKey=String(p.campaign_key||"valutazione-gratuita-2026-09");

  try{
    const campaign=await campaignByKey(campaignKey);

    if(action==="status"){
      const stats=await refreshCounts(campaign.id);
      const {data:latest}=await SERVICE.from("email_campaign_events").select("event_type,detail,created_at").eq("campaign_id",campaign.id).order("created_at",{ascending:false}).limit(25);
      return json(origin,{ok:true,campaign:{...campaign,html_content:undefined,text_content:undefined},stats,provider:{name:"Microsoft Graph",configured:graphConfigured(),sender:"F1IMMOBILIARESUSA@OUTLOOK.IT"},events:latest||[]});
    }

    if(action==="crm_contacts"){
      const {data:contacts,error}=await SERVICE.from("email_marketing_contacts")
        .select("email,first_name,last_name,consent_f1,status")
        .eq("consent_f1",true)
        .not("email","is",null)
        .order("updated_at",{ascending:false})
        .limit(5000);
      if(error) throw error;
      const items=(contacts||[])
        .filter((x:any)=>EMAIL_RE.test(norm(x.email)))
        .map((x:any)=>({email:norm(x.email),first_name:x.first_name||"",last_name:x.last_name||""}));
      return json(origin,{ok:true,items});
    }

    if(action==="import"){
      const input=Array.isArray(p.recipients)?p.recipients:[];
      if(input.length>1000) return json(origin,{error:"Massimo 1000 righe per blocco"},400);
      const seen=new Set<string>();
      const valid:any[]=[]; let invalid=0,duplicates=0;
      for(const raw of input){
        const obj=typeof raw==="string"?{email:raw}:raw||{};
        const email=norm(obj.email);
        if(!EMAIL_RE.test(email)){invalid++;continue;}
        if(seen.has(email)){duplicates++;continue;}
        seen.add(email);
        valid.push({email,first_name:String(obj.first_name||obj.nome||"").trim().slice(0,100),last_name:String(obj.last_name||obj.cognome||"").trim().slice(0,100),source_row:obj});
      }
      const emails=valid.map(x=>x.email);
      const contactMap=new Map<string,any>();
      const suppression=new Set<string>();
      const existingMap=new Map<string,any>();
      if(emails.length){
        const {data:contacts}=await SERVICE.from("email_marketing_contacts").select("id,email_normalized,first_name,last_name,consent_f1,status").in("email_normalized",emails);
        for(const c of contacts||[]) contactMap.set(norm(c.email_normalized),c);
        const {data:sups}=await SERVICE.from("email_suppression_list").select("email_normalized,brand").in("email_normalized",emails).in("brand",["f1","all"]);
        for(const s of sups||[]) suppression.add(norm(s.email_normalized));
        const {data:existingRows}=await SERVICE.from("email_campaign_recipients").select("id,email_normalized,status,sent_at,unsubscribe_token,retry_count").eq("campaign_id",campaign.id).in("email_normalized",emails);
        for(const e of existingRows||[]) existingMap.set(norm(e.email_normalized),e);
      }

      const terminalStatuses=new Set(["sent","delivered","opened","clicked","replied","lead","unsubscribed","hard_bounce"]);
      let authorized=0,notAuthorized=0,suppressed=0,alreadySent=0;
      const rows:any[]=[];
      for(const item of valid){
        const c=contactMap.get(item.email);
        const existing=existingMap.get(item.email);
        if(existing && terminalStatuses.has(existing.status)){
          alreadySent++;
          continue;
        }

        let status="pending", reason="AUTHORIZED";
        if(suppression.has(item.email)){status="suppressed";reason="SUPPRESSION_LIST";suppressed++;}
        else if(!c){status="not_authorized";reason="NO_F1_CONTACT_OR_CONSENT";notAuthorized++;}
        else if(c.consent_f1!==true){status="not_authorized";reason="F1_CONSENT_NOT_ACTIVE";notAuthorized++;}
        else if(["blocked","hard_bounce","unsubscribed"].includes(norm(c.status))){status="suppressed";reason="CONTACT_BLOCKED";suppressed++;}
        else authorized++;

        rows.push({
          campaign_id:campaign.id,contact_id:c?.id||null,email:item.email,
          first_name:item.first_name||c?.first_name||null,last_name:item.last_name||c?.last_name||null,
          status,eligibility_reason:reason,source_row:item.source_row||{},
          retry_count: existing?.retry_count || 0
        });
      }
      if(rows.length){
        const {error}=await SERVICE.from("email_campaign_recipients").upsert(rows,{onConflict:"campaign_id,email_normalized"});
        if(error) throw error;
      }
      await SERVICE.from("email_campaign_events").insert({
        campaign_id:campaign.id,event_type:"IMPORT",
        detail:{by:user.email,received:input.length,valid:valid.length,invalid,duplicates,authorized,not_authorized:notAuthorized,suppressed,already_sent:alreadySent}
      });
      const stats=await refreshCounts(campaign.id);
      return json(origin,{ok:true,import:{received:input.length,valid:valid.length,invalid,duplicates,authorized,not_authorized:notAuthorized,suppressed,already_sent:alreadySent},stats});
    }

    if(action==="send_test"){
      const email=norm(p.email);
      if(!EMAIL_RE.test(email)) return json(origin,{error:"Email di test non valida"},400);
      const access=await graphAccessToken();
      const fake={email,first_name:String(p.first_name||"").trim(),unsubscribe_token:crypto.randomUUID()};
      const result=await sendOne(access,campaign,fake);
      await SERVICE.from("email_campaign_events").insert({campaign_id:campaign.id,event_type:"TEST_SENT",detail:{by:user.email,email,client_request_id:result.clientRequestId}});
      return json(origin,{ok:true,test_sent:true,email});
    }

    if(action==="start"){
      if(!graphConfigured()) return json(origin,{error:"MICROSOFT_NOT_CONFIGURED",message:"Microsoft Graph non è ancora autorizzato per F1IMMOBILIARESUSA@OUTLOOK.IT"},503);
      const access=await graphAccessToken();
      await SERVICE.from("email_campaigns").update({status:"sending",started_at:campaign.started_at||new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()}).eq("id",campaign.id);
      const {data:batch,error:batchErr}=await SERVICE.from("email_campaign_recipients")
        .select("id,email,first_name,last_name,status,retry_count,unsubscribe_token")
        .eq("campaign_id",campaign.id)
        .in("status",["pending","queued","failed"])
        .lt("retry_count",3)
        .order("imported_at",{ascending:true})
        .limit(20);
      if(batchErr) throw batchErr;
      let sent=0,failed=0;
      for(const rcp of batch||[]){
        await SERVICE.from("email_campaign_recipients").update({status:"sending",updated_at:new Date().toISOString()}).eq("id",rcp.id);
        try{
          const out=await sendOne(access,campaign,rcp);
          await SERVICE.from("email_campaign_recipients").update({
            status:"sent",provider_message_id:out.clientRequestId,sent_at:new Date().toISOString(),error:null,updated_at:new Date().toISOString()
          }).eq("id",rcp.id);
          await SERVICE.from("email_campaign_events").insert({campaign_id:campaign.id,recipient_id:rcp.id,event_type:"SENT",detail:{client_request_id:out.clientRequestId}});
          sent++;
          await new Promise(resolve=>setTimeout(resolve,350));
        }catch(e:any){
          const retry=(rcp.retry_count||0)+1;
          const hard=e?.status>=400 && e?.status<500 && ![408,429].includes(e?.status);
          await SERVICE.from("email_campaign_recipients").update({
            status:hard?"hard_bounce":"failed",retry_count:retry,error:String(e?.detail||e?.message||"SEND_FAILED").slice(0,1200),bounced_at:hard?new Date().toISOString():null,updated_at:new Date().toISOString()
          }).eq("id",rcp.id);
          if(hard){
            await SERVICE.from("email_suppression_list").upsert({email:rcp.email,brand:"f1",reason:"HARD_BOUNCE_OR_PERMANENT_SEND_ERROR",source:"campaign-send-f1"},{onConflict:"brand,email_normalized"});
          }
          await SERVICE.from("email_campaign_events").insert({campaign_id:campaign.id,recipient_id:rcp.id,event_type:hard?"HARD_BOUNCE":"SEND_FAILED",detail:{status:e?.status||null,error:String(e?.detail||e?.message||"").slice(0,1000)}});
          failed++;
          if(e?.status===429) await new Promise(resolve=>setTimeout(resolve,1500));
        }
      }
      const {count:remaining}=await SERVICE.from("email_campaign_recipients").select("id",{count:"exact",head:true}).eq("campaign_id",campaign.id).in("status",["pending","queued","failed"]).lt("retry_count",3);
      const done=(remaining??0)===0;
      await SERVICE.from("email_campaigns").update({status:done?"completed":"sending",completed_at:done?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",campaign.id);
      const stats=await refreshCounts(campaign.id);
      return json(origin,{ok:true,batch:{sent,failed,remaining:remaining??0,done},stats});
    }

    return json(origin,{error:"Azione non valida"},400);
  }catch(e:any){
    return json(origin,{error:String(e?.message||"Errore interno")},500);
  }
});