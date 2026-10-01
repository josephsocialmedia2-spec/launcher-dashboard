const { test, expect } = require('@playwright/test');

async function prepare(page){
  await page.addInitScript(()=>{window.open=()=>({closed:false})});
  await page.route('**/f1-tree-cloud.js*',route=>route.fulfill({
    status:200,contentType:'application/javascript',
    body:"window.F1TreeCloud={boot:async()=>true,schedulePush:()=>{},touchLocal:p=>{if(p)p.updatedAt=new Date().toISOString()},queueDeleteLegacyIds:()=>{},queueReset:()=>{}};"
  }));
  await page.route('**/f1-contact-outreach.js*',route=>route.fulfill({
    status:200,contentType:'application/javascript',
    body:"window.F1ContactOutreach={ready:()=>true,today:async()=>({day:'2026-10-01',timezone:'Europe/Rome',total:0,calls:0,messages:0,events:[]}),record:async x=>x,recordInteraction:async()=>({})};"
  }));
}

test('mind map shell is freeform, compact and visually focused', async ({page})=>{
  await prepare(page);
  await page.setViewportSize({width:1600,height:900});
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'MAPPA RELAZIONALE'})).toBeVisible();
  const metrics=await page.evaluate(()=>{
    const ws=document.querySelector('#relationshipWorkspace').getBoundingClientRect();
    const left=document.querySelector('.relationship-left').getBoundingClientRect();
    const right=document.querySelector('.relationship-right').getBoundingClientRect();
    const root=document.querySelector('[data-person-id="root"]').getBoundingClientRect();
    return {leftRatio:left.width/ws.width,rightRatio:right.width/ws.width,nodeWidth:root.width,nodeHeight:root.height};
  });
  expect(metrics.leftRatio).toBeLessThan(.38);
  expect(metrics.rightRatio).toBeGreaterThan(.60);
  expect(metrics.nodeWidth).toBeLessThanOrEqual(150);
  expect(metrics.nodeHeight).toBeLessThan(120);
  await expect(page.locator('#relationshipTreeViewport')).toHaveCSS('cursor','grab');
});

test('new relationship types start in deliberately different freeform directions', async ({page})=>{
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    const now=new Date().toISOString();
    db.people=[
      {id:'root',parentId:null,name:'IO',surname:'',stage:'Nome',phone:'',town:''},
      {id:'a',parentId:'root',name:'AMICA',surname:'',stage:'Nome',phone:'',town:'',createdAt:now,updatedAt:now},
      {id:'b',parentId:'root',name:'COLLEGA',surname:'',stage:'Nome',phone:'',town:'',createdAt:now,updatedAt:now},
      {id:'c',parentId:'root',name:'FIGLIA',surname:'',stage:'Nome',phone:'',town:'',createdAt:now,updatedAt:now}
    ];
    db.relations=[
      {id:'r1',pairId:'p1',pairRole:'forward',sourceId:'root',targetId:'a',type:'amica',inverseType:'amico_a',context:'quick_relationship'},
      {id:'r2',pairId:'p1',pairRole:'reverse',sourceId:'a',targetId:'root',type:'amico_a',inverseType:'amica',context:'quick_relationship'},
      {id:'r3',pairId:'p2',pairRole:'forward',sourceId:'root',targetId:'b',type:'collega',inverseType:'collega',context:'quick_relationship'},
      {id:'r4',pairId:'p2',pairRole:'reverse',sourceId:'b',targetId:'root',type:'collega',inverseType:'collega',context:'quick_relationship'},
      {id:'r5',pairId:'p3',pairRole:'forward',sourceId:'root',targetId:'c',type:'figlia',inverseType:'genitore',context:'quick_relationship'},
      {id:'r6',pairId:'p3',pairRole:'reverse',sourceId:'c',targetId:'root',type:'genitore',inverseType:'figlia',context:'quick_relationship'}
    ];
    db.graphPositions={root:{x:520,y:300}};
    F1RelationshipTree.render();
  });
  const pos=await page.evaluate(()=>({
    a:db.graphPositions.a,b:db.graphPositions.b,c:db.graphPositions.c
  }));
  expect(new Set([Math.round(pos.a.x)+':'+Math.round(pos.a.y),Math.round(pos.b.x)+':'+Math.round(pos.b.y),Math.round(pos.c.x)+':'+Math.round(pos.c.y)]).size).toBe(3);
});

