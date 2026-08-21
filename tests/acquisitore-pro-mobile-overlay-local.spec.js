const { test, expect } = require('@playwright/test');

const CASES=[
  ['persona','PERSONA'],
  ['cartello','CARTELLO VENDESI'],
  ['condominio','CONDOMINIO / CASA'],
  ['attivita','NEGOZIO / BAR'],
  ['professionista','PROFESSIONISTA'],
  ['telefono','TELEFONATA']
];

async function openApp(page){
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto('/acquisitore-pro-mobile/index.html?overlayqa='+Date.now(),{waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-situation="persona"]')).toBeVisible();
  return errors;
}

test('mobile situations: ogni tasto apre overlay full-screen e copre la home',async({page})=>{
  const errors=await openApp(page);
  for(const [key,title] of CASES){
    await page.locator(`[data-situation="${key}"]`).click();
    const overlay=page.locator('#situationOverlay');
    await expect(overlay).toHaveClass(/open/);
    await expect(overlay).toHaveAttribute('aria-hidden','false');
    await expect(page.locator('#situationTitle')).toHaveText(title);
    const box=await overlay.boundingBox();
    const vp=page.viewportSize();
    expect(box.x).toBeLessThanOrEqual(1);
    expect(box.y).toBeLessThanOrEqual(1);
    expect(box.width).toBeGreaterThanOrEqual(vp.width-2);
    expect(box.height).toBeGreaterThanOrEqual(vp.height-2);
    const start=(await page.locator('#situationGuide').innerText()).trim();
    expect(start.length).toBeGreaterThan(15);
    await page.locator('[data-overlay-answer="si"]').click();
    const after=(await page.locator('#situationGuide').innerText()).trim();
    expect(after.length).toBeGreaterThan(8);
    expect(after).not.toBe(start);
    await page.locator('#situationBack').click();
    await expect(overlay).not.toHaveClass(/open/);
  }
  expect(errors).toEqual([]);
});

test('mobile situations: REGISTRA CONTATTO chiude overlay e apre editor',async({page})=>{
  const errors=await openApp(page);
  await page.locator('[data-situation="cartello"]').click();
  await expect(page.locator('#situationOverlay')).toHaveClass(/open/);
  await page.locator('#situationRegister').click();
  await expect(page.locator('#situationOverlay')).not.toHaveClass(/open/);
  await expect(page.locator('#genericDialog')).toHaveAttribute('open','');
  await expect(page.locator('#dialogTitle')).toHaveText('NUOVO CONTATTO');
  expect(errors).toEqual([]);
});
