const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.route('https://josephsocialmedia2-spec.github.io/immobili-in-zona/**',route=>route.fulfill({status:200,contentType:'text/csv',body:'COMUNE,DOVE_ANDRE,COSA_CERCO,PREZZO,SELLER_SIGNAL,SCORE,PRIORITA,FONTE,URL\n'}));
  await page.goto('/acquisitore-pro-mobile/index.html?qa='+Date.now(),{waitUntil:'domcontentloaded'});
  await expect(page.locator('#zoneOpenBtn')).toBeVisible();
  await page.waitForFunction(()=>!!window.F1SellerSignalsZone);
}

test('VAI IN ZONA apre Seller Signal ordinati per score',async({page})=>{
  await openApp(page);
  await page.locator('#zoneOpenBtn').click();
  await expect(page.locator('#sellerZoneOverlay')).toHaveClass(/open/);
  await expect(page.locator('#sellerZoneBody')).toContainText('Bussoleno');
  await expect(page.locator('#sellerZoneBody')).toContainText('Via Traforo 38');
  await expect(page.locator('#sellerZoneBody')).toContainText('PRIVATO');
  await expect(page.locator('#sellerZoneBody')).toContainText('NO AGENZIE');
  await expect(page.locator('#sellerZoneBody')).toContainText('100 · MASSIMA');
  const targets=await page.evaluate(()=>JSON.parse(localStorage.getItem('f1VaiZonaTargets')||'[]'));
  expect(targets.length).toBeGreaterThan(0);
  expect(targets[0].paese).toBe('Bussoleno');
  expect(targets[0].via).toContain('Via Traforo');
  expect(targets[0].civico).toBe('38');
  expect(targets[0].segnale).toContain('NO AGENZIE');
});

test('PROSSIMO SELLER e LAVORATO aggiornano davvero lo stato',async({page})=>{
  await openApp(page);
  await page.locator('#zoneOpenBtn').click();
  await expect(page.locator('.szCard')).toBeVisible();
  const firstId=await page.locator('.szCard').getAttribute('data-seller-id');
  const firstAddress=(await page.locator('.szAddr').textContent()).trim();
  await page.locator('#sellerNext').click();
  const secondAddress=(await page.locator('.szAddr').textContent()).trim();
  expect(secondAddress).not.toBe(firstAddress);
  await page.locator('#sellerZoneClose').click();
  await page.locator('#zoneOpenBtn').click();
  await expect(page.locator('.szCard')).toBeVisible();
  const currentId=await page.locator('.szCard').getAttribute('data-seller-id');
  await page.locator('#sellerDone').click();
  const stored=await page.evaluate(id=>localStorage.getItem('f1:seller:'+id),currentId);
  expect(stored).toBe('LAVORATO');
  await expect(page.locator(`.szCard[data-seller-id="${currentId}"]`)).toHaveCount(0);
  expect(firstId).toBeTruthy();
});

test('fallback telefono: Seller Signal resta disponibile se le fonti non rispondono',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('f1SellerSignalCacheV2',JSON.stringify({ts:new Date().toISOString(),records:[{id:'cached-seller',comune:'Condove',indirizzo:'Via Roma 99',cosa_cerco:'Appartamento con cartello',prezzo_attuale:'€99.000',seller_signal:['INVENDUTO','RIBASSO'],score:92,priorita:'ALTA',fonte:'Cache Radar',url:''}]}));
    const originalFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>{
      const u=String(input&&input.url?input.url:input||'');
      if(u.includes('seller-segnalati.json')||u.includes('/seller_radar_auto/data/giro_acquisizione.csv'))return Promise.reject(new TypeError('QA offline Seller Signal'));
      return originalFetch(input,init);
    };
  });
  await page.goto('/acquisitore-pro-mobile/index.html?qa='+Date.now(),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.F1SellerSignalsZone);
  await page.locator('#zoneOpenBtn').click();
  await expect(page.locator('#sellerZoneBody')).toContainText('Condove');
  await expect(page.locator('#sellerZoneBody')).toContainText('Via Roma 99');
  await expect(page.locator('#sellerZoneBody')).toContainText('RIBASSO');
});

test('VAI IN ZONA non rompe SONO QUI e layout smartphone',async({page,isMobile})=>{
  await openApp(page);
  await page.locator('#zoneOpenBtn').click();
  await expect(page.locator('#sellerZoneOverlay')).toHaveClass(/open/);
  if(isMobile){
    const box=await page.locator('#sellerZoneOverlay').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(page.viewportSize().width+1);
    const dims=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));
    expect(dims.sw).toBeLessThanOrEqual(dims.w+1);
  }
  await page.locator('#sellerZoneClose').click();
  await page.locator('#hereBtn').click();
  await expect(page.locator('#dialogTitle')).toContainText('NUOVA DESTINAZIONE');
  await expect(page.locator('#zVia')).toBeVisible();
});