test('selecting a person emphasizes its own relationship context without hiding the rest', async ({page})=>{
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    const now=new Date().toISOString();
    db.people=[
      {id:'root',parentId:null,name:'IO',surname:'',stage:'Nome',phone:'',town:''},
      {id:'a',parentId:'root',name:'A',surname:'',stage:'Nome',phone:'',town:'',createdAt:now,updatedAt:now},
      {id:'b',parentId:'root',name:'B',surname:'',stage:'Nome',phone:'',town:'',createdAt:now,updatedAt:now},
      {id:'c',parentId:'root',name:'C',surname:'',stage:'Nome',phone:'',town:'',createdAt:now,updatedAt:now}
    ];
    db.graphPositions={root:{x:200,y:200},a:{x:450,y:180},b:{x:700,y:260},c:{x:700,y:500}};
    db.relations=[
      {id:'1',pairId:'pa',pairRole:'forward',sourceId:'a',targetId:'b',type:'amica',inverseType:'amico_a',context:'quick_relationship'},
      {id:'2',pairId:'pa',pairRole:'reverse',sourceId:'b',targetId:'a',type:'amico_a',inverseType:'amica',context:'quick_relationship'},
      {id:'3',pairId:'pc',pairRole:'forward',sourceId:'root',targetId:'c',type:'collega',inverseType:'collega',context:'quick_relationship'},
      {id:'4',pairId:'pc',pairRole:'reverse',sourceId:'c',targetId:'root',type:'collega',inverseType:'collega',context:'quick_relationship'}
    ];
    F1RelationshipTree.render();F1RelationshipTree.select('a',false);
  });
  await expect(page.locator('.rel-edge-path.context-active')).toHaveCount(1);
  await expect(page.locator('.rel-edge-path.context-dim')).toHaveCount(1);
  await expect(page.locator('[data-person-id="c"]')).toHaveClass(/context-dim/);
});

for(const count of [20,50,100,200]){
  test('temporary QA map renders '+count+' nodes without database writes', async ({page})=>{
    await prepare(page);
    await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
    const timing=await page.evaluate(count=>{
      const now=new Date().toISOString(),people=[{id:'root',parentId:null,name:'IO',surname:'',stage:'Nome',phone:'',town:''}],relations=[],positions={root:{x:1100,y:820}};
      for(let i=1;i<count;i++){
        const id='n'+i,parent=i<9?'root':'n'+Math.max(1,Math.floor(i/4));
        people.push({id,parentId:parent,name:'PERSONA '+i,surname:'',stage:'Nome',phone:'',town:'',createdAt:now,updatedAt:now});
        const pair='pair'+i;
        relations.push({id:'f'+i,pairId:pair,pairRole:'forward',sourceId:parent,targetId:id,type:i%4===0?'collega':i%3===0?'amica':'conoscente',inverseType:i%4===0?'collega':i%3===0?'amico_a':'conoscente',context:'quick_relationship'});
        relations.push({id:'r'+i,pairId:pair,pairRole:'reverse',sourceId:id,targetId:parent,type:i%4===0?'collega':i%3===0?'amico_a':'conoscente',inverseType:i%4===0?'collega':i%3===0?'amica':'conoscente',context:'quick_relationship'});
        const angle=i*2.399963229728653,radius=90+Math.sqrt(i)*95;
        positions[id]={x:1100+Math.cos(angle)*radius,y:820+Math.sin(angle)*radius};
      }
      db.people=people;db.relations=relations;db.graphPositions=positions;
      const t0=performance.now();F1RelationshipTree.render();const ms=performance.now()-t0;
      return {ms,nodes:document.querySelectorAll('.rel-graph-node').length,edges:document.querySelectorAll('.rel-edge-path').length};
    },count);
    console.log('MINDMAP_PERF',count,Math.round(timing.ms)+'ms',timing.nodes+' nodes',timing.edges+' edges');
    expect(timing.nodes).toBe(count);
    expect(timing.edges).toBe(count-1);
    expect(timing.ms).toBeLessThan(2500);
  });
}


