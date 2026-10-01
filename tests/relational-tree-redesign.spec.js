const { test, expect } = require('@playwright/test');

async function prepare(page){
  await page.addInitScript(() => {
    window.open = () => ({ closed:false });
  });
  await page.route('**/f1-tree-cloud.js*', route => route.fulfill({
    status:200,
    contentType:'application/javascript',
    body:"window.F1TreeCloud={boot:async()=>true,schedulePush:()=>{},touchLocal:p=>{if(p)p.updatedAt=new Date().toISOString()},queueDeleteLegacyIds:()=>{},queueReset:()=>{}};"
  }));
  await page.route('**/f1-contact-outreach.js*', route => route.fulfill({
    status:200,
    contentType:'application/javascript',
    body:"window.__outreachRecords=[];window.F1ContactOutreach={ready:()=>true,today:async()=>({day:'2026-10-01',timezone:'Europe/Rome',total:0,calls:0,messages:0,events:[]}),record:async x=>{window.__outreachRecords.push(x);return x},recordInteraction:async()=>({})};"
  }));
}

async function addRootPerson(page,name){
  await page.getByRole('button',{name:'+ Nuova persona'}).click();
  await page.locator('#pName').fill(name);
  await page.locator('#savePersonBtn').click();
  await expect(page.locator('#relationModal')).toHaveClass(/open/);
  const id=await page.evaluate(n=>db.people.find(p=>p.name===n)?.id,name);
  return id;
}

test('desktop layout uses compact contacts left and relational tree right', async ({ page }) => {
  await prepare(page);
  await page.setViewportSize({width:1600,height:900});
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#relationshipWorkspace')).toBeVisible();
  await expect(page.locator('#dailyOutreachGrid .daily-outreach-cell')).toHaveCount(100);
  await expect(page.locator('#relationshipTree')).toBeVisible();
  const layout=await page.evaluate(()=>{
    const ws=document.querySelector('#relationshipWorkspace').getBoundingClientRect();
    const left=document.querySelector('.relationship-left').getBoundingClientRect();
    const right=document.querySelector('.relationship-right').getBoundingClientRect();
    const cell=document.querySelector('.daily-outreach-cell').getBoundingClientRect();
    return {ws,left,right,cell};
  });
  expect(layout.left.left).toBeLessThan(layout.right.left);
  expect(layout.left.width).toBeLessThan(layout.right.width);
  expect(layout.cell.width).toBeLessThanOrEqual(30);
  expect(layout.cell.height).toBeLessThanOrEqual(30);
});

test('Teresa can add Adriano as husband with reciprocal relationship automatically', async ({ page }) => {
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  const teresaId=await addRootPerson(page,'TERESA');
  await page.getByRole('button',{name:'MARITO',exact:true}).click();
  await page.locator('#relName').fill('ADRIANO');
  await page.getByRole('button',{name:'SALVA E CREA RAMO'}).click();

  const state=await page.evaluate(({teresaId})=>{
    const teresa=db.people.find(p=>p.id===teresaId);
    const adriano=db.people.find(p=>p.name==='ADRIANO');
    return {
      people:db.people.filter(p=>p.id!=='root').map(p=>p.name),
      adrianoId:adriano?.id,
      forward:db.relations.some(r=>r.sourceId===teresaId&&r.targetId===adriano?.id&&r.type==='marito'),
      reverse:db.relations.some(r=>r.sourceId===adriano?.id&&r.targetId===teresaId&&r.type==='moglie'),
      sameParent:adriano?.parentId===teresa?.parentId
    };
  },{teresaId});
  expect(state.people).toEqual(expect.arrayContaining(['TERESA','ADRIANO']));
  expect(state.forward).toBeTruthy();
  expect(state.reverse).toBeTruthy();
  expect(state.sameParent).toBeTruthy();
  await expect(page.locator('[data-person-id="'+state.adrianoId+'"]')).toBeVisible();
});

