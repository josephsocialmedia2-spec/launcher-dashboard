const {test,expect}=require('@playwright/test');
async function freeze(page,iso){await page.clock.install({time:new Date(iso)});}
async function openAt(page,iso){await freeze(page,iso);await page.goto('/index.html');await expect(page.locator('#f1CommandPanel')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.F1DailyCommand?.TASKS?.length||0)).toBe(20);}

test.describe('F1 daily command + IA004 workspace',()=>{
  test('mappa ora reale, ADESSO/DOPO, completa su click e persiste',async({browser})=>{
    const context=await browser.newContext({timezoneId:'Europe/Rome',viewport:{width:1440,height:1000}});const page=await context.newPage();
    await openAt(page,'2026-09-13T16:45:00+02:00');
    await expect(page.locator('[data-task-id="contact-pm"]')).toHaveClass(/current/);
    await expect(page.locator('#f1NextOrder')).toContainText('ADESSO');
    await expect(page.locator('#f1NextOrder')).toContainText('CONTATTO');
    await expect(page.locator('#f1AfterOrder')).toContainText('DOPO');
    await page.locator('#f1NextOrder [data-action="start"]').click();
    await expect(page.locator('[data-task-id="contact-pm"] .f1-order-status')).toContainText('IN CORSO');
    await page.clock.fastForward('00:00:05');
    await page.locator('#f1NextOrder [data-action="complete"]').click();
    await expect(page.locator('[data-task-id="contact-pm"] .f1-order-status')).toContainText('COMPLETATO');
    await expect.poll(()=>page.locator('#f1NextOrder').innerText()).toContain('FOLLOW-UP POMERIDIANO');
    const saved=await page.evaluate(()=>{const k=F1DailyCommand.storageKey();return{key:k,data:JSON.parse(localStorage.getItem(k))}});
    expect(saved.key).toBe('f1DailyCommand:2026-09-13');expect(saved.data.tasks['contact-pm'].status).toBe('completed');expect(saved.data.tasks['contact-pm'].completedAt).toBeTruthy();
    await page.reload();await expect(page.locator('[data-task-id="contact-pm"] .f1-order-status')).toContainText('COMPLETATO');await context.close();
  });

  test('desktop mostra 4 reparti + OGGI in 100vh senza scroll pagina',async({browser})=>{
    const context=await browser.newContext({timezoneId:'Europe/Rome',viewport:{width:1600,height:1000}});const page=await context.newPage();await openAt(page,'2026-09-13T10:15:00+02:00');
    for(const sel of ['#reparto-ricerca','#reparto-acquisizione','#reparto-vendita','#reparto-pubblicita','#f1CommandPanel'])await expect(page.locator(sel)).toBeVisible();
    await expect(page.locator('#reparto-ricerca .f1-op-card')).toHaveCount(8);await expect(page.locator('#reparto-acquisizione .f1-op-card')).toHaveCount(8);await expect(page.locator('#reparto-vendita .f1-op-card')).toHaveCount(8);await expect(page.locator('#reparto-pubblicita .f1-op-card')).toHaveCount(8);
    for(const sel of ['#program90Widget','#network250Widget','#marketPreviewWidget','#jlsWidget'])await expect(page.locator(sel)).toHaveCount(1);
    const layout=await page.evaluate(()=>{const s=document.querySelector('.f1-daily-shell').getBoundingClientRect(),l=document.querySelector('.f1-dashboard-left').getBoundingClientRect(),r=document.querySelector('#f1CommandPanel').getBoundingClientRect();return{shell:s.width,left:l.width,right:r.width,leftR:l.right,rightL:r.left,scrollH:document.documentElement.scrollHeight,h:innerHeight,scrollW:document.documentElement.scrollWidth,w:innerWidth}});
    expect(layout.left/layout.shell).toBeGreaterThan(0.76);expect(layout.left/layout.shell).toBeLessThan(0.83);expect(layout.right/layout.shell).toBeGreaterThan(0.17);expect(layout.right/layout.shell).toBeLessThan(0.24);expect(layout.leftR).toBeLessThanOrEqual(layout.rightL);expect(layout.scrollH).toBeLessThanOrEqual(layout.h+1);expect(layout.scrollW).toBeLessThanOrEqual(layout.w+1);
    for(const path of ['/market-preview.html','/crm.html','/seller-radar-unico.html?view=vendita','/telefonate-oggi.html','/script-operativo.html','/oggi.html#tasks','/content-opportunity-engine.html']){const res=await page.request.get(path);expect(res.status(),path).toBeLessThan(400)}
    await page.screenshot({path:'test-results/daily-command-desktop.png',fullPage:true});await context.close();
  });

  test('metriche non inventano valori quando cloud non autenticato',async({browser})=>{
    const context=await browser.newContext({timezoneId:'Europe/Rome',viewport:{width:1400,height:900}});const page=await context.newPage();await openAt(page,'2026-09-13T09:00:00+02:00');
    await expect(page.locator('#f1CloudState')).toContainText(/ACCESSO RICHIESTO|ATTIVO/);
    const values=await page.locator('[data-metric] b').allTextContents();expect(values.every(v=>v!=='…')).toBeTruthy();
    await context.close();
  });

  test('mobile mette OGGI prima dell operatività e non crea overflow orizzontale',async({browser})=>{
    const context=await browser.newContext({timezoneId:'Europe/Rome',viewport:{width:412,height:915},isMobile:true});const page=await context.newPage();await openAt(page,'2026-09-13T07:40:00+02:00');
    const layout=await page.evaluate(()=>{const p=document.querySelector('#f1CommandPanel').getBoundingClientRect(),l=document.querySelector('.f1-dashboard-left').getBoundingClientRect();return{panelTop:p.top,leftTop:l.top,scrollWidth:document.documentElement.scrollWidth,width:innerWidth}});
    expect(layout.panelTop).toBeLessThan(layout.leftTop);expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width+1);await expect(page.locator('#reparto-ricerca')).toBeVisible();await page.screenshot({path:'test-results/daily-command-mobile.png',fullPage:true});await context.close();
  });

  test('cambio data crea nuova giornata senza cancellare storico',async({browser})=>{
    const context=await browser.newContext({timezoneId:'Europe/Rome',viewport:{width:1280,height:900}});const page=await context.newPage();await openAt(page,'2026-09-13T19:00:00+02:00');await page.evaluate(()=>F1DailyCommand.completeTask('content'));expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('f1DailyCommand:2026-09-13')).tasks.content.status)).toBe('completed');await page.clock.setFixedTime(new Date('2026-09-14T06:31:00+02:00'));await page.evaluate(()=>F1DailyCommand.render());await expect(page.locator('#f1CompletedCount')).toHaveText('0 / 20');expect(await page.evaluate(()=>localStorage.getItem('f1DailyCommand:2026-09-13')!==null)).toBeTruthy();await context.close();
  });
});