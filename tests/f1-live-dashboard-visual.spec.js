const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const LIVE = 'https://josephsocialmedia2-spec.github.io/launcher-dashboard/ricerca-territoriale.html';

async function prepare(page) {
  await page.route('**/f1-call-block.js*', route =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
  );
  await page.route('**/auth/v1/user*', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'qa-live-user' }) })
  );
  await page.route('**/rest/v1/**', route => {
    const url = route.request().url();
    let body = [];
    if (url.includes('/rpc/f1_staff_me')) {
      body = [{ user_id: 'qa-live-user', first_name: 'QA', last_name: 'Live', role: 'TITOLARE' }];
    } else if (url.includes('/rpc/f1_territory_panel_state')) {
      body = {
        progress: {
          status: 'OPERATIVO',
          comune: 'Susa',
          zona: 'Centro',
          via: 'Via Roma',
          civic_start: '1',
          last_civic: '3',
          next_civic: '5',
          civic_sequence: ['1', '3', '5']
        },
        summary: { civics: 2, condominiums: 1, activities: 1, contacts: 4, news: 1 },
        pending_news: []
      };
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.addInitScript(() => {
    const session = {
      access_token: 'qa-live-token',
      refresh_token: 'qa-live-refresh',
      expires_at: Date.now() + 3600000,
      saved_at: Date.now()
    };
    localStorage.setItem('f1SupabaseSession', JSON.stringify(session));
    sessionStorage.setItem('f1SupabaseSession', JSON.stringify(session));
  });
}

test('published F1 dashboard keeps the repaired visual layout', async ({ browser }) => {
  const sizes = [
    { name: 'desktop-1600', width: 1600, height: 900 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'mobile-390', width: 390, height: 844 }
  ];

  fs.mkdirSync('test-results', { recursive: true });

  for (const size of sizes) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      serviceWorkers: 'block'
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(String(err.message || err)));

    await prepare(page);
    await page.goto(LIVE + '?live_visual=' + Date.now() + '-' + size.name, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await expect(page.locator('html')).not.toHaveClass(/f1-auth-pending/);
    await expect(page.locator('#actionNowTitle')).toHaveText(/VAI AL CIVICO 5/);
    await expect(page.locator('#pendingBody .alert-copy strong')).toHaveText(/Nessuna notizia pendente/i);

    const metrics = await page.evaluate(() => {
      const box = selector => document.querySelector(selector)?.getBoundingClientRect() || null;
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        now: box('.f1-now-card'),
        today: box('.f1-today-card'),
        attention: box('.f1-attention-card'),
        copy: box('#pendingBody .alert-copy'),
        pending: box('#pendingBody .alert-copy strong')
      };
    });

    expect(metrics.overflow, size.name + ' live horizontal overflow').toBeLessThanOrEqual(2);
    expect(metrics.copy?.width || 0, size.name + ' live CRM text width').toBeGreaterThan(120);
    expect(metrics.pending?.width || 0, size.name + ' live pending text width').toBeGreaterThan(120);
    expect(metrics.pending?.height || 999, size.name + ' live pending text collapse').toBeLessThan(90);
    expect(metrics.now?.height || 9999, size.name + ' live primary card stretch').toBeLessThan(size.width >= 768 ? 540 : 650);

    const shotPath = path.join('test-results', 'live-f1-' + size.name + '.png');
    await page.screenshot({ path: shotPath, fullPage: true });

    expect(pageErrors, size.name + '\n' + pageErrors.join('\n')).toEqual([]);
    await context.close();
  }
});
