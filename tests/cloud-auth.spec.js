const { test, expect } = require('@playwright/test');
const REST='https://nqnmlsmeiynxbdojeyjt.supabase.co/rest/v1/';
const AUTH='https://nqnmlsmeiynxbdojeyjt.supabase.co/auth/v1/';

async function mockValidUser(context){
  await context.route(AUTH+'user',async route=>{
    expect(route.request().headers().authorization).toContain('Bearer qa-access');
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'00000000-0000-4000-8000-000000000001',role:'authenticated'})});
  });
}

test('Supabase login is validated, persists after refresh and across tabs, and unlocks unified CRM',async({browser})=>{
  const context=await browser.newContext();
  await context.route(AUTH+'token?grant_type=password',async route=>{
    const body=JSON.parse(route.request().postData()||'{}');
    expect(body.email).toBe('qa@example.test');
    expect(body.password).toBe('qa-password');
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'qa-access',refresh_token:'qa-refresh',expires_in:3600,token_type:'bearer',user:{id:'00000000-0000-4000-8000-000000000001'}})});
  });
  await mockValidUser(context);
  await context.route(REST+'**',async route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  const page=await context.newPage();
  await page.goto('/setup-cloud.html?return=crm.html');
  await expect(page.locator('#cloudState')).toContainText('NON AUTENTICATO');
  await page.fill('#email','qa@example.test');
  await page.fill('#password','qa-password');
  await page.click('#loginBtn');
  await page.waitForURL('**/crm.html');
  await expect(page.locator('#cloudStatus')).toContainText('SUPABASE AUTENTICATO');
  expect(await page.evaluate(()=>window.F1CRMAuthGuard?.ready())).toBeTruthy();
  const stored=await page.evaluate(()=>localStorage.getItem('f1SupabaseSession')||'');
  expect(stored).toContain('qa-access');
  expect(stored).not.toContain('qa-password');

  await page.reload();
  await expect(page.locator('#cloudStatus')).toContainText('SUPABASE AUTENTICATO');
  expect(await page.evaluate(()=>window.F1CRMAuthGuard?.ready())).toBeTruthy();

  const second=await context.newPage();
  await second.goto('/crm.html');
  await expect(second.locator('#cloudStatus')).toContainText('SUPABASE AUTENTICATO');
  expect(await second.evaluate(()=>window.F1Sync.ready())).toBeTruthy();
  expect(await second.evaluate(()=>window.F1CRMAuthGuard?.ready())).toBeTruthy();
  await context.close();
});

test('invalid stored session is rejected and CRM never falls back to cached leads',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('f1SupabaseSession',JSON.stringify({access_token:'stale-token',expires_at:Date.now()+3600000}));
    localStorage.setItem('f1AcquisitionLeadsV1',JSON.stringify([{lead_id:'local-only',nome:'NON DEVE APPARIRE'}]));
  });
  await page.route(AUTH+'user',async route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({message:'invalid token'})}));
  await page.goto('/crm.html');
  await expect(page.locator('#crmAuthRequired')).toContainText('ACCESSO CRM RICHIESTO');
  await expect(page.locator('#crmLoginBtn')).toHaveText('ACCEDI AL CRM');
  await expect(page.locator('#list')).not.toContainText('NON DEVE APPARIRE');
  expect(await page.evaluate(()=>localStorage.getItem('f1SupabaseSession'))).toBeNull();
});

test('expired access token is refreshed then validated before CRM data loads',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('f1SupabaseSession',JSON.stringify({access_token:'expired',refresh_token:'qa-refresh',expires_at:Date.now()-1000})));
  await page.route(AUTH+'token?grant_type=refresh_token',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'qa-access',refresh_token:'qa-refresh-2',expires_in:3600,user:{id:'00000000-0000-4000-8000-000000000001'}})}));
  await page.route(AUTH+'user',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'00000000-0000-4000-8000-000000000001',role:'authenticated'})}));
  await page.route(REST+'**',async route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto('/crm.html');
  await expect(page.locator('#cloudStatus')).toContainText('SUPABASE AUTENTICATO');
  const stored=await page.evaluate(()=>localStorage.getItem('f1SupabaseSession')||'');
  expect(stored).toContain('qa-access');
  expect(stored).toContain('qa-refresh-2');
});

test('magic-link request does not create new users',async({page})=>{
  let payload=null;
  await page.route(AUTH+'otp?**',async route=>{payload=JSON.parse(route.request().postData()||'{}');await route.fulfill({status:200,contentType:'application/json',body:'{}'})});
  await page.goto('/setup-cloud.html?return=crm.html');
  await page.fill('#email','qa@example.test');
  await page.click('#magicBtn');
  await expect(page.locator('#status')).toContainText('LINK INVIATO');
  expect(payload).toMatchObject({email:'qa@example.test',create_user:false});
});
