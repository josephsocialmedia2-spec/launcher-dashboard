import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as XLSX from "npm:xlsx@0.18.5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};
const ISTAT_XLSX = "https://www.istat.it/wp-content/uploads/2024/12/StrutturaATECO-2025-IT-EN-1.xlsx";
const EXPECTED = { total: 3257, 1:22, 2:87, 3:287, 4:651, 5:920, 6:1290 };

function reply(body: unknown, status=200){ return new Response(JSON.stringify(body),{status,headers:CORS}); }
function s(v: unknown){ return String(v ?? "").trim(); }

async function verifyStaff(auth:string,url:string,anon:string,service:string){
  const u=await fetch(url+"/auth/v1/user",{headers:{apikey:anon,Authorization:auth}});
  if(!u.ok) return null;
  const user=await u.json();
  if(!user?.id) return null;
  const r=await fetch(url+"/rest/v1/f1_staff_profiles?select=user_id,status,role&user_id=eq."+encodeURIComponent(user.id)+"&status=eq.ACTIVE&limit=1",{headers:{apikey:service,Authorization:"Bearer "+service}});
  if(!r.ok) return null;
  const rows=await r.json();
  return rows?.[0]||null;
}

function hierarchy(code:string,level:number,section:string){
  const division = level>=2 ? code.slice(0,2) : "";
  const group = level>=3 ? code.slice(0,4) : "";
  const cls = level>=4 ? code.slice(0,5) : "";
  const category = level>=5 ? code.slice(0,7) : "";
  const subcategory = level>=6 ? code.slice(0,8) : "";
  return {section_code:level===1?code:section,division_code:division,group_code:group,class_code:cls,category_code:category,subcategory_code:subcategory};
}

function parse(workbook:XLSX.WorkBook){
  const sheet=workbook.Sheets["ATECO 2025 Struttura"];
  if(!sheet) throw new Error("ATECO_SHEET_MISSING");
  const rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:""}) as unknown[][];
  const out:any[]=[]; let section="";
  for(let i=1;i<rows.length;i++){
    const r=rows[i]||[];
    const code=s(r[1]), titleIt=s(r[2]), titleEn=s(r[3]), level=Number(s(r[4])), parent=s(r[5]);
    if(!code || !Number.isInteger(level) || level<1 || level>6) continue;
    if(level===1) section=code;
    out.push({
      code,title_it:titleIt,title_en:titleEn,level,parent_code:parent,...hierarchy(code,level,section),
      source_url:ISTAT_XLSX,source_version:"ATECO 2025",synced_at:new Date().toISOString()
    });
  }
  const counts:any={};
  for(const x of out) counts[x.level]=(counts[x.level]||0)+1;
  if(out.length!==EXPECTED.total) throw new Error("ATECO_COUNT_INVALID:"+out.length);
  for(let l=1;l<=6;l++) if(counts[l]!==EXPECTED[l as keyof typeof EXPECTED]) throw new Error("ATECO_LEVEL_"+l+"_INVALID:"+counts[l]);
  return {rows:out,counts};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:CORS});
  if(req.method!=="POST") return reply({ok:false,error:"METHOD_NOT_ALLOWED"},405);
  try{
    const url=Deno.env.get("SUPABASE_URL")||"";
    const anon=Deno.env.get("SUPABASE_ANON_KEY")||"";
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
    if(!url||!anon||!service) return reply({ok:false,error:"SERVER_CONFIG_MISSING"},500);
    const auth=req.headers.get("authorization")||"";
    const staff=await verifyStaff(auth,url,anon,service);
    if(!staff) return reply({ok:false,error:"F1_AUTH_REQUIRED"},401);

    const src=await fetch(ISTAT_XLSX,{headers:{"User-Agent":"F1-Email-Radar/2.0"}});
    if(!src.ok) return reply({ok:false,error:"ISTAT_FETCH_FAILED",status:src.status},502);
    const wb=XLSX.read(await src.arrayBuffer(),{type:"array"});
    const parsed=parse(wb);

    const r=await fetch(url+"/rest/v1/rpc/f1_ateco_replace_catalog",{
      method:"POST",
      headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json"},
      body:JSON.stringify({p_rows:parsed.rows})
    });
    const body=await r.text();
    if(!r.ok) return reply({ok:false,error:"ATECO_COMMIT_FAILED",detail:body},500);
    return reply({ok:true,source:ISTAT_XLSX,total:parsed.rows.length,levels:parsed.counts,commit:JSON.parse(body),staff_role:staff.role,synced_at:new Date().toISOString()});
  }catch(e){ return reply({ok:false,error:"UNEXPECTED",detail:String((e as any)?.message||e)},500); }
});