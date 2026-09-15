const { test, expect } = require('@playwright/test');

test('CRM boot carica 50 lead, pagina server-side e Research resta lazy', async ({ page }) => {
  const rpcBodies=[];
  let fullLeadPulls=0,researchEngineRequests=0;
  await page.addInitScript(() => {
    localStorage.setItem('f1UnifiedCrmLegacyMigratedV1','1');
    localStorage.setItem('f1SupabaseSession', JSON.stringify({access_token:'qa-token',refresh_token:'qa-refresh',expires_at:Date.now()+3600000,user:{id:'qa-user'}}));
    sessionStorage.setItem('f1SupabaseSession', JSON.stringify({access_token:'qa-token',refresh_token:'qa-refresh',expires_at:Date.now()+3600000,user:{id:'qa-user'}}));
  });
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({status:200,contentType:'application/javascript',body:'window.XLSX={};'}));
  await page.route('**/market-interest-engine.js*', async route => { researchEngineRequests++; await route.continue(); });
  await page.route('https://nqnmlsmeiynxbdojeyjt.supabase.co/auth/v1/user', route => route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'qa-user',role:'authenticated'})}));
  await page.route('https://nqnmlsmeiynxbdojeyjt.supabase.co/rest/v1/**', async route => {
    const req=route.request(),u=new URL(req.url()),path=u.pathname;
    if(path.endsWith('/rpc/f1_crm_lead_page')){
      const body=JSON.parse(req.postData()||'{}');rpcBodies.push(body);const offset=Number(body.p_offset||0),rows=[];
      for(let i=0;i<50;i++){const n=offset+i+1;rows.push({lead_id:'lead-'+n,pillar:1,source_type:n===1?'MARKET_LISTING':'OTHER',source:'QA',source_url:n===1?'https://example.test/annuncio/1':'',nome:n===1?'':'Mario',cognome:n===1?'':'Rossi '+n,azienda:'',telefono:'333000'+String(n).padStart(4,'0'),email:'',comune:'Villar Dora',via:'Via Test',civico:String(n),zona:'',immobile_id:'',competitor_agency:'',lead_reason:'QA',lead_score:90,status:'DA_CONTATTARE',next_action:'Controlla',next_action_date:'2026-09-15T08:00:00Z',assigned_to:'',privacy_basis:'QA',do_not_contact:false,rpo_status:'VERIFICATO_OK',updated_at:'2026-09-15T08:00:00Z',market_data:n===1?{property_type_normalized:'Bilocale',municipality:'Villar Dora'}:{},due_task_count:0,filtered_count:1240,total_count:1240,core4_total:154,won_total:0,dnc_total:0});}
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(rows)});
    }
    if(path.endsWith('/leads') && req.method()==='GET'){fullLeadPulls++;return route.fulfill({status:200,contentType:'application/json',body:'[]'});}
    if(path.endsWith('/tasks')) return route.fulfill({status:200,contentType:'application/json',body:'[]'});
    if(path.endsWith('/interactions')) return route.fulfill({status:200,contentType:'application/json',body:'[]'});
    return route.fulfill({status:200,contentType:'application/json',body:'[]'});
  });

  await page.goto('/crm.html');
  await expect(page.locator('article.lead')).toHaveCount(50);
  await expect(page.locator('#sTot')).toHaveText('1240');
  await expect(page.locator('#sCore')).toHaveText('154');
  await expect(page.locator('#crmPager')).toContainText('Pagina 1 / 25');
  await expect(page.locator('.f1InterestBtn')).toHaveCount(1);
  expect(fullLeadPulls).toBe(0);
  expect(researchEngineRequests).toBe(0);
  expect(rpcBodies[0].p_limit).toBe(50);
  expect(rpcBodies[0].p_offset).toBe(0);

  await page.click('#crmNextPage');
  await expect(page.locator('#crmPager')).toContainText('Pagina 2 / 25');
  await expect(page.locator('article.lead').first()).toHaveAttribute('data-lead-id','lead-51');
  expect(rpcBodies.at(-1).p_offset).toBe(50);
  expect(fullLeadPulls).toBe(0);
  expect(researchEngineRequests).toBe(0);

  const perf=await page.evaluate(() => ({usable:window.F1CRMPerf?.marks?.has('CRM_USABLE'),dataEnd:window.F1CRMPerf?.marks?.has('FIRST_DATA_END'),renderEnd:window.F1CRMPerf?.marks?.has('FIRST_RENDER_END')}));
  expect(perf).toEqual({usable:true,dataEnd:true,renderEnd:true});
});
