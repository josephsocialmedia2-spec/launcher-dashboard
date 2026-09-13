const { test, expect } = require('@playwright/test');

const BASE='https://nqnmlsmeiynxbdojeyjt.supabase.co';
const AUTH=BASE+'/auth/v1/';
const REST=BASE+'/rest/v1/';

function idField(table){return table==='leads'?'lead_id':table==='tasks'?'task_id':table==='interactions'?'interaction_id':table+'_id'}

async function installBackend(context,db){
  await context.route(AUTH+'token?grant_type=password',async route=>{
    const body=JSON.parse(route.request().postData()||'{}');
    expect(body).toMatchObject({email:'qa@example.test',password:'qa-password'});
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'qa-access',refresh_token:'qa-refresh',expires_in:3600,user:{id:'00000000-0000-4000-8000-000000000001'}})});
  });
  await context.route(AUTH+'user',async route=>{
    expect(route.request().headers().authorization).toContain('Bearer qa-access');
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'00000000-0000-4000-8000-000000000001',role:'authenticated'})});
  });
  await context.route(REST+'**',async route=>{
    const req=route.request(),u=new URL(req.url()),table=u.pathname.split('/').pop(),method=req.method();
    if(!db[table])return route.fulfill({status:404,contentType:'application/json',body:'[]'});
    expect(req.headers().authorization||'').toContain('Bearer qa-access');
    if(method==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(db[table])});
    if(method==='POST'){
      const incoming=JSON.parse(req.postData()||'[]'),rows=Array.isArray(incoming)?incoming:[incoming],field=idField(table);
      for(const row of rows){const i=db[table].findIndex(x=>String(x[field])===String(row[field]));if(i>=0)db[table][i]={...db[table][i],...row};else db[table].push({...row})}
      return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(rows)});
    }
    if(method==='PATCH'){
      const patch=JSON.parse(req.postData()||'{}'),field=idField(table),filter=u.searchParams.get(field),value=filter?.replace(/^eq\./,'');
      const changed=[];for(let i=0;i<db[table].length;i++)if(!value||String(db[table][i][field])===value){db[table][i]={...db[table][i],...patch};changed.push(db[table][i])}
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(changed)});
    }
    if(method==='DELETE'){
      const field=idField(table),filter=u.searchParams.get(field),value=filter?.replace(/^eq\./,'');db[table]=db[table].filter(x=>String(x[field])!==value);return route.fulfill({status:204,body:''});
    }
    return route.fulfill({status:405,contentType:'application/json',body:'[]'});
  });
}

test('dashboard -> auth -> CRM -> lead/interactions/task -> refresh/reopen persistence',async({browser})=>{
  const db={leads:[],interactions:[],tasks:[],territories:[],crm_import_log:[]};
  const context=await browser.newContext();
  await installBackend(context,db);
  const page=await context.newPage();
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));

  // 1. Dashboard
  await page.goto('/index.html');
  await expect(page.locator('body')).toContainText('F1');

  // 2. CRM non autenticato -> gate esplicito
  await page.goto('/crm.html');
  await expect(page.locator('#crmAuthRequired')).toContainText('ACCESSO CRM RICHIESTO');
  await expect(page.locator('#crmLoginBtn')).toHaveText('ACCEDI AL CRM');

  // 3. Autenticazione
  await page.click('#crmLoginBtn');
  await page.waitForURL('**/setup-cloud.html?return=crm.html');
  await page.fill('#email','qa@example.test');
  await page.fill('#password','qa-password');
  await page.click('#loginBtn');
  await page.waitForURL('**/crm.html');
  await expect(page.locator('#cloudStatus')).toContainText('SUPABASE AUTENTICATO');
  expect(await page.evaluate(()=>window.F1CRMAuthGuard?.ready())).toBeTruthy();

  // 4-5. Refresh: la sessione resta valida
  await page.reload();
  await expect(page.locator('#cloudStatus')).toContainText('SUPABASE AUTENTICATO');
  expect(await page.evaluate(()=>window.F1CRMAuthGuard?.ready())).toBeTruthy();

  // 6-7. Crea Lead dal CRM
  await page.click('#newBtn');
  await expect(page.locator('#leadDlg')).toBeVisible();
  await page.fill('#fNome','QA Browser');
  await page.fill('#fCognome','CRM');
  await page.fill('#fTelefono','3330001122');
  await page.fill('#fEmail','qa.browser@example.test');
  await page.fill('#fComune','Villar Dora');
  await page.fill('#fVia','Via QA');
  await page.fill('#fCivico','1');
  await page.selectOption('#fType','FSBO');
  await page.selectOption('#fRpo','NON_APPLICABILE');
  await page.fill('#fNotes','Record QA browser persistente');
  await page.fill('#fNext','Richiamo QA');
  await page.fill('#fNextDate','2026-09-14');
  await page.click('#saveLeadBtn');
  await expect(page.locator('#list')).toContainText('QA Browser CRM');
  expect(db.leads).toHaveLength(1);
  expect(db.interactions.length).toBeGreaterThanOrEqual(1);
  expect(db.tasks.length).toBeGreaterThanOrEqual(1);

  // modifica + ricerca
  await page.getByRole('button',{name:'MODIFICA'}).first().click();
  await page.fill('#fNotes','Record QA browser MODIFICATO');
  await page.click('#saveLeadBtn');
  await page.fill('#q','MODIFICATO');
  await expect(page.locator('#list')).toContainText('QA Browser CRM');
  await page.fill('#q','');

  // 8. Registra interazione / esito
  await page.getByRole('button',{name:'REGISTRA ESITO'}).first().click();
  await page.fill('#oOutcome','CONTATTO QA');
  await page.fill('#oNote','Interazione QA verificata');
  await page.fill('#oNext','Follow-up QA');
  await page.fill('#oNextDate','2026-09-15');
  await page.click('#saveOutcomeBtn');
  await expect(page.locator('#sInteractions')).not.toHaveText('0');
  expect(db.interactions.some(x=>x.outcome==='CONTATTO QA')).toBeTruthy();

  // 9. Il task esiste ed è collegato allo stesso Lead
  const leadId=db.leads[0].lead_id;
  expect(db.tasks.some(x=>x.lead_id===leadId)).toBeTruthy();
  expect(db.interactions.every(x=>x.lead_id===leadId)).toBeTruthy();

  // controllo duplicati manuale: stesso telefono non crea un secondo Lead
  await page.click('#newBtn');
  await page.fill('#fNome','QA Duplicato');
  await page.fill('#fTelefono','3330001122');
  await page.fill('#fComune','Villar Dora');
  await page.selectOption('#fType','FSBO');
  await page.click('#saveLeadBtn');
  expect(db.leads).toHaveLength(1);

  // 10-11. Chiudi/reapri CRM: sessione e dati restano disponibili
  await page.close();
  const reopened=await context.newPage();
  await reopened.goto('/crm.html');
  await expect(reopened.locator('#cloudStatus')).toContainText('SUPABASE AUTENTICATO');
  await expect(reopened.locator('#list')).toContainText('QA');
  expect(await reopened.evaluate(()=>window.F1CRMAuthGuard?.ready())).toBeTruthy();
  expect(db.leads).toHaveLength(1);
  expect(db.interactions.length).toBeGreaterThanOrEqual(3);
  expect(db.tasks.length).toBeGreaterThanOrEqual(1);

  expect(pageErrors).toEqual([]);
  await context.close();
});
