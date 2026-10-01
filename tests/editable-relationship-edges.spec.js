const { test, expect } = require('@playwright/test');

async function prepare(page){
  await page.addInitScript(() => {
    window.open = (url) => { window.__lastOpen = String(url || ''); return { closed:false }; };
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
async function newPerson(page,name,surname='',phone=''){
  await page.getByRole('button',{name:'+ Nuova persona'}).click();
  await page.locator('#pName').fill(name);
  if(surname)await page.locator('#pSurname').fill(surname);
  if(phone)await page.locator('#pPhone').fill(phone);
  await page.locator('#savePersonBtn').click();
  await expect(page.locator('#relationModal')).toHaveClass(/open/);
  await expect.poll(()=>page.locator('#personId').inputValue()).not.toBe('draft');
  const id=await page.locator('#personId').inputValue();
  await expect.poll(()=>page.evaluate(savedId=>db.people.some(p=>p.id===savedId),id)).toBeTruthy();
  const saved=await page.evaluate(savedId=>db.people.find(p=>p.id===savedId),id);
  expect([saved.name,saved.surname].filter(Boolean).join(' ').toUpperCase()).toBe([name,surname].filter(Boolean).join(' ').toUpperCase());
  return id;
}
async function createRelationFromOpenPopup(page,type,targetName,targetSurname='',phone=''){
  await page.getByRole('button',{name:type,exact:true}).click();
  await page.locator('#relName').fill(targetName);
  if(targetSurname)await page.locator('#relSurname').fill(targetSurname);
  if(phone)await page.locator('#relPhone').fill(phone);
  await page.getByRole('button',{name:'SALVA E CREA RAMO'}).click();
}
async function createRenatoMamma(page){
  const renatoId=await newPerson(page,'RENATO','TONIOLO');
  await createRelationFromOpenPopup(page,'MOGLIE','MAMMA');
  const mammaId=await page.evaluate(()=>db.people.find(p=>p.name==='MAMMA')?.id);
  return {renatoId,mammaId};
}

test('RENATO and MAMMA have one visible editable MOGLIE ↔ MARITO edge', async ({ page }) => {
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  const {renatoId,mammaId}=await createRenatoMamma(page);

  const state=await page.evaluate(({renatoId,mammaId})=>({
    forward:db.relations.filter(r=>r.sourceId===renatoId&&r.targetId===mammaId).map(r=>r.type),
    reverse:db.relations.filter(r=>r.sourceId===mammaId&&r.targetId===renatoId).map(r=>r.type),
    edges:F1RelationshipTree.visualEdges().filter(e=>(e.sourceId===renatoId&&e.targetId===mammaId)||(e.sourceId===mammaId&&e.targetId===renatoId)).length
  }),{renatoId,mammaId});
  expect(state.forward).toContain('moglie');
  expect(state.reverse).toContain('marito');
  expect(state.edges).toBe(1);

  await expect(page.locator('.rel-edge-path')).toHaveCount(1);
  const label=page.locator('.rel-edge-label').filter({hasText:'MOGLIE ↔ MARITO'});
  await expect(label).toHaveCount(1);
  await label.click();
  await expect(page.locator('#edgeEditorModal')).toHaveClass(/open/);
  await expect(page.locator('#edgeEditorFrom')).toContainText('RENATO TONIOLO');
  await expect(page.locator('#edgeEditorTo')).toContainText('MAMMA');
});

test('editing an edge updates both directions and its visible label', async ({ page }) => {
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  const {renatoId,mammaId}=await createRenatoMamma(page);
  await page.locator('.rel-edge-label').click();
  await page.locator('#edgeEditorType').selectOption('amica');
  await page.locator('#edgeEditorInverse').selectOption('amico_a');
  await page.getByRole('button',{name:'SALVA',exact:true}).click();

  const pair=await page.evaluate(({renatoId,mammaId})=>({
    a:db.relations.find(r=>r.sourceId===renatoId&&r.targetId===mammaId)?.type,
    b:db.relations.find(r=>r.sourceId===mammaId&&r.targetId===renatoId)?.type
  }),{renatoId,mammaId});
  expect(pair).toEqual({a:'amica',b:'amico_a'});
  await expect(page.locator('.rel-edge-label')).toContainText('AMICA ↔ AMICO/A');
});

test('deleting an edge keeps both people', async ({ page }) => {
  await prepare(page);
  page.on('dialog',d=>d.accept());
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  const {renatoId,mammaId}=await createRenatoMamma(page);
  const before=await page.evaluate(()=>db.people.length);
  await page.locator('.rel-edge-label').click();
  await page.getByRole('button',{name:'ELIMINA RELAZIONE'}).click();
  expect(await page.evaluate(()=>db.people.length)).toBe(before);
  expect(await page.evaluate(({renatoId,mammaId})=>db.people.some(p=>p.id===renatoId)&&db.people.some(p=>p.id===mammaId),{renatoId,mammaId})).toBeTruthy();
  await expect(page.locator('.rel-edge-label')).toHaveCount(0);
});

test('MAMMA to ERICA creates FIGLIA ↔ MADRE automatically', async ({ page }) => {
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  const {mammaId}=await createRenatoMamma(page);
  await page.evaluate(id=>F1RelationshipTree.openPicker(id,'figlia'),mammaId);
  await page.locator('#relName').fill('ERICA');
  await page.getByRole('button',{name:'SALVA E CREA RAMO'}).click();
  const ericaId=await page.evaluate(()=>db.people.find(p=>p.name==='ERICA')?.id);

  const pair=await page.evaluate(({mammaId,ericaId})=>({
    forward:db.relations.find(r=>r.sourceId===mammaId&&r.targetId===ericaId)?.type,
    reverse:db.relations.find(r=>r.sourceId===ericaId&&r.targetId===mammaId)?.type
  }),{mammaId,ericaId});
  expect(pair).toEqual({forward:'figlia',reverse:'madre'});
  await expect(page.locator('.rel-edge-label').filter({hasText:'FIGLIA ↔ MADRE'})).toHaveCount(1);
});

test('one person can keep family, friend and colleague edges simultaneously', async ({ page }) => {
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  const {mammaId}=await createRenatoMamma(page);
  await page.evaluate(id=>F1RelationshipTree.openPicker(id,'figlia'),mammaId);
  await page.locator('#relName').fill('ERICA');
  await page.getByRole('button',{name:'SALVA E CREA RAMO'}).click();
  const ericaId=await page.evaluate(()=>db.people.find(p=>p.name==='ERICA')?.id);

  await page.evaluate(id=>F1RelationshipTree.openPicker(id,'amica'),ericaId);
  await page.locator('#relName').fill('ANNA');
  await page.getByRole('button',{name:'SALVA E CREA RAMO'}).click();

  await page.evaluate(id=>F1RelationshipTree.openPicker(id,'collega'),ericaId);
  await page.locator('#relName').fill('LUCA');
  await page.getByRole('button',{name:'SALVA E CREA RAMO'}).click();

  const count=await page.evaluate(id=>F1RelationshipTree.visualEdges().filter(e=>e.sourceId===id||e.targetId===id).length,ericaId);
  expect(count).toBe(3);
  await expect(page.locator('.rel-edge-label').filter({hasText:'AMICA'})).toHaveCount(1);
  await expect(page.locator('.rel-edge-label').filter({hasText:'COLLEGA'})).toHaveCount(1);
});

test('ALTRO accepts a custom edge label', async ({ page }) => {
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  const renatoId=await newPerson(page,'RENATO','TONIOLO');
  await page.getByRole('button',{name:'ALTRO',exact:true}).click();
  await page.locator('#relCustomLabel').fill('AMMINISTRATORE CONDOMINIO');
  await page.locator('#relName').fill('MARIO');
  await page.getByRole('button',{name:'SALVA E CREA RAMO'}).click();
  await expect(page.locator('.rel-edge-label').filter({hasText:'AMMINISTRATORE CONDOMINIO'})).toHaveCount(1);
  expect(await page.evaluate(id=>db.relations.some(r=>r.sourceId===id&&r.customLabel==='AMMINISTRATORE CONDOMINIO'),renatoId)).toBeTruthy();
});

test('dragging a card updates the edge and persists graph position through refresh', async ({ page }) => {
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  const {renatoId}=await createRenatoMamma(page);
  await page.evaluate(()=>F1RelationshipTree.fit());
  const node=page.locator('[data-person-id="'+renatoId+'"]');
  const beforePos=await page.evaluate(id=>({...db.graphPositions[id]}),renatoId);
  const beforePath=await page.locator('.rel-edge-path').getAttribute('d');
  const box=await node.boundingBox();
  await page.mouse.move(box.x+55,box.y+18);
  await page.mouse.down();
  await page.mouse.move(box.x+135,box.y+78,{steps:6});
  await page.mouse.up();
  const afterPos=await page.evaluate(id=>({...db.graphPositions[id]}),renatoId);
  const afterPath=await page.locator('.rel-edge-path').getAttribute('d');
  expect(afterPos.x).not.toBe(beforePos.x);
  expect(afterPath).not.toBe(beforePath);
  await page.reload({waitUntil:'domcontentloaded'});
  const persisted=await page.evaluate(id=>({...db.graphPositions[id]}),renatoId);
  expect(persisted.x).toBeCloseTo(afterPos.x,1);
  expect(persisted.y).toBeCloseTo(afterPos.y,1);
});

test('dragging the connect handle to an existing card opens the relationship chooser', async ({ page }) => {
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  const renatoId=await newPerson(page,'RENATO','TONIOLO');
  await page.evaluate(()=>F1RelationshipTree.closePicker());
  const mammaId=await newPerson(page,'MAMMA');
  await page.evaluate(()=>F1RelationshipTree.closePicker());
  await page.evaluate(()=>F1RelationshipTree.fit());

  const handle=page.locator('[data-person-id="'+renatoId+'"] .rel-connect-handle');
  const target=page.locator('[data-person-id="'+mammaId+'"]');
  const hb=await handle.boundingBox(),tb=await target.boundingBox();
  await page.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2);
  await page.mouse.down();
  await page.mouse.move(tb.x+tb.width/2,tb.y+tb.height/2,{steps:8});
  await page.mouse.up();
  await expect(page.locator('#relationModal')).toHaveClass(/open/);
  await expect(page.locator('#relationContextQuestion')).toContainText('RENATO TONIOLO');
  await expect(page.locator('#relationContextQuestion')).toContainText('MAMMA');
});

test('phone is visible; phone/WhatsApp opens wa.me and call button uses tel:', async ({ page }) => {
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  const renatoId=await newPerson(page,'RENATO','TONIOLO','3481234567');
  await page.evaluate(()=>F1RelationshipTree.closePicker());
  const card=page.locator('[data-person-id="'+renatoId+'"]');
  await expect(card.locator('.rel-node-phone')).toHaveText('348 123 4567');
  await expect(card.locator('a.call')).toHaveAttribute('href','tel:+393481234567');
  await card.locator('.rel-node-phone').click();
  expect(await page.evaluate(()=>window.__lastOpen)).toBe('https://wa.me/393481234567');
  expect(await page.evaluate(()=>window.__outreachRecords.length)).toBe(0);
  await expect(page.locator('#waConfirmBar')).toHaveClass(/open/);
  await page.locator('#waConfirmButton').click();
  await expect.poll(()=>page.evaluate(()=>window.__outreachRecords.length)).toBe(1);
});

test('source includes cloud-persisted graph positions and one SVG edge layer', async () => {
  const fs=require('fs');
  const tree=fs.readFileSync('albero-fonti-notizie.html','utf8');
  const graph=fs.readFileSync('f1-relational-tree.js','utf8');
  const cloud=fs.readFileSync('f1-tree-cloud.js','utf8');
  expect(tree).toContain('id="relationshipEdges"');
  expect(tree).toContain('id="relationshipEdgeLabels"');
  expect(tree).toContain('id="relationshipNodes"');
  expect(graph).toContain('marker-start="url(#relArrow)"');
  expect(graph).toContain('marker-end="url(#relArrow)"');
  expect(graph).toContain('data-relation-id');
  expect(cloud).toContain('graphPositions:db.graphPositions||{}');
  expect(cloud).toContain('db.graphPositions=g.graphPositions');
});
