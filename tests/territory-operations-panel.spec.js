const {test,expect}=require('@playwright/test');
const OBS='00000000-0000-4000-8000-000000000111';

async function mountPanel(page,state){
  await page.setContent('<!doctype html><html><body><aside id="f1CommandPanel" class="f1-command-panel"><div class="f1-command-head"><div id="f1NextOrder"></div><div id="f1AfterOrder"></div></div><div class="f1-command-list" id="f1CommandList"></div><section class="f1-final-report" id="f1Report"></section></aside></body></html>');
  await page.evaluate(s=>{window.F1StaffData={ready:()=>true,rpc:async()=>s}},state);
  await page.addStyleTag({path:'territory-operations-panel.css'});
  await page.addScriptTag({path:'territory-operations-panel.js'});
}

test('territory panel is a visible direct row of the right command sidebar',async({page})=>{
  await mountPanel(page,{progress:null,summary:{},pending_news:[]});
  const panel=page.locator('#f1TerritoryPanel');
  await expect(panel).toBeVisible();
  expect(await panel.evaluate(el=>el.parentElement?.id)).toBe('f1CommandPanel');
  expect(await page.locator('#f1CommandPanel').evaluate(el=>[...el.children].map(x=>x.id||x.className))).toEqual(['f1-command-head','f1TerritoryPanel','f1CommandList','f1Report']);
  await expect(page.locator('#f1CommandPanel')).toHaveClass(/f1-territory-enabled/);
});

test('territory panel renders current street, counters, pending CRM action and restart civic',async({page})=>{
  await mountPanel(page,{progress:{progress_id:'p1',comune:'Avigliana',zona:'Zona A',via:'Via Roma',civic_start:'1',last_civic:'27',next_civic:'28',status:'DA_CONSUNTIVARE'},summary:{civics:27,condominiums:3,activities:7,contacts:2,news:4,pending_crm:3,callbacks:1},pending_news:[{observation_id:OBS,news_type:'PROPRIETARIO_VALUTA_VENDITA',via:'Via Roma',civico:'27',detail:'Proprietario valuta vendita'}]});
  const panel=page.locator('#f1TerritoryPanel');
  await expect(panel).toContainText('RICERCA TERRITORIALE');
  await expect(panel).toContainText('Avigliana · Zona A');
  await expect(panel).toContainText('Via Roma');
  await expect(panel).toContainText('Civici lavorati: 1–27');
  await expect(panel).toContainText('RIPARTI DAL CIVICO 28');
  await expect(panel).toContainText('DA INSERIRE NEL CRM: 3');
  await expect(panel).toContainText('Proprietario valuta vendita');
  await expect(panel.getByRole('link',{name:'INSERISCI NEL CRM →'})).toHaveAttribute('href',`crm.html?territory_observation=${OBS}#territory-news`);
  await expect(panel.getByRole('link',{name:'VAI AL CRM →'})).toHaveAttribute('href','crm.html');
});

test('territory panel shows explicit zero-data state instead of invented street data',async({page})=>{
  await mountPanel(page,{progress:null,summary:{},pending_news:[]});
  const panel=page.locator('#f1TerritoryPanel');
  await expect(panel).toContainText('NESSUN GIRO ATTIVO');
  await expect(panel.getByRole('link',{name:'SELEZIONA ZONA'})).toHaveAttribute('href','territory-control.html');
  await expect(panel).not.toContainText('Avigliana');
  await expect(panel).not.toContainText('Via Roma');
});

test('CRM territory handoff prefills the news and blocks duplicate creation after confirmed save',async({page})=>{
  await page.goto(`http://127.0.0.1:4173/tests/fixtures/territory-handoff-harness.html?territory_observation=${OBS}`);
  const dlg=page.locator('#territoryNewsDlg');
  await expect(dlg).toBeVisible();
  await expect(page.locator('#thComune')).toHaveValue('Avigliana');
  await expect(page.locator('#thZona')).toHaveValue('Zona A');
  await expect(page.locator('#thVia')).toHaveValue('Via Roma');
  await expect(page.locator('#thCivico')).toHaveValue('27');
  await expect(page.locator('#thDetail')).toHaveValue('Proprietario valuta vendita');
  await page.locator('#thSave').click();
  await expect(page.locator('#thStatus')).toContainText('INSERITA NEL CRM');
  const saved=await page.evaluate(()=>window.__savedNews);
  expect(saved.payload.title).toBe('PROPRIETARIO VALUTA VENDITA');
  expect(saved.payload.comune).toBe('Avigliana');
  expect(saved.payload.usable).toBe(false);
  const patched=await page.evaluate(()=>window.__patchedObservation);
  expect(patched.status).toBe('INSERITA_CRM');
  expect(patched.crm_record_id).toBe('00000000-0000-4000-8000-000000000333');
});
