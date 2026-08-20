const { test, expect } = require('@playwright/test');

const APP = '/acquisitore-pro/app-v25.html';
const ORIGIN = 'http://127.0.0.1:4173';

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  return errors;
}

async function openApp(page) {
  const errors = watchErrors(page);
  const t0 = Date.now();
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('header')).toContainText('ACQUISITORE PRO');
  await expect(page.locator('#closeContactBtn')).toBeVisible();
  await page.waitForTimeout(250);
  return { errors, elapsed: Date.now() - t0 };
}

async function createContact(page, suffix = 'A', outcome = 'Appuntamento') {
  await page.locator('[data-situation="persona"]').click();
  await page.locator('#name').fill('Mario Rossi ' + suffix);
  await page.locator('#phone').fill('39333123456');
  await page.locator('#address').fill('Via Roma 10, Avigliana');
  await page.locator('#source').selectOption({ label: 'Giro zona' });
  await page.locator('#note').fill('Contatto QA ' + suffix);
  await page.locator('#outcome').selectOption({ label: outcome });
  await page.locator('#nextAction').fill('Richiamare');
  await page.locator('#closeContactBtn').click();
}

test('avvio, performance, console e nessun backend nascosto', async ({ page }) => {
  const requests = [];
  page.on('request', r => requests.push(r.url()));
  const { errors, elapsed } = await openApp(page);
  await page.locator('#selfCheckBtn').click();
  await expect(page.locator('#healthLine')).toContainText('AUTODIAGNOSI LOCALE OK');
  expect(elapsed).toBeLessThan(5000);
  expect(errors).toEqual([]);
  const unexpected = requests.filter(u => u.startsWith('http') && !u.startsWith(ORIGIN));
  expect(unexpected).toEqual([]);
});

