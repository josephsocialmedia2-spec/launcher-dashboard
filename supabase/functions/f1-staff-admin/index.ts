import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";
const BASE=Deno.env.get("SUPABASE_URL")||"https://nqnmlsmeiynxbdojeyjt.supabase.co";
const KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Max-Age":"86400"};
const H={...CORS,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
const out=(s:number,b:unknown)=>new Response(JSON.stringify(b),{status:s,headers:H});
const clean=(v:any,n=300)=>String(v??"").trim().slice(0,n);
const roles=new Set(["TITOLARE","RESPONSABILE","FUNZIONARIO"]);
function admin(){if(!KEY)throw new Error("Missing server admin key");return createClient(BASE,KEY,{auth:{persistSession:false,autoRefreshToken:false}})}
async function caller(sb:any,req:Request){const auth=req.headers.get("authorization")||"";const token=auth.replace(/^Bearer\s+/i,"");if(!token)throw new Error("AUTH_REQUIRED");const {data,error}=await sb.auth.getUser(token);if(error||!data?.user?.id)throw new Error("AUTH_INVALID");const {data:p,error:pe}=await sb.from("f1_staff_profiles").select("user_id,role,status").eq("user_id",data.user.id).maybeSingle();if(pe||!p||p.role!=="TITOLARE"||p.status!=="ACTIVE")throw new Error("TITOLARE_REQUIRED");return data.user}
async function audit(sb:any,actor:string,owner:string,action:string,after:any,reason=""){await sb.from("f1_audit_log").insert({actor_user_id:actor,owner_user_id:owner||null,action,table_name:"f1_staff_profiles",record_key:owner||"",after_data:after||{},source:"F1_STAFF_ADMIN_EDGE",reason})}
Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response("ok",{status:200,headers:CORS});if(req.method!=="POST")return out(405,{ok:false,error:"method_not_allowed"});let sb:any;try{sb=admin()}catch(e){return out(500,{ok:false,error:String(e)})}let me:any;try{me=await caller(sb,req)}catch(e){return out(403,{ok:false,error:String(e)})}let b:any={};try{b=await req.json()}catch{return out(400,{ok:false,error:"invalid_json"})}const action=clean(b.action,40).toLowerCase();try{
 if(action==="list"){
   const {data:profiles,error:pe}=await sb.from("f1_staff_profiles").select("user_id,first_name,last_name,company_email,role,status,assigned_territory,created_at,updated_at").order("role").order("last_name").order("first_name");if(pe)throw pe;
   const {data:authData,error:ue}=await sb.auth.admin.listUsers({page:1,perPage:1000});if(ue)throw ue;
   const {data:logs,error:le}=await sb.from("f1_staff_access_log").select("user_id,occurred_at").order("occurred_at",{ascending:false}).limit(5000);if(le)throw le;
   const users=new Map((authData?.users||[]).map((u:any)=>[u.id,u]));
   const lastAccess=new Map<string,string>(),accessCount=new Map<string,number>();
   for(const l of (logs||[])){const id=String(l.user_id||"");accessCount.set(id,(accessCount.get(id)||0)+1);if(id&&!lastAccess.has(id))lastAccess.set(id,l.occurred_at)}
   const accounts=(profiles||[]).map((p:any)=>{const u:any=users.get(p.user_id);return{
     user_id:p.user_id,first_name:p.first_name,last_name:p.last_name,role:p.role,status:p.status,
     company_email:p.company_email,email:u?.email||p.company_email||"",created_at:u?.created_at||p.created_at||null,
     last_sign_in_at:u?.last_sign_in_at||null,email_confirmed_at:u?.email_confirmed_at||null,banned_until:u?.banned_until||null,
     last_access:lastAccess.get(String(p.user_id))||null,access_count:accessCount.get(String(p.user_id))||0,
     assigned_territory:p.assigned_territory||{},password_status:"PROTECTED",
     providers:Array.isArray(u?.app_metadata?.providers)?u.app_metadata.providers:[]
   }}); 
   return out(200,{ok:true,accounts,total:accounts.length});
 }
 if(action==="create"){
   const email=clean(b.email,320).toLowerCase(),password=String(b.password||""),role=clean(b.role,30).toUpperCase();if(!email||!email.includes("@")||password.length<12||!roles.has(role))return out(422,{ok:false,error:"email_password_role_required",message:"Email valida, password di almeno 12 caratteri e ruolo valido sono obbligatori."});
   const {data:u,error:ue}=await sb.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{f1_role:role}});if(ue||!u?.user)throw ue||new Error("user_create_failed");const uid=u.user.id;
   const profile={user_id:uid,first_name:clean(b.first_name,120),last_name:clean(b.last_name,120),company_email:email,phone:clean(b.phone,50),start_date:clean(b.start_date,10)||new Date().toISOString().slice(0,10),role,manager_user_id:b.manager_user_id||null,assigned_territory:b.assigned_territory||{},status:"ACTIVE",daily_objectives:b.daily_objectives||{},weekly_objectives:b.weekly_objectives||{},monthly_objectives:b.monthly_objectives||{}};
   const {error:pe}=await sb.from("f1_staff_profiles").insert(profile);if(pe){await sb.auth.admin.deleteUser(uid);throw pe}await audit(sb,me.id,uid,"STAFF_CREATED",profile,"Creazione account applicativo F1");return out(200,{ok:true,user_id:uid,role,account_created:true,mailbox_created:false,message:"Account applicativo creato. La casella email aziendale reale, se necessaria, va creata nel provider di posta F1."});
 }
 const target=clean(b.user_id,80);if(!target)return out(422,{ok:false,error:"user_id_required"});if(action==="disable"&&target===me.id)return out(409,{ok:false,error:"cannot_disable_current_titolare"});const {data:old,error:oe}=await sb.from("f1_staff_profiles").select("*").eq("user_id",target).maybeSingle();if(oe||!old)return out(404,{ok:false,error:"staff_not_found"});
 if(action==="set_password"){
   if(target===me.id)return out(409,{ok:false,error:"use_recovery_for_current_titolare",message:"Per il TITOLARE corrente usa il recupero password via email."});
   const password=String(b.password||"");if(password.length<12)return out(422,{ok:false,error:"password_too_short",message:"La password temporanea deve contenere almeno 12 caratteri."});
   const {error:ae}=await sb.auth.admin.updateUserById(target,{password});if(ae)throw ae;
   await audit(sb,me.id,target,"STAFF_PASSWORD_RESET",{password_changed:true},clean(b.reason,500)||"Password temporanea impostata dal titolare");
   return out(200,{ok:true,password_changed:true,message:"Password temporanea aggiornata. La password non è stata salvata nei dati F1."});
 }
 if(action==="disable"){
   const {error:ae}=await sb.auth.admin.updateUserById(target,{ban_duration:"876000h",app_metadata:{...(old.app_metadata||{}),f1_role:old.role,f1_status:"DISABLED"}});if(ae)throw ae;const {error:pe}=await sb.from("f1_staff_profiles").update({status:"DISABLED",updated_at:new Date().toISOString()}).eq("user_id",target);if(pe)throw pe;await audit(sb,me.id,target,"STAFF_DISABLED",{status:"DISABLED"},clean(b.reason,500));return out(200,{ok:true,status:"DISABLED",authorization_revoked:true,note:"RLS blocca immediatamente l'accesso CRM; gli access token Auth già emessi restano tecnicamente validi fino alla loro scadenza, ma non autorizzano più dati F1."});
 }
 if(action==="enable"){
   const {error:ae}=await sb.auth.admin.updateUserById(target,{ban_duration:"none",app_metadata:{f1_role:old.role,f1_status:"ACTIVE"}});if(ae)throw ae;const {error:pe}=await sb.from("f1_staff_profiles").update({status:"ACTIVE",updated_at:new Date().toISOString()}).eq("user_id",target);if(pe)throw pe;await audit(sb,me.id,target,"STAFF_ENABLED",{status:"ACTIVE"},clean(b.reason,500));return out(200,{ok:true,status:"ACTIVE"});
 }
 if(action==="update"){
   const role=b.role?clean(b.role,30).toUpperCase():old.role;if(!roles.has(role))return out(422,{ok:false,error:"invalid_role"});const patch:any={first_name:b.first_name===undefined?old.first_name:clean(b.first_name,120),last_name:b.last_name===undefined?old.last_name:clean(b.last_name,120),phone:b.phone===undefined?old.phone:clean(b.phone,50),role,manager_user_id:b.manager_user_id===undefined?old.manager_user_id:(b.manager_user_id||null),assigned_territory:b.assigned_territory===undefined?old.assigned_territory:(b.assigned_territory||{}),daily_objectives:b.daily_objectives===undefined?old.daily_objectives:(b.daily_objectives||{}),weekly_objectives:b.weekly_objectives===undefined?old.weekly_objectives:(b.weekly_objectives||{}),monthly_objectives:b.monthly_objectives===undefined?old.monthly_objectives:(b.monthly_objectives||{}),updated_at:new Date().toISOString()};const {error:pe}=await sb.from("f1_staff_profiles").update(patch).eq("user_id",target);if(pe)throw pe;const {error:ae}=await sb.auth.admin.updateUserById(target,{app_metadata:{f1_role:role,f1_status:old.status}});if(ae)throw ae;await audit(sb,me.id,target,"STAFF_UPDATED",patch,clean(b.reason,500));return out(200,{ok:true,role});
 }
 return out(400,{ok:false,error:"unsupported_action"});
}catch(e){return out(500,{ok:false,error:e instanceof Error?e.message:String(e)})}});
