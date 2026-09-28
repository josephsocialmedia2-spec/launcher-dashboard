const { test, expect } = require('@playwright/test');

const corePages = [
  'albero-fonti-notizie.html',
  'ricerca-territoriale.html#territorio',
  'crm.html',
  'oggi.html#tasks',
  'documenti-vendita.html',
  'centrale-risultati.html',
  'accessi-ufficio.html',
  'setup-cloud.html?return=ricerca-territoriale.html'
];

test.describe('F1 Launcher master UI', () => {
  for (const target of corePages) {
    test(`${target} usa il design system condiviso`, async ({ page }) => {
      await page.goto('/' + target, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toHaveClass(/f1-master-ui/);
      const cssLoaded = await page.locator('link[href*="f1-launcher-master.css"]').count();
      expect(cssLoaded).toBe(1);

      const tokens = await page.evaluate(() => {
        const s = getComputedStyle(document.documentElement);
        return {
          bg: s.getPropertyValue('--f1m-bg').trim(),
          blue: s.getPropertyValue('--f1m-blue').trim(),
          cyan: s.getPropertyValue('--f1m-cyan').trim()
        };
      });
      expect(tokens.bg).toBe('#001020');
      expect(tokens.blue).toBe('#168fff');
      expect(tokens.cyan).toBe('#20c7ff');

      const hasNavigation = await page.locator('.f1-master-sidebar, aside.sidebar').count();
      expect(hasNavigation).toBeGreaterThan(0);
    });
  }

  test('hash #territorio resta operativo', async ({ page }) => {
    await page.goto('/ricerca-territoriale.html#territorio', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#territorio')).toHaveCount(1);
    expect(await page.evaluate(() => location.hash)).toBe('#territorio');
  });

  test('desktop non genera overflow orizzontale strutturale', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/ricerca-territoriale.html#territorio', { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test('mobile espone il controllo navigazione', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/ricerca-territoriale.html#territorio', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.f1-master-menu-toggle')).toBeVisible();
  });
});
