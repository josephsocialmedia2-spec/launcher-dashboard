const { test, expect } = require('@playwright/test');

for (const viewport of [{name:'desktop',width:1280,height:900},{name:'mobile',width:390,height:844}]) {
  test(`nuova opportunita -> CRM unificato -> deduplica ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const db={leads:[],interactions:[],tasks:[]};
    await page.addInitScript(() => {
      sessionStorage.setItem('f1SupabaseSession', JSON.stringify({access_token:'qa-token',refresh_token:'qa-refresh',expires_at:Date.now()+3600000,user:{id:'qa-user'}}));
      if(window.top===window) localStorage.removeItem('f1OperationalFlowV1');
    });
    await page.route('https://nqnmlsmeiynxbdojeyjt.supabase.co/rest/v1/**', async route => {
      const req=route.request(),u=new URL(req.url()),table=u.pathname.split('/').pop(),method=req.method();
      if(!db[table]) return route.fulfill({status:404,body:'[]'});
      if(method==='GET') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(db[table])});
      if(method==='POST'){
        const rows=JSON.parse(req.postData()||'[]');
        for(const row of rows){
          const idField=table==='leads'?'lead_id':table==='tasks'?'task_id':'interaction_id';
          const i=db[table].findIndex(x=>String(x[idField])===String(row[idField]));
          if(i>=0) db[table][i]={...db[table][i],...row}; else db[table].push({...row});
        }
        return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify(rows)});
      }
      if(method==='PATCH') return route.fulfill({status:200,contentType:'application/json',body:'[]'});
      return route.fulfill({status:405,body:'[]'});
    });

    await page.goto('/nuova-opportunita.html');
    await page.selectOption('#opType','FSBO');
    await page.fill('#opComune','Villar Dora');
    await page.fill('#opVia','Via Roma');
    await page.fill('#opCivico','9');
    await page.fill('#opSource','https://example.test/annuncio/f1-qa-001?utm_source=qa');
    await page.fill('#opNote','Test QA CRM unificato');
    await page.click('button[type="submit"]');

    await expect(page.locator('#loadCrmBtn')).toHaveText('SALVA NEL CRM');
    await page.fill('#oppNome','Mario');
    await page.fill('#oppCognome','Rossi');
    await page.fill('#oppTelefono','333 123 4567');
    await page.fill('#oppEmail','mario.qa@example.test');
    await page.fill('#oppPropertyType','Casa indipendente');
    await page.fill('#oppPrice','380000');
    await page.fill('#oppFonte','QA SELLER RADAR');

    await page.click('#loadCrmBtn');
    await expect(page.locator('#crmLoadStatus')).toContainText('SALVATO NEL CRM UNIFICATO');
    expect(db.leads).toHaveLength(1);
    expect(db.interactions).toHaveLength(1);
    expect(db.tasks).toHaveLength(1);
    expect(db.interactions[0].lead_id).toBe(db.leads[0].lead_id);
    expect(db.tasks[0].lead_id).toBe(db.leads[0].lead_id);
    expect(db.leads[0].source_url).toContain('example.test/annuncio/f1-qa-001');

    await page.click('#loadCrmBtn');
    await expect(page.locator('#crmLoadStatus')).toContainText('DUPLICATO');
    expect(db.leads).toHaveLength(1);
    expect(db.interactions).toHaveLength(2);
    expect(db.tasks).toHaveLength(1);
    expect(db.interactions[1].lead_id).toBe(db.leads[0].lead_id);
  });
}