test('PWA: manifest, PNG reali e service worker pubblicati correttamente', async ({ request }) => {
  for (const path of [APP,'/acquisitore-pro/app-v25.css','/acquisitore-pro/app-v25.js','/acquisitore-pro/manifest-v25.webmanifest','/acquisitore-pro/sw-v25.js','/acquisitore-pro/icon-v25-192.png','/acquisitore-pro/icon-v25-512.png','/acquisitore-pro/icon-v25-maskable-512.png']) {
    const r = await request.get(path);
    expect(r.ok(), path + ' HTTP ' + r.status()).toBeTruthy();
  }
  const manifestResponse = await request.get('/acquisitore-pro/manifest-v25.webmanifest');
  const m = await manifestResponse.json();
  expect(m.name).toBe('Acquisitore Pro');
  expect(m.start_url).toBe('./app-v25.html');
  expect(['standalone','fullscreen','minimal-ui']).toContain(m.display);
  expect(m.prefer_related_applications).not.toBe(true);
  expect(m.icons.some(i => i.sizes === '192x192')).toBeTruthy();
  expect(m.icons.some(i => i.sizes === '512x512')).toBeTruthy();
  expect(m.icons.some(i => String(i.purpose || '').includes('maskable'))).toBeTruthy();
  for (const p of ['/acquisitore-pro/icon-v25-192.png','/acquisitore-pro/icon-v25-512.png','/acquisitore-pro/icon-v25-maskable-512.png']) {
    const r = await request.get(p); const body = await r.body();
    expect(body.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  }
});

test('contatto CRUD completo: inserisci, salva, riapri, modifica, elimina', async ({ page }) => {
  await openApp(page);
  await createContact(page, 'CRUD', 'Interessato');
  await expect(page.locator('#mContacts')).toHaveText('1');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#mContacts')).toHaveText('1');
  await page.locator('#contactsBtn').click();
  await expect(page.locator('[data-contact-edit]').first()).toBeVisible();
  await page.locator('[data-contact-edit]').first().click();
  await expect(page.locator('#editBanner')).toHaveClass(/on/);
  await page.locator('#name').fill('Mario Rossi MODIFICATO');
  await page.locator('#note').fill('Nota modificata');
  await page.locator('#closeContactBtn').click();
  await page.locator('#contactsBtn').click();
  await expect(page.locator('#dialogBody')).toContainText('Mario Rossi MODIFICATO');
  page.once('dialog', d => d.accept());
  await page.locator('[data-contact-delete]').first().click();
  await expect(page.locator('#mContacts')).toHaveText('0');
  await expect(page.locator('#dialogBody')).not.toContainText('Mario Rossi MODIFICATO');
});

test('contatori, traguardi e trofeo persistono', async ({ page }) => {
  await openApp(page);
  await page.locator('#newsBtn').click();
  await page.locator('#goalsBtn').click();
  await page.locator('#gConv').fill('1');
  await page.locator('#gNews').fill('1');
  await page.locator('#gAppt').fill('1');
  await page.locator('#gProps').fill('1');
  await page.locator('#gSave').click();
  await createContact(page, 'GOAL', 'Possibile vendita');
  await createContact(page, 'GOAL2', 'Appuntamento');
  await expect(page.locator('#goalsBox')).toContainText('TUTTI I TRAGUARDI SUPERATI');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#mNews')).toHaveText('1');
  await expect(page.locator('#goalsBox')).toContainText('TUTTI I TRAGUARDI SUPERATI');
});

test('zona CRUD completo e persistenza', async ({ page }) => {
  await openApp(page);
  await page.locator('#manualZoneBtn').click();
  await page.locator('#zPaese').fill('Avigliana');
  await page.locator('#zVia').fill('Via Roma');
  await page.locator('#zCivico').fill('10');
  await page.locator('#zCosa').fill('Privato motivato');
  await page.locator('#zPrezzo').fill('180000');
  await page.locator('#zSegnale').fill('Ribasso');
  await page.locator('#zSave').click();
  await expect(page.locator('#zoneBox')).toContainText('Via Roma');
  await page.locator('#zoneEditBtn').click();
  await page.locator('#zCivico').fill('12');
  await page.locator('#zSave').click();
  await expect(page.locator('#zoneBox')).toContainText('12');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#zoneBox')).toContainText('Via Roma');
  page.once('dialog', d => d.accept());
  await page.locator('#zoneDeleteBtn').click();
  await expect(page.locator('#zoneBox')).toContainText('Nessuna destinazione');
});

test('SONO QUI: GPS autorizzato, reverse geocode e salvataggio', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'], { origin: ORIGIN });
  await context.setGeolocation({ latitude: 45.0777, longitude: 7.4010 });
  await page.route('https://nominatim.openstreetmap.org/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ address: { town: 'Avigliana', road: 'Via Roma', house_number: '10' } }) }));
  await openApp(page);
  await page.locator('#hereBtn').click();
  await expect(page.locator('#zPaese')).toHaveValue('Avigliana');
  await expect(page.locator('#zVia')).toHaveValue('Via Roma');
  await expect(page.locator('#zCivico')).toHaveValue('10');
  await page.locator('#zSave').click();
  await expect(page.locator('#zoneBox')).toContainText('Via Roma');
});

test('SONO QUI: permesso negato non blocca e lascia inserimento manuale', async ({ page, context }) => {
  await context.clearPermissions();
  await openApp(page);
  await page.locator('#hereBtn').click();
  await expect(page.locator('#zVia')).toBeVisible();
  await expect(page.locator('#zGeoInfo')).toContainText(/Posizione non disponibile|Geolocalizzazione non disponibile/);
  await page.locator('#zVia').fill('Via Manuale');
  await page.locator('#zSave').click();
  await expect(page.locator('#zoneBox')).toContainText('Via Manuale');
});

test('PROSEGUI DA IERI: recupera punto e aggiunge vie adiacenti senza duplicati', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'], { origin: ORIGIN });
  await context.setGeolocation({ latitude: 45.0777, longitude: 7.4010 });
  await page.route('https://nominatim.openstreetmap.org/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ address: { town: 'Avigliana', road: 'Via Roma', house_number: '10' } }) }));
  await page.route('https://overpass-api.de/api/interpreter', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ elements:[{tags:{name:'Via Roma'}},{tags:{name:'Via Garibaldi'}},{tags:{name:'Via Garibaldi'}},{tags:{name:'Via Torino'}}] }) }));
  await openApp(page);
  await page.locator('#hereBtn').click();
  await expect(page.locator('#zVia')).toHaveValue('Via Roma');
  await page.locator('#zSave').click();
  await page.locator('#resumeBtn').click();
  await page.waitForTimeout(250);
  const state = await page.evaluate(() => window.AcquisitorePro.getState());
  expect(state.zones.filter(z => z.via === 'Via Garibaldi')).toHaveLength(1);
  expect(state.zones.some(z => z.via === 'Via Torino')).toBeTruthy();
});

