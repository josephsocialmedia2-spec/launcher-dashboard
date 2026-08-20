const CACHE='acquisitore-pro-v15-avvio-rapido';
const ASSETS=['./index.html','./manifest.webmanifest','./icon.svg','./icon-192.svg','./icon-512.svg','./acquisizione-vai-qui-addon.js','./reel-social-addon.js','./backup-addon.js','./piano-pubblicazione-addon.js','./strategia-dettagli-addon.js','./piano-deluxe-whatsapp-addon.js','./digital-strategist-addon.js','./chiudi-contatto-addon.js'];

function preparaPagina(html){
  let out=html
    .replaceAll('Referral','Segnalazione')
    .replaceAll('Partner','Professionista / collaboratore')
    .replaceAll('Inbound','Persona che ci ha contattato (sito/social/pubblicità)');
  const tags=[];
  for(const file of ['acquisizione-vai-qui-addon.js','reel-social-addon.js','backup-addon.js','piano-pubblicazione-addon.js','strategia-dettagli-addon.js','piano-deluxe-whatsapp-addon.js','digital-strategist-addon.js','chiudi-contatto-addon.js']){
    if(!out.includes(file))tags.push(`<script src="./${file}"></script>`);
  }
  if(tags.length)out=out.includes('</body>')?out.replace('</body>',tags.join('')+'</body>'):out+tags.join('');
  return out;
}

function htmlResponse(html){return new Response(preparaPagina(html),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}})}

async function aggiornaIndexInBackground(){
  try{
    const r=await fetch('./index.html?fresh='+Date.now(),{cache:'no-store'});
    if(!r.ok)return;
    const html=await r.text();
    const c=await caches.open(CACHE);
    await c.put('./index.html',new Response(html,{headers:{'content-type':'text/html; charset=utf-8'}}));
  }catch(e){}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    for(const asset of ASSETS){try{await cache.add(asset)}catch(e){}}
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

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  const isPage=event.request.mode==='navigate'||url.pathname.endsWith('/acquisitore-pro/')||url.pathname.endsWith('/acquisitore-pro/index.html');
  if(isPage){
    event.respondWith((async()=>{
      const cached=await caches.match('./index.html');
      if(cached){event.waitUntil(aggiornaIndexInBackground());return htmlResponse(await cached.text())}
      try{const r=await fetch(event.request,{cache:'no-store'});return htmlResponse(await r.text())}catch(e){return new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial;padding:30px"><h2>Acquisitore Pro</h2><p>Connessione non disponibile. Riprova.</p><button onclick="location.reload()">RIPROVA</button></body>',{headers:{'content-type':'text/html; charset=utf-8'}})}
    })());return;
  }
  if(url.pathname.endsWith('/manifest.webmanifest')){event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match(event.request)));return;}
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});return r})));
});