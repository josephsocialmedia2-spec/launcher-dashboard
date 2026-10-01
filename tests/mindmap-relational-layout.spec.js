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
