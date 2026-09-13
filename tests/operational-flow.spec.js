const { test, expect } = require('@playwright/test');

test.describe('F1 guided operational flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => localStorage.removeItem('f1OperationalFlowV1'));
    await page.reload();
  });

  test('creates an opportunity, guides all stages and persists resume context', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'DASHBOARD OPERATIVA' })).toBeVisible();
    await expect(page.locator('.process-path')).toContainText('NUOVA OPPORTUNITÀ');
    await expect(page.locator('.process-path')).toContainText('FOLLOW-UP');

    await page.locator('#flowResume .flow-main-btn').click();
    await expect(page).toHaveURL(/nuova-opportunita\.html/);

    await page.selectOption('#opType', 'VENDITA');
    await page.fill('#opComune', 'Villar Dora');
    await page.fill('#opVia', 'Via Roma');
    await page.fill('#opCivico', '9');
    await page.fill('#opSource', 'https://example.com/annuncio-test');
    await page.fill('#opNote', 'Test percorso F1');
    await page.getByRole('button', { name: 'AVVIA PROCESSO' }).click();

    await expect(page.locator('#workspace')).toBeVisible();
    await expect(page.locator('#activeContext')).toContainText('Villar Dora');
    await expect(page.locator('#activeContext')).toContainText('Via Roma 9');
    await expect(page.locator('#stageTitle')).toHaveText('RICERCA');
    await expect(page.locator('#flowFrame')).toHaveAttribute('src', /seller-radar-unico\.html\?view=vendita/);

    const expected = [
      ['RISULTATI', /centrale-risultati\.html/],
      ['VERIFICA', /address-intelligence\.html/],
      ['CRM', /crm\.html/],
      ['CONTATTO', /telefonate-oggi\.html/],
      ['SCRIPT', /script-operativo\.html/],
      ['ESITO', /crm\.html\?flowMode=outcome/],
      ['FOLLOW-UP', /oggi\.html\?flowOpportunity=.*#tasks/]
    ];

    for (const [stage, src] of expected) {
      await page.getByRole('button', { name: 'SEGNA FATTO E AVANTI' }).click();
      await expect(page.locator('#stageTitle')).toHaveText(stage);
      await expect(page.locator('#flowFrame')).toHaveAttribute('src', src);
    }

    await page.locator('.flow-step', { hasText: 'SCRIPT' }).click();
    await expect(page.locator('#stageTitle')).toHaveText('SCRIPT');
    const scriptFrame = page.frameLocator('#flowFrame');
    await expect(scriptFrame.locator('#scriptContext')).toContainText('Villar Dora', { timeout: 15000 });
    await expect(scriptFrame.locator('#suggestedScript')).toHaveText('PROSPECTING / ACQUISIZIONE');

    await page.goto('/index.html');
    await expect(page.locator('#flowResume')).toContainText('RIPRENDI');
    await expect(page.locator('#flowResume')).toContainText('Villar Dora');
    await expect(page.locator('#flowResume')).toContainText('Via Roma 9');
  });

  test('routes expired opportunities to the expired Seller Radar view', async ({ page }) => {
    await page.goto('/nuova-opportunita.html');
    await page.selectOption('#opType', 'SCADUTO');
    await page.fill('#opComune', 'Condove');
    await page.getByRole('button', { name: 'AVVIA PROCESSO' }).click();
    await expect(page.locator('#stageTitle')).toHaveText('RICERCA');
    await expect(page.locator('#flowFrame')).toHaveAttribute('src', /seller-radar-unico\.html\?view=scaduti/);
  });
});
