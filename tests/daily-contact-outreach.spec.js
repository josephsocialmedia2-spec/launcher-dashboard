const { test, expect } = require('@playwright/test');
const fs = require('fs');

function events(n){
  return Array.from({length:n},(_,i)=>({
    event_id:'e'+(i+1),
    channel:i%3===0?'MESSAGE':'CALL',
    occurred_at:new Date(Date.UTC(2026,9,1,7,0,i)).toISOString(),
    source:'qa',
    source_event_id:'qa:'+(i+1),
    contact_ref:'lead-'+(i+1),
    display_name:'CONTATTO '+(i+1),
    metadata:{}
  }));
}
function payload(n){
  const rows=events(n);
  return {
    day:'2026-10-01',
    timezone:'Europe/Rome',
    total:n,
    calls:rows.filter(x=>x.channel==='CALL').length,
    messages:rows.filter(x=>x.channel==='MESSAGE').length,
    events:rows
  };
}
async function prepare(page,data){
  await page.addInitScript(value=>{ window.__qaDailyOutreach=value; },data);
  await page.route('**/f1-contact-outreach.js*', route=>route.fulfill({
    status:200,
    contentType:'application/javascript',
    body:"window.F1ContactOutreach={ready:()=>true,today:async()=>window.__qaDailyOutreach,record:async()=>({}),recordInteraction:async()=>({})};"
  }));
  await page.route('**/f1-tree-cloud.js*', route=>route.fulfill({
    status:200,
    contentType:'application/javascript',
    body:"window.F1TreeCloud={boot:async()=>true,touchLocal:()=>{},queueDeleteLegacyIds:()=>{},queueReset:()=>{}};"
  }));
}

test('legacy KPI, objective, chain and visual tree are absent', async () => {
  const source=fs.readFileSync('albero-fonti-notizie.html','utf8');
  for(const forbidden of [
    'id="networkKpis"','id="metrics"','id="dailyTarget"','id="dailyProgress"',
    'id="todayContacts"','id="journey"','id="chronologyGraph"','id="tree"',
    'Albero verticale delle relazioni','Obiettivo giornaliero contatti','Catena operativa',
    '<section class="confirm-panel"><h3>SOLO TU PUOI CONFERMARE QUESTO'
  ]) expect(source).not.toContain(forbidden);
  expect(source).toContain('id="dailyOutreachPanel"');
  expect(source).toContain('CONTATTI DI OGGI');
  expect(source).toContain('Telefonate e messaggi realmente effettuati oggi');
});

for(const n of [0,1,2,10,37,100,103]){
  test('daily 1-100 register renders '+n+' real contacts', async ({ page }) => {
    await prepare(page,payload(n));
    await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#dailyOutreachPanel')).toBeVisible();
    await expect(page.locator('#dailyOutreachGrid .daily-outreach-cell')).toHaveCount(100);
    await page.evaluate(value=>window.F1DailyOutreach.apply(value),payload(n));
    await expect(page.locator('#dailyOutreachTotal')).toHaveText(String(n));
    await expect(page.locator('#dailyOutreachGrid .daily-outreach-cell.on')).toHaveCount(Math.min(n,100));
    await expect(page.locator('#dailyOutreachGrid .daily-outreach-cell:not(.on)')).toHaveCount(Math.max(0,100-n));
  });
}

test('CALL and MESSAGE are distinguished and ordered chronologically', async ({ page }) => {
  const data={
    total:2,calls:1,messages:1,
    events:[
      {channel:'CALL',occurred_at:'2026-10-01T08:00:00Z',display_name:'MARIO',event_id:'1'},
      {channel:'MESSAGE',occurred_at:'2026-10-01T08:01:00Z',display_name:'ANNA',event_id:'2'}
    ]
  };
  await prepare(page,data);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(value=>window.F1DailyOutreach.apply(value),data);
  await expect(page.locator('[data-outreach-index="0"]')).toHaveClass(/call/);
  await expect(page.locator('[data-outreach-index="1"]')).toHaveClass(/message/);
  await expect(page.locator('#dailyOutreachCalls')).toHaveText('1');
  await expect(page.locator('#dailyOutreachMessages')).toHaveText('1');
});

test('daily register survives refresh when central source still returns the events', async ({ page }) => {
  const data=payload(37);
  await prepare(page,data);
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#dailyOutreachGrid .daily-outreach-cell.on')).toHaveCount(37);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#dailyOutreachGrid .daily-outreach-cell.on')).toHaveCount(37);
});

test('new day starts visually from zero without deleting prior events', async ({ page }) => {
  await prepare(page,payload(0));
  await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#dailyOutreachTotal')).toHaveText('0');
  await expect(page.locator('#dailyOutreachGrid .daily-outreach-cell.on')).toHaveCount(0);
  const migration=fs.readFileSync('supabase-migrations/20261001_contact_outreach_daily_counter.sql','utf8');
  expect(migration).toContain("at time zone 'Europe/Rome'");
  expect(migration).toContain('occurred_at>=v_start');
  expect(migration).toContain('occurred_at<v_end');
});

test('outreach persistence is idempotent and wired to real interactions', async () => {
  const migration=fs.readFileSync('supabase-migrations/20261001_contact_outreach_daily_counter.sql','utf8');
  const data=fs.readFileSync('f1-acquisition-data.js','utf8');
  const calls=fs.readFileSync('telefonate-oggi.html','utf8');
  expect(migration).toContain('unique (user_id, source_event_id)');
  expect(migration).toContain('on conflict (user_id,source_event_id) do nothing');
  expect(data).toContain("recordInteraction(confirmed,'crm-interaction')");
  expect(calls).toContain("interaction_type:'CALL'");
  expect(calls).toContain("interaction_type:'WHATSAPP'");
  expect(calls).toContain('SEGNA MESSAGGIO INVIATO');
  expect(calls).toContain("outcome:'MESSAGGIO_INVIATO'");
});

for(const size of [
  {name:'desktop',width:1600,height:900},
  {name:'tablet',width:768,height:1024},
  {name:'mobile',width:390,height:844}
]){
  test('daily contact panel is readable on '+size.name, async ({ browser }) => {
    const context=await browser.newContext({viewport:{width:size.width,height:size.height}});
    const page=await context.newPage();
    await prepare(page,payload(37));
    await page.goto('/albero-fonti-notizie.html',{waitUntil:'domcontentloaded'});
    const box=await page.locator('#dailyOutreachPanel').boundingBox();
    expect(box).toBeTruthy();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(size.width+2);
    await expect(page.locator('#dailyOutreachGrid .daily-outreach-cell')).toHaveCount(100);
    await context.close();
  });
}
