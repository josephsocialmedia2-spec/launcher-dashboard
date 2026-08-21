const { test, expect } = require('@playwright/test');
const LIVE='https://josephsocialmedia2-spec.github.io/launcher-dashboard/acquisitore-pro-mobile/index.html';
const TARGET='https://josephsocialmedia2-spec.github.io/open-social-scheduler/monday-control.html';

test('PIANO PUBBLICAZIONE apre Monday Control e non il dialogo interno', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto(LIVE,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#publicationBtn')).toBeVisible();
  const popupPromise=page.waitForEvent('popup');
  await page.locator('#publicationBtn').click();
  const popup=await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  expect(popup.url()).toBe(TARGET);
  await expect(page.locator('#genericDialog')).not.toHaveAttribute('open','');
});
