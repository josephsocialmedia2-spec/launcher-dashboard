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
  expect(js).not.toContain('Villar Dora","Chianocco');
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
  await expect(page.getByRole('heading', { name: 'ACCESSO F1 · CLOUD' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ACCEDI' })).toBeVisible();
  await expect(page.getByRole('button', { name: /PRIMO ACCESSO/i })).toHaveCount(0);
  await expect(page.getByText(/creazione account non è disponibile/i)).toBeVisible();
});

test('CRM blocks phone actions while RPO is unverified', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('f1AcquisitionLeadsV1', JSON.stringify([{
      lead_id:'qa-rpo-lead',pillar:1,source_type:'FSBO',source:'QA',source_url:'',created_at:new Date().toISOString(),
      first_seen:new Date().toISOString(),last_seen:new Date().toISOString(),nome:'QA',cognome:'RPO',telefono:'390000000000',
      email:'',comune:'Villar Dora',via:'Via Test',civico:'',zona:'',immobile_id:'',competitor_agency:'',lead_reason:'FSBO',
      lead_score:80,confidence:'HIGH',status:'DA_VERIFICARE',last_contact:'',next_action:'Verifica RPO',next_action_date:'',
      assigned_to:'',notes:'QA gate',privacy_basis:'QA',do_not_contact:false,rpo_status:'DA_VERIFICARE',created_by:'qa',
      updated_at:new Date().toISOString(),deleted:false
    }]));
  });
  await page.goto('/crm.html');
  await expect(page.getByRole('heading', { name: 'LEAD · INTERAZIONI · TASK' })).toBeVisible();
  const card = page.locator('.lead').filter({ hasText: 'QA RPO' });
  await expect(card).toBeVisible();
  await expect(card.getByText('RPO DA VERIFICARE', { exact: true })).toBeVisible();
  await expect(card.getByRole('link', { name: 'CHIAMA' })).toHaveCount(0);
  await expect(card.getByText('CONTATTO BLOCCATO FINO A VERIFICA RPO', { exact: true })).toBeVisible();
});

test('Telefonate view keeps CALL task blocked until CRM contact eligibility is verified', async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date().toISOString();
    localStorage.setItem('f1AcquisitionLeadsV1', JSON.stringify([{
      lead_id:'qa-call-lead',pillar:1,source_type:'FSBO',source:'QA',created_at:now,nome:'QA',cognome:'CALL',telefono:'390000000001',
      comune:'Villar Dora',via:'Via Test',lead_reason:'FSBO',lead_score:85,confidence:'HIGH',status:'DA_VERIFICARE',
      do_not_contact:false,rpo_status:'DA_VERIFICARE',updated_at:now,deleted:false
    }]));
    localStorage.setItem('f1AcquisitionTasksV1', JSON.stringify([{
      task_id:'11111111-1111-4111-8111-111111111111',lead_id:'qa-call-lead',property_id:'',event_id:'',pillar:1,
      task_type:'CALL',reason:'QA CALL gate',priority:85,due_date:now,assigned_to:'',status:'OPEN',created_at:now,completed_at:'',
      outcome:'',metadata:{core_category:'FSBO'},updated_at:now
    }]));
  });
  await page.goto('/telefonate-oggi.html');
  const card = page.locator('.call').filter({ hasText: 'QA CALL gate' });
  await expect(card).toBeVisible();
  await expect(card.getByText(/BLOCCATO · RPO DA_VERIFICARE/)).toBeVisible();
  await expect(card.getByRole('link', { name: 'APRI CENTRALE PC' })).toHaveCount(0);
  await expect(card.getByRole('link', { name: 'VERIFICA LEAD / RPO' })).toBeVisible();
});

test('mobile command center remains usable', async ({ page }) => {
  await page.goto('/oggi.html');
  await expect(page.getByRole('heading', { name: 'F1 ACQUISITION COMMAND CENTER' })).toBeVisible();
  await page.locator('#taskFilter').scrollIntoViewIfNeeded();
  await expect(page.locator('#taskFilter')).toBeVisible();
  await expect(page.locator('.foot')).toBeVisible();
});
