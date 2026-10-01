const { test, expect } = require('@playwright/test');
const fs = require('fs');

async function prepare(page){
  await page.addInitScript(() => {
    window.open = () => ({ closed:false });
    window.__pushes = 0;
  });
  await page.route('**/f1-tree-cloud.js*', route => route.fulfill({
    status:200,
    contentType:'application/javascript',
    body:"window.F1TreeCloud={boot:async()=>true,schedulePush:()=>{window.__pushes=(window.__pushes||0)+1},touchLocal:p=>{if(p)p.updatedAt=new Date().toISOString()},queueDeleteLegacyIds:()=>{},queueReset:()=>{}};"
  }));
  await page.route('**/f1-contact-outreach.js*', route => route.fulfill({
    status:200,
    contentType:'application/javascript',
    body:"window.F1ContactOutreach={ready:()=>true,today:async()=>({day:'2026-10-01',timezone:'Europe/Rome',total:0,calls:0,messages:0,events:[]}),record:async x=>x,recordInteraction:async()=>({})};"
  }));
}

async function seed(page){
  await page.evaluate(() => {
    const now=new Date().toISOString();
    db.people=[
      {id:'root',parentId:null,name:'IO',surname:'',stage:'Nome',phone:'',town:'',createdAt:now,updatedAt:now},
      {id:'a',parentId:'root',name:'RENATO',surname:'TONIOLO',stage:'Contatto',phone:'3481234567',town:'Bruzolo',createdAt:now,updatedAt:now},
      {id:'b',parentId:'root',name:'MAMMA',surname:'',stage:'Nome',phone:'',town:'',createdAt:now,updatedAt:now},
      {id:'c',parentId:'b',name:'ERICA',surname:'',stage:'Nome',phone:'',town:'',createdAt:now,updatedAt:now}
    ];
    db.relations=[
      {id:'r1',pairId:'spouse',pairRole:'forward',sourceId:'a',targetId:'b',type:'moglie',inverseType:'marito',context:'quick_relationship'},
      {id:'r2',pairId:'spouse',pairRole:'reverse',sourceId:'b',targetId:'a',type:'marito',inverseType:'moglie',context:'quick_relationship'},
      {id:'r3',pairId:'child',pairRole:'forward',sourceId:'b',targetId:'c',type:'figlia',inverseType:'madre',context:'quick_relationship'},
      {id:'r4',pairId:'child',pairRole:'reverse',sourceId:'c',targetId:'b',type:'madre',inverseType:'figlia',context:'quick_relationship'}
    ];
    db.graphPositions={
      root:{x:200,y:180},
      a:{x:500,y:220},
      b:{x:760,y:220},
      c:{x:760,y:470}
    };
    db.graphGroups=[];
    persist();
    F1RelationshipTree.render();
    window.__pushes=0;
  });
}

test.beforeEach(async ({page})=>{
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  await seed(page);
});

test('single drag is free, marks manual, updates edges and persists only on drop', async ({page})=>{
  const before=await page.evaluate(()=>({
    pos:{...db.graphPositions.a},
    relations:JSON.stringify(db.relations)
  }));
  const pathBefore=await page.locator('.rel-edge-path[data-relation-id="spouse"]').getAttribute('d');
  const node=page.locator('[data-person-id="a"]');
  const box=await node.boundingBox();
  await page.mouse.move(box.x+55,box.y+18);
  await page.mouse.down();
  await page.mouse.move(box.x+135,box.y+78,{steps:8});
  await page.mouse.up();

  const after=await page.evaluate(()=>({
    pos:{...db.graphPositions.a},
    relations:JSON.stringify(db.relations),
    pushes:window.__pushes
  }));
  const pathAfter=await page.locator('.rel-edge-path[data-relation-id="spouse"]').getAttribute('d');
  expect(after.pos.x).not.toBe(before.pos.x);
  expect(after.pos.y).not.toBe(before.pos.y);
  expect(after.pos.manual).toBe(true);
  expect(after.relations).toBe(before.relations);
  expect(pathAfter).not.toBe(pathBefore);
  expect(after.pushes).toBe(1);

  await page.reload({waitUntil:'domcontentloaded'});
  const persisted=await page.evaluate(()=>({...db.graphPositions.a}));
  expect(persisted.x).toBeCloseTo(after.pos.x,1);
  expect(persisted.y).toBeCloseTo(after.pos.y,1);
  expect(persisted.manual).toBe(true);
});

