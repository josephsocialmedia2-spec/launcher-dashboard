const { test, expect } = require('@playwright/test');

const BASE='https://nqnmlsmeiynxbdojeyjt.supabase.co';
const AUTH=BASE+'/auth/v1/';
const REST=BASE+'/rest/v1/';

function idField(table){return table==='leads'?'lead_id':table==='tasks'?'task_id':table==='interactions'?'interaction_id':table+'_id'}
function core4(lead){return ['PAST_CLIENT','COI','FSBO','EXPIRED_CANDIDATE','EXPIRED_VERIFIED'].includes(String(lead.source_type||'').toUpperCase())}
function due(task){return !['DONE','CANCELLED'].includes(String(task.status||'OPEN').toUpperCase())&&(!task.due_date||String(task.due_date).slice(0,10)<='2026-09-15')}
function pageRows(db,body){
  const q=String(body.p_search||'').trim().toLowerCase(),status=String(body.p_status||''),filter=String(body.p_filter||''),offset=Number(body.p_offset||0),limit=Number(body.p_limit||50);
  let rows=db.leads.filter(x=>!x.deleted);
  if(q)rows=rows.filter(x=>[x.nome,x.cognome,x.telefono,x.email,x.comune,x.via,x.source,x.source_url,x.notes].join(' ').toLowerCase().includes(q));
  if(status)rows=rows.filter(x=>String(x.status||'')===status);
  if(filter==='CORE4')rows=rows.filter(core4);
  if(filter==='RPO')rows=rows.filter(x=>String(x.rpo_status||'')==='DA_VERIFICARE');
  if(filter==='MARKET_LISTING')rows=rows.filter(x=>['MARKET_LISTING','MARKET_SIGNAL','COMPETITOR_LISTING','FSBO_CANDIDATE','EXPIRED_CANDIDATE','EXPIRED_VERIFIED'].includes(String(x.source_type||'')));
  if(filter==='DUE')rows=rows.filter(x=>db.tasks.some(t=>String(t.lead_id)===String(x.lead_id)&&due(t)));
  const filtered=rows.length;
  return rows.slice(offset,offset+limit).map(x=>({...x,interaction_count:db.interactions.filter(i=>String(i.lead_id)===String(x.lead_id)).length,filtered_count:filtered}));
}

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
    const req=route.request(),u=new URL(req.url()),path=u.pathname,table=path.split('/').pop(),method=req.method();
    expect(req.headers().authorization||'').toContain('Bearer qa-access');
    const ok=body=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
    if(path.endsWith('/rpc/f1_crm_kpis'))return ok([{
      leads:db.leads.filter(x=>!x.deleted).length,
      core4:db.leads.filter(x=>!x.deleted&&core4(x)).length,
      tasks_due:db.tasks.filter(due).length,
      interactions:db.interactions.length,
      assignments:db.leads.filter(x=>['INCARICO','ACQUISITO'].includes(String(x.status||''))).length,
      do_not_contact:db.leads.filter(x=>x.do_not_contact||String(x.status||'')==='NON_CONTATTARE').length
    }]);
    if(path.endsWith('/rpc/f1_crm_lead_page_v2'))return ok(pageRows(db,JSON.parse(req.postData()||'{}')));
    if(path.endsWith('/rpc/f1_crm_visible_tasks')){
      const body=JSON.parse(req.postData()||'{}'),ids=new Set((body.p_lead_ids||[]).map(String));
      return ok(db.tasks.filter(t=>ids.has(String(t.lead_id))&&!['DONE','CANCELLED'].includes(String(t.status||'OPEN').toUpperCase())));
    }
    if(!db[table])return route.fulfill({status:404,contentType:'application/json',body:'[]'});
    if(method==='GET'){
      const field=idField(table),eq=u.searchParams.get(field)?.replace(/^eq\./,'');
      const rows=eq?db[table].filter(x=>String(x[field])===String(eq)):db[table];
      return ok(rows);
    }
    if(method==='POST'){
      const incoming=JSON.parse(req.postData()||'[]'),rows=Array.isArray(incoming)?incoming:[incoming],field=idField(table);
      for(const row of rows){const i=db[table].findIndex(x=>String(x[field])===String(row[field]));if(i>=0)db[table][i]={...db[table][i],...row};else db[table].push({...row})}
      return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(rows)});
    }
    if(method==='PATCH'){
      const patch=JSON.parse(req.postData()||'{}'),field=idField(table),filter=u.searchParams.get(field),value=filter?.replace(/^eq\./,'');
      const changed=[];for(let i=0;i<db[table].length;i++)if(!value||String(db[table][i][field])===value){db[table][i]={...db[table][i],...patch};changed.push(db[table][i])}
      return ok(changed);
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
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error'&&!/^Failed to load resource/i.test(m.text()))consoleErrors.push(m.text())});

  await page.goto('/index.html');
  await expect(page.locator('body')).toContainText('F1');

  await page.goto('/crm.html');
  await expect(page.locator('#crmAuthRequired')).toContainText('ACCESSO CRM RICHIESTO');
  await expect(page.locator('#crmLoginBtn')).toHaveText('ACCEDI AL CRM');

  await page.click('#crmLoginBtn');
  await page.waitForURL('**/setup-cloud.html?return=crm.html');
  await page.fill('#email','qa@example.test');
  await page.fill('#password','qa-password');
  await page.click('#loginBtn');
  await page.waitForURL('**/crm.html');
  await expect(page.locator('#cloudStatus')).toContainText('SUPABASE AUTENTICATO');
  expect(await page.evaluate(()=>window.F1CRMAuthGuard?.ready())).toBeTruthy();

  await page.reload();
  await expect(page.locator('#cloudStatus')).toContainText('SUPABASE AUTENTICATO');
  expect(await page.evaluate(()=>window.F1CRMAuthGuard?.ready())).toBeTruthy();

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

  await page.getByRole('button',{name:'MODIFICA'}).first().click();
  await page.fill('#fNotes','Record QA browser MODIFICATO');
  await page.click('#saveLeadBtn');
  await page.fill('#q','MODIFICATO');
  await expect(page.locator('#list')).toContainText('QA Browser CRM');
  await page.fill('#q','');
  await expect(page.locator('#list')).toContainText('QA Browser CRM');

  await page.getByRole('button',{name:'REGISTRA ESITO'}).first().click();
  await page.fill('#oOutcome','CONTATTO QA');
  await page.fill('#oNote','Interazione QA verificata');
  await page.fill('#oNext','Follow-up QA');
  await page.fill('#oNextDate','2026-09-15');
  await page.click('#saveOutcomeBtn');
  await expect(page.locator('#sInteractions')).not.toHaveText('0');
  expect(db.interactions.some(x=>x.outcome==='CONTATTO QA')).toBeTruthy();

  const leadId=db.leads[0].lead_id;
  expect(db.tasks.some(x=>x.lead_id===leadId)).toBeTruthy();
  expect(db.interactions.every(x=>x.lead_id===leadId)).toBeTruthy();

  await page.click('#newBtn');
  await page.fill('#fNome','QA Duplicato');
  await page.fill('#fTelefono','3330001122');
  await page.fill('#fComune','Villar Dora');
  await page.selectOption('#fType','FSBO');
  await page.click('#saveLeadBtn');
  expect(db.leads).toHaveLength(1);

  await page.close();
  const reopened=await context.newPage();
  const reopenedErrors=[];
  reopened.on('pageerror',e=>reopenedErrors.push(String(e)));
  await reopened.goto('/crm.html');
  await expect(reopened.locator('#cloudStatus')).toContainText('SUPABASE AUTENTICATO');
  await expect(reopened.locator('#list')).toContainText('QA');
  expect(await reopened.evaluate(()=>window.F1CRMAuthGuard?.ready())).toBeTruthy();
  expect(db.leads).toHaveLength(1);
  expect(db.interactions.length).toBeGreaterThanOrEqual(2);
  expect(db.tasks.length).toBeGreaterThanOrEqual(1);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(reopenedErrors).toEqual([]);
  await context.close();
});