test('report: download JSON e CSV reali', async ({ page }) => {
  await openApp(page);
  await createContact(page, 'REPORT');
  await page.locator('#reportBtn').click();
  const jsonPromise = page.waitForEvent('download');
  await page.locator('#reportJson').click();
  const jsonDownload = await jsonPromise;
  expect(jsonDownload.suggestedFilename()).toMatch(/Report_.*\.json$/);
  const csvPromise = page.waitForEvent('download');
  await page.locator('#reportCsv').click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toMatch(/Contatti_.*\.csv$/);
});

test('backup: scarica, altera, ripristina; backup invalido non distrugge dati', async ({ page }) => {
  await openApp(page);
  await createContact(page, 'BACKUP1');
  await page.locator('#backupBtn').click();
  const dl = page.waitForEvent('download');
  await page.locator('#bkDown').click();
  const backup = await dl; const backupPath = await backup.path();
  await page.locator('#dialogClose').click();
  await createContact(page, 'BACKUP2');
  await expect(page.locator('#mContacts')).toHaveText('2');
  await page.locator('#backupBtn').click();
  await page.locator('#bkFile').setInputFiles(backupPath);
  await expect(page.locator('#bkInfo')).toContainText('Backup ripristinato');
  await expect(page.locator('#mContacts')).toHaveText('1');
  await page.locator('#bkFile').setInputFiles({ name:'bad.json', mimeType:'application/json', buffer:Buffer.from('{bad') });
  await expect(page.locator('#bkInfo')).toContainText('Backup non valido');
  await expect(page.locator('#mContacts')).toHaveText('1');
});

test('documenti, prequalifica e strategia: salva e riapri', async ({ page }) => {
  await openApp(page);
  await page.locator('#sellerBtn').click();
  await page.locator('[data-doc="0"]').check();
  const pqDetails = page.locator('#dialogBody details').nth(1);
  await pqDetails.locator('summary').click();
  await page.locator('[data-pq="0"]').fill('Vendita entro 90 giorni');
  await page.locator('#sellerSave').click();
  await page.locator('#sellerBtn').click();
  await expect(page.locator('[data-doc="0"]')).toBeChecked();
  await page.locator('#dialogBody details').nth(1).locator('summary').click();
  await expect(page.locator('[data-pq="0"]')).toHaveValue('Vendita entro 90 giorni');
  await page.locator('#dialogBody details').nth(2).locator('summary').click();
  await expect(page.locator('#dialogBody')).toContainText('Coordinamento documenti');
});

test('piano pubblicazione: salva, riapri, modalità cliente e blocco javascript URL', async ({ page }) => {
  await openApp(page);
  await page.locator('#publicationBtn').click();
  await page.locator('#pProp').fill('Quadrilocale Rivoli');
  await page.locator('#pAddr').fill('Via Test 22');
  await page.locator('[data-pdate="0"]').fill('2026-08-30');
  await page.locator('[data-pstatus="0"]').selectOption('PROGRAMMATO');
  await page.locator('[data-purl="0"]').fill('https://example.com/annuncio');
  await page.locator('[data-purl="1"]').fill('javascript:alert(1)');
  await page.locator('#pSave').click();
  await page.locator('#publicationBtn').click();
  await expect(page.locator('#pProp')).toHaveValue('Quadrilocale Rivoli');
  await page.locator('#dialogClose').click();
  await page.locator('#clientPlanBtn').click();
  await expect(page.locator('#dialogBody')).toContainText('Quadrilocale Rivoli');
  await expect(page.locator('#dialogBody')).toContainText('PROGRAMMATO');
  await expect(page.locator('#dialogBody a[href^="javascript:"]')).toHaveCount(0);
});

test('XSS base: dati utente sono testo, non HTML eseguibile', async ({ page }) => {
  await openApp(page);
  await page.locator('#name').fill('<img src=x onerror="window.__xss=1">');
  await page.locator('#note').fill('<script>window.__xss=2</script>');
  await page.locator('#closeContactBtn').click();
  await page.locator('#contactsBtn').click();
  await expect(page.locator('#dialogBody')).toContainText('<img src=x');
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
});

