const CACHE='f1-acquisition-v20260912-1';
const STATIC=[
  './oggi.html',
  './giro-acquisizione.html',
  './telefonate-oggi.html',
  './crm.html',
  './seller-radar-unico.html',
  './seller-segnalati.html',
  './competitor-intelligence.html',
  './social-seller-radar.html',
  './neighborhood-intelligence.html',
  './territory-control.html',
  './radar-edilizio.html',
  './organizer-lunedi.html',
  './gruppi-social-f1.html',
  './gestione-app.html',
  './setup-cloud.html',
  './index.html',
  './system-registry.json',
  './config/territory.json',
  './config/acquisition-engine.json',
  './data/acquisition-public.json',
  './data/radar_edilizio.json',
  './manifest.webmanifest',
  './pwa.js',
  './f1-acquisition-core.js',
  './f1-acquisition-data.js',
  './supabase-config.js',
  './supabase-sync.js',
  './field-sync.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(c=>Promise.allSettled(STATIC.map(url=>c.add(url))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith('f1-')&&k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

function networkFirst(req,fallback){
  return fetch(req).then(res=>{
    if(res&&res.ok){
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(req,copy));
    }
    return res;
  }).catch(()=>caches.match(req).then(hit=>hit||fallback&&caches.match(fallback)));
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  if(req.mode==='navigate'){
    event.respondWith(networkFirst(req,'./oggi.html'));
    return;
  }

  const live=[
    '/data/acquisition-public.json',
    '/config/territory.json',
    '/config/acquisition-engine.json',
    '/data/radar_edilizio.json'
  ];
  if(live.some(s=>url.pathname.endsWith(s))){
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(
    caches.match(req).then(hit=>hit||fetch(req).then(res=>{
      if(res.ok&&['script','style','manifest'].includes(req.destination)){
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(req,copy));
      }
      return res;
    }))
  );
});