test('movement below click threshold does not move or persist the card', async ({page})=>{
  const before=await page.evaluate(()=>({...db.graphPositions.a}));
  const box=await page.locator('[data-person-id="a"]').boundingBox();
  await page.mouse.move(box.x+50,box.y+18);
  await page.mouse.down();
  await page.mouse.move(box.x+53,box.y+20);
  await page.mouse.up();
  const after=await page.evaluate(()=>({pos:{...db.graphPositions.a},pushes:window.__pushes}));
  expect(after.pos.x).toBe(before.x);
  expect(after.pos.y).toBe(before.y);
  expect(after.pos.manual).toBe(false);
  expect(after.pushes).toBe(0);
});

test('pin protects a card from explicit reorder but never blocks manual drag', async ({page})=>{
  await page.evaluate(()=>F1RelationshipTree.togglePin('a'));
  const pinned=await page.evaluate(()=>({...db.graphPositions.a}));
  const beforeB=await page.evaluate(()=>({...db.graphPositions.b}));
  await page.evaluate(()=>F1RelationshipTree.reorder(true));
  const after=await page.evaluate(()=>({a:{...db.graphPositions.a},b:{...db.graphPositions.b}}));
  expect(after.a.x).toBe(pinned.x);
  expect(after.a.y).toBe(pinned.y);
  expect(after.a.pinned).toBe(true);
  expect(after.b.x===beforeB.x && after.b.y===beforeB.y).toBe(false);

  const box=await page.locator('[data-person-id="a"]').boundingBox();
  await page.mouse.move(box.x+45,box.y+20);
  await page.mouse.down();
  await page.mouse.move(box.x+105,box.y+55,{steps:5});
  await page.mouse.up();
  const moved=await page.evaluate(()=>({...db.graphPositions.a}));
  expect(moved.pinned).toBe(true);
  expect(moved.x).not.toBe(pinned.x);
});

test('ctrl multiselect moves selected cards together and preserves their distances', async ({page})=>{
  const before=await page.evaluate(()=>({
    a:{...db.graphPositions.a},b:{...db.graphPositions.b},c:{...db.graphPositions.c}
  }));
  await page.evaluate(()=>{
    F1RelationshipTree.select('a',false);
    F1RelationshipTree.select('b',false,{ctrlKey:true});
    F1RelationshipTree.select('c',false,{ctrlKey:true});
  });
  await expect(page.locator('.rel-graph-node.multi-selected')).toHaveCount(3);

  const box=await page.locator('[data-person-id="b"]').boundingBox();
  await page.mouse.move(box.x+45,box.y+18);
  await page.mouse.down();
  await page.mouse.move(box.x+120,box.y+63,{steps:6});
  await page.mouse.up();

  const after=await page.evaluate(()=>({
    a:{...db.graphPositions.a},b:{...db.graphPositions.b},c:{...db.graphPositions.c}
  }));
  const dax=after.a.x-before.a.x, dbx=after.b.x-before.b.x, dcx=after.c.x-before.c.x;
  const day=after.a.y-before.a.y, dby=after.b.y-before.b.y, dcy=after.c.y-before.c.y;
  expect(dax).toBeCloseTo(dbx,0);
  expect(dax).toBeCloseTo(dcx,0);
  expect(day).toBeCloseTo(dby,0);
  expect(day).toBeCloseTo(dcy,0);
  expect(after.a.manual&&after.b.manual&&after.c.manual).toBe(true);
});

