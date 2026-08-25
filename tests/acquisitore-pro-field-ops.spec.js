const { test, expect } = require('@playwright/test');

test('operatore zona: flusso mobile salva uscita, immobile e contatto nel CRM', async ({ page }) => {
  await page.goto('/acquisitore-pro/app-v25.html');
  await expect(page.locator('#fieldOpsOpen')).toBeVisible();
  await page.locator('#fieldOpsOpen').click();
  await expect(page.locator('#fieldOps')).toHaveClass(/on/);
  await expect(page.locator('.foTile')).toHaveCount(12);

  await page.getByRole('button', { name: 'ESCI IN ZONA' }).click();
  await page.locator('#fsComune').fill('Napoli');
  await page.locator('#fsMicro').fill('Vomero');
  await page.locator('#fsVia').fill('Via Scarlatti');
  await page.locator('#fsSave').click();

  await page.getByRole('button', { name: 'NUOVO IMMOBILE' }).click();
  await page.locator('#fpCivico').fill('12');
  await page.locator('#fpPriority').selectOption('Alta');
  await expect(page.locator('#fpPricing')).toHaveAttribute('href', 'https://www.agentpricing.com/j.malafronte');
  await page.locator('#fpSave').click();

  await page.getByRole('button', { name: 'CONTATTI OGGI' }).click();
  await page.locator('#fcNew').click();
  await page.locator('#fn').fill('Contatto test');
  await page.locator('#fphone').fill('3331112222');
  await page.locator('#faddress').fill('Napoli, Via Scarlatti 12');
  await page.locator('#fstatus').selectOption('RICHIAMA');
  await page.locator('#fSave').click();
  await expect(page.getByText('Contatto test')).toBeVisible();

  const stored = await page.evaluate(() => ({
    field: JSON.parse(localStorage.getItem('acqProFieldOpsV26')),
    core: JSON.parse(localStorage.getItem('acqProV25'))
  }));
  expect(stored.field.sessions).toHaveLength(1);
  expect(stored.field.properties).toHaveLength(1);
  expect(stored.field.properties[0]).toMatchObject({ comune: 'Napoli', civico: '12', priorita: 'Alta' });
  expect(stored.core.contacts.some((contact) => contact.name === 'Contatto test' && contact.status === 'RICHIAMA')).toBeTruthy();
});

test('operatore zona: fotocamera, assistente e timer espongono i flussi reali', async ({ page }) => {
  await page.goto('/acquisitore-pro/app-v25.html');
  await page.locator('#fieldOpsOpen').click();

  await page.getByRole('button', { name: 'FOTOCAMERA' }).click();
  await expect(page.locator('#fcFile')).toHaveAttribute('capture', 'environment');
  await expect(page.getByText(/GPS e indirizzo/)).toBeVisible();
  await page.locator('#foBack').click();

  await page.getByRole('button', { name: 'ASSISTENTE' }).click();
  await expect(page.getByText(/audio non viene salvato/i)).toBeVisible();
  await page.locator('#faText').fill('non mi interessa');
  await page.locator('#faDone').click();
  await expect(page.locator('#faGuide')).toContainText('Capisco');
  await page.locator('#foBack').click();

  await page.getByRole('button', { name: 'TIMER 4 ORE' }).click();
  await expect(page.getByText(/serve una configurazione Push lato server/i)).toBeVisible();
  await page.locator('#ftStart').click();
  const timer = await page.evaluate(() => JSON.parse(localStorage.getItem('acqProFieldOpsV26')).timer);
  expect(Date.parse(timer.dueAt) - Date.parse(timer.startedAt)).toBe(4 * 60 * 60 * 1000);
});
