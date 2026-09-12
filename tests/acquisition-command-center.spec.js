const { test, expect } = require('@playwright/test');

async function responseOk(request, path) {
  const res = await request.get(path);
  expect(res.ok(), `${path} should return 2xx`).toBeTruthy();
  return res;
}

test('command center loads canonical 5 Pillars architecture', async ({ page, request }) => {
  await page.goto('/oggi.html');
  await expect(page.getByRole('heading', { name: 'F1 ACQUISITION COMMAND CENTER' })).toBeVisible();
  await expect(page.getByText('CORE 4 · PRIORITÀ MASSIMA')).toBeVisible();
  await expect(page.getByText('I 5 PILASTRI')).toBeVisible();
  await expect(page.getByText('COMPETITOR INTELLIGENCE', { exact: true })).toBeVisible();
  await expect(page.getByText('Cosa devo fare adesso')).toBeVisible();

  const territory = await (await responseOk(request, '/config/territory.json')).json();
  expect(territory.reference_hub).toBeTruthy();
  await expect(page.getByText(`CENTRO: ${territory.reference_hub}`)).toBeVisible();

  const engine = await (await responseOk(request, '/config/acquisition-engine.json')).json();
  expect(engine.pillars).toHaveLength(5);
  for (const pillar of engine.pillars) {
    await expect(page.getByText(pillar.label, { exact: true })).toBeVisible();
  }
});

test('core acquisition routes do not 404', async ({ request }) => {
  const paths = [
    '/oggi.html',
    '/telefonate-oggi.html',
    '/giro-acquisizione.html',
    '/crm.html',
    '/seller-radar-unico.html',
    '/competitor-intelligence.html',
    '/social-seller-radar.html',
    '/territory-control.html',
    '/neighborhood-intelligence.html',
    '/radar-edilizio.html',
    '/f1-acquisition-core.js',
    '/f1-acquisition-data.js',
    '/data/acquisition-public.json'
  ];
  for (const path of paths) await responseOk(request, path);
});

test('command center does not contain legacy Susa hard-coded territory constants', async ({ request }) => {
  const res = await responseOk(request, '/oggi.html');
  const html = await res.text();
  expect(html).not.toContain('OPERATIVE_20KM');
  expect(html).not.toContain('ROUTE_ORDER');
  expect(html).not.toContain('CENTRO: SUSA');
  expect(html).toContain('config/territory.json');
});

test('public acquisition feed exposes no private contact fields', async ({ request }) => {
  const feed = await (await responseOk(request, '/data/acquisition-public.json')).json();
  const forbidden = new Set(['telefono','phone','email','nome','cognome','phone_public','email_public','public_entities']);
  function walk(value) {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      expect(forbidden.has(key.toLowerCase()), `forbidden public key: ${key}`).toBeFalsy();
      walk(child);
    }
  }
  walk(feed);
});

test('mobile command center remains usable', async ({ page }) => {
  await page.goto('/oggi.html');
  await expect(page.getByRole('heading', { name: 'F1 ACQUISITION COMMAND CENTER' })).toBeVisible();
  await page.locator('#taskFilter').scrollIntoViewIfNeeded();
  await expect(page.locator('#taskFilter')).toBeVisible();
  await expect(page.locator('.foot')).toBeVisible();
});
