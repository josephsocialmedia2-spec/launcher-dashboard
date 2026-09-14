const {test,expect}=require('@playwright/test');
async function freeze(page,iso){await page.clock.install({time:new Date(iso)});}
async function openAt(page,iso,path='/index.html'){await freeze(page,iso);await page.goto(path);await expect(page.locator('#f1CommandPanel')).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.F1DailyCommand?.TASKS?.length||0)).toBe(20);await expect(page.locator('#f1AIGuide')).toBeVisible();}

test.describe('F1 daily command + IA004 workspace + Guida IA',()=>{
  test('mappa ora reale, guida singola azione, completa e persiste',async({browser})=>{
    const context=await browser.newContext({timezoneId:'Europe/Rome',viewport:{width:1440,height:1000}});const page=await context.newPage();
    await openAt(page,'2026-09-13T16:45:00+02:00');
    await expect(page.locator('[data-task-id="contact-pm"]')).toHaveClass(/current/);
    await expect(page.locator('#f1AiTitle')).toContainText('CONTATTO');
    for(const id of ['#f1AiWhere','#f1AiWho','#f1AiObjective','#f1AiDuration','#f1AiCompletion','#f1AiNext'])await expect(page.locator(id)).not.toHaveText('—');
    await page.evaluate(()=>F1DailyCommand.startTask('contact-pm'));
    expect(await page.evaluate(()=>F1DailyCommand.loadState().tasks['contact-pm'].status)).toBe('running');
    await page.clock.fastForward('00:00:05');
    await page.locator('#f1AiRecalc').click();
    await expect(page.locator('#f1AiTitle')).toContainText('CONTATTO');
    await page.locator('#f1AiDone').click();
    await expect.poll(()=>page.evaluate(()=>F1DailyCommand.loadState().tasks['contact-pm'].status)).toBe('completed');
    await expect.poll(()=>page.locator('#f1AiTitle').innerText()).toContain('FOLLOW-UP POMERIDIANO');
    const saved=await page.evaluate(()=>{const k=F1DailyCommand.storageKey();return{key:k,data:JSON.parse(localStorage.getItem(k))}});
    expect(saved.key).toBe('f1DailyCommand:2026-09-13');expect(saved.data.tasks['contact-pm'].status).toBe('completed');expect(saved.data.tasks['contact-pm'].completedAt).toBeTruthy();
    await page.reload();await expect.poll(()=>page.evaluate(()=>F1DailyCommand.loadState().tasks['contact-pm'].status)).toBe('completed');await expect(page.locator('#f1AIGuide')).toBeVisible();await context.close();
  });

  test('guida IA permanente espone controlli operativi e passo-passo',async({browser})=>{
    const context=await browser.newContext({timezoneId:'Europe/Rome',viewport:{width:1440,height:1000}});const page=await context.newPage();await openAt(page,'2026-09-13T10:15:00+02:00');
    for(const id of ['#f1AiStart','#f1AiHow','#f1AiScript','#f1AiDone','#f1AiBlocked','#f1AiRecalc'])await expect(page.locator(id)).toBeVisible();
    await page.locator('#f1AiHow').click();await expect(page.locator('#f1AiStepper')).toHaveClass(/on/);await expect(page.locator('#f1AiStepNo')).toContainText('PASSO 1');
    await page.locator('#f1AiStepClose').click();await page.locator('#f1AiBlocked').click();await expect(page.locator('#f1AiBlockers')).toHaveClass(/on/);await expect(page.locator('[data-block="responsabile"]')).toBeVisible();
    await context.close();
  });

  test('nuovo funzionario apre il modulo senza perdere la guida',async({browser})=>{
    const context=await browser.newContext({timezoneId:'Europe/Rome',viewport:{width:1440,height:1000}});const page=await context.newPage();await openAt(page,'2026-09-13T09:40:00+02:00');
    await expect(page.locator('#f1AiTitle')).toContainText('VERIFICA OPPORTUNITÀ');await expect(page.locator('#f1AiStart')).toHaveText(/AVVIA E APRI|APRI MODULO/);
    const before=new URL(page.url()).pathname;await page.locator('#f1AiStart').click();
    await expect(page.locator('#f1GuidedWorkspace')).toHaveClass(/on/);await expect(page.locator('#f1AIGuide')).toBeVisible();await expect(page.locator('#f1GuidedTask')).toContainText('VERIFICA OPPORTUNITÀ');
    await expect(page.locator('#f1GuidedFrame')).toHaveAttribute('src',/centrale-risultati\.html/);expect(new URL(page.url()).pathname).toBe(before);
    await page.locator('#f1GuidedBack').click();await expect(page.locator('#f1GuidedWorkspace')).not.toHaveClass(/on/);await context.close();
  });

  test('desktop mostra 4 reparti + guida in 100vh senza scroll pagina',async({browser})=>{
    const context=await browser.newContext({timezoneId:'Europe/Rome',viewport:{width:1600,height:1000}});const page=await context.newPage();await openAt(page,'2026-09-13T10:15:00+02:00');
    for(const sel of ['#reparto-ricerca','#reparto-acquisizione','#reparto-vendita','#reparto-pubblicita','#f1CommandPanel','#f1AIGuide'])await expect(page.locator(sel)).toBeVisible();
    await expect(page.locator('#reparto-ricerca .f1-op-card')).toHaveCount(8);await expect(page.locator('#reparto-acquisizione .f1-op-card')).toHaveCount(8);await expect(page.locator('#reparto-vendita .f1-op-card')).toHaveCount(8);await expect(page.locator('#reparto-pubblicita .f1-op-card')).toHaveCount(8);
    for(const sel of ['#program90Widget','#network250Widget','#marketPreviewWidget','#jlsWidget'])await expect(page.locator(sel)).toHaveCount(1);
    const layout=await page.evaluate(()=>{const s=document.querySelector('.f1-daily-shell').getBoundingClientRect(),l=document.querySelector('.f1-dashboard-left').getBoundingClientRect(),r=document.querySelector('#f1CommandPanel').getBoundingClientRect();return{shell:s.width,left:l.width,right:r.width,leftR:l.right,rightL:r.left,scrollH:document.documentElement.scrollHeight,h:innerHeight,scrollW:document.documentElement.scrollWidth,w:innerWidth}});
    expect(layout.left/layout.shell).toBeGreaterThan(0.74);expect(layout.left/layout.shell).toBeLessThan(0.81);expect(layout.right/layout.shell).toBeGreaterThan(0.19);expect(layout.right/layout.shell).toBeLessThan(0.26);expect(layout.leftR).toBeLessThanOrEqual(layout.rightL);expect(layout.scrollH).toBeLessThanOrEqual(layout.h+1);expect(layout.scrollW).toBeLessThanOrEqual(layout.w+1);
    for(const path of ['/market-preview.html','/crm.html','/seller-radar-unico.html?view=vendita','/telefonate-oggi.html','/script.html','/oggi.html#tasks','/content-opportunity-engine.html']){const res=await page.request.get(path);expect(res.status(),path).toBeLessThan(400)}
    await page.screenshot({path:'test-results/daily-command-desktop.png',fullPage:true});await context.close();
  });

  test('loader guida funziona anche entrando dalla root con slash',async({browser})=>{
    const context=await browser.newContext({timezoneId:'Europe/Rome',viewport:{width:1400,height:900}});const page=await context.newPage();await openAt(page,'2026-09-13T09:00:00+02:00','/');await expect(page.locator('#f1AIGuide')).toBeVisible();await context.close();
  });

  test('metriche non inventano valori quando cloud non autenticato',async({browser})=>{
    const context=await browser.newContext({timezoneId:'Europe/Rome',viewport:{width:1400,height:900}});const page=await context.newPage();await openAt(page,'2026-09-13T09:00:00+02:00');
    await expect(page.locator('#f1CloudState')).toContainText(/ACCESSO RICHIESTO|ATTIVO/);
    const values=await page.locator('[data-metric] b').allTextContents();expect(values.every(v=>v!=='…')).toBeTruthy();
    await expect(page.locator('#f1AiSource')).toContainText(/modalità calendario\/dashboard|dati cloud verificati/);await context.close();
  });

  test('mobile mette guida prima dell operatività e non crea overflow orizzontale',async({browser})=>{
    const context=await browser.newContext({timezoneId:'Europe/Rome',viewport:{width:412,height:915},isMobile:true});const page=await context.newPage();await openAt(page,'2026-09-13T07:40:00+02:00');
    const layout=await page.evaluate(()=>{const p=document.querySelector('#f1CommandPanel').getBoundingClientRect(),l=document.querySelector('.f1-dashboard-left').getBoundingClientRect();return{panelTop:p.top,leftTop:l.top,scrollWidth:document.documentElement.scrollWidth,width:innerWidth}});
    expect(layout.panelTop).toBeLessThan(layout.leftTop);expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width+1);await expect(page.locator('#f1AIGuide')).toBeVisible();await expect(page.locator('#reparto-ricerca')).toBeVisible();await page.screenshot({path:'test-results/daily-command-mobile.png',fullPage:true});await context.close();
  });

  test('cambio data crea nuova giornata senza cancellare storico',async({browser})=>{
    const context=await browser.newContext({timezoneId:'Europe/Rome',viewport:{width:1280,height:900}});const page=await context.newPage();await openAt(page,'2026-09-13T19:00:00+02:00');await page.evaluate(()=>F1DailyCommand.completeTask('content'));expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('f1DailyCommand:2026-09-13')).tasks.content.status)).toBe('completed');await page.clock.setFixedTime(new Date('2026-09-14T06:31:00+02:00'));await page.evaluate(()=>F1DailyCommand.render());await expect(page.locator('#f1CompletedCount')).toHaveText('0 / 20');expect(await page.evaluate(()=>localStorage.getItem('f1DailyCommand:2026-09-13')!==null)).toBeTruthy();await context.close();
  });
});