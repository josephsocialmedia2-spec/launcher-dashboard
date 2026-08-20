const CACHE='acquisitore-pro-v12-stable';
const ASSETS=['./index.html','./manifest.webmanifest','./icon.svg','./acquisizione-vai-qui-addon.js','./reel-social-addon.js','./backup-addon.js','./piano-pubblicazione-addon.js','./strategia-dettagli-addon.js','./piano-deluxe-whatsapp-addon.js','./digital-strategist-addon.js'];

function preparaPagina(html){
  let out=html
    .replaceAll('Referral','Segnalazione')
    .replaceAll('Partner','Professionista / collaboratore')
    .replaceAll('Inbound','Persona che ci ha contattato (sito/social/pubblicità)');
  const tags=[];
  if(!out.includes('acquisizione-vai-qui-addon.js'))tags.push('<script src="./acquisizione-vai-qui-addon.js"></script>');
  if(!out.includes('reel-social-addon.js'))tags.push('<script src="./reel-social-addon.js"></script>');
  if(!out.includes('backup-addon.js'))tags.push('<script src="./backup-addon.js"></script>');
  if(!out.includes('piano-pubblicazione-addon.js'))tags.push('<script src="./piano-pubblicazione-addon.js"></script>');
  if(!out.includes('strategia-dettagli-addon.js'))tags.push('<script src="./strategia-dettagli-addon.js"></script>');
  if(!out.includes('piano-deluxe-whatsapp-addon.js'))tags.push('<script src="./piano-deluxe-whatsapp-addon.js"></script>');
  if(!out.includes('digital-strategist-addon.js'))tags.push('<script src="./digital-strategist-addon.js"></script>');
  if(tags.length)out=out.includes('</body>')?out.replace('</body>',tags.join('')+'</body>'):out+tags.join('');
  return out;
}

async function fetchConTimeout(request,ms=6000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try{return await fetch(request,{cache:'no-store',signal:controller.signal})}
  finally{clearTimeout(timer)}
}

async function paginaAggiornata(request){
  try{
    const response=await fetchConTimeout(request);
    if(!response.ok)throw new Error('HTTP '+response.status);
    const html=await response.text();
    const cache=await caches.open(CACHE);
    cache.put('./index.html',new Response(html,{headers:{'content-type':'text/html; charset=utf-8'}})).catch(()=>{});
    return new Response(preparaPagina(html),{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
  }catch(err){
    const cached=await caches.match('./index.html');
    if(cached){
      const html=await cached.text();
      return new Response(preparaPagina(html),{status:200,headers:{'content-type':'text/html; charset=utf-8'}});
    }
    return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial;padding:24px"><h2>Acquisitore Pro</h2><p>Connessione non disponibile. Riprova tra poco.</p><button onclick="location.reload()">RIPROVA</button></body>',{status:200,headers:{'content-type':'text/html; charset=utf-8'}});
  }
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
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  const isPage=event.request.mode==='navigate'||url.pathname.endsWith('/acquisitore-pro/')||url.pathname.endsWith('/acquisitore-pro/index.html');
  if(isPage){event.respondWith(paginaAggiornata(event.request));return;}
  if(url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cached=await caches.match(event.request);
    if(cached)return cached;
    try{
      const response=await fetchConTimeout(event.request,6000);
      if(response.ok){const cache=await caches.open(CACHE);cache.put(event.request,response.clone()).catch(()=>{});}
      return response;
    }catch(e){return new Response('',{status:504,statusText:'Offline'});}
  })());
});