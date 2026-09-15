const { test, expect } = require('@playwright/test');

function lead(n, extra={}) {
  return {
    lead_id:`lead-${n}`, pillar:1, source_type:'OTHER', source:'QA', source_url:'',
    nome:'Mario', cognome:`Rossi ${n}`, azienda:'', telefono:`333${String(n).padStart(7,'0')}`, email:'',
    comune:'Villar Dora', via:'Via Test', civico:String(n), zona:'Via Test', immobile_id:'', competitor_agency:'',
    lead_reason:'QA', lead_score:90, confidence:'MEDIUM', status:'DA_CONTATTARE', last_contact:null,
    next_action:'Controlla', next_action_date:'2026-09-15T08:00:00Z', assigned_to:'', privacy_basis:'QA',
    do_not_contact:false, rpo_status:'VERIFICATO_OK', updated_at:'2026-09-15T08:00:00Z', market_data:{},
    interaction_count:n===2?1:0, filtered_count:1240, ...extra
  };
}

async function installBackend(page) {
  const metrics={pageBodies:[],kpi:0,visibleTasks:[],fullLeads:0,fullTasks:0,fullInteractions:0,leadDetail:[],leadPatch:[],interactionLeadGets:[],interactionPosts:0,taskPatch:0,xlsx:0,researchScripts:0,researchRest:0};
  const leads=new Map();
  for(let i=1;i<=120;i++) leads.set(`lead-${i}`,lead(i));
  leads.set('lead-1',lead(1,{source_type:'MARKET_LISTING',source_url:'https://example.test/annuncio/1',nome:'',cognome:'',telefono:'',market_data:{property_type_normalized:'Bilocale',municipality:'Villar Dora',street:'Via Test',street_number:'1',classification:'DA_CLASSIFICARE'}}));

  await page.addInitScript(() => {
    const session={access_token:'qa-token',refresh_token:'qa-refresh',expires_at:Date.now()+3600000,user:{id:'qa-user'}};
    localStorage.setItem('f1UnifiedCrmLegacyMigratedV1','1');
    localStorage.setItem('f1SupabaseSession',JSON.stringify(session));
    sessionStorage.setItem('f1SupabaseSession',JSON.stringify(session));
  });

  await page.route('https://nqnmlsmeiynxbdojeyjt.supabase.co/auth/v1/user', route => route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'qa-user',role:'authenticated'})}));
  await page.route('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', route => {metrics.xlsx++;return route.fulfill({status:200,contentType:'application/javascript',body:'window.XLSX={read:()=>({SheetNames:["Sheet1"],Sheets:{Sheet1:{}}}),utils:{sheet_to_json:()=>[["Nome","Telefono"],["Test","3331234567"]]}};'});});
  await page.route('**/market-interest-core.js*', route => {metrics.researchScripts++;return route.abort('failed');});
  await page.route('**/market-interest-engine.js*', async route => {metrics.researchScripts++;await route.continue();});

  await page.route('https://nqnmlsmeiynxbdojeyjt.supabase.co/rest/v1/**', async route => {
    const req=route.request(), u=new URL(req.url()), path=u.pathname, method=req.method();
    const ok=body=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
    if(path.endsWith('/rpc/f1_crm_kpis')) {metrics.kpi++;return ok([{leads:1240,core4:154,tasks_due:381,interactions:158,assignments:0,do_not_contact:0}]);}
    if(path.endsWith('/rpc/f1_crm_lead_page_v2')) {
      const body=JSON.parse(req.postData()||'{}');metrics.pageBodies.push(body);const offset=Number(body.p_offset||0), rows=[];
      for(let i=1;i<=50;i++){const n=offset+i;const row={...(leads.get(`lead-${n}`)||lead(n)),filtered_count:body.p_search?12:1240};rows.push(row);}
      return ok(rows);
    }
    if(path.endsWith('/rpc/f1_crm_visible_tasks')) {
      const body=JSON.parse(req.postData()||'{}'),ids=body.p_lead_ids||[];metrics.visibleTasks.push(ids.slice());
      return ok(ids.map((id,i)=>({task_id:`task-${id}`,lead_id:id,property_id:'',pillar:1,task_type:'CALL',reason:'Follow-up visibile',priority:80-i,due_date:'2026-09-15T08:00:00Z',status:'OPEN',outcome:'',metadata:{},updated_at:'2026-09-15T08:00:00Z'})));
    }
    if(path.endsWith('/leads') && method==='GET') {
      const id=(u.searchParams.get('lead_id')||'').replace(/^eq\./,'');
      if(id){metrics.leadDetail.push(id);return ok([leads.get(id)||lead(Number(id.split('-')[1])||999)]);}
      metrics.fullLeads++;return ok([...leads.values()]);
    }
    if(path.endsWith('/leads') && method==='PATCH') {
      const id=(u.searchParams.get('lead_id')||'').replace(/^eq\./,'');const patch=JSON.parse(req.postData()||'{}'),next={...(leads.get(id)||{}),...patch,lead_id:id};leads.set(id,next);metrics.leadPatch.push({id,patch});return ok([next]);
    }
    if(path.endsWith('/leads') && method==='POST') {
      const rows=JSON.parse(req.postData()||'[]');for(const row of rows)leads.set(row.lead_id,row);return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(rows)});
    }
    if(path.endsWith('/tasks') && method==='GET'){metrics.fullTasks++;return ok([]);}
    if(path.endsWith('/tasks') && method==='PATCH'){metrics.taskPatch++;return ok([{task_id:(u.searchParams.get('task_id')||'').replace(/^eq\./,''),status:'DONE',updated_at:new Date().toISOString()}]);}
    if(path.endsWith('/tasks') && method==='POST'){const rows=JSON.parse(req.postData()||'[]');return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(rows)});}
    if(path.endsWith('/interactions') && method==='GET') {
      const id=(u.searchParams.get('lead_id')||'').replace(/^eq\./,'');
      if(id){metrics.interactionLeadGets.push(id);return ok([{interaction_id:'int-1',lead_id:id,property_id:'',task_id:null,interaction_type:'CALL',direction:'OUTBOUND',occurred_at:'2026-09-14T10:00:00Z',outcome:'CONTATTATO',note:'Interazione QA',next_action:'',next_action_date:null,created_at:'2026-09-14T10:00:00Z'}]);}
      metrics.fullInteractions++;return ok([]);
    }
    if(path.endsWith('/interactions') && method==='POST'){metrics.interactionPosts++;const rows=JSON.parse(req.postData()||'[]');return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(rows)});}
    if(path.includes('/research_jobs')||path.includes('/research_results')||path.includes('/research_entities')||path.includes('/listing_snapshots')){metrics.researchRest++;return ok([]);}
    if(path.endsWith('/crm_import_log')) return ok([]);
    return ok([]);
  });
  return {metrics,leads};
}