test('child and friend branches appear quickly and branch can collapse', async ({ page }) => {
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  const teresaId=await addRootPerson(page,'TERESA');
  await page.getByRole('button',{name:'MARITO',exact:true}).click();
  await page.locator('#relName').fill('ADRIANO');
  await page.getByRole('button',{name:'SALVA E CREA RAMO'}).click();

  await page.evaluate(id=>F1RelationshipTree.openPicker(id,'figlio'),teresaId);
  await page.locator('#relName').fill('LUCA');
  await page.getByRole('button',{name:'SALVA E CREA RAMO'}).click();

  await page.evaluate(id=>F1RelationshipTree.openPicker(id,'amica'),teresaId);
  await page.locator('#relName').fill('MARIA');
  await page.getByRole('button',{name:'SALVA E CREA RAMO'}).click();

  const ids=await page.evaluate(()=>Object.fromEntries(db.people.filter(p=>['TERESA','LUCA','MARIA'].includes(p.name)).map(p=>[p.name,p.id])));
  await expect(page.locator('[data-person-id="'+ids.LUCA+'"]')).toBeVisible();
  await expect(page.locator('[data-person-id="'+ids.MARIA+'"]')).toBeVisible();

  await page.evaluate(id=>F1RelationshipTree.toggle(id),teresaId);
  await expect(page.locator('[data-person-id="'+ids.LUCA+'"]')).toHaveCount(0);
  await page.evaluate(id=>F1RelationshipTree.toggle(id),teresaId);
  await expect(page.locator('[data-person-id="'+ids.LUCA+'"]')).toBeVisible();
});

test('existing person is linked without creating a duplicate', async ({ page }) => {
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  const teresaId=await addRootPerson(page,'TERESA');
  await page.getByRole('button',{name:'AMICA',exact:true}).click();
  await page.locator('#relName').fill('MARIA');
  await page.getByRole('button',{name:'SALVA E CREA RAMO'}).click();
  const mariaId=await page.evaluate(()=>db.people.find(p=>p.name==='MARIA').id);
  const before=await page.evaluate(()=>db.people.length);

  await page.evaluate(id=>F1RelationshipTree.openPicker(id,'collega'),teresaId);
  await page.locator('#relName').fill('MARIA');
  await expect(page.locator('#relationExisting')).toContainText('MARIA');
  await page.locator('#relationExisting button').first().click();

  const after=await page.evaluate(()=>db.people.length);
  expect(after).toBe(before);
  const linked=await page.evaluate(({teresaId,mariaId})=>db.relations.some(r=>r.sourceId===teresaId&&r.targetId===mariaId&&r.type==='collega'),{teresaId,mariaId});
  expect(linked).toBeTruthy();
});

test('WhatsApp opening does not count until SEGNA MESSAGGIO INVIATO', async ({ page }) => {
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  const teresaId=await addRootPerson(page,'TERESA');
  await page.getByRole('button',{name:'AMICO',exact:true}).click();
  await page.locator('#relName').fill('PAOLO');
  await page.locator('#relPhone').fill('3331234567');
  await page.getByRole('button',{name:'SALVA E CREA RAMO'}).click();
  await expect.poll(()=>page.evaluate(()=>db.people.some(p=>String(p.name||'').toUpperCase()==='PAOLO'))).toBeTruthy();
  const paoloId=await page.evaluate(()=>db.people.find(p=>String(p.name||'').toUpperCase()==='PAOLO').id);

  await page.evaluate(id=>F1RelationshipTree.openWhatsApp(id),paoloId);
  expect(await page.evaluate(()=>window.__outreachRecords.length)).toBe(0);
  await expect(page.locator('#waConfirmBar')).toHaveClass(/open/);
  await page.locator('#waConfirmButton').click();
  await expect.poll(()=>page.evaluate(()=>window.__outreachRecords.length)).toBe(1);
  expect(await page.evaluate(()=>window.__outreachRecords[0].channel)).toBe('MESSAGE');
});

test('person sheet is compact and keeps accordion sections', async ({ page }) => {
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  const teresaId=await addRootPerson(page,'TERESA');
  await page.evaluate(()=>F1RelationshipTree.closePicker());
  await page.evaluate(id=>openPerson(id),teresaId);
  await expect(page.locator('#drawer')).toHaveClass(/open/);
  await expect(page.locator('.drawer-quick-actions')).toContainText('WHATSAPP');
  await expect(page.locator('.drawer-quick-actions')).toContainText('+ PERSONA COLLEGATA');
  await expect(page.locator('details.compact-section')).toHaveCount(6);
  await expect(page.getByRole('button',{name:'+ ESPANDI RETE'})).toBeVisible();
});

for(const size of [
  {name:'desktop',width:1600,height:900},
  {name:'tablet',width:1024,height:768},
  {name:'mobile',width:390,height:844}
]){
  test('relational workspace is usable on '+size.name, async ({ browser }) => {
    const context=await browser.newContext({viewport:{width:size.width,height:size.height}});
    const page=await context.newPage();
    await prepare(page);
    await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
    await expect(page.locator('#dailyOutreachGrid .daily-outreach-cell')).toHaveCount(100);
    await expect(page.locator('#relationshipTreeViewport')).toBeVisible();
    await context.close();
  });
}
