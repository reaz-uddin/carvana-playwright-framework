import { test, expect } from '../../src/fixtures/pages.fixture';
import { vehicleSelections } from '../../src/data/searches';

/**
 * Scenario 3: Search for a car, then open a specific trim from the results.
 * Default data: search "2019 Toyota Rav4", then click a "2019 Toyota RAV4 XLE".
 * Add rows to `vehicleSelections` in src/data/searches.ts for more combinations.
 */
test.describe('Carvana - open vehicle details from search', () => {
  for (const { search, trim, notTrims = [] } of vehicleSelections) {
    const target = `${search.year} ${search.make} ${search.model} ${trim}`;

    test(`TC-003 Search "${search.query}" and open a ${target} @smoke @search @vdp`, async (
      { richmondInventoryPage: inventory, searchResultsPage: results, vehicleDetailsPage: vdp },
      testInfo,
    ) => {
      await test.step('Open the Richmond, VA inventory page', async () => {
        await inventory.open();
        await inventory.assertNotBlocked();
        await inventory.dismissCookieBannerIfPresent();
      });

      await test.step(`Search for "${search.query}"`, async () => {
        await inventory.searchBar.search(search.query);
        await results.assertOnResultsUrl();
        results.assertFiltersMatch(search);
        await results.waitForResultsFor(search);
      });

      const clicked = await test.step(`Click the first ${target} in the results`, async () => {
        const tile = await results.openVehicle(search, trim);
        expect(tile.trim, 'Clicked tile trim').toBe(trim);
        return tile;
      });

      await test.step('Vehicle details page is for the clicked car', async () => {
        await vdp.assertNotBlocked();
        await vdp.assertIsVehicle(clicked);
      });

      await test.step(`Heading and title are "${search.year} ${search.make} ${search.model}"`, async () => {
        await vdp.assertHeading(search);
      });

      const trimLine = await test.step(`Trim is ${trim}`, async () => {
        return vdp.assertTrim(trim, notTrims);
      });

      const vdpMileage = await test.step('Mileage matches the result tile', async () => {
        return vdp.assertMileageMatches(clicked);
      });

      await test.step('"Get Started" purchase button is visible', async () => {
        await vdp.assertGetStartedVisible();
      });

      await test.step('Attach evidence to report', async () => {
        await vdp.attachScreenshot(testInfo, 'vehicle-details');
        await vdp.attachJson(testInfo, 'vehicle-details', {
          query: search.query,
          requestedTrim: trim,
          clickedTile: clicked,
          vehicleDetailsPage: {
            url: vdp.currentUrl(),
            vehicleId: vdp.vehicleId(),
            heading: (await vdp.heading.innerText()).trim(),
            trimLine,
            mileage: vdpMileage,
          },
        });
      });
    });
  }
});
