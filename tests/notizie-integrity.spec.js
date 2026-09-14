const {test,expect}=require('@playwright/test');
const fs=require('fs');

const HARNESS='/tests/fixtures/notizie-integrity-harness.html';

async function fillNews(page,{level='N3',title='Notizia N3 test',comune='Villar Dora',via='Via Roma 1',zona='Centro',source='TEST',detail='Informazione immobiliare concreta di test',justification='Dato concreto coerente con il livello'}={}){
  await page.selectOption('[name="level"]',level);
  await page.fill('[name="title"]',title);
  await page.fill('[name="comune"]',comune);
  await page.fill('[name="via"]',via);
  await page.fill('[name="zona"]',zona);
  await page.fill('[name="source"]',source);
  await page.fill('[name="detail"]',detail);
  await page.fill('[name="justification"]',justification);
}

async function freshHarness(page){
  await page.goto(HARNESS);
  await page.evaluate(()=>window.__resetHarness());
  await page.reload();
}

test('TEST 1 — N3 salva, conferma, resetta, rilegge lista e KPI',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await freshHarness(page);
  await fillNews(page);
  await page.click('#save');
  await expect(page.locator('#newsMsg')).toContainText('NOTIZIA REGISTRATA · N3');
  await expect(page.locator('#kNews')).toHaveText('1');
  await expect(page.locator('#newsList')).toContainText('N3 · Notizia N3 test · Villar Dora');
  await expect(page.locator('[name="title"]')).toHaveValue('');
  expect(errors).toEqual([]);
});

test('TEST 2 — form assente: safeReset non va in crash',async({page})=>{
  await freshHarness(page);
  const warnings=[];page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text())});
  const result=await page.evaluate(()=>F1NotizieIntegrity.safeResetForm('form-inesistente'));
  expect(result).toBe(false);
  expect(warnings.join(' ')).toContain('Form non trovato o non valido');
});

test('TEST 3 — salvataggio fallito mantiene dati, lista e KPI',async({page})=>{
  await freshHarness(page);
  await fillNews(page,{title:'N3 da non perdere'});
  await page.evaluate(()=>window.__FAIL_SAVE=true);
  await page.click('#save');
  await expect(page.locator('#newsMsg')).toContainText('SALVATAGGIO NON COMPLETATO — I DATI SONO STATI MANTENUTI');
  await expect(page.locator('[name="title"]')).toHaveValue('N3 da non perdere');
  await expect(page.locator('#kNews')).toHaveText('0');
  await expect(page.locator('#newsList')).toHaveText('');
  await expect(page.locator('#save')).toBeEnabled();
});

test('TEST 4 — doppio submit produce una sola notizia',async({page})=>{
  await freshHarness(page);
  await fillNews(page,{title:'N3 doppio click'});
  await page.evaluate(()=>{
    const form=document.getElementById('newsForm');
    form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  });
  await expect(page.locator('#newsMsg')).toContainText('NOTIZIA REGISTRATA · N3');
  await expect(page.locator('#kNews')).toHaveText('1');
  const rows=await page.evaluate(()=>JSON.parse(localStorage.getItem('f1-notizie-integrity-harness')||'[]'));
  expect(rows).toHaveLength(1);
});

test('TEST 5 — rerender dopo conferma non usa riferimenti DOM nulli',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await freshHarness(page);
  await fillNews(page,{title:'N3 rerender'});
  await page.evaluate(()=>window.__RERENDER_ON_REFRESH=true);
  await page.click('#save');
  await expect(page.locator('#newsFormRemoved')).toBeVisible();
  await expect(page.locator('#kNews')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('TEST 6 — N1 N2 N3 N4 restano persistenti dopo refresh pagina',async({page})=>{
  await freshHarness(page);
  for(const level of ['N1','N2','N3','N4']){
    await fillNews(page,{level,title:`Notizia ${level}`});
    await page.click('#save');
    await expect(page.locator('#newsMsg')).toContainText(`NOTIZIA REGISTRATA · ${level}`);
  }
  await expect(page.locator('#kNews')).toHaveText('4');
  await page.reload();
  await expect(page.locator('#kNews')).toHaveText('4');
  for(const level of ['N1','N2','N3','N4'])await expect(page.locator('#newsList')).toContainText(`Notizia ${level}`);
});

test('contratto produzione — niente reset via event.currentTarget dopo await e salvataggio richiede conferma',async()=>{
  const pageSource=fs.readFileSync('funzionario-notiziere.html','utf8');
  const dataSource=fs.readFileSync('f1-staff-data.js','utf8');
  expect(pageSource).toContain('f1-notizie-integrity.js?v=20260914-news1');
  expect(pageSource).not.toContain('e.currentTarget.reset()');
  expect(pageSource).toContain('F1NotizieIntegrity.bindNewsForm');
  expect(pageSource).toContain('id="newsList"');
  expect(dataSource).toContain('SALVATAGGIO NOTIZIA NON CONFERMATO');
  expect(dataSource).not.toContain('return r?.[0]||row');
});
