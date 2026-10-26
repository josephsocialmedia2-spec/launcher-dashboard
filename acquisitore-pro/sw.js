const CACHE='acquisitore-pro-v3-italiano';
const ASSETS=['./manifest.webmanifest','./icon.svg'];

function traduciInterfaccia(html){
  return html
    .replaceAll('Referral','Segnalazione')
    .replaceAll('Partner','Professionista / collaboratore')
    .replaceAll('Inbound','Persona che ci ha contattato (sito/social/pubblicità)');
}

async function paginaItaliana(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    const html=await response.text();
    const headers=new Headers(response.headers);
    headers.set('content-type','text/html; charset=utf-8');
    return new Response(traduciInterfaccia(html),{status:response.status,statusText:response.statusText,headers});
  }catch(err){
    const cached=await caches.match('./index.html');
    if(cached){
      const html=await cached.text();
      return new Response(traduciInterfaccia(html),{headers:{'content-type':'text/html; charset=utf-8'}});
    }
    throw err;
  }
}

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  const isPage=event.request.mode==='navigate' || url.pathname.endsWith('/acquisitore-pro/') || url.pathname.endsWith('/acquisitore-pro/index.html');
  if(isPage){
    event.respondWith(paginaItaliana(event.request));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
  })));
});
