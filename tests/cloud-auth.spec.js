const { test, expect } = require('@playwright/test');
const REST='https://nqnmlsmeiynxbdojeyjt.supabase.co/rest/v1/';
const AUTH='https://nqnmlsmeiynxbdojeyjt.supabase.co/auth/v1/';
const FN='https://nqnmlsmeiynxbdojeyjt.supabase.co/functions/v1/';
const USER_ID='00000000-0000-4000-8000-000000000001';

async function mockValidUser(context,email='qa@example.test'){
  await context.route(AUTH+'user',async route=>{
    expect(route.request().headers().authorization).toContain('Bearer qa-access');
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:USER_ID,role:'authenticated',email})});
  });
}

async function mockRest(context){
  await context.route(REST+'**',async route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
}

test('BLOCCO 1 · NORMALE · account creato dal titolare -> login -> sessione -> dashboard F1',async({browser})=>{
  const context=await browser.newContext();
  let loginCalls=0;
  await context.route(AUTH+'token?grant_type=password',async route=>{
    loginCalls++;
    const body=JSON.parse(route.request().postData()||'{}');
    expect(body.email).toBe('ana.cet.4567@f1.local');
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'qa-access',refresh_token:'qa-refresh',expires_in:3600,token_type:'bearer',user:{id:USER_ID,email:body.email}})});
  });
  await mockValidUser(context,'ana.cet.4567@f1.local');
  await mockRest(context);
  const page=await context.newPage();
  await page.goto('/setup-cloud.html?invite=staff&return=ricerca-territoriale.html');
  await expect(page.locator('#signupBtn')).toHaveCount(0);
  await page.fill('#email','ana.cet.4567@f1.local');
  await page.fill('#password','Qa-password-1234');
  await page.click('#loginBtn');
  await page.waitForURL('**/ricerca-territoriale.html');
  await page.waitForFunction(()=>window.F1DashboardAuthGuard?.ready()===true);
  expect(loginCalls).toBe(1);
  const stored=await page.evaluate(()=>localStorage.getItem('f1SupabaseSession')||'');
  expect(stored).toContain('qa-access');
  expect(stored).toContain('qa-refresh');
  expect(stored).not.toContain('Qa-password-1234');
  await context.close();
});
test('BLOCCO 1 · DISTRATTO · email errata non chiama Supabase e doppio click non duplica login',async({page})=>{
  let loginCalls=0;
  await page.route(AUTH+'token?grant_type=password',async route=>{
    loginCalls++;
    await new Promise(r=>setTimeout(r,80));
    await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'invalid login credentials'})});
  });
  await page.goto('/setup-cloud.html?return=ricerca-territoriale.html');
  await page.fill('#email','email-sbagliata');
  await page.fill('#password','password-qualsiasi');
  await page.click('#loginBtn');
  await expect(page.locator('#status')).toContainText('Inserisci una email valida');
  expect(loginCalls).toBe(0);

  await page.fill('#email','qa@example.test');
  await page.evaluate(()=>{const b=document.querySelector('#loginBtn');b.click();b.click()});
  await expect(page.locator('#status')).toContainText('ERRORE');
  expect(loginCalls).toBe(1);
});

test('BLOCCO 1 · ORDINE ERRATO · dashboard diretta senza sessione torna al login',async({page})=>{
  await page.goto('/ricerca-territoriale.html');
  await page.waitForURL('**/setup-cloud.html?return=ricerca-territoriale.html');
  await expect(page.locator('#cloudState')).toContainText('NON AUTENTICATO');
  expect(await page.evaluate(()=>localStorage.getItem('f1SupabaseSession'))).toBeNull();
});

test('BLOCCO 1 · EDGE CASE · timeout rete non blocca la pagina e consente nuovo tentativo',async({page})=>{
  await page.addInitScript(()=>{
    window.F1_AUTH_TIMEOUT_MS=120;
    const realFetch=window.fetch.bind(window);
    window.fetch=(input,init={})=>{
      const url=String(input?.url||input||'');
      if(url.includes('/auth/v1/token?grant_type=password')){
        return new Promise((resolve,reject)=>{
          const signal=init.signal;
          if(signal?.aborted){reject(new DOMException('Aborted','AbortError'));return}
          signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
        });
      }
      return realFetch(input,init);
    };
  });
  await page.goto('/setup-cloud.html?return=ricerca-territoriale.html');
  await page.fill('#email','qa@example.test');
  await page.fill('#password','qa-password');
  await page.click('#loginBtn');
  await expect(page.locator('#status')).toContainText('Tempo massimo di connessione superato');
  await expect(page.locator('#loginBtn')).toBeEnabled();
  await expect(page.locator('#email')).toHaveValue('qa@example.test');
  await expect(page.locator('#password')).toHaveValue('qa-password');
});

test('Supabase login is validated, persists after refresh and across tabs, and unlocks unified CRM',async({browser})=>{
  const context=await browser.newContext();
  await context.route(AUTH+'token?grant_type=password',async route=>{
    const body=JSON.parse(route.request().postData()||'{}');
    expect(body.email).toBe('qa@example.test');
    expect(body.password).toBe('qa-password');
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'qa-access',refresh_token:'qa-refresh',expires_in:3600,token_type:'bearer',user:{id:USER_ID}})});
  });
  await mockValidUser(context);
  await mockRest(context);
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
  await page.route(AUTH+'token?grant_type=refresh_token',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'qa-access',refresh_token:'qa-refresh-2',expires_in:3600,user:{id:USER_ID}})}));
  await page.route(AUTH+'user',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:USER_ID,role:'authenticated'})}));
  await mockRest(page);
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
