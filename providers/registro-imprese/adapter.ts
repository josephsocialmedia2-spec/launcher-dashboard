export type RegistroImpreseConnectorConfig = {
  base:string; path:string; apiKey:string; apiKeyHeader:string; method:string;
};

export function registroImpreseConfig():RegistroImpreseConnectorConfig{
  return {
    base:Deno.env.get("REGISTRO_IMPRESE_API_BASE")||"",
    path:Deno.env.get("REGISTRO_IMPRESE_SEARCH_PATH")||"",
    apiKey:Deno.env.get("REGISTRO_IMPRESE_API_KEY")||"",
    apiKeyHeader:Deno.env.get("REGISTRO_IMPRESE_API_KEY_HEADER")||"",
    method:(Deno.env.get("REGISTRO_IMPRESE_HTTP_METHOD")||"POST").toUpperCase()
  };
}

export function registroImpreseStatus(){
  const c=registroImpreseConfig();
  return c.base&&c.path&&c.apiKey&&c.apiKeyHeader?"READY":"CREDENTIALS_REQUIRED";
}

export async function registroImpreseRequest(payload:unknown){
  const c=registroImpreseConfig();
  if(registroImpreseStatus()!=="READY") throw new Error("REGISTRO_IMPRESE_CONTRACT_REQUIRED");
  if(!["GET","POST"].includes(c.method)) throw new Error("REGISTRO_IMPRESE_HTTP_METHOD_NOT_ALLOWED");
  const endpoint=new URL(c.path,c.base);
  const headers:Record<string,string>={"Accept":"application/json",[c.apiKeyHeader]:c.apiKey};
  const init:RequestInit={method:c.method,headers};
  if(c.method==="POST"){headers["Content-Type"]="application/json";init.body=JSON.stringify(payload)}
  const r=await fetch(endpoint,init);
  if(!r.ok) throw new Error("REGISTRO_IMPRESE_HTTP_"+r.status);
  return await r.json();
}

// Il path e lo schema NON sono inventati: devono provenire dal contratto/API InfoCamere effettivamente acquistato/autorizzato.
