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
    '/oggi.html','/telefonate-oggi.html','/giro-acquisizione.html','/crm.html','/setup-cloud.html',
    '/seller-radar-unico.html','/competitor-intelligence.html','/social-seller-radar.html','/territory-control.html',
    '/neighborhood-intelligence.html','/radar-edilizio.html','/f1-acquisition-core.js','/f1-acquisition-data.js',
    '/supabase-config.js','/supabase-sync.js','/data/acquisition-public.json'
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

test('Supabase config contains no duplicated territory list', async ({ request }) => {
  const res = await responseOk(request, '/supabase-config.js');
  const js = await res.text();
  expect(js).not.toContain('F1_TERRITORIES_2026');
  expect(js).not.toContain('Villar Dora\",\"Chianocco');
  expect(js).toContain("./config/territory.json");
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

test('cloud access page is login-only', async ({ page }) => {
  await page.goto('/setup-cloud.html');
  await expect(page.getByRole('heading', { name: 'ACCESSO CLOUD' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ENTRA' })).toBeVisible();
  await expect(page.getByRole('button', { name: /CREA ACCOUNT · PRIMO ACCESSO/i })).toHaveCount(0);
  await expect(page.getByText(/Autenticazione individuale necessaria/i)).toBeVisible();
});

test('core contact eligibility blocks unverified RPO and do-not-contact', async ({ page }) => {
  await page.goto('/oggi.html');
  await expect.poll(() => page.evaluate(() => typeof window.F1AcquisitionCore?.contactEligible)).toBe('function');
  const gate = await page.evaluate(() => ({
    unverified: F1AcquisitionCore.contactEligible({telefono:'390000000000',do_not_contact:false,status:'DA_VERIFICARE',rpo_status:'DA_VERIFICARE'}),
    verified: F1AcquisitionCore.contactEligible({telefono:'390000000000',do_not_contact:false,status:'DA_CONTATTARE',rpo_status:'VERIFICATO_OK'}),
    dnc: F1AcquisitionCore.contactEligible({telefono:'390000000000',do_not_contact:true,status:'DA_CONTATTARE',rpo_status:'VERIFICATO_OK'})
  }));
  expect(gate.unverified).toBeFalsy();
  expect(gate.verified).toBeTruthy();
  expect(gate.dnc).toBeFalsy();
});

test('Telefonate view keeps its own RPO gate active', async ({ page }) => {
  await page.goto('/telefonate-oggi.html');
  await expect.poll(() => page.evaluate(() => typeof window.callAllowed)).toBe('function');
  const gate = await page.evaluate(() => ({
    unverified: callAllowed({telefono:'390000000001',do_not_contact:false,status:'DA_VERIFICARE',rpo_status:'DA_VERIFICARE'}),
    verified: callAllowed({telefono:'390000000001',do_not_contact:false,status:'DA_CONTATTARE',rpo_status:'VERIFICATO_OK'}),
    blocked: callAllowed({telefono:'390000000001',do_not_contact:false,status:'NON_CONTATTARE',rpo_status:'VERIFICATO_OK'})
  }));
  expect(gate.unverified).toBeFalsy();
  expect(gate.verified).toBeTruthy();
  expect(gate.blocked).toBeFalsy();
  await expect(page.getByRole('link', { name: 'VERIFICA RPO' })).toBeVisible();
});

test('unauthenticated browser cache cannot become the CRM source of truth', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('f1AcquisitionLeadsV1', JSON.stringify([{
      lead_id:'qa-local-only',source_type:'PAST_CLIENT',nome:'QA',cognome:'LOCAL',telefono:'390000000002',
      status:'DA_RICONTATTARE',rpo_status:'VERIFICATO_OK',next_action_date:'2000-01-01'
    }]));
    localStorage.setItem('f1AcquisitionTasksV1', JSON.stringify([{
      task_id:'22222222-2222-4222-8222-222222222222',lead_id:'qa-local-only',task_type:'CALL',status:'OPEN',due_date:'2000-01-01'
    }]));
  });
  await page.goto('/oggi.html');
  const state = await page.evaluate(async () => {
    let requireCloudMessage='';
    try { F1AcquisitionData.requireCloud(); } catch (e) { requireCloudMessage=String(e.message||e); }
    const d=await F1AcquisitionData.loadDashboardData();
    return {
      cloud:d.cloud,
      leadCount:d.leads.length,
      hasLocalTask:d.tasks.some(t=>String(t.lead_id)==='qa-local-only'),
      requireCloudMessage
    };
  });
  expect(state.cloud).toBeFalsy();
  expect(state.leadCount).toBe(0);
  expect(state.hasLocalTask).toBeFalsy();
  expect(state.requireCloudMessage).toMatch(/accesso cloud richiesto/i);
});

test('mobile command center remains usable', async ({ page }) => {
  await page.goto('/oggi.html');
  await expect(page.getByRole('heading', { name: 'F1 ACQUISITION COMMAND CENTER' })).toBeVisible();
  await page.locator('#taskFilter').scrollIntoViewIfNeeded();
  await expect(page.locator('#taskFilter')).toBeVisible();
  await expect(page.locator('.foot')).toBeVisible();
});
