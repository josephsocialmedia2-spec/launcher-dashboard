const { test, expect } = require('@playwright/test');

async function openApp(page){
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
  await page.goto('/acquisitore-pro-mobile/index.html?prospectingqa='+Date.now(),{waitUntil:'domcontentloaded'});
  await expect(page.locator('#prospectingBtn')).toBeVisible();
  return errors;
}

test('Prospecting Susa: apre 20 giornate, mappa e navigatore completo',async({page})=>{
  const errors=await openApp(page);
  await page.locator('#prospectingBtn').click();
  const overlay=page.locator('#susaProspectingOverlay');
  await expect(overlay).toHaveClass(/open/);
  await expect(overlay).toHaveAttribute('aria-hidden','false');
  await expect(page.locator('#spDaySelect option')).toHaveCount(20);
  await expect(page.locator('#spDays')).toHaveText('20');
  await expect(page.locator('#spKm')).toHaveText('145,3');
  await expect(page.locator('#spDirection')).toContainText('Corso Inghilterra');
  await expect(page.locator('#spMap .spRoute')).not.toHaveCount(0);
  await expect(page.locator('#spMap .spCurrent')).not.toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Prospecting Susa: FATTA salva e riprende dalla svolta successiva',async({page})=>{
  const errors=await openApp(page);
  await page.locator('#prospectingBtn').click();
  await expect(page.locator('#spStep')).toContainText('PASSAGGIO 1 DI');
  await page.locator('#spDone').click();
  await expect(page.locator('#spStep')).toContainText('PASSAGGIO 2 DI');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('f1:prospecting:susa:v1')));
  expect(saved.statuses['0:0']).toBe('FATTA');
  expect(saved.stepByDay['0']).toBe(1);
  await page.locator('#spClose').click();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#prospectingBtn').click();
  await expect(page.locator('#spStep')).toContainText('PASSAGGIO 2 DI');
  expect(errors).toEqual([]);
});

test('Prospecting Susa: CONTATTO TROVATO apre il CRM con via e nota precompilate',async({page})=>{
  const errors=await openApp(page);
  await page.locator('#prospectingBtn').click();
  await page.locator('#spContact').click();
  await expect(page.locator('#susaProspectingOverlay')).not.toHaveClass(/open/);
  await expect(page.locator('#genericDialog')).toHaveAttribute('open','');
  await expect(page.locator('#dialogTitle')).toHaveText('NUOVO CONTATTO');
  await expect(page.locator('#mcAddress')).toHaveValue(/Susa/);
  await expect(page.locator('#mcNote')).toHaveValue(/Circle prospecting/);
  await expect(page.locator('#mcSource')).toHaveValue('Giro zona');
  expect(errors).toEqual([]);
});

test('Prospecting Susa: layout smartphone senza scorrimento orizzontale',async({page,isMobile})=>{
  test.skip(!isMobile,'Controllo riservato al progetto mobile');
  const errors=await openApp(page);
  await page.locator('#prospectingBtn').click();
  const viewport=page.viewportSize();
  const box=await page.locator('#susaProspectingOverlay').boundingBox();
  expect(box.x).toBeLessThanOrEqual(1);
  expect(box.width).toBeLessThanOrEqual(viewport.width+1);
  const dimensions=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width+1);
  expect(errors).toEqual([]);
});

test('Prospecting Susa: gli asset sono inclusi nella cache offline',async({request})=>{
  for(const path of ['/acquisitore-pro-mobile/prospecting-susa.css','/acquisitore-pro-mobile/prospecting-susa.js','/acquisitore-pro-mobile/susa-prospecting-data.json']){
    const response=await request.get(path);
    expect(response.status(),path).toBe(200);
  }
  const worker=await (await request.get('/acquisitore-pro-mobile/sw.js')).text();
  expect(worker).toContain('v13-prospecting-susa');
  expect(worker).toContain('./susa-prospecting-data.json');
});
