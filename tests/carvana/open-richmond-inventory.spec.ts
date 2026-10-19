import { test, expect } from '../../src/fixtures/pages.fixture';

/**
 * Scenario 1: Open the Carvana used-car inventory page for Richmond, VA.
 * URL: https://www.carvana.com/cars/in-richmond-va
 */
test.describe('Carvana - Richmond, VA inventory', () => {
  test('TC-001 Open the Richmond, VA inventory page @smoke', async ({ richmondInventoryPage: page }, testInfo) => {
    const snapshot = await test.step('Open https://www.carvana.com/cars/in-richmond-va', async () => {
      return page.open();
    });

    await test.step('Page is not a bot-protection / access-denied page', async () => {
      await page.assertNotBlocked();
    });

    await test.step('Main document returned a successful HTTP status', async () => {
      await page.assertHttpOk();
    });

    await test.step('Dismiss cookie banner if present', async () => {
      await page.dismissCookieBannerIfPresent();
    });

    await test.step('URL is the Richmond, VA inventory page', async () => {
      await page.assertOnLocationUrl();
    });

    await test.step('Page title is Carvana-branded', async () => {
      await page.assertBrandedTitle();
    });

    await test.step('Main heading is visible', async () => {
      await page.assertHeadingVisible();
    });

    await test.step('Page references Richmond', async () => {
      await page.assertMentionsCity();
    });

    const vehicleCount = await test.step('Vehicle listings are rendered (soft check)', async () => {
      const count = await page.vehicleCount();
      expect.soft(count, 'Number of vehicle tiles').toBeGreaterThan(0);
      return count;
    });

    await test.step('Attach evidence to report', async () => {
      await page.attachScreenshot(testInfo, 'richmond-inventory');
      await page.attachJson(testInfo, 'page-details', {
        ...snapshot,
        heading: await page.headingText(),
        vehicleTilesFound: vehicleCount,
      });
    });
  });
});
