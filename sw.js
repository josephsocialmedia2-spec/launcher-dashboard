self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{try{const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)))}catch(_){}try{await self.registration.unregister()}catch(_){}const clients=await self.clients.matchAll({type:'window'});for(const c of clients){try{c.navigate(c.url)}catch(_){}}})())});
// Emergency no-cache worker: intentionally no fetch handler.
