import type {SearchProvider,SearchHit} from "./SearchProvider.ts";
export class BraveSearchProvider implements SearchProvider{
 key="BRAVE_SEARCH";
 configured(){return !!Deno.env.get("BRAVE_SEARCH_API_KEY")}
 async search(query:string):Promise<SearchHit[]>{
  const token=Deno.env.get("BRAVE_SEARCH_API_KEY");if(!token)throw new Error("BRAVE_SEARCH_API_KEY_REQUIRED");
  const u=new URL("https://api.search.brave.com/res/v1/web/search");
  u.searchParams.set("q",query);u.searchParams.set("country","it");u.searchParams.set("search_lang","it");u.searchParams.set("count","20");
  const r=await fetch(u,{headers:{"Accept":"application/json","X-Subscription-Token":token}});
  if(!r.ok)throw new Error("BRAVE_SEARCH_HTTP_"+r.status);
  const j=await r.json();
  return (j?.web?.results||[]).map((x:any)=>({url:String(x.url||""),title:String(x.title||"")})).filter((x:SearchHit)=>!!x.url);
 }
}
