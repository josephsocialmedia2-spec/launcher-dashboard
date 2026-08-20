const { test, expect } = require('@playwright/test');

const APP = '/acquisitore-pro/app-v24.html';

async function openApp(page) {
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') jsErrors.push('console: ' + m.text()); });
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('header')).toContainText('ACQUISITORE PRO');
  await page.waitForTimeout(300);
  return jsErrors;
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

test('avvio, asset interni e console senza errori critici', async ({ page, request }) => {
  const errors = await openApp(page);
  for (const path of [APP,'/acquisitore-pro/app-v24.js','/acquisitore-pro/app-v24-extra.js','/acquisitore-pro/manifest-v24.webmanifest','/acquisitore-pro/sw-v24.js','/acquisitore-pro/icon-192.svg','/acquisitore-pro/icon-512.svg']) {
    const r = await request.get(path);
    expect(r.ok(), path + ' HTTP ' + r.status()).toBeTruthy();
  }
  await page.locator('#selfCheckBtn').click();
  await expect(page.locator('#healthLine')).toContainText('AUTODIAGNOSI LOCALE OK');
  expect(errors).toEqual([]);
});

test('contatto: inserisci, salva, riapri e persistenza', async ({ page }) => {
  await openApp(page);
  await createContact(page);
  await expect(page.locator('#mContacts')).toHaveText('1');
  await expect(page.locator('#mConv')).toHaveText('1');
  await expect(page.locator('#mAppt')).toHaveText('1');
  await expect(page.locator('#name')).toHaveValue('');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#mContacts')).toHaveText('1');
  await page.locator('#contactsBtn').click();
  await expect(page.locator('#dialogBody')).toContainText('Mario Rossi A');
  await expect(page.locator('#dialogBody')).toContainText('Via Roma 10');
});

test('contatto: modifica ed elimina realmente', async ({ page }) => {
  await openApp(page);
  await createContact(page, 'EDIT', 'Interessato');
  await page.locator('#contactsBtn').click();
  const edit = page.locator('[data-contact-edit]').first();
  const del = page.locator('[data-contact-delete]').first();
  await expect(edit).toBeVisible();
  await expect(del).toBeVisible();
  await edit.click();
  await expect(page.locator('#name')).toHaveValue(/Mario Rossi EDIT/);
  await page.locator('#name').fill('Mario Rossi MODIFICATO');
  await page.locator('#note').fill('Nota modificata');
  await page.locator('#closeContactBtn').click();
  await page.locator('#contactsBtn').click();
  await expect(page.locator('#dialogBody')).toContainText('Mario Rossi MODIFICATO');
  page.once('dialog', d => d.accept());
  await page.locator('[data-contact-delete]').first().click();
  await expect(page.locator('#dialogBody')).not.toContainText('Mario Rossi MODIFICATO');
  await expect(page.locator('#mContacts')).toHaveText('0');
});

test('traguardi e notizie: click reali e persistenza', async ({ page }) => {
  await openApp(page);
  await page.locator('#newsBtn').click();
  await expect(page.locator('#mNews')).toHaveText('1');
  const answers = ['2', '1', '1', '1'];
  page.on('dialog', async d => { if (d.type() === 'prompt') await d.accept(answers.shift()); else await d.accept(); });
  await page.locator('#goalsBtn').click();
  await expect(page.locator('#goalsBox')).toContainText('Notizie');
  await expect(page.locator('#goalsBox')).toContainText('TRAGUARDO SUPERATO');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#mNews')).toHaveText('1');
});

test('zona manuale: inserisci, salva, riapri e prosegui', async ({ page }) => {
  await openApp(page);
  await page.locator('#manualZoneBtn').click();
  await page.locator('#zPaese').fill('Avigliana');
  await page.locator('#zVia').fill('Via Roma');
  await page.locator('#zCivico').fill('10');
  await page.locator('#zCosa').fill('Privato motivato');
  await page.locator('#zPrezzo').fill('180000');
  await page.locator('#zSegnale').fill('Ribasso');
  await page.locator('#zSave').click();
  await expect(page.locator('#zoneBox')).toContainText('Avigliana');
  await expect(page.locator('#zoneBox')).toContainText('Via Roma');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#zoneBox')).toContainText('Via Roma');
  await page.locator('#resumeBtn').click();
  await expect(page.locator('#zoneBox')).toContainText('Via Roma');
});

