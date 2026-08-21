const { test, expect } = require('@playwright/test');

const LIVE='https://josephsocialmedia2-spec.github.io/launcher-dashboard/acquisitore-pro/index.html?v=25&qa=live';
const ORIGIN='https://josephsocialmedia2-spec.github.io';

function watch(page){const errors=[];page.on('pageerror',e=>errors.push('pageerror: '+String(e)));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});return errors;}

test('deployment pubblico: v25 si apre realmente senza errori critici',async({page})=>{
  const errors=watch(page);
  const response=await page.goto(LIVE,{waitUntil:'domcontentloaded',timeout:30000});
  expect(response && response.status()).toBeLessThan(400);
  await expect(page.locator('header')).toContainText('ACQUISITORE PRO');
  await expect(page.locator('header')).toContainText('v25');
  await expect(page.locator('#hereBtn')).toBeVisible();
  await expect(page.locator('#closeContactBtn')).toBeVisible();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('deployment pubblico: asset canonici rispondono 2xx/3xx',async({request})=>{
  const urls=[
    ORIGIN+'/launcher-dashboard/acquisitore-pro/index.html',
    ORIGIN+'/launcher-dashboard/acquisitore-pro/app-v25.css',
    ORIGIN+'/launcher-dashboard/acquisitore-pro/app-v25.js',
    ORIGIN+'/launcher-dashboard/acquisitore-pro/manifest.webmanifest',
    ORIGIN+'/launcher-dashboard/acquisitore-pro/sw.js',
    ORIGIN+'/launcher-dashboard/acquisitore-pro/icon-v25-192.png',
    ORIGIN+'/launcher-dashboard/acquisitore-pro/icon-v25-512.png',
    ORIGIN+'/launcher-dashboard/acquisitore-pro/icon-v25-maskable-512.png'
  ];
  for(const url of urls){const r=await request.get(url,{timeout:30000,failOnStatusCode:false});expect(r.status(),url).toBeGreaterThanOrEqual(200);expect(r.status(),url).toBeLessThan(400);}
});

test('deployment pubblico: service worker controlla pagina e offline riapre shell',async({page,context})=>{
  await page.goto(LIVE,{waitUntil:'domcontentloaded',timeout:30000});
  await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
  await page.reload({waitUntil:'domcontentloaded'});
  const reg=await page.evaluate(()=>navigator.serviceWorker.getRegistration().then(r=>({script:r?.active?.scriptURL||'',scope:r?.scope||''})));
  expect(reg.script).toContain('/launcher-dashboard/acquisitore-pro/sw.js');
  expect(reg.scope).toContain('/launcher-dashboard/acquisitore-pro/');
  const keys=await page.evaluate(()=>caches.keys());
  expect(keys.some(k=>k.includes('acquisitore-pro-v25'))).toBeTruthy();
  await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('header')).toContainText('ACQUISITORE PRO');
  await expect(page.locator('#closeContactBtn')).toBeVisible();
  await context.setOffline(false);
});

test('deployment pubblico mobile: matrice viewport senza overflow',async({page})=>{
  for(const vp of [{width:320,height:640},{width:360,height:740},{width:390,height:844},{width:412,height:915}]){
    await page.setViewportSize(vp);
    await page.goto(LIVE+'&w='+vp.width,{waitUntil:'domcontentloaded',timeout:30000});
    const m=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));
    expect(m.scroll,'viewport '+vp.width).toBeLessThanOrEqual(m.w+1);
    const here=await page.locator('#hereBtn').boundingBox();
    const close=await page.locator('#closeContactBtn').boundingBox();
    expect(here).toBeTruthy();expect(close).toBeTruthy();
    expect(here.x).toBeGreaterThanOrEqual(0);expect(here.x+here.width).toBeLessThanOrEqual(vp.width+1);
    expect(close.height).toBeGreaterThanOrEqual(44);
    await page.locator('#manualZoneBtn').click();
    const dialog=await page.locator('#genericDialog').boundingBox();
    expect(dialog.x).toBeGreaterThanOrEqual(0);expect(dialog.x+dialog.width).toBeLessThanOrEqual(vp.width+1);
    await page.locator('#dialogClose').click();
  }
});

test('link esterni operativi: destinazioni reali rispondono senza 4xx/5xx',async({request})=>{
  const urls=[
    'https://josephsocialmedia2-spec.github.io/open-social-scheduler/monday-control.html',
    'https://josephsocialmedia2-spec.github.io/open-social-scheduler/content-center.html',
    'https://josephsocialmedia2-spec.github.io/open-social-scheduler/',
    'https://cdn.shopify.com/s/files/1/1046/2730/6835/files/Portfolio_Performance_Report_Joseph_Digital_Strategist_PREMIUM_FINALE_CON_FOTO_E_INVITO_v4.pdf?v=1787228245',
    'https://cdn.shopify.com/s/files/1/1046/2730/6835/files/F1_Piano_Marketing_Deluxe_Ville_Villini.pdf?v=1787226181',
    'https://cdn.shopify.com/s/files/1/1046/2730/6835/files/F1_Piano_Marketing_Deluxe_Appartamenti_Signorili.pdf?v=1787227485'
  ];
  for(const url of urls){const r=await request.get(url,{timeout:30000,failOnStatusCode:false});expect(r.status(),url).toBeGreaterThanOrEqual(200);expect(r.status(),url).toBeLessThan(400);}
});

test('contatti: link tel e WhatsApp generati correttamente',async({page})=>{
  await page.goto(LIVE,{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#name').fill('Test Live Contatto');
  await page.locator('#phone').fill('+39 333 123 4567');
  await page.locator('#address').fill('Via Test 1');
  await page.locator('#closeContactBtn').click();
  await page.locator('#contactsBtn').click();
  const tel=await page.locator('#dialogBody a[href^="tel:"]').first().getAttribute('href');
  const wa=await page.locator('#dialogBody a[href^="https://wa.me/"]').first().getAttribute('href');
  expect(tel).toContain('333');
  expect(wa).toBe('https://wa.me/393331234567');
});
