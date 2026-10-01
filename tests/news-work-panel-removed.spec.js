const { test, expect } = require('@playwright/test');
const fs = require('fs');

async function prepareTreePage(page) {
  await page.route('**/f1-tree-cloud.js*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: "window.F1TreeCloud={boot:async()=>true,touchLocal:()=>{},queueReset:()=>{}};"
    })
  );
}

test('Fonti di Notizie no longer contains the removed workbench', async ({ page, request }) => {
  const source = fs.readFileSync('albero-fonti-notizie.html','utf8');

  for (const forbidden of [
    'F1 NOTIZIE · LAVORAZIONE E RICHIAMI',
    'Notizie da lavorare',
    'IMPORTA NOTIZIE JSON',
    'Nessuna notizia da lavorare',
    '100 Telefonate',
    'id="importNewsFile"',
    'id="newsWorkbenchList"',
    'id="newsDueSummary"',
    'class="news-workbench"'
  ]) {
    expect(source, 'forbidden panel fragment: ' + forbidden).not.toContain(forbidden);
  }

  for (const required of [
    'RICERCA TERRITORIALE → FONTI DI NOTIZIE',
    "Apri la dashboard, cerca segnali territoriali e poi registra qui ogni nominativo come nodo dell'albero.",
    'onclick="openNewsDashboard()"',
    '>NOTIZIE</button>',
    'id="sourceGrid"',
    'id="tree"',
    'id="mnemonicPanel"'
  ]) {
    expect(source, 'required content: ' + required).toContain(required);
  }

  const res = await request.get('/albero-fonti-notizie.html');
  expect(res.ok()).toBeTruthy();

  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e.message || e)));
  await prepareTreePage(page);
  await page.goto('/albero-fonti-notizie.html', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('RICERCA TERRITORIALE → FONTI DI NOTIZIE')).toBeVisible();
  await expect(page.locator('.dashboard-strip .news-launcher')).toHaveText('NOTIZIE');
  await expect(page.locator('.news-workbench')).toHaveCount(0);
  await expect(page.locator('#mnemonicPanel')).toBeVisible();

  expect(pageErrors, pageErrors.join('\n')).toEqual([]);
});

test('Fonti di Notizie remains usable on mobile after panel removal', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  await prepareTreePage(page);
  await page.goto('/albero-fonti-notizie.html', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('RICERCA TERRITORIALE → FONTI DI NOTIZIE')).toBeVisible();
  await expect(page.locator('.dashboard-strip .news-launcher')).toBeVisible();
  await expect(page.locator('.news-workbench')).toHaveCount(0);

  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 2);
  await context.close();
});