test('200-node map keeps drag and pan responsive without page errors', async ({page})=>{
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    const now=new Date().toISOString(),people=[{id:'root',parentId:null,name:'IO',surname:'',stage:'Nome',phone:'',town:''}],relations=[],positions={root:{x:1250,y:850}};
    for(let i=1;i<200;i++){
      const id='perf'+i,parent=i<12?'root':'perf'+Math.max(1,Math.floor(i/5));
      people.push({id,parentId:parent,name:'PERF '+i,surname:'',stage:'Nome',phone:'',town:'',createdAt:now,updatedAt:now});
      const pair='perfPair'+i,type=i%5===0?'collega':i%3===0?'amica':'conoscente';
      const inv=type==='amica'?'amico_a':type;
      relations.push({id:'pf'+i,pairId:pair,pairRole:'forward',sourceId:parent,targetId:id,type,inverseType:inv,context:'quick_relationship'});
      relations.push({id:'pr'+i,pairId:pair,pairRole:'reverse',sourceId:id,targetId:parent,type:inv,inverseType:type,context:'quick_relationship'});
      const angle=i*2.399963229728653,radius=100+Math.sqrt(i)*100;
      positions[id]={x:1250+Math.cos(angle)*radius,y:850+Math.sin(angle)*radius};
    }
    db.people=people;db.relations=relations;db.graphPositions=positions;F1RelationshipTree.render();F1RelationshipTree.fit();
  });

  const result=await page.evaluate(()=>{
    const node=document.querySelector('[data-person-id="perf100"]');
    const viewport=document.querySelector('#relationshipTreeViewport');
    const stage=document.querySelector('#relationshipTreeStage');
    const beforePos={...db.graphPositions.perf100};
    const nr=node.getBoundingClientRect(),sx=nr.left+35,sy=nr.top+18;
    const dragStart=performance.now();
    node.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,clientX:sx,clientY:sy,pointerId:11}));
    for(let i=1;i<=60;i++)window.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:sx+i*1.4,clientY:sy+i*.7,pointerId:11}));
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:sx+84,clientY:sy+42,pointerId:11}));
    const dragMs=performance.now()-dragStart,afterPos={...db.graphPositions.perf100};

    const vr=viewport.getBoundingClientRect(),px=vr.left+12,py=vr.top+12,beforeTransform=stage.style.transform;
    const panStart=performance.now();
    viewport.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,clientX:px,clientY:py,pointerId:12}));
    for(let i=1;i<=60;i++)window.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:px+i*1.5,clientY:py+i*.5,pointerId:12}));
    window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:px+90,clientY:py+30,pointerId:12}));
    const panMs=performance.now()-panStart,afterTransform=stage.style.transform;
    return {dragMs,panMs,beforePos,afterPos,beforeTransform,afterTransform};
  });

  console.log('MINDMAP_INTERACTION_PERF','drag',Math.round(result.dragMs)+'ms','pan',Math.round(result.panMs)+'ms');
  expect(result.afterPos.x).not.toBe(result.beforePos.x);
  expect(result.afterTransform).not.toBe(result.beforeTransform);
  expect(result.dragMs).toBeLessThan(1000);
  expect(result.panMs).toBeLessThan(500);
  expect(pageErrors).toEqual([]);
});

