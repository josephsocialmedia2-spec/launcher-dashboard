const CACHE='f1-operativo-v20260831-susa-km-order-1';
const STATIC=[
  './oggi.html',
  './giro-acquisizione.html',
  './telefonate-oggi.html',
  './directory-radar-mobile.html',
  './incrocio-giro-contatti.html',
  './crm.html',
  './seller-radar-unico.html',
  './seller-segnalati.html',
  './market-intelligence.html',
  './organizer-lunedi.html',
  './gruppi-social-f1.html',
  './gestione-app.html',
  './setup-cloud.html',
  './system-registry.json',
  './manifest.webmanifest',
  './pwa.js',
  './supabase-config.js',
  './supabase-sync.js',
  './field-sync.js'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('f1-operativo-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res}).catch(()=>caches.match(req).then(r=>r||caches.match('./oggi.html'))));
    return;
  }
  event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{
    if(res.ok&&['script','style','manifest'].includes(req.destination)){
      const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));
    }
    return res;
  })));
});
