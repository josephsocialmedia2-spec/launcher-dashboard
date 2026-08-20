self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{try{const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)))}catch(_){}try{await self.registration.unregister()}catch(_){}try{await self.clients.claim()}catch(_){}})())});
// Nessun fetch handler: l'app usa direttamente GitHub Pages senza cache PWA.
