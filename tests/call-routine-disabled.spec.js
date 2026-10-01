const { test, expect } = require('@playwright/test');

const times = [
  ['09:29','2026-10-01T09:29:00+02:00'],
  ['09:30','2026-10-01T09:30:00+02:00'],
  ['10:30','2026-10-01T10:30:00+02:00'],
  ['12:29','2026-10-01T12:29:00+02:00'],
  ['12:30','2026-10-01T12:30:00+02:00'],
  ['12:31','2026-10-01T12:31:00+02:00']
];

test('mandatory morning Telefonate routine is absent from canonical sources', async ({ request }) => {
  const dashboard = await (await request.get('/ricerca-territoriale.html')).text();
  const territory = await (await request.get('/territory-mobile.html')).text();
  const callBlock = await (await request.get('/f1-call-block.js')).text();
  const telefonate = await (await request.get('/telefonate-oggi.html')).text();
  const daily = await (await request.get('/daily-command-panel.js')).text();

  expect(dashboard).not.toContain('f1-call-block.js');
  expect(territory).not.toContain('f1CallBlockAppRouter');
  expect(territory).not.toContain('telefonate-oggi.html?source=f1-territory-app');

  expect(callBlock).toContain('enabled:false');
  expect(callBlock).not.toContain('inCallBlock');
  expect(callBlock).not.toContain('location.href');
  expect(callBlock).not.toContain('setInterval');

  for (const forbidden of [
    '09:30–12:30',
    'BLOCCO OPERATIVO OBBLIGATORIO',
    'MODALITÀ TELEFONATE ATTIVA',
    'Fino alle 12:30 fai solo chiamate',
    'Niente altro fino alle 12:30',
    'isFocusWindow(',
    'WAS_ACTIVE_FROM_APP'
  ]) {
    expect(telefonate).not.toContain(forbidden);
  }

  expect(daily).not.toContain("name:'PROSPECTING'");
  expect(daily).not.toContain("name:'CONTATTO'");
  expect(daily).not.toContain("goal:'10 contatti prospecting'");
  expect(daily).not.toContain("module:'Telefonate + Script + CRM'");
});

for (const [label, iso] of times) {
  test('Telefonate remains free at ' + label, async ({ browser }) => {
    const fixed = Date.parse(iso);
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();

    await page.addInitScript(ts => {
      const NativeDate = Date;
      class FixedDate extends NativeDate {
        constructor(...args) {
          if (args.length) super(...args);
          else super(ts);
        }
        static now() { return ts; }
      }
      globalThis.Date = FixedDate;
    }, fixed);

    await page.goto('/telefonate-oggi.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#sessionTitle')).toHaveText('TELEFONATE');
    await expect(page.locator('#sessionSub')).toContainText('Coda disponibile');
    await expect(page.locator('body')).not.toHaveClass(/focus-active/);
    await expect(page.locator('#f1CallBlockGate')).toHaveCount(0);
    await expect(page).toHaveURL(/telefonate-oggi\.html/);
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/telefonate-oggi\.html/);

    await context.close();
  });
}
