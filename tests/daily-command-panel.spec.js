const {test,expect}=require('@playwright/test');
async function freeze(page,iso){await page.clock.install({time:new Date(iso)});}
async function openAt(page,iso){await freeze(page,iso);await page.goto('/index.html');await expect(page.locator('#f1CommandPanel')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.F1DailyCommand?.TASKS?.length||0)).toBe(20);}

test.describe('F1 daily command panel',()=>{
  test('mappa l ora reale, completa solo su click e persiste dopo refresh',async({browser})=>{
    const context=await browser.newContext({timezoneId:'Europe/Rome',viewport:{width:1440,height:1000}});const page=await context.newPage();
    await openAt(page,'2026-09-13T16:45:00+02:00');
    await expect(page.locator('[data-task-id="contact-pm"]')).toHaveClass(/current/);
    await expect(page.locator('[data-task-id="contact-pm"] .f1-order-status')).toContainText('ADESSO');
    await expect(page.locator('[data-task-id="address"]')).toHaveClass(/late/);
    await expect(page.locator('[data-task-id="followup-pm"] .f1-order-status')).toContainText('PROGRAMMATO');
    await page.locator('[data-task-id="contact-pm"] [data-action="start"]').click();
    await expect(page.locator('[data-task-id="contact-pm"] .f1-order-status')).toContainText('IN CORSO');
    await page.clock.fastForward('00:00:05');
    await page.locator('[data-task-id="contact-pm"] [data-action="complete"]').click();
    await expect(page.locator('[data-task-id="contact-pm"] .f1-order-status')).toContainText('COMPLETATO');
    await expect(page.locator('#f1NextOrder')).toContainText('17:30–18:00 · FOLLOW-UP POMERIDIANO');
    const saved=await page.evaluate(()=>{const k=F1DailyCommand.storageKey();return{key:k,data:JSON.parse(localStorage.getItem(k))}});
    expect(saved.key).toBe('f1DailyCommand:2026-09-13');expect(saved.data.tasks['contact-pm'].status).toBe('completed');expect(saved.data.tasks['contact-pm'].completedAt).toBeTruthy();
    await page.reload();await expect(page.locator('#f1CommandPanel')).toBeVisible();await expect(page.locator('[data-task-id="contact-pm"] .f1-order-status')).toContainText('COMPLETATO');
    await context.close();
  });

  test('desktop 70/30 senza sovrapposizioni e moduli esistenti preservati',async({browser})=>{
    const context=await browser.newContext({timezoneId:'Europe/Rome',viewport:{width:1600,height:1000}});const page=await context.newPage();await openAt(page,'2026-09-13T10:15:00+02:00');
    for(const sel of ['#program90Widget','#network250Widget','#marketPreviewWidget','#jlsWidget','a[href="crm.html"]','a[href="telefonate-oggi.html"]','a[href="script-operativo.html"]','a[href="oggi.html#tasks"]','a[href="address-intelligence.html"]'])await expect(page.locator(sel).first()).toBeVisible();
    expect(await page.locator('a.card').count()).toBeGreaterThanOrEqual(15);
    const boxes=await page.evaluate(()=>{const s=document.querySelector('.f1-daily-shell').getBoundingClientRect(),l=document.querySelector('.f1-dashboard-left').getBoundingClientRect(),r=document.querySelector('#f1CommandPanel').getBoundingClientRect();return{shell:s.width,left:l.width,right:r.width,leftR:l.right,rightL:r.left,pos:getComputedStyle(document.querySelector('#f1CommandPanel')).position}});
    expect(boxes.left/boxes.shell).toBeGreaterThan(0.67);expect(boxes.left/boxes.shell).toBeLessThan(0.76);expect(boxes.right/boxes.shell).toBeGreaterThan(0.23);expect(boxes.right/boxes.shell).toBeLessThan(0.33);expect(boxes.leftR).toBeLessThanOrEqual(boxes.rightL);expect(boxes.pos).toBe('sticky');
    for(const path of ['/market-preview.html','/crm.html','/seller-radar-unico.html?view=vendita','/telefonate-oggi.html','/script-operativo.html','/oggi.html#tasks']){const res=await page.request.get(path);expect(res.status(),path).toBeLessThan(400)}
    await page.screenshot({path:'test-results/daily-command-desktop.png',fullPage:true});await context.close();
  });

  test('mobile mostra il programma prima della dashboard e non crea overflow orizzontale',async({browser})=>{
    const context=await browser.newContext({timezoneId:'Europe/Rome',viewport:{width:412,height:915},isMobile:true});const page=await context.newPage();await openAt(page,'2026-09-13T07:40:00+02:00');
    const layout=await page.evaluate(()=>{const p=document.querySelector('#f1CommandPanel').getBoundingClientRect(),l=document.querySelector('.f1-dashboard-left').getBoundingClientRect();return{panelTop:p.top,leftTop:l.top,scrollWidth:document.documentElement.scrollWidth,width:innerWidth,pos:getComputedStyle(document.querySelector('#f1CommandPanel')).position}});
    expect(layout.panelTop).toBeLessThan(layout.leftTop);expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width+1);expect(layout.pos).toBe('relative');
    await expect(page.locator('[data-task-id="preview"] .f1-order-status')).toContainText('ADESSO');
    await page.screenshot({path:'test-results/daily-command-mobile.png',fullPage:true});await context.close();
  });

  test('cambio data crea una nuova giornata senza cancellare lo storico precedente',async({browser})=>{
    const context=await browser.newContext({timezoneId:'Europe/Rome',viewport:{width:1280,height:900}});const page=await context.newPage();await openAt(page,'2026-09-13T19:00:00+02:00');
    await page.evaluate(()=>F1DailyCommand.completeTask('content'));
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('f1DailyCommand:2026-09-13')).tasks.content.status)).toBe('completed');
    await page.clock.setFixedTime(new Date('2026-09-14T06:31:00+02:00'));await page.evaluate(()=>F1DailyCommand.render());
    await expect(page.locator('#f1CompletedCount')).toHaveText('0 / 20');
    expect(await page.evaluate(()=>localStorage.getItem('f1DailyCommand:2026-09-13')!==null)).toBeTruthy();
    expect(await page.evaluate(()=>F1DailyCommand.storageKey())).toBe('f1DailyCommand:2026-09-14');
    await context.close();
  });
});