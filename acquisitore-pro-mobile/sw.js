const CACHE='acquisitore-pro-mobile-clean-v5';
const CORE=[
  './index.html',
  './manifest.webmanifest',
  './preflight.js',
  '../acquisitore-pro/app-v25.css',
  '../acquisitore-pro/contact-id-repair.js',
  '../acquisitore-pro/app-v25.js',
  '../acquisitore-pro/icon-v25-192.png',
  '../acquisitore-pro/icon-v25-512.png',
  '../acquisitore-pro/icon-v25-maskable-512.png'
];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(CORE.map(u=>new Request(u,{cache:'reload'})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('acquisitore-pro-mobile-')&&k!==CACHE).map(k=>caches.delete(k)));
    if(self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(()=>{});
    await self.clients.claim();
  })());
});
async function networkFirst(request,fallback){
  const cache=await caches.open(CACHE);
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok) await cache.put(fallback||request,response.clone());
    return response;
  }catch(e){
    const cached=await cache.match(fallback||request,{ignoreSearch:true});
    if(cached)return cached;
    throw e;
  }
}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith(networkFirst(event.request,'./index.html'));
    return;
  }
  event.respondWith(networkFirst(event.request));
});
