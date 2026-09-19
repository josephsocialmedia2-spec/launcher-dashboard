const { test, expect } = require('@playwright/test');
test('seller lead engine loads and links valuation', async ({ page, request }) => {
  await page.goto('/seller-lead-engine.html');
  await expect(page.getByRole('heading', { name: 'F1 SELLER LEAD ENGINE' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'VALUTAZIONE PROFESSIONALE GRATUITA' })).toHaveAttribute('href','https://www.agentpricing.com/j.malafronte');
  for (const path of ['/seller-radar-unico.html','/crm.html','/data/seller-lead-engine-public.json','/data/postiz-outbox.json']) {
    const res=await request.get(path); expect(res.ok(),path).toBeTruthy();
  }
});
test('seller public feed has no direct private contact fields', async ({ request }) => {
  const feed=await (await request.get('/data/seller-lead-engine-public.json')).json();
  const forbidden=new Set(['telefono','phone','email','nome','cognome','phone_public','email_public','public_entities']);
  function walk(v){if(Array.isArray(v))return v.forEach(walk);if(!v||typeof v!=='object')return;for(const [k,c] of Object.entries(v)){expect(forbidden.has(k.toLowerCase()),'forbidden public key: '+k).toBeFalsy();walk(c)}}
  walk(feed);
});
