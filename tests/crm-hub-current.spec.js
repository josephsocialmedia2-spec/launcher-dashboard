const { test, expect } = require('@playwright/test');

const BASE='https://nqnmlsmeiynxbdojeyjt.supabase.co';

async function installSession(page){
  await page.addInitScript(() => {
    const session={
      access_token:'qa-token',
      refresh_token:'qa-refresh',
      expires_at:Date.now()+3600000,
      saved_at:Date.now(),
      user:{id:'qa-user'}
    };
    localStorage.setItem('f1SupabaseSession',JSON.stringify(session));
    sessionStorage.setItem('f1SupabaseSession',JSON.stringify(session));
  });
  await page.route(BASE+'/auth/v1/user',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify({id:'qa-user',role:'authenticated'})
  }));
}

test('CRM Hub without session keeps the explicit login gate', async ({ page }) => {
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e.stack||e)));
  await page.goto('/crm.html#contatti',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#crmAuthRequired')).toContainText('ACCESSO CRM RICHIESTO');
  await expect(page.locator('#crmLoginBtn')).toHaveText('ACCEDI AL CRM');
  await expect(page.locator('#crmLoginBtn')).toHaveAttribute('href','setup-cloud.html?return=crm.html');
  expect(errors).toEqual([]);
});

test('CRM Hub loads current Contatti Immobili Trattative and Attivita sections', async ({ page }) => {
  const errors=[],calls=[];
  page.on('pageerror',e=>errors.push(String(e.stack||e)));
  await installSession(page);

  await page.route(BASE+'/rest/v1/**',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname;
    if(path.endsWith('/rpc/f1_crm_hub_page_v1')){
      const body=JSON.parse(req.postData()||'{}');
      calls.push(body);
      const section=body.p_section;
      let rows=[];
      if(section==='CONTATTI') rows=[{
        lead_id:'lead-1',nome:'Anna',cognome:'Bianchi',telefono:'3331234567',
        email:'anna@example.test',comune:'Torino',via:'Via Roma',civico:'10',
        source:'CRM',source_type:'COI',status:'DA_CONTATTARE',lead_reason:'Centro di influenza'
      }];
      if(section==='IMMOBILI') rows=[{
        property_id:'property-1',tipologia:'Appartamento',comune:'Torino',
        via:'Via Po',civico:'20',status:'ATTIVO',caratteristiche:{locali:3}
      }];
      if(section==='TRATTATIVE') rows=[{
        lead_id:'lead-2',nome:'Mario',cognome:'Rossi',telefono:'3332223344',
        comune:'Rivoli',status:'APPUNTAMENTO',next_action:'Valutazione',
        next_action_date:'2026-10-02'
      }];
      if(section==='ATTIVITA') rows=[{
        task_id:'task-1',lead_id:'lead-1',lead_nome:'Anna',lead_cognome:'Bianchi',
        task_type:'CALL',reason:'Richiamo cliente',status:'OPEN',
        due_date:'2026-10-01',lead_telefono:'3331234567',lead_comune:'Torino'
      }];
      return route.fulfill({
        status:200,contentType:'application/json',
        body:JSON.stringify({rows,filtered:rows.length,total:rows.length})
      });
    }
    if(path.endsWith('/tasks') && req.method()==='PATCH'){
      return route.fulfill({status:200,contentType:'application/json',body:'[]'});
    }
    return route.fulfill({status:200,contentType:'application/json',body:'[]'});
  });

  await page.goto('/crm.html#contatti',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#cloudStatus')).toContainText('SUPABASE AUTENTICATO');
  await expect(page.locator('#hubSectionTitle')).toHaveText('CONTATTI');
  await expect(page.locator('.hub-card')).toContainText('Anna Bianchi');
  await expect(page.locator('.hub-card')).toContainText('Torino');

  await page.locator('#hubComune').fill('Torino');
  await expect.poll(()=>calls.at(-1)?.p_filters?.comune||'').toBe('Torino');

  await page.locator('#crmHubNav [data-section="immobili"]').click();
  await expect(page).toHaveURL(/#immobili$/);
  await expect(page.locator('#hubSectionTitle')).toHaveText('IMMOBILI');
  await expect(page.locator('.hub-card')).toContainText('Appartamento');
  await expect(page.locator('.hub-card')).toContainText('Via Po');

  await page.locator('#crmHubNav [data-section="trattative"]').click();
  await expect(page.locator('#hubSectionTitle')).toHaveText('TRATTATIVE');
  await expect(page.locator('.hub-card')).toContainText('Mario Rossi');
  await expect(page.locator('.hub-card')).toContainText('Valutazione');

  await page.locator('#crmHubNav [data-section="attivita"]').click();
  await expect(page.locator('#hubSectionTitle')).toHaveText('ATTIVITÀ');
  await expect(page.locator('.hub-card')).toContainText('CALL · Anna Bianchi');
  await expect(page.locator('.hub-card')).toContainText('Richiamo cliente');

  expect(calls.map(x=>x.p_section)).toEqual(expect.arrayContaining(['CONTATTI','IMMOBILI','TRATTATIVE','ATTIVITA']));
  expect(errors).toEqual([]);
});