test('collapsing a hierarchical branch does not delete unrelated cross-links', async ({page})=>{
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  const state=await page.evaluate(()=>{
    const now=new Date().toISOString();
    db.people=[
      {id:'root',parentId:null,name:'IO',surname:'',stage:'Nome',phone:'',town:''},
      {id:'m',parentId:'root',name:'MAMMA',surname:'',stage:'Nome',phone:'',town:'',createdAt:now,updatedAt:now},
      {id:'e',parentId:'m',name:'ERICA',surname:'',stage:'Nome',phone:'',town:'',createdAt:now,updatedAt:now},
      {id:'a',parentId:'root',name:'ANNA',surname:'',stage:'Nome',phone:'',town:'',createdAt:now,updatedAt:now}
    ];
    db.graphPositions={root:{x:200,y:200},m:{x:470,y:260},e:{x:690,y:420},a:{x:830,y:180}};
    db.relations=[
      {id:'1',pairId:'fam',pairRole:'forward',sourceId:'m',targetId:'e',type:'figlia',inverseType:'madre',context:'quick_relationship'},
      {id:'2',pairId:'fam',pairRole:'reverse',sourceId:'e',targetId:'m',type:'madre',inverseType:'figlia',context:'quick_relationship'},
      {id:'3',pairId:'friend',pairRole:'forward',sourceId:'e',targetId:'a',type:'amica',inverseType:'amico_a',context:'quick_relationship'},
      {id:'4',pairId:'friend',pairRole:'reverse',sourceId:'a',targetId:'e',type:'amico_a',inverseType:'amica',context:'quick_relationship'}
    ];
    F1RelationshipTree.render();
    return {people:db.people.length,relations:db.relations.length};
  });
  await expect(page.locator('[data-person-id="e"]')).toBeVisible();
  await page.evaluate(()=>F1RelationshipTree.toggle('m'));
  await expect(page.locator('[data-person-id="m"]')).toBeVisible();
  await expect(page.locator('[data-person-id="e"]')).toHaveCount(0);
  await expect(page.locator('[data-person-id="a"]')).toBeVisible();
  expect(await page.evaluate(()=>({people:db.people.length,relations:db.relations.length}))).toEqual(state);
  await page.evaluate(()=>F1RelationshipTree.toggle('m'));
  await expect(page.locator('[data-person-id="e"]')).toBeVisible();
  await expect(page.locator('.rel-edge-label').filter({hasText:'AMICA'})).toHaveCount(1);
});

test('mind map cards and relationship labels expose keyboard and ARIA affordances', async ({page})=>{
  await prepare(page);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    const now=new Date().toISOString();
    db.people=[
      {id:'root',parentId:null,name:'IO',surname:'',stage:'Nome',phone:'',town:''},
      {id:'p1',parentId:'root',name:'RENATO',surname:'TONIOLO',stage:'Contatto',phone:'3481234567',town:'Bruzolo',createdAt:now,updatedAt:now},
      {id:'p2',parentId:'root',name:'MAMMA',surname:'',stage:'Nome',phone:'',town:'',createdAt:now,updatedAt:now}
    ];
    db.graphPositions={root:{x:180,y:160},p1:{x:450,y:210},p2:{x:720,y:210}};
    db.relations=[
      {id:'a',pairId:'couple',pairRole:'forward',sourceId:'p1',targetId:'p2',type:'moglie',inverseType:'marito',context:'quick_relationship'},
      {id:'b',pairId:'couple',pairRole:'reverse',sourceId:'p2',targetId:'p1',type:'marito',inverseType:'moglie',context:'quick_relationship'}
    ];
    F1RelationshipTree.render();
  });
  const renato=page.locator('[data-person-id="p1"]');
  await expect(renato).toHaveAttribute('tabindex','0');
  await expect(renato).toHaveAttribute('aria-label',/RENATO TONIOLO/);
  await expect(renato.locator('.rel-node-phone')).toHaveAttribute('aria-label',/Apri WhatsApp con RENATO TONIOLO/);
  await expect(renato.locator('a.call')).toHaveAttribute('aria-label',/Chiama RENATO TONIOLO/);
  await expect(page.locator('.rel-edge-label')).toHaveAttribute('aria-label',/Modifica relazione MOGLIE ↔ MARITO/);
});

for(const size of [
  {name:'1600x900',width:1600,height:900},
  {name:'1366x768',width:1366,height:768},
  {name:'1024x768',width:1024,height:768},
  {name:'768x1024',width:768,height:1024},
  {name:'430x932',width:430,height:932},
  {name:'390x844',width:390,height:844}
]){
  test('mind map remains usable at '+size.name,async({browser})=>{
    const context=await browser.newContext({viewport:{width:size.width,height:size.height}});
    const page=await context.newPage();await prepare(page);
    await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#relationshipTreeViewport')).toBeVisible();
    await expect(page.locator('#dailyOutreachGrid .daily-outreach-cell')).toHaveCount(100);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
    await context.close();
  });
}
