const CACHE='acquisitore-pro-v25-shell-canonical-3';
const CORE=[
  './index.html',
  './app-v25.html',
  './app-v25.css',
  './contact-id-repair.js',
  './app-v25.js',
  './manifest.webmanifest',
  './icon-v25-192.png',
  './icon-v25-512.png',
  './icon-v25-maskable-512.png'
];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('acquisitore-pro-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
async function staleWhileRevalidate(request,event){
  const cache=await caches.open(CACHE);
  const cached=await cache.match(request,{ignoreSearch:true});
  const fresh=fetch(request,{cache:'no-store'}).then(async response=>{
    if(response&&response.ok) await cache.put(request,response.clone());
    return response;
  }).catch(()=>null);
  if(cached){event.waitUntil(fresh);return cached;}
  return (await fresh)||new Response('Risorsa non disponibile offline',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}});
}
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET') return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const shell=await cache.match('./index.html');
      try{
        const response=await fetch(request,{cache:'no-store'});
        if(response&&response.ok){
          event.waitUntil(cache.put('./index.html',response.clone()));
          return response;
        }
      }catch{}
      return shell||new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Acquisitore Pro</title><body style="font-family:Arial;padding:24px"><h2>Acquisitore Pro</h2><p>Copia locale non ancora disponibile. Collegati una volta e riapri l’app.</p></body>',{headers:{'content-type':'text/html; charset=utf-8'}});
    })());
    return;
  }
  if(CORE.some(p=>url.pathname.endsWith(p.slice(1)))) event.respondWith(staleWhileRevalidate(request,event));
});
