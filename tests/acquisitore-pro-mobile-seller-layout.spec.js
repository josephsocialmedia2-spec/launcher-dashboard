const { test, expect } = require('@playwright/test');

const LIVE='https://josephsocialmedia2-spec.github.io/launcher-dashboard/acquisitore-pro-mobile/index.html';

async function openLive(page){
  await page.goto(LIVE+'?qa=seller-v8-'+Date.now(),{waitUntil:'domcontentloaded'});
  await expect(page.locator('#sellerBtn')).toBeVisible();
}

test('seller mobile: lista documenti leggibile senza sovrapposizioni',async({page})=>{
  test.setTimeout(120000);
  await page.setViewportSize({width:360,height:800});
  await openLive(page);
  await page.locator('#sellerBtn').click();
  await expect(page.locator('#dialogTitle')).toContainText('DOCUMENTI / PREQUALIFICA / STRATEGIA');
  const labels=page.locator('#dialogBody details').first().locator('label.row');
  await expect(labels).toHaveCount(12);
  const metrics=await labels.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();const cs=getComputedStyle(n);return{x:r.x,y:r.y,w:r.width,h:r.height,display:cs.display,fontSize:cs.fontSize,lineHeight:cs.lineHeight}}));
  for(const m of metrics){expect(m.display).toBe('grid');expect(m.w).toBeGreaterThan(250);expect(m.h).toBeGreaterThan(44);expect(m.x).toBeGreaterThanOrEqual(0);expect(m.x+m.w).toBeLessThanOrEqual(360)}
  for(let i=1;i<metrics.length;i++){expect(metrics[i].y).toBeGreaterThanOrEqual(metrics[i-1].y+metrics[i-1].h-1)}
  const overflow=await page.evaluate(()=>({w:innerWidth,sw:document.documentElement.scrollWidth,dbw:document.querySelector('#dialogBody').scrollWidth,dbcw:document.querySelector('#dialogBody').clientWidth}));
  expect(overflow.sw).toBeLessThanOrEqual(overflow.w+1);
  expect(overflow.dbw).toBeLessThanOrEqual(overflow.dbcw+1);
});

test('seller mobile: font Android grande resta leggibile',async({page})=>{
  test.setTimeout(120000);
  await page.setViewportSize({width:360,height:800});
  await page.addStyleTag({content:'html{font-size:125%!important}'});
  await openLive(page);
  await page.addStyleTag({content:'html{font-size:125%!important}'});
  await page.locator('#sellerBtn').click();
  const labels=page.locator('#dialogBody details').first().locator('label.row');
  const boxes=await labels.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}}));
  for(let i=1;i<boxes.length;i++){expect(boxes[i].y).toBeGreaterThanOrEqual(boxes[i-1].y+boxes[i-1].h-1)}
  const db=await page.locator('#dialogBody').evaluate(n=>({sw:n.scrollWidth,cw:n.clientWidth}));
  expect(db.sw).toBeLessThanOrEqual(db.cw+1);
});
