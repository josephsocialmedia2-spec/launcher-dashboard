const { test, expect } = require('@playwright/test');
test('seller lead engine loads, links valuation and exposes communication queue', async ({ page, request }) => {
  await page.goto('/seller-lead-engine.html');
  await expect(page.getByRole('heading', { name: 'F1 SELLER LEAD ENGINE' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'VALUTAZIONE PROFESSIONALE GRATUITA' })).toHaveAttribute('href','https://www.agentpricing.com/j.malafronte');
  await expect(page.locator('span.label').filter({ hasText: /^COMUNICAZIONI$/ })).toBeVisible();
  for (const path of ['/seller-radar-unico.html','/crm.html','/data/seller-lead-engine-public.json','/data/postiz-outbox.json','/data/communication-outbox.json']) {
    const res=await request.get(path); expect(res.ok(),path).toBeTruthy();
  }
  const q=await (await request.get('/data/communication-outbox.json')).json();
  expect(q.status).toBe('QUEUE_READY');
  expect(Array.isArray(q.items)).toBeTruthy();
  expect(q.items.length).toBeGreaterThan(0);
});
test('seller public feed has no direct private contact fields', async ({ request }) => {
  const feed=await (await request.get('/data/seller-lead-engine-public.json')).json();
  const forbidden=new Set(['telefono','phone','email','nome','cognome','phone_public','email_public','public_entities']);
  function walk(v){if(Array.isArray(v))return v.forEach(walk);if(!v||typeof v!=='object')return;for(const [k,c] of Object.entries(v)){expect(forbidden.has(k.toLowerCase()),'forbidden public key: '+k).toBeFalsy();walk(c)}}
  walk(feed);
});
test('communication outbox contains no resolved recipient details', async ({ request }) => {
  const q=await (await request.get('/data/communication-outbox.json')).json();
  const serialized=JSON.stringify(q).toLowerCase();
  expect(serialized.includes('"recipient":')).toBeFalsy();
  expect(serialized.includes('"recipient_lookup":"crm_authenticated_required"')).toBeTruthy();
});


test('territory mobile home opens Seller Lead Engine', async ({ page }) => {
  await page.goto('/territory-mobile.html');
  const link = page.locator('#openSellerLeadEngine');
  await expect(link).toBeVisible();
  await expect(link).toHaveText('F1 SELLER LEAD ENGINE');
  await expect(link).toHaveAttribute('href','seller-lead-engine.html');
});
