const { test, expect } = require('@playwright/test');
const LIVE='https://josephsocialmedia2-spec.github.io/launcher-dashboard/acquisitore-pro-mobile/index.html';
const TARGET='https://josephsocialmedia2-spec.github.io/open-social-scheduler/monday-control.html?view=last-3-days';

test('PIANO PUBBLICAZIONE apre direttamente Monday Control', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto(LIVE,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#publicationBtn')).toBeVisible();
  await Promise.all([
    page.waitForURL(TARGET,{waitUntil:'domcontentloaded'}),
    page.locator('#publicationBtn').click()
  ]);
  expect(page.url()).toBe(TARGET);
});
