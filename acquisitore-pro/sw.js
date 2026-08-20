const CACHE='acquisitore-pro-core-v23';
const CORE=['./index.html','./manifest.webmanifest','./icon-192.svg','./icon-512.svg','./core-loader.js'];
function attachLoader(html){
  let out=html.replaceAll('Referral','Segnalazione').replaceAll('Partner','Professionista / collaboratore').replaceAll('Inbound','Persona che ci ha contattato');
  if(out.includes('core-loader.js'))return out;
  const tag='<script src="./core-loader.js?v=23"></script>';
  return out.includes('</body>')?out.replace('</body>',tag+'</body>'):out+tag;
}
async function preparedResponse(response){const html=attachLoader(await response.text());return new Response(html,{status:response.status,statusText:response.statusText,headers:{'content-type':'text/html; charset=utf-8'}})}
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.allSettled(CORE.map(url=>cache.add(new Request(url,{cache:'reload'}))));await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('acquisitore-pro-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  const home=event.request.mode==='navigate'&&(url.pathname.endsWith('/acquisitore-pro/')||url.pathname.endsWith('/acquisitore-pro/index.html'));
  if(home){event.respondWith((async()=>{const cache=await caches.open(CACHE),cached=await cache.match('./index.html');if(cached){event.waitUntil(fetch('./index.html',{cache:'no-store'}).then(async r=>{if(r.ok)await cache.put('./index.html',r.clone())}).catch(()=>{}));return preparedResponse(cached)}try{const r=await fetch(event.request,{cache:'no-store'});if(r.ok)await cache.put('./index.html',r.clone());return preparedResponse(r)}catch{return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Acquisitore Pro</title><body style="font-family:Arial;padding:24px"><h2>Acquisitore Pro</h2><p>Modalità offline: riapri l’app appena disponibile la prima copia locale.</p></body>',{headers:{'content-type':'text/html; charset=utf-8'}})}})());return}
  if(CORE.some(x=>url.pathname.endsWith(x.slice(1)))){event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(async r=>{if(r.ok)(await caches.open(CACHE)).put(event.request,r.clone());return r})));return}
  event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(event.request)));
});