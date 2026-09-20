import type {BusinessDirectoryProvider,BusinessDirectoryCandidate} from "./BusinessDirectoryProvider.ts";
export class GooglePlacesProvider implements BusinessDirectoryProvider{
 key="GOOGLE_PLACES_NEW";
 configured(){return !!Deno.env.get("GOOGLE_MAPS_API_KEY")}
 async search(textQuery:string):Promise<BusinessDirectoryCandidate[]>{
  const key=Deno.env.get("GOOGLE_MAPS_API_KEY");if(!key)throw new Error("GOOGLE_MAPS_API_KEY_REQUIRED");
  const r=await fetch("https://places.googleapis.com/v1/places:searchText",{
   method:"POST",
   headers:{"Content-Type":"application/json","X-Goog-Api-Key":key,"X-Goog-FieldMask":"places.id,places.websiteUri"},
   body:JSON.stringify({textQuery,languageCode:"it",regionCode:"IT",maxResultCount:10})
  });
  if(!r.ok)throw new Error("GOOGLE_PLACES_HTTP_"+r.status);
  const j=await r.json();
  return (j?.places||[]).filter((p:any)=>p?.id&&p?.websiteUri).map((p:any)=>({provider_id:String(p.id),website_url:String(p.websiteUri)}));
 }
}
// Non persistere contenuto Places come record F1: usare website_url per verificare il sito ufficiale e rispettare i termini applicabili.