test('SONO QUI: permesso geolocalizzazione, reverse geocoding e fallback UI', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'], { origin: 'http://127.0.0.1:4173' });
  await context.setGeolocation({ latitude: 45.0777, longitude: 7.4010 });
  await page.route('https://nominatim.openstreetmap.org/**', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ address: { town: 'Avigliana', road: 'Via Roma', house_number: '10' } }) }));
  await openApp(page);
  await page.locator('#hereBtn').click();
  await expect(page.locator('#zPaese')).toHaveValue('Avigliana');
  await expect(page.locator('#zVia')).toHaveValue('Via Roma');
  await expect(page.locator('#zCivico')).toHaveValue('10');
  await page.locator('#zSave').click();
  await expect(page.locator('#zoneBox')).toContainText('Via Roma');
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

test('backup: scarica, altera dati, ripristina e verifica', async ({ page }) => {
  await openApp(page);
  await createContact(page, 'BACKUP1');
  await page.locator('#backupBtn').click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#bkDown').click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();
  await page.locator('#dialogClose').click();
  await createContact(page, 'BACKUP2');
  await expect(page.locator('#mContacts')).toHaveText('2');
  await page.locator('#backupBtn').click();
  await page.locator('#bkFile').setInputFiles(backupPath);
  await expect(page.locator('#bkInfo')).toContainText('Backup ripristinato');
  await expect(page.locator('#mContacts')).toHaveText('1');
});

test('documenti venditore e prequalifica: salva e riapri', async ({ page }) => {
  await openApp(page);
  await page.locator('#sellerBtn').click();
  await page.locator('[data-doc="0"]').check();
  await page.locator('details').nth(1).locator('summary').click();
  await page.locator('[data-pq="0"]').fill('Vendita entro 90 giorni');
  await page.locator('#sellerSave').click();
  await page.locator('#sellerBtn').click();
  await expect(page.locator('[data-doc="0"]')).toBeChecked();
  await page.locator('details').nth(1).locator('summary').click();
  await expect(page.locator('[data-pq="0"]')).toHaveValue('Vendita entro 90 giorni');
});

test('piano pubblicazione: modifica, salva, riapri e modalità cliente', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#publicationClientBtn')).toBeVisible();
  await page.locator('#publicationBtn').click();
  await page.locator('#pProp').fill('Quadrilocale Rivoli');
  await page.locator('#pAddr').fill('Via Test 22');
  await page.locator('[data-pdate="0"]').fill('2026-08-30');
  await page.locator('[data-pstatus="0"]').selectOption('PROGRAMMATO');
  await page.locator('[data-purl="0"]').fill('https://example.com/annuncio');
  await page.locator('#pSave').click();
  await page.locator('#publicationBtn').click();
  await expect(page.locator('#pProp')).toHaveValue('Quadrilocale Rivoli');
  await expect(page.locator('[data-pstatus="0"]')).toHaveValue('PROGRAMMATO');
  await page.locator('#dialogClose').click();
  await page.locator('#publicationClientBtn').click();
  await expect(page.locator('#dialogBody')).toContainText('Quadrilocale Rivoli');
  await expect(page.locator('#dialogBody')).toContainText('PROGRAMMATO');
});

test('reel e link operativi: UI completa e URL validi', async ({ page, request }) => {
  await openApp(page);
  await page.locator('#reelBtn').click();
  await expect(page.locator('#reelFileV24')).toBeVisible();
  const hrefs = await page.locator('#dialogBody a[href]').evaluateAll(as => as.map(a => a.href));
  expect(hrefs.length).toBeGreaterThanOrEqual(4);
  for (const href of hrefs) {
    const r = await request.get(href, { timeout: 15000, failOnStatusCode: false });
    expect(r.status(), href).toBeLessThan(500);
  }
});

test('offline: shell PWA riapre dopo installazione service worker', async ({ page, context }) => {
  await openApp(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('header')).toContainText('ACQUISITORE PRO');
  await expect(page.locator('#closeContactBtn')).toBeVisible();
  await context.setOffline(false);
});

test('responsive: nessun overflow orizzontale e modali dentro viewport', async ({ page, isMobile }) => {
  await openApp(page);
  const sizes = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1);
  await expect(page.locator('#closeContactBtn')).toBeVisible();
  await page.locator('#sellerBtn').click();
  const box = await page.locator('#genericDialog').boundingBox();
  const viewport = page.viewportSize();
  expect(box).toBeTruthy();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  if (isMobile) expect(viewport.width).toBeLessThanOrEqual(500);
});
