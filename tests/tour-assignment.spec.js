const { test, expect } = require('@playwright/test');

const staff=[{user_id:'11111111-1111-4111-8111-111111111111',first_name:'Mario',last_name:'Rossi',role:'FUNZIONARIO',status:'ACTIVE',assigned_territory:{}}];

async function mockWizard(page,{active=false}={}){
  await page.route('**/supabase-sync.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:`window.F1Sync={configured:()=>true,ensureSession:async()=>true,ready:()=>true,authToken:async()=>'qa'};`}));
  await page.route('**/config/territory.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({reference_hub:'Susa',sinistra:['Avigliana'],destra:['Bussoleno']})}));
  await page.route('**/f1-staff-data.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:`window.__assignCalls=[];window.__activeMode=${active?'true':'false'};window.F1StaffData={ready:()=>true,me:async()=>({user_id:'owner',first_name:'Titolare',last_name:'F1',role:'TITOLARE',status:'ACTIVE'}),rpc:async(name,payload)=>{if(name==='f1_territory_admin_team')return ${JSON.stringify(staff)};if(name==='f1_territory_admin_tours')return window.__activeMode?[{progress_id:'p1',user_id:'${staff[0].user_id}',first_name:'Mario',last_name:'Rossi',role:'FUNZIONARIO',comune:'Avigliana',status:'IN_CORSO',assigned_at:'2026-10-05T08:00:00+02:00'}]:[];if(name==='f1_territory_assign_municipality'){window.__assignCalls.push(payload);await new Promise(r=>setTimeout(r,120));if(window.__activeMode)return {ok:false,code:'ACTIVE_TOUR_EXISTS',existing:{comune:'Avigliana',status:'IN_CORSO'}};return {ok:true,progress_id:'new',comune:payload.p_comune,status:'IN_CORSO'};}throw new Error('RPC non mockata '+name)}};`}));
}

async function fillTour(page){
  await expect(page.getByText('A CHI ASSEGNI QUESTO GIRO?')).toBeVisible();
  await page.getByRole('button',{name:/AVANTI/}).click();
  await page.locator('#comune').selectOption('Avigliana');
}

test('Titolare assegna un Comune a un funzionario',async({page})=>{
  await mockWizard(page);
  await page.goto('/assegna-giro.html?qa='+Date.now(),{waitUntil:'domcontentloaded'});
  await fillTour(page);
  await page.getByRole('button',{name:/ASSEGNA GIRO/}).click();
  await expect(page.getByText('GIRO ASSEGNATO')).toBeVisible();
  const calls=await page.evaluate(()=>window.__assignCalls);
  expect(calls).toHaveLength(1);
  expect(calls[0].p_comune).toBe('Avigliana');
  expect(calls[0].p_user_id).toBe(staff[0].user_id);
});

test('Doppio click su ASSEGNA GIRO crea una sola richiesta',async({page})=>{
  await mockWizard(page);
  await page.goto('/assegna-giro.html?qa='+Date.now(),{waitUntil:'domcontentloaded'});
  await fillTour(page);
  const btn=page.getByRole('button',{name:/ASSEGNA GIRO/});
  await btn.dblclick();
  await expect(page.getByText('GIRO ASSEGNATO')).toBeVisible();
  expect(await page.evaluate(()=>window.__assignCalls.length)).toBe(1);
});

test('Giro già attivo non viene sovrascritto',async({page})=>{
  await mockWizard(page,{active:true});
  await page.goto('/assegna-giro.html?qa='+Date.now(),{waitUntil:'domcontentloaded'});
  await fillTour(page);
  await page.getByRole('button',{name:/ASSEGNA GIRO/}).click();
  await expect(page.locator('#msg')).toContainText('GIÀ UN GIRO ATTIVO');
  expect(await page.evaluate(()=>window.__assignCalls.length)).toBe(1);
});

test('Territorio Titolare espone il comando leggero + ASSEGNA NUOVO GIRO',async({page})=>{
  await page.route('**/f1-dashboard-auth-guard.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:`document.documentElement.classList.remove('f1-auth-pending');const cta=document.getElementById('twAssignTour');if(cta)cta.hidden=false;`}));
  await page.goto('/ricerca-territoriale.html?qa='+Date.now(),{waitUntil:'domcontentloaded'});
  const cta=page.getByRole('link',{name:/ASSEGNA NUOVO GIRO/});
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('href','assegna-giro.html');
  await expect(page.locator('script[src*="f1-tour-admin-dashboard.js"]')).toHaveCount(0);
});

test('Smartphone: wizard senza overflow orizzontale',async({page,isMobile})=>{
  test.skip(!isMobile,'controllo dedicato al progetto mobile');
  await mockWizard(page);
  await page.goto('/assegna-giro.html?qa='+Date.now(),{waitUntil:'domcontentloaded'});
  const d=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth}));
  expect(d.sw).toBeLessThanOrEqual(d.w+1);
  await expect(page.getByText('+ ASSEGNA NUOVO GIRO')).toBeVisible();
});
