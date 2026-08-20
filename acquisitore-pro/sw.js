const CACHE='acquisitore-pro-v21-shell';
const SHELL=['./index.html','./manifest.webmanifest','./icon-192.svg','./icon-512.svg','./bootstrap-v21.js'];
function withBootstrap(html){
  let out=html.replaceAll('Referral','Segnalazione').replaceAll('Partner','Professionista / collaboratore').replaceAll('Inbound','Persona che ci ha contattato');
  if(!out.includes('bootstrap-v21.js')) out=out.replace('</body>','<script src="./bootstrap-v21.js?v=21"></script></body>');
  return out;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const c=await caches.open(CACHE);
  for(const url of SHELL){try{await c.add(new Request(url,{cache:'reload'}))}catch(e){}}
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const k of await caches.keys()) if(k.startsWith('acquisitore-pro-')&&k!==CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const u=new URL(event.request.url);
  const isIndex=u.pathname.endsWith('/acquisitore-pro/')||u.pathname.endsWith('/acquisitore-pro/index.html');
  if(event.request.mode==='navigate'&&!isIndex)return;
  if(isIndex){
    event.respondWith((async()=>{
      const cached=await caches.match('./index.html');
      if(cached){
        const html=withBootstrap(await cached.text());
        fetch(event.request,{cache:'no-store'}).then(async r=>{
          if(!r.ok)return;
          const fresh=withBootstrap(await r.text());
          const c=await caches.open(CACHE);await c.put('./index.html',new Response(fresh,{headers:{'content-type':'text/html; charset=utf-8'}}));
        }).catch(()=>{});
        return new Response(html,{headers:{'content-type':'text/html; charset=utf-8'}});
      }
      const r=await fetch(event.request,{cache:'no-store'});
      const html=withBootstrap(await r.text());
      const c=await caches.open(CACHE);await c.put('./index.html',new Response(html,{headers:{'content-type':'text/html; charset=utf-8'}}));
      return new Response(html,{headers:{'content-type':'text/html; charset=utf-8'}});
    })());return;
  }
  if(u.pathname.endsWith('/bootstrap-v21.js')){
    event.respondWith(caches.match(event.request).then(r=>r||fetch(event.request,{cache:'no-store'})));return;
  }
  event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(event.request)));
});
