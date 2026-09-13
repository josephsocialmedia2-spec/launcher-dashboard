const { test, expect } = require('@playwright/test');
const REST='https://nqnmlsmeiynxbdojeyjt.supabase.co/rest/v1/';
const AUTH='https://nqnmlsmeiynxbdojeyjt.supabase.co/auth/v1/';

test('Supabase login persists across tabs and unlocks unified CRM',async({browser})=>{
  const context=await browser.newContext();
  await context.route(AUTH+'token?grant_type=password',async route=>{
    const body=JSON.parse(route.request().postData()||'{}');
    expect(body.email).toBe('qa@example.test');
    expect(body.password).toBe('qa-password');
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'qa-access',refresh_token:'qa-refresh',expires_in:3600,token_type:'bearer',user:{id:'00000000-0000-4000-8000-000000000001'}})});
  });
  await context.route(REST+'**',async route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  const page=await context.newPage();
  await page.goto('/setup-cloud.html?return=crm.html');
  await expect(page.locator('#cloudState')).toContainText('NON AUTENTICATO');
  await page.fill('#email','qa@example.test');
  await page.fill('#password','qa-password');
  await page.click('#loginBtn');
  await page.waitForURL('**/crm.html');
  await expect(page.locator('#cloudStatus')).toContainText('SUPABASE AUTENTICATO');
  const stored=await page.evaluate(()=>localStorage.getItem('f1SupabaseSession')||'');
  expect(stored).toContain('qa-access');
  expect(stored).not.toContain('qa-password');

  const second=await context.newPage();
  await second.goto('/crm.html');
  await expect(second.locator('#cloudStatus')).toContainText('SUPABASE AUTENTICATO');
  expect(await second.evaluate(()=>window.F1Sync.ready())).toBeTruthy();
  await context.close();
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
