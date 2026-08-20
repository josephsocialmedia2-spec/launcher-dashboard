const { test, expect } = require('@playwright/test');

const APP='/acquisitore-pro/index.html';
const RESET='/acquisitore-pro/ripristina-pwa.html';
const ORIGIN='http://127.0.0.1:4173';

async function openCanonical(page){
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
  await page.goto(APP,{waitUntil:'domcontentloaded'});
  await expect(page.locator('header')).toContainText('ACQUISITORE PRO');
  await expect(page.locator('header')).toContainText('v25');
  await expect(page.locator('#closeContactBtn')).toBeVisible();
  await page.waitForTimeout(250);
  return errors;
}

test('percorso canonico: v25, manifest, service worker e offline',async({page,context,request})=>{
  const errors=await openCanonical(page);
  for(const p of [APP,'/acquisitore-pro/manifest.webmanifest','/acquisitore-pro/sw.js','/acquisitore-pro/app-v25.css','/acquisitore-pro/app-v25.js','/acquisitore-pro/icon-v25-192.png','/acquisitore-pro/icon-v25-512.png','/acquisitore-pro/icon-v25-maskable-512.png']){
    const r=await request.get(p);expect(r.ok(),p+' HTTP '+r.status()).toBeTruthy();
  }
  const m=await (await request.get('/acquisitore-pro/manifest.webmanifest')).json();
  expect(m.id).toBe('./');
  expect(m.start_url).toBe('./index.html');
  expect(m.display).toBe('standalone');
  expect(m.icons.some(i=>i.sizes==='192x192'&&i.type==='image/png')).toBeTruthy();
  expect(m.icons.some(i=>i.sizes==='512x512'&&String(i.purpose||'').includes('maskable'))).toBeTruthy();
  await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
  const registration=await page.evaluate(()=>navigator.serviceWorker.getRegistration().then(r=>({scope:r?.scope||'',script:r?.active?.scriptURL||''})));
  expect(registration.script).toContain('/acquisitore-pro/sw.js');
  await page.reload({waitUntil:'domcontentloaded'});
  await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('header')).toContainText('ACQUISITORE PRO');
  await expect(page.locator('#closeContactBtn')).toBeVisible();
  await context.setOffline(false);
  expect(errors).toEqual([]);
});

test('migrazione automatica: dati v23/v24 vengono caricati nella v25 canonica',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.removeItem('acqProV25');
    localStorage.removeItem('acqProV25Snapshot');
    localStorage.setItem('acqProMobile',JSON.stringify({contacts:[{id:'legacy-1',name:'Contatto Storico',phone:'39333111111',address:'Via Storica 7',source:'Giro zona',note:'Dato precedente',outcome:'Appuntamento',next:'Richiamare',date:'',ts:'2026-08-19T10:00:00.000Z'}],stats:{c:1,v:7,a:1,i:0}}));
    localStorage.setItem('f1Performance',JSON.stringify({news:3,goals:{v:100,news:20,a:5,i:3}}));
    localStorage.setItem('f1VaiZonaTargets',JSON.stringify([{paese:'Avigliana',via:'Via Migrata',civico:'8',cosa:'Presidio',prezzo:'',segnale:'Storico'}]));
    localStorage.setItem('f1LastZone',JSON.stringify({paese:'Avigliana',via:'Via Migrata',civico:'8'}));
  });
  await openCanonical(page);
  await expect(page.locator('#mContacts')).toHaveText('1');
  await expect(page.locator('#mConv')).toHaveText('7');
  await expect(page.locator('#mNews')).toHaveText('3');
  await expect(page.locator('#zoneBox')).toContainText('Via Migrata');
  await page.locator('#contactsBtn').click();
  await expect(page.locator('#dialogBody')).toContainText('Contatto Storico');
  await expect(page.locator('#dialogBody')).toContainText('Via Storica 7');
});

test('ripristino PWA: conserva dati e riapre la v25 canonica',async({page})=>{
  await openCanonical(page);
  await page.locator('#name').fill('Persistenza Reset');
  await page.locator('#address').fill('Via Reset 25');
  await page.locator('#note').fill('Non cancellare');
  await page.locator('#closeContactBtn').click();
  await expect(page.locator('#mContacts')).toHaveText('1');
  await page.goto(RESET,{waitUntil:'domcontentloaded'});
  await page.waitForURL(/\/acquisitore-pro\/index\.html\?v=25&fresh=1/,{timeout:12000});
  await expect(page.locator('header')).toContainText('v25');
  await expect(page.locator('#mContacts')).toHaveText('1');
  await page.locator('#contactsBtn').click();
  await expect(page.locator('#dialogBody')).toContainText('Persistenza Reset');
  const reg=await page.evaluate(()=>navigator.serviceWorker.ready.then(r=>r.active?.scriptURL||''));
  expect(reg).toContain('/acquisitore-pro/sw.js');
});

test('canonical mobile: nessun overflow e pulsanti zona/form dentro viewport',async({page,isMobile})=>{
  await openCanonical(page);
  const s=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));
  expect(s.scroll).toBeLessThanOrEqual(s.w+1);
  await expect(page.locator('#hereBtn')).toBeVisible();
  await page.locator('#manualZoneBtn').click();
  const box=await page.locator('#genericDialog').boundingBox();
  const vp=page.viewportSize();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x+box.width).toBeLessThanOrEqual(vp.width+1);
  await expect(page.locator('#zVia')).toBeVisible();
  if(isMobile)expect(vp.width).toBeLessThanOrEqual(500);
});