async function openReady(page){await page.goto('/crm.html');await expect(page.locator('article.lead')).toHaveCount(50);}

test('critical path: KPI -> 50 lead -> task visibili, senza interactions/research/XLSX', async ({page}) => {
  const {metrics}=await installBackend(page);
  await openReady(page);
  await expect(page.locator('#sTot')).toHaveText('1240');
  await expect(page.locator('#sCore')).toHaveText('154');
  await expect(page.locator('#sDue')).toHaveText('381');
  await expect(page.locator('#sInteractions')).toHaveText('158');
  await expect(page.locator('#crmPager')).toContainText('Pagina 1 / 25');
  await expect(page.locator('article[data-lead-id="lead-2"]')).toContainText('1 interazioni');
  await expect(page.locator('article[data-lead-id="lead-2"]')).toContainText('Follow-up visibile');
  expect(metrics.pageBodies).toHaveLength(1);
  expect(metrics.pageBodies[0].p_limit).toBe(50);
  expect(metrics.fullLeads).toBe(0);
  expect(metrics.fullTasks).toBe(0);
  expect(metrics.fullInteractions).toBe(0);
  expect(metrics.researchRest).toBe(0);
  expect(metrics.researchScripts).toBe(0);
  expect(metrics.xlsx).toBe(0);
  expect(metrics.visibleTasks[0]).toHaveLength(50);
  const marks=await page.evaluate(()=>['COUNT_KPI_END','LOAD_FIRST_50_END','LOAD_VISIBLE_TASKS_END','FIRST_RENDER_END','CRM_USABLE'].map(x=>window.F1CRMPerf.marks.has(x)));
  expect(marks).toEqual([true,true,true,true,true]);
});

test('paginazione e filtri restano server-side', async ({page}) => {
  const {metrics}=await installBackend(page);await openReady(page);
  await page.click('#crmNextPage');await expect(page.locator('#crmPager')).toContainText('Pagina 2 / 25');expect(metrics.pageBodies.at(-1).p_offset).toBe(50);
  await page.selectOption('#statusFilter','DA_CONTATTARE');await expect.poll(()=>metrics.pageBodies.at(-1)?.p_status).toBe('DA_CONTATTARE');expect(metrics.pageBodies.at(-1).p_offset).toBe(0);
  await page.selectOption('#coreFilter','DUE');await expect.poll(()=>metrics.pageBodies.at(-1)?.p_filter).toBe('DUE');
  await page.selectOption('#coreFilter','RPO');await expect.poll(()=>metrics.pageBodies.at(-1)?.p_filter).toBe('RPO');
  await page.selectOption('#coreFilter','MARKET_LISTING');await expect.poll(()=>metrics.pageBodies.at(-1)?.p_filter).toBe('MARKET_LISTING');
  expect(metrics.fullLeads).toBe(0);expect(metrics.fullTasks).toBe(0);expect(metrics.fullInteractions).toBe(0);
});

