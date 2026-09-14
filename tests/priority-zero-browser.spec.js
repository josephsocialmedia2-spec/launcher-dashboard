const {test,expect}=require('@playwright/test');

async function waitGuide(page){
  await page.goto('/index.html');
  await expect(page.locator('#f1AIGuide')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>!!window.F1PriorityZero&&!!window.F1PriorityZeroBridge&&!!window.F1AIGuide)).toBeTruthy();
}

async function seed(page,contacts,interactions=[]){
  await page.evaluate(({contacts,interactions})=>{
    const ctx=F1AIGuide.context();
    ctx.loaded=true;
    ctx.profile={role:'FUNZIONARIO',daily_objectives:{news:3},assigned_territory:{comune:'Villar Dora'}};
    ctx.news=[];
    ctx.interactions=interactions;
    ctx.tasks=[];ctx.leads=[];ctx.properties=[];ctx.requests=[];
    F1PriorityZero._testSetCache({contacts});
    F1PriorityZeroBridge.sync();
  },{contacts,interactions});
}

const family={contact_id:'fam-1',nome:'Mario',cognome:'Rossi',tipo_rapporto:['PARENTE'],come_lo_conosco:'zio materno',priorita:'A',stato_contatto:'ATTIVO'};
const friend={contact_id:'fr-1',nome:'Anna',cognome:'Verdi',tipo_rapporto:['AMICO'],come_lo_conosco:'amica storica',priorita:'A',stato_contatto:'ATTIVO'};
const network={contact_id:'net-1',nome:'Paolo',cognome:'Bianchi',tipo_rapporto:['PROFESSIONISTA'],come_lo_conosco:'geometra',priorita:'A',stato_contatto:'ATTIVO'};
const worked=(id,circle)=>({occurred_at:new Date().toISOString(),metadata:{origin:'PRIORITY_ZERO_NEWS',network_contact_id:id,circle}});

test.describe('F1 priorità zero · ricerca notizie',()=>{
  test('COSA FACCIO parte da famiglia e non da task/CRM/annunci',async({page})=>{
    await waitGuide(page);
    await seed(page,[family,friend,network]);
    await expect.poll(()=>page.locator('#f1AiTitle').innerText()).toContain('ADESSO CERCA UNA NOTIZIA · FAMIGLIA');
    await expect(page.locator('#f1AiWho')).toContainText('Mario Rossi');
    await expect(page.locator('#f1AiWho')).toContainText('zio materno');
    await expect(page.locator('#f1AiSource')).toContainText('PRIORITÀ ZERO');
    await expect(page.locator('#f1PriorityZeroCard')).toBeVisible();
    await expect(page.locator('#f1PriorityZeroCard')).toContainText('FAMIGLIA');
    await expect(page.locator('#f1PriorityZeroCard')).toContainText('AMICI');
    await expect(page.locator('#f1PriorityZeroCard')).toContainText('RETE / COI');
    await expect(page.locator('#f1PriorityZeroCard')).toContainText('ESTRANEI');
  });

  test('AVVIA E APRI mantiene guida e apre rete personale',async({page})=>{
    await waitGuide(page);
    await seed(page,[family,friend,network]);
    await expect.poll(()=>page.locator('#f1AiTitle').innerText()).toContain('FAMIGLIA');
    await page.locator('#f1AiStart').click();
    await expect(page.locator('#f1GuidedWorkspace')).toHaveClass(/on/);
    await expect(page.locator('#f1AIGuide')).toBeVisible();
    await expect(page.locator('#f1GuidedFrame')).toHaveAttribute('src',/network-reconstruction\.html/);
  });

  test('HO FINITO impone esito e NON RISPONDE richiede prossima azione e data',async({page})=>{
    await waitGuide(page);
    await seed(page,[family,friend,network]);
    await expect.poll(()=>page.locator('#f1AiTitle').innerText()).toContain('FAMIGLIA');
    await page.locator('#f1AiDone').click();
    await expect(page.locator('#f1P0Outcome')).toHaveClass(/on/);
    await page.locator('#p0Outcome').selectOption('NON_RISPONDE');
    await page.locator('#p0Save').click();
    await expect(page.locator('#p0Msg')).toContainText('PROSSIMA AZIONE E DATA');
    await page.locator('#p0Cancel').click();
  });

  test('gerarchia anti-salto famiglia poi amici poi rete poi estranei',async({page})=>{
    await waitGuide(page);
    await seed(page,[family,friend,network],[worked('fam-1','FAMILY')]);
    await expect.poll(()=>page.locator('#f1AiTitle').innerText()).toContain('AMICI E CONOSCENTI');
    await seed(page,[family,friend,network],[worked('fam-1','FAMILY'),worked('fr-1','FRIENDS')]);
    await expect.poll(()=>page.locator('#f1AiTitle').innerText()).toContain('RETE / COI');
    await seed(page,[family,friend,network],[worked('fam-1','FAMILY'),worked('fr-1','FRIENDS'),worked('net-1','NETWORK')]);
    await expect.poll(()=>page.locator('#f1AiTitle').innerText()).toContain('ESTRANEI');
  });

  test('se famiglia manca non salta agli amici',async({page})=>{
    await waitGuide(page);
    await seed(page,[friend,network]);
    await expect.poll(()=>page.locator('#f1AiTitle').innerText()).toContain('COMPLETA ALBERO RELAZIONALE · FAMIGLIA');
    await expect(page.locator('#f1AiExecute')).toContainText('NON INVENTARE NOMINATIVI');
    await expect(page.locator('#f1AiNext')).toContainText('NON PASSARE');
  });
});
