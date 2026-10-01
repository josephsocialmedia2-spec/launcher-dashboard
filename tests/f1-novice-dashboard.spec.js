const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const corePages = [
  'ricerca-territoriale.html',
  'albero-fonti-notizie.html',
  'crm.html',
  'telefonate-oggi.html',
  'f1-email-radar.html',
  'oggi.html',
  'documenti-vendita.html',
  'centrale-risultati.html',
  'accessi-ufficio.html',
  'setup-cloud.html',
  'mike-ferry-script-trainer/index.html',
  'mike-ferry-script-trainer/acquisition.html',
  'mike-ferry-script-trainer/simulator.html',
  'mike-ferry-script-trainer/audio.html'
];

function localTarget(fromFile, raw) {
  if (!raw || /^(https?:|mailto:|tel:|data:|javascript:|#)/i.test(raw)) return null;
  if (raw.includes('${')) return null;
  const clean = raw.split('#')[0].split('?')[0];
  if (!clean) return null;
  const base = path.dirname(fromFile);
  const target = path.normalize(path.join(base, clean));
  if (clean.endsWith('/')) return path.join(target, 'index.html');
  return target;
}

test.describe('F1 novice dashboard contract', () => {
  test('core pages do not reference missing local files', async () => {
    const missing = [];
    for (const file of corePages) {
      const html = fs.readFileSync(file, 'utf8');
      const refs = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map(m => m[1]);
      for (const ref of refs) {
        const target = localTarget(file, ref);
        if (!target) continue;
        if (!fs.existsSync(target)) missing.push(file + ' -> ' + ref);
      }
    }
    expect(missing, missing.join('\n')).toEqual([]);
  });

  test('home keeps the DOM contract required by the protected territory runtime', async () => {
    const html = fs.readFileSync('ricerca-territoriale.html', 'utf8');
    const requiredIds = [
      'toast','topClock','stepClock','todayDate','todayLabel','remainingTop','remainingMain',
      'remainingCaption','blockStartLabel','blockEndLabel','timeProgress','operationState',
      'stepNow','stepNext','territoryStatus','crumbs','factComune','factZona','factVia',
      'civicStart','civicLast','lastCivic','nextCivic','civicProgress','kpiCivics',
      'kpiCondos','kpiActivities','kpiContacts','kpiNews','actionNowTitle','actionNowSub',
      'continueSearch','nextActivityTitle','nextActivitySub','nextActivity','pendingTitle',
      'pendingBody','cloudPill','staffName','userBadge','territorio'
    ];
    for (const id of requiredIds) {
      expect(html, 'Missing runtime id #' + id).toContain('id="' + id + '"');
    }
    expect(html).toContain('f1-dashboard-novice.css');
    expect(html).not.toContain('REALMEDIAPRO');
    expect(html).not.toContain('CUSTOMER CAMPAIGN ENGINE');
  });

  test('authenticated dashboard renders a real next action without page errors', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(String(err.message || err)));

    await page.route('**/f1-call-block.js*', route =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
    );

    await page.route('**/auth/v1/user', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'qa-user' }) })
    );

    await page.route('**/rest/v1/**', route => {
      const url = route.request().url();
      let body = [];
      if (url.includes('/rpc/f1_staff_me')) {
        body = [{ user_id: 'qa-user', first_name: 'QA', last_name: 'User', role: 'TITOLARE' }];
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
          summary: { civics: 2, condominiums: 1, activities: 0, contacts: 4, news: 1 },
          pending_news: []
        };
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.addInitScript(() => {
      const session = {
        access_token: 'qa-token',
        refresh_token: 'qa-refresh',
        expires_at: Date.now() + 3600000,
        saved_at: Date.now()
      };
      localStorage.setItem('f1SupabaseSession', JSON.stringify(session));
      sessionStorage.setItem('f1SupabaseSession', JSON.stringify(session));
    });

    await page.goto('/ricerca-territoriale.html?qa=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).not.toHaveClass(/f1-auth-pending/);
    await expect(page.locator('#actionNowTitle')).toHaveText(/VAI AL CIVICO 5/);
    await expect(page.locator('#factComune')).toHaveText('Susa');
    await expect(page.locator('#factVia')).toHaveText('Via Roma');
    await expect(page.locator('#kpiContacts')).toHaveText('4');
    await expect(page.locator('#continueSearch')).toHaveAttribute('href', 'territory-mobile.html#terr');
    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  });

  test('shared navigation exposes all primary areas and uses task groups', async ({ page }) => {
    await page.goto('/documenti-vendita.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.f1-master-sidebar')).toBeVisible();
    const labels = await page.locator('.f1-master-nav-label').allTextContents();
    expect(labels).toEqual(expect.arrayContaining([
      'OGGI','TERRITORIO','CLIENTI E IMMOBILI','LAVORO','FORMAZIONE','SISTEMA'
    ]));
    await expect(page.locator('.f1-master-sidebar a[href="telefonate-oggi.html"]')).toHaveCount(1);
    await expect(page.locator('.f1-master-sidebar a[href="f1-email-radar.html"]')).toHaveCount(1);
    await expect(page.locator('.f1-master-sidebar a[href="mike-ferry-script-trainer/"]')).toHaveCount(1);
  });

  test('mobile home keeps one-column actions and a usable navigation control', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/documenti-vendita.html', { waitUntil: 'domcontentloaded' });
    const toggle = page.locator('.f1-master-menu-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('body')).toHaveClass(/f1-master-menu-open/);
    const firstLink = page.locator('.f1-master-sidebar a').first();
    await expect(firstLink).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test('main dashboard stays usable on desktop tablet and mobile', async ({ browser }, testInfo) => {
    const sizes = [
      { name: 'desktop-1600', width: 1600, height: 900 },
      { name: 'desktop-1366', width: 1366, height: 768 },
      { name: 'tablet-1024', width: 1024, height: 768 },
      { name: 'tablet-768', width: 768, height: 1024 },
      { name: 'mobile-430', width: 430, height: 932 },
      { name: 'mobile-390', width: 390, height: 844 },
      { name: 'mobile-360', width: 360, height: 800 }
    ];

    for (const size of sizes) {
      const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(String(err.stack || err.message || err)));

      await page.route('**/f1-call-block.js*', route =>
        route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
      );
      await page.route('**/auth/v1/user', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'qa-user' }) })
      );
      await page.route('**/rest/v1/**', route => {
        const url = route.request().url();
        let body = [];
        if (url.includes('/rpc/f1_staff_me')) {
          body = [{ user_id: 'qa-user', first_name: 'QA', last_name: 'Responsive', role: 'TITOLARE' }];
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
          access_token: 'qa-token',
          refresh_token: 'qa-refresh',
          expires_at: Date.now() + 3600000,
          saved_at: Date.now()
        };
        localStorage.setItem('f1SupabaseSession', JSON.stringify(session));
        sessionStorage.setItem('f1SupabaseSession', JSON.stringify(session));
      });

      await page.goto('/ricerca-territoriale.html?responsive=' + size.name, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).not.toHaveClass(/f1-auth-pending/);
      await expect(page.locator('.f1-home-heading')).toBeVisible();
      await expect(page.locator('.f1-now-card')).toBeVisible();
      await expect(page.locator('#actionNowTitle')).toHaveText(/VAI AL CIVICO 5/);
      await expect(page.locator('.f1-quick-actions')).toBeVisible();

      const layout = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector)?.getBoundingClientRect() || null;
        const pending = document.querySelector('#pendingBody .alert-copy strong');
        const pendingStyle = pending ? getComputedStyle(pending) : null;
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          headingWidth: rect('.f1-home-heading')?.width || 0,
          viewport: window.innerWidth,
          nowCard: rect('.f1-now-card'),
          todayCard: rect('.f1-today-card'),
          attentionCard: rect('.f1-attention-card'),
          attentionCopy: rect('#pendingBody .alert-copy'),
          pendingStrong: rect('#pendingBody .alert-copy strong'),
          pendingLineHeight: pendingStyle ? parseFloat(pendingStyle.lineHeight) || 0 : 0,
          pendingText: pending?.textContent?.trim() || ''
        };
      });
      expect(layout.overflow, size.name + ' horizontal overflow').toBeLessThanOrEqual(2);
      expect(layout.headingWidth, size.name + ' heading width').toBeLessThanOrEqual(layout.viewport + 1);
      expect(layout.pendingText).toMatch(/Nessuna notizia pendente/i);
      expect(layout.attentionCopy?.width || 0, size.name + ' CRM text column width').toBeGreaterThan(120);
      expect(layout.pendingStrong?.width || 0, size.name + ' pending text width').toBeGreaterThan(120);
      expect(layout.pendingStrong?.height || 999, size.name + ' pending text vertical collapse').toBeLessThan(90);
      if (size.width >= 768) {
        expect(layout.nowCard?.height || 9999, size.name + ' oversized primary card').toBeLessThan(540);
      } else {
        expect(layout.nowCard?.height || 9999, size.name + ' oversized mobile primary card').toBeLessThan(650);
      }
      for (const card of [layout.nowCard, layout.todayCard, layout.attentionCard]) {
        if (!card) continue;
        expect(card.width, size.name + ' card width').toBeGreaterThan(180);
        expect(card.height, size.name + ' card height').toBeGreaterThan(80);
      }

      if (size.width <= 900) {
        await expect(page.locator('.f1-master-menu-toggle')).toBeVisible();
      }

      const shot = await page.screenshot({ fullPage: true });
      await testInfo.attach('f1-' + size.name, { body: shot, contentType: 'image/png' });
      expect(pageErrors, size.name + '\n' + pageErrors.join('\n')).toEqual([]);
      await context.close();
    }
  });

});