test('Reel e canali operativi: pulsanti/link presenti e schemi sicuri', async ({ page }) => {
  await openApp(page);
  await page.locator('#reelBtn').click();
  await expect(page.locator('#reelFile')).toBeVisible();
  await expect(page.locator('#reelShare')).toBeVisible();
  const hrefs = await page.locator('#dialogBody a[href]').evaluateAll(as => as.map(a => a.href));
  expect(hrefs.length).toBeGreaterThanOrEqual(4);
  for (const href of hrefs) expect(/^https:\/\//.test(href)).toBeTruthy();
});

test('servizi esterni principali raggiungibili senza errore server', async ({ request }) => {
  const urls = [
    'https://josephsocialmedia2-spec.github.io/open-social-scheduler/monday-control.html',
    'https://josephsocialmedia2-spec.github.io/open-social-scheduler/content-center.html',
    'https://josephsocialmedia2-spec.github.io/open-social-scheduler/',
    'https://cdn.shopify.com/s/files/1/1046/2730/6835/files/Portfolio_Performance_Report_Joseph_Digital_Strategist_PREMIUM_FINALE_CON_FOTO_E_INVITO_v4.pdf?v=1787228245',
    'https://cdn.shopify.com/s/files/1/1046/2730/6835/files/F1_Piano_Marketing_Deluxe_Ville_Villini.pdf?v=1787226181',
    'https://cdn.shopify.com/s/files/1/1046/2730/6835/files/F1_Piano_Marketing_Deluxe_Appartamenti_Signorili.pdf?v=1787227485'
  ];
  for (const url of urls) {
    const r = await request.get(url, { timeout: 20000, failOnStatusCode:false });
    expect(r.status(), url).toBeLessThan(500);
  }
});

test('API geografiche live rispondono senza 5xx', async ({ request }) => {
  const n = await request.get('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=45.0777&lon=7.4010&zoom=16&addressdetails=1', { headers:{'Accept':'application/json','User-Agent':'AcquisitorePro-QA/25'}, timeout:20000, failOnStatusCode:false });
  expect(n.status()).toBeLessThan(500);
  const o = await request.post('https://overpass-api.de/api/interpreter', { form:{data:'[out:json];way(around:100,45.0777,7.4010)[highway][name];out tags 1;'}, timeout:25000, failOnStatusCode:false });
  expect(o.status()).toBeLessThan(500);
});

test('offline: service worker installa shell e riapre app senza rete', async ({ page, context }) => {
  await openApp(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload({ waitUntil:'domcontentloaded' });
  const cacheNames = await page.evaluate(() => caches.keys());
  expect(cacheNames.some(k => k.includes('acquisitore-pro-v25-shell'))).toBeTruthy();
  await context.setOffline(true);
  await page.reload({ waitUntil:'domcontentloaded' });
  await expect(page.locator('header')).toContainText('ACQUISITORE PRO');
  await expect(page.locator('#closeContactBtn')).toBeVisible();
  await context.setOffline(false);
});

test('responsive smartphone/desktop: nessun overflow, modali e touch target corretti', async ({ page, isMobile }) => {
  await openApp(page);
  const sizes = await page.evaluate(() => ({ width:innerWidth, scroll:document.documentElement.scrollWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1);
  const closeBox = await page.locator('#closeContactBtn').boundingBox();
  expect(closeBox.height).toBeGreaterThanOrEqual(44);
  await page.locator('#sellerBtn').click();
  const box = await page.locator('#genericDialog').boundingBox();
  const vp = page.viewportSize();
  expect(box).toBeTruthy();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
  if (isMobile) expect(vp.width).toBeLessThanOrEqual(500);
});

test('smoke navigazione: tutti i moduli principali aprono senza errori console', async ({ page }) => {
  const { errors } = await openApp(page);
  for (const id of ['contactsBtn','reportBtn','backupBtn','sellerBtn','publicationBtn','clientPlanBtn','reelBtn']) {
    await page.locator('#' + id).click();
    await expect(page.locator('#genericDialog')).toBeVisible();
    await page.locator('#dialogClose').click();
  }
  await page.locator('#newsBtn').click();
  await page.locator('#manualZoneBtn').click();
  await expect(page.locator('#zVia')).toBeVisible();
  await page.locator('#dialogClose').click();
  expect(errors).toEqual([]);
});
