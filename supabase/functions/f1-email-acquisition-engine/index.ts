import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PROJECT_URL=Deno.env.get("SUPABASE_URL")||"";
const ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")||"";
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const ALLOWED_ORIGINS=new Set([
  "https://josephsocialmedia2-spec.github.io",
  "https://f1immobiliare.com",
  "https://www.f1immobiliare.com"
]);
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function cors(origin:string|null){
  return {
    "Access-Control-Allow-Origin":origin&&ALLOWED_ORIGINS.has(origin)?origin:"",
    "Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type, x-f1-cron-token",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Vary":"Origin"
  };
}
function reply(origin:string|null,body:any,status=200){
  return new Response(JSON.stringify(body),{status,headers:{...cors(origin),"Content-Type":"application/json; charset=utf-8"}});
}
function norm(v:any){return String(v??"").trim().toLowerCase();}
async function sha256(s:string){
  const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function db(path:string,opt:any={}){
  const r=await fetch(PROJECT_URL+"/rest/v1/"+path,{
    ...opt,
    headers:{
      apikey:SERVICE_KEY,
      Authorization:"Bearer "+SERVICE_KEY,
      "Content-Type":"application/json",
      Prefer:opt.prefer||"return=representation",
      ...(opt.headers||{})
    }
  });
  const txt=await r.text();
  if(!r.ok) throw new Error("DB_"+r.status+":"+txt.slice(0,1200));
  return txt?JSON.parse(txt):null;
}
async function auth(req:Request){
  const bearer=req.headers.get("authorization")||"";
  if(bearer.toLowerCase().startsWith("bearer ")){
    const u=await fetch(PROJECT_URL+"/auth/v1/user",{headers:{apikey:ANON_KEY,Authorization:bearer}});
    if(u.ok){
      const user=await u.json();
      if(user?.id){
        const rows=await db("f1_staff_profiles?select=user_id,role,status&user_id=eq."+encodeURIComponent(user.id)+"&status=eq.ACTIVE&limit=1");
        if(rows?.[0]) return {id:user.id,email:user.email||"",role:rows[0].role,cron:false};
      }
    }
  }
  const token=req.headers.get("x-f1-cron-token")||"";
  if(token){
    const rows=await db("f1_email_radar_runtime_config?select=value&key=eq.cron_token_sha256&limit=1");
    if(rows?.[0]?.value && await sha256(token)===rows[0].value){
      const owners=await db("f1_staff_profiles?select=user_id,role&status=eq.ACTIVE&role=eq.TITOLARE&limit=1");
      if(owners?.[0]) return {id:owners[0].user_id,email:"cron@f1.local",role:"CRON",cron:true};
    }
  }
  return null;
}
async function config(){
  const rows=await db("f1_email_radar_runtime_config?select=key,value&key=in.(acquisition_active_campaign_key,acquisition_send_enabled,acquisition_compliance_mode,acquisition_followup_days,acquisition_max_daily_contacts)");
  const out:any={};
  for(const r of rows||[]) out[r.key]=r.value;
  return {
    activeCampaignKey:String(out.acquisition_active_campaign_key||""),
    sendEnabled:String(out.acquisition_send_enabled||"false")==="true",
    complianceMode:String(out.acquisition_compliance_mode||"STRICT_CONSENT"),
    followupDays:String(out.acquisition_followup_days||"0,3,7,14"),
    maxDailyContacts:Number(out.acquisition_max_daily_contacts||20)
  };
}
function dataQuality(e:any){
  let s=0;
  if(e.verification_status==="VERIFICATO")s+=30;
  else if(e.verification_status==="PARZIALMENTE_VERIFICATO")s+=18;
  if(e.email)s+=20;
  if(e.email && e.email_type!=="EMAIL_NON_VERIFICATA")s+=10;
  if(e.phone||e.mobile)s+=10;
  if(e.website)s+=10;
  if(e.vat_number)s+=10;
  if(e.ateco_code)s+=10;
  return Math.min(100,s);
}
function recencyScore(e:any){
  const raw=e.last_verified_at||e.updated_at||e.first_seen_at;
  const ts=raw?Date.parse(raw):NaN;
  if(!Number.isFinite(ts))return null;
  const days=Math.max(0,(Date.now()-ts)/86400000);
  if(days<=7)return 100;
  if(days<=30)return 80;
  if(days<=90)return 60;
  if(days<=180)return 40;
  return 20;
}
function campaignCompleteness(c:any){
  const a=c?.metadata?.acquisition||{};
  const required=["offer","target","icp","buyer_persona","area_geografica","value_proposition","cta"];
  const missing=required.filter(k=>{
    const v=a[k];
    return v==null || v==="" || (Array.isArray(v)&&v.length===0) || (typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===0);
  });
  return {ready:missing.length===0,missing,meta:a};
}
function scoreIcp(e:any,meta:any){
  const cfg=meta?.icp||{};
  const ateco=Array.isArray(cfg.ateco_prefixes)?cfg.ateco_prefixes.map((x:any)=>String(x)):[];
  const comuni=Array.isArray(meta?.area_geografica)?meta.area_geografica.map((x:any)=>String(x).toLowerCase()):[];
  if(!ateco.length&&!comuni.length)return null;
  let num=0,den=0;
  if(ateco.length){den+=60;if(ateco.some((p:string)=>String(e.ateco_code||"").startsWith(p)))num+=60;}
  if(comuni.length){den+=40;if(comuni.includes(String(e.comune||"").toLowerCase()))num+=40;}
  return den?Math.round(num/den*100):null;
}
function graphConfigured(){
  return Boolean(Deno.env.get("MS_GRAPH_CLIENT_ID")&&Deno.env.get("MS_GRAPH_CLIENT_SECRET")&&Deno.env.get("MS_GRAPH_REFRESH_TOKEN"));
}
async function currentCampaign(key:string){
  if(!key)return null;
  const rows=await db("email_campaigns?select=id,campaign_key,name,status,metadata&brand=eq.f1&campaign_key=eq."+encodeURIComponent(key)+"&is_test=eq.false&limit=1");
  return rows?.[0]||null;
}
async function cycle(actor:any){
  const cfg=await config();
  const campaign=await currentCampaign(cfg.activeCampaignKey);
  const ccheck=campaignCompleteness(campaign);
  const campaignKey=cfg.activeCampaignKey||"_RESEARCH_";

  const [entities,contacts,sups,existing]=await Promise.all([
    db("f1_email_radar_entities?select=*&order=updated_at.desc&limit=5000"),
    db("email_marketing_contacts?select=id,email_normalized,consent_f1,status,updated_at&source_brand=eq.f1&limit=5000"),
    db("email_suppression_list?select=email_normalized,brand,reason&brand=in.(f1,all)&limit=5000"),
    db("f1_email_acquisition_leads?select=acquisition_id,entity_id,campaign_key,state,compliance_status,email_status,do_not_contact&campaign_key=eq."+encodeURIComponent(campaignKey)+"&limit=5000")
  ]);

  const contactMap=new Map((contacts||[]).map((x:any)=>[norm(x.email_normalized),x]));
  const supMap=new Map((sups||[]).map((x:any)=>[norm(x.email_normalized),x]));
  const oldMap=new Map((existing||[]).map((x:any)=>[String(x.entity_id),x]));

  let created=0,updated=0,ready=0,consentRequired=0,suppressed=0,noEmail=0,pecOnly=0;
  for(const e of entities||[]){
    const email=norm(e.email);
    const c=email?contactMap.get(email):null;
    const sup=email?supMap.get(email):null;

    let emailStatus="NON_VERIFICATA";
    if(email && EMAIL_RE.test(email) && e.verification_status==="VERIFICATO" && e.email_type!=="EMAIL_NON_VERIFICATA")emailStatus="VERIFICATA";
    else if(email && EMAIL_RE.test(email))emailStatus="RISCHIOSA";
    else if(email)emailStatus="INVALIDA";

    let compliance="REVIEW_REQUIRED",basis="",dnc=false,state="DATA_CHECK",nextAction="",qualification="PENDING";
    if(e.marketing_status==="NON_USARE_MARKETING"){
      compliance="DO_NOT_CONTACT";basis="RADAR_NON_USARE_MARKETING";dnc=true;state="DO_NOT_CONTACT";nextAction="NESSUN CONTATTO";
    }else if(sup || ["blocked","hard_bounce","unsubscribed"].includes(norm(c?.status))){
      compliance="SUPPRESSED";basis=sup?.reason||"CONTACT_BLOCKED";dnc=true;state="DO_NOT_CONTACT";emailStatus="SOPPRESSA";nextAction="NESSUN CONTATTO";suppressed++;
    }else if(!email && e.pec){
      compliance="PEC_ONLY";basis="PEC_NON_USATA_PER_MARKETING";state="PAUSED";nextAction="CERCARE EMAIL ORDINARIA AUTORIZZATA";pecOnly++;
    }else if(!email){
      compliance="NO_EMAIL";basis="EMAIL_ASSENTE";state="DATA_CHECK";nextAction="ARRICCHIMENTO DATI";noEmail++;
    }else if(c?.consent_f1===true){
      compliance="ELIGIBLE_CONSENT";basis="CONSENT_F1_ACTIVE";
      if(ccheck.ready && graphConfigured() && cfg.sendEnabled){
        state="READY";qualification="QUALIFIED";nextAction="IMPORTA NELLA CAMPAGNA AUTORIZZATA";ready++;
      }else{
        state="PAUSED";qualification=ccheck.ready?"QUALIFIED":"BLOCKED_CONFIGURATION";
        nextAction=!ccheck.ready?"CONFIGURA CAMPAGNA B2B":(!graphConfigured()?"COLLEGA MICROSOFT GRAPH":"ABILITA INVIO CAMPAGNA");
      }
    }else if(e.marketing_status==="CLIENTE_ESISTENTE" || e.marketing_status==="SOFT_SPAM_DA_VALUTARE"){
      compliance="REVIEW_SOFT_SPAM";basis="SOFT_SPAM_RICHIEDE_VERIFICA REQUISITI";state="PAUSED";qualification=ccheck.ready?"QUALIFIED":"BLOCKED_CONFIGURATION";nextAction="VERIFICA SOFT SPAM";
    }else{
      compliance="CONSENT_REQUIRED";basis="PUBLIC_EMAIL_NOT_MARKETING_PERMISSION";state="PAUSED";qualification=ccheck.ready?"QUALIFIED":"BLOCKED_CONFIGURATION";nextAction="OTTENERE BASE GIURIDICA / CONSENSO";consentRequired++;
    }

    const dq=dataQuality(e), rec=recencyScore(e), icp=ccheck.ready?scoreIcp(e,ccheck.meta):null;
    const priority=(ccheck.ready && icp!=null)?Math.round(icp*0.6+dq*0.25+(rec??0)*0.15):null;
    const payload:any={
      entity_id:e.entity_id,campaign_key:campaignKey,campaign_id:campaign?.id||null,contact_id:c?.id||null,
      company_name:e.denomination||e.legal_name||"",email,email_status:emailStatus,state,qualification_status:qualification,
      compliance_status:compliance,compliance_basis:basis,do_not_contact:dnc,icp_score:icp,
      buyer_persona_score:null,trigger_score:null,recency_score:rec,data_quality_score:dq,economic_potential_score:null,
      lead_priority_score:priority,next_action:nextAction,next_action_at:null,owner:"F1",updated_at:new Date().toISOString(),
      metadata:{
        source_type:e.primary_source_type||"",source_url:e.primary_source_url||"",marketing_status:e.marketing_status||"",
        comune:e.comune||"",ateco_code:e.ateco_code||"",verification_status:e.verification_status||"",
        campaign_ready:ccheck.ready,campaign_missing:ccheck.missing
      }
    };
    const old=oldMap.get(String(e.entity_id));
    const rows=await db("f1_email_acquisition_leads?on_conflict=entity_id,campaign_key",{
      method:"POST",body:JSON.stringify(payload),prefer:"resolution=merge-duplicates,return=representation"
    });
    const cur=rows?.[0];
    if(!old)created++;else updated++;
    if(cur && (!old || old.state!==cur.state || old.compliance_status!==cur.compliance_status || old.email_status!==cur.email_status || old.do_not_contact!==cur.do_not_contact)){
      await db("f1_email_acquisition_events",{method:"POST",body:JSON.stringify({
        acquisition_id:cur.acquisition_id,entity_id:e.entity_id,campaign_key:campaignKey,
        event_type:old?"STATE_REFRESH":"ACQUISITION_CREATED",
        reason:basis,detail:{actor:actor.email||actor.role,from:old?{state:old.state,compliance:old.compliance_status}:null,to:{state,compliance,email_status:emailStatus}}
      }),prefer:"return=minimal"});
    }
  }

  const leads=await db("f1_email_acquisition_leads?select=state,compliance_status,email_status,do_not_contact&campaign_key=eq."+encodeURIComponent(campaignKey)+"&limit=5000");
  const counts:any={contacts:(leads||[]).length,ready:0,consent_required:0,suppressed:0,do_not_contact:0,no_email:0,pec_only:0};
  for(const l of leads||[]){
    if(l.state==="READY")counts.ready++;
    if(l.compliance_status==="CONSENT_REQUIRED")counts.consent_required++;
    if(l.compliance_status==="SUPPRESSED")counts.suppressed++;
    if(l.do_not_contact)counts.do_not_contact++;
    if(l.compliance_status==="NO_EMAIL")counts.no_email++;
    if(l.compliance_status==="PEC_ONLY")counts.pec_only++;
  }
  await db("f1_email_acquisition_kpi_snapshots",{method:"POST",body:JSON.stringify({
    campaign_key:campaignKey,contacts:counts.contacts,ready:counts.ready,consent_required:counts.consent_required,suppressed:counts.suppressed,
    metrics:{do_not_contact:counts.do_not_contact,no_email:counts.no_email,pec_only:counts.pec_only,campaign_ready:ccheck.ready,campaign_missing:ccheck.missing,provider_configured:graphConfigured(),send_enabled:cfg.sendEnabled}
  }),prefer:"return=minimal"});

  return {cfg,campaign:campaign?{campaign_key:campaign.campaign_key,name:campaign.name,status:campaign.status}:null,campaign_check:ccheck,provider:{name:"Microsoft Graph",configured:graphConfigured()},counts,processed:(entities||[]).length,created,updated};
}
async function status(){
  const cfg=await config();
  const campaign=await currentCampaign(cfg.activeCampaignKey);
  const ccheck=campaignCompleteness(campaign);
  const key=cfg.activeCampaignKey||"_RESEARCH_";
  const leads=await db("f1_email_acquisition_leads?select=state,compliance_status,email_status,do_not_contact,data_quality_score,lead_priority_score&campaign_key=eq."+encodeURIComponent(key)+"&limit=5000");
  const counts:any={contacts:(leads||[]).length,ready:0,consent_required:0,suppressed:0,do_not_contact:0,no_email:0,pec_only:0,verified_email:0,risky_email:0};
  let dq=0,dqn=0;
  for(const l of leads||[]){
    if(l.state==="READY")counts.ready++;
    if(l.compliance_status==="CONSENT_REQUIRED")counts.consent_required++;
    if(l.compliance_status==="SUPPRESSED")counts.suppressed++;
    if(l.do_not_contact)counts.do_not_contact++;
    if(l.compliance_status==="NO_EMAIL")counts.no_email++;
    if(l.compliance_status==="PEC_ONLY")counts.pec_only++;
    if(l.email_status==="VERIFICATA")counts.verified_email++;
    if(l.email_status==="RISCHIOSA")counts.risky_email++;
    if(l.data_quality_score!=null){dq+=Number(l.data_quality_score);dqn++;}
  }
  return {
    cfg,campaign:campaign?{campaign_key:campaign.campaign_key,name:campaign.name,status:campaign.status}:null,
    campaign_check:ccheck,provider:{name:"Microsoft Graph",configured:graphConfigured(),sender:"F1IMMOBILIARESUSA@OUTLOOK.IT"},
    counts,avg_data_quality:dqn?Math.round(dq/dqn):0,
    blockers:[
      ...(!ccheck.ready?["CAMPAIGN_CONFIG_REQUIRED"]:[]),
      ...(!graphConfigured()?["MICROSOFT_GRAPH_NOT_CONFIGURED"]:[]),
      ...(counts.ready===0?["NO_COMPLIANT_READY_RECIPIENTS"]:[])
    ]
  };
}

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS"){
    if(origin && !ALLOWED_ORIGINS.has(origin))return new Response(null,{status:403});
    return new Response("ok",{headers:cors(origin)});
  }
  if(req.method!=="POST")return reply(origin,{error:"METHOD_NOT_ALLOWED"},405);
  if(origin && !ALLOWED_ORIGINS.has(origin))return reply(origin,{error:"ORIGIN_NOT_ALLOWED"},403);

  const actor=await auth(req);
  if(!actor)return reply(origin,{error:"UNAUTHORIZED"},401);
  let p:any={};try{p=await req.json()}catch{}
  const action=String(p.action||"STATUS").toUpperCase();
  try{
    if(action==="CYCLE"||action==="CRON")return reply(origin,{ok:true,action,result:await cycle(actor)});
    if(action==="STATUS"||action==="REPORT")return reply(origin,{ok:true,action,result:await status()});
    return reply(origin,{error:"INVALID_ACTION"},400);
  }catch(e:any){
    return reply(origin,{error:"ENGINE_ERROR",detail:String(e?.message||e).slice(0,1600)},500);
  }
});