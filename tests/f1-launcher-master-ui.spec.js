const { test, expect } = require('@playwright/test');
const fs = require('fs');

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

  test('hash #territorio resta nel contratto statico della pagina', async () => {
    // In CI il guard di autenticazione può reindirizzare a setup-cloud prima
    // dell'asserzione browser. Verifichiamo quindi il contratto HTML senza
    // disabilitare o aggirare l'autenticazione reale.
    const html = fs.readFileSync('ricerca-territoriale.html', 'utf8');
    expect(html).toContain('id="territorio"');
    expect(html).toContain('ricerca-territoriale.html#territorio');
  });

  test('desktop non genera overflow orizzontale strutturale sul master', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/albero-fonti-notizie.html', { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test('mobile espone il controllo navigazione sulle pagine senza sidebar nativa', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/documenti-vendita.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.f1-master-menu-toggle')).toBeVisible();
  });
  
  test('campaign buttons are present and point to distinct real destinations', async ({ page }) => {
    await page.goto('/documenti-vendita.html', { waitUntil: 'domcontentloaded' });
    const links = await page.locator('.f1-campaign-link').evaluateAll(nodes =>
      nodes.map(n => ({ text: n.textContent.trim(), href: n.getAttribute('href') }))
    );
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        text: expect.stringContaining('CAMPAGNE REALMEDIAPRO'),
        href: '/launcher-dashboard/customer-campaign-engine/'
      }),
      expect.objectContaining({
        text: expect.stringContaining('CAMPAGNE F1 IMMOBILIARE'),
        href: 'https://josephsocialmedia2-spec.github.io/open-social-scheduler/f1-content-hub/'
      })
    ]));
    expect(new Set(links.map(x => x.href)).size).toBeGreaterThanOrEqual(2);
  });

  test('mobile drawer exposes campaigns and remains scrollable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/documenti-vendita.html', { waitUntil: 'domcontentloaded' });
    const toggle = page.locator('.f1-master-menu-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('.f1-master-sidebar')).toBeVisible();
    await expect(page.locator('.f1-master-sidebar .f1-campaign-link')).toHaveCount(2);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });

});