test('dettaglio e interazioni sono lazy per un solo lead', async ({page}) => {
  const {metrics}=await installBackend(page);await openReady(page);
  expect(metrics.leadDetail).toHaveLength(0);expect(metrics.interactionLeadGets).toHaveLength(0);
  await page.locator('article[data-lead-id="lead-2"] button').filter({hasText:'MODIFICA'}).click();
  await expect(page.locator('#leadDlg')).toBeVisible();
  await expect(page.locator('#leadInteractions')).toContainText('Interazione QA');
  expect(metrics.leadDetail).toEqual(['lead-2']);expect(metrics.interactionLeadGets).toEqual(['lead-2']);expect(metrics.fullInteractions).toBe(0);
  const marks=await page.evaluate(()=>({detail:window.F1CRMPerf.marks.has('DETAIL_LOAD_END'),interactions:window.F1CRMPerf.marks.has('INTERACTIONS_LOAD_END')}));
  expect(marks).toEqual({detail:true,interactions:true});
});

test('modifica lead usa PATCH singolo e aggiorna una card senza reload pagina', async ({page}) => {
  const {metrics}=await installBackend(page);await openReady(page);const baseline=metrics.pageBodies.length;
  await page.locator('article[data-lead-id="lead-2"] button').filter({hasText:'MODIFICA'}).click();await page.fill('#fNome','Luigi');await page.click('#saveLeadBtn');
  await expect(page.locator('article[data-lead-id="lead-2"] .name')).toContainText('Luigi');
  expect(metrics.leadPatch.some(x=>x.id==='lead-2'&&x.patch.nome==='Luigi')).toBeTruthy();expect(metrics.pageBodies.length).toBe(baseline);expect(metrics.fullLeads).toBe(0);
});

test('registrare esito aggiorna record/card/KPI senza reload CRM', async ({page}) => {
  const {metrics}=await installBackend(page);await openReady(page);const baseline=metrics.pageBodies.length;
  await page.locator('article[data-lead-id="lead-3"] button').filter({hasText:'REGISTRA ESITO'}).click();await page.fill('#oOutcome','RICHIAMATO');await page.fill('#oNote','Esito QA');await page.click('#saveOutcomeBtn');
  await expect(page.locator('article[data-lead-id="lead-3"]')).toContainText('1 interazioni');
  expect(metrics.interactionPosts).toBe(1);expect(metrics.leadPatch.some(x=>x.id==='lead-3')).toBeTruthy();expect(metrics.taskPatch).toBe(1);expect(metrics.pageBodies.length).toBe(baseline);expect(metrics.fullInteractions).toBe(0);
});

test('ricerca rapida esegue una sola query dopo debounce', async ({page}) => {
  const {metrics}=await installBackend(page);await openReady(page);const baseline=metrics.pageBodies.length;
  await page.locator('#q').pressSequentially('VILLAR DORA',{delay:10});await page.waitForTimeout(550);
  expect(metrics.pageBodies.length-baseline).toBe(1);expect(metrics.pageBodies.at(-1).p_search).toBe('VILLAR DORA');expect(metrics.fullLeads).toBe(0);
});

test('XLSX entra nel runtime solo al click import', async ({page}) => {
  const {metrics}=await installBackend(page);await openReady(page);expect(metrics.xlsx).toBe(0);
  await page.click('#excelImportBtn');await expect(page.locator('#excelImportDlg')).toBeVisible();expect(metrics.xlsx).toBe(1);
});

test('errore Research resta isolato e CRM continua a funzionare', async ({page}) => {
  const {metrics}=await installBackend(page);await openReady(page);await expect(page.locator('.f1InterestBtn')).toHaveCount(1);
  page.once('dialog',d=>d.dismiss());await page.click('.f1InterestBtn');await page.waitForTimeout(150);
  await expect(page.locator('article.lead')).toHaveCount(50);await expect(page.locator('#newBtn')).toBeEnabled();expect(metrics.researchScripts).toBeGreaterThan(0);expect(metrics.fullLeads).toBe(0);expect(metrics.fullTasks).toBe(0);expect(metrics.fullInteractions).toBe(0);
});