test('groups assign, collapse, expand and drag all members as one unit', async ({page})=>{
  const gid=await page.evaluate(()=>{
    const id=F1RelationshipTree.createGroup('FAMIGLIA');
    F1RelationshipTree.assignGroup('a',id);
    F1RelationshipTree.assignGroup('b',id);
    return id;
  });
  await expect(page.locator('.rel-group-box[data-group-id="'+gid+'"]')).toBeVisible();
  const before=await page.evaluate(()=>({a:{...db.graphPositions.a},b:{...db.graphPositions.b}}));

  await page.evaluate(id=>F1RelationshipTree.toggleGroupCollapse(id),gid);
  await expect(page.locator('[data-person-id="a"]')).toHaveCount(0);
  await expect(page.locator('.rel-group-box[data-group-id="'+gid+'"]')).toContainText('2 PERSONE');
  await page.evaluate(id=>F1RelationshipTree.toggleGroupCollapse(id),gid);
  await expect(page.locator('[data-person-id="a"]')).toBeVisible();

  const handle=page.locator('.rel-group-box[data-group-id="'+gid+'"] .rel-group-handle');
  const box=await handle.boundingBox();
  await page.mouse.move(box.x+30,box.y+10);
  await page.mouse.down();
  await page.mouse.move(box.x+100,box.y+55,{steps:6});
  await page.mouse.up();

  const after=await page.evaluate(()=>({a:{...db.graphPositions.a},b:{...db.graphPositions.b},groups:db.graphGroups}));
  expect(after.a.x-before.a.x).toBeCloseTo(after.b.x-before.b.x,1);
  expect(after.a.y-before.a.y).toBeCloseTo(after.b.y-before.b.y,1);
  expect(after.a.groupId).toBe(gid);
  expect(after.b.groupId).toBe(gid);
  expect(after.groups.find(g=>g.id===gid)).toBeTruthy();
});

test('saving phone data never destroys a manual graph position', async ({page})=>{
  await page.evaluate(()=>{
    db.graphPositions.a={x:615,y:345,manual:true,pinned:false,groupId:null};
    F1RelationshipTree.render();
    openPerson('a');
  });
  await page.locator('#pPhone').fill('349 111 2233');
  await page.locator('#savePersonBtn').click();
  const state=await page.evaluate(()=>({phone:db.people.find(p=>p.id==='a').phone,pos:{...db.graphPositions.a}}));
  expect(state.phone).toBe('349 111 2233');
  expect(state.pos.x).toBe(615);
  expect(state.pos.y).toBe(345);
  expect(state.pos.manual).toBe(true);
});

test('keyboard arrows provide a non-drag movement path and undo restores the previous position', async ({page})=>{
  const card=page.locator('[data-person-id="a"]');
  await card.focus();
  const before=await page.evaluate(()=>({...db.graphPositions.a}));
  await card.press('ArrowRight');
  const moved=await page.evaluate(()=>({...db.graphPositions.a}));
  expect(moved.x).toBe(before.x+10);
  expect(moved.manual).toBe(true);
  await page.evaluate(()=>F1RelationshipTree.undoMove());
  const restored=await page.evaluate(()=>({...db.graphPositions.a}));
  expect(restored.x).toBe(before.x);
  expect(restored.y).toBe(before.y);
});

test('cloud metadata keeps graphPositions and graphGroups without a parallel database', async ()=>{
  const cloud=fs.readFileSync('f1-tree-cloud.js','utf8');
  const migration=fs.readFileSync('supabase-migrations/20260924_f1_tree_network_engine_v2.sql','utf8');
  expect(cloud).toContain('graphPositions:db.graphPositions||{}');
  expect(cloud).toContain('graphGroups:Array.isArray(db.graphGroups)?db.graphGroups:[]');
  expect(cloud).toContain('db.graphGroups=Array.isArray(g.graphGroups)?g.graphGroups:(db.graphGroups||[])');
  expect(migration).toContain('graph_meta jsonb');
});
