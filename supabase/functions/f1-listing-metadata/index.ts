import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const allowed = [
  "immobiliare.it","www.immobiliare.it",
  "idealista.it","www.idealista.it",
  "casa.it","www.casa.it",
  "subito.it","www.subito.it",
  "lasacraimmobiliare.it","www.lasacraimmobiliare.it"
];

function decode(s:string){
  return s.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/\s+/g," ").trim();
}
function meta(html:string, key:string, attr="name"){
  const safe=key.replace(/[.*+?^$()|[\]\\]/g,"\\$&");
  const re=new RegExp('<meta[^>]+(?:'+attr+')=["\\\']'+safe+'["\\\'][^>]+content=["\\\']([^"\\\']*)["\\\']','i');
  const m=html.match(re); if(m?.[1]) return decode(m[1]);
  const re2=new RegExp('<meta[^>]+content=["\\\']([^"\\\']*)["\\\'][^>]+(?:'+attr+')=["\\\']'+safe+'["\\\']','i');
  return decode(html.match(re2)?.[1]||"");
}
function title(html:string){return decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"")}
function jsonLdDescription(html:string){
  const blocks=[...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for(const b of blocks){
    try{
      const parsed=JSON.parse(b[1]);
      const arr=Array.isArray(parsed)?parsed:[parsed];
      for(const x of arr){
        const d=x?.description||x?.about?.description;
        if(typeof d==="string"&&d.trim()) return decode(d).slice(0,800);
      }
    }catch{}
  }
  return "";
}
Deno.serve(async(req:Request)=>{
  if(req.method!=="POST") return new Response("Method not allowed",{status:405});
  try{
    const body=await req.json(); const raw=String(body?.url||"").trim();
    const u=new URL(raw);
    if(!["https:","http:"].includes(u.protocol) || !allowed.includes(u.hostname.toLowerCase()))
      return new Response(JSON.stringify({error:"DOMAIN_NOT_ALLOWED"}),{status:400,headers:{"content-type":"application/json"}});
    const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),9000);
    const res=await fetch(u.toString(),{signal:ctrl.signal,redirect:"follow",headers:{"user-agent":"Mozilla/5.0 F1PropertyResearch/1.0","accept":"text/html,application/xhtml+xml"}});
    clearTimeout(timer);
    if(!res.ok) return new Response(JSON.stringify({error:"FETCH_FAILED",status:res.status}),{status:502,headers:{"content-type":"application/json"}});
    const ct=res.headers.get("content-type")||"";
    if(!ct.includes("text/html")) return new Response(JSON.stringify({error:"NOT_HTML"}),{status:415,headers:{"content-type":"application/json"}});
    const text=(await res.text()).slice(0,1200000);
    const data={
      url:res.url,
      title:meta(text,"og:title","property")||title(text),
      description:(meta(text,"og:description","property")||meta(text,"description")||jsonLdDescription(text)).slice(0,800),
      canonical:(text.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1]||""),
      fetched_at:new Date().toISOString()
    };
    return new Response(JSON.stringify(data),{headers:{"content-type":"application/json","cache-control":"no-store"}});
  }catch(e){
    return new Response(JSON.stringify({error:String(e?.message||e)}),{status:400,headers:{"content-type":"application/json"}});
  }
});