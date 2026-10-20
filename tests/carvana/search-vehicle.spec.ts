import { test, expect } from '../../src/fixtures/pages.fixture';
import { vehicleSearches } from '../../src/data/searches';

/**
 * Scenario 2: Search for a car (data-driven).
 * Default data: "2019 Toyota Rav4", run from the Richmond, VA inventory page.
 * Add rows to src/data/searches.ts to search for more vehicles.
 */
test.describe('Carvana - vehicle search', () => {
  for (const search of vehicleSearches) {
    test(`TC-002 Search for "${search.query}" @smoke @search`, async (
      { richmondInventoryPage: inventory, searchResultsPage: results },
      testInfo,
    ) => {
      await test.step('Open the Richmond, VA inventory page', async () => {
        await inventory.open();
        await inventory.assertNotBlocked();
        await inventory.dismissCookieBannerIfPresent();
      });

      const suggestions = await test.step(`Type "${search.query}" into the search bar`, async () => {
        await inventory.searchBar.typeQuery(search.query);
        const texts = await inventory.searchBar.suggestionTexts();
        expect(texts[0], 'Top suggestion').toMatch(new RegExp(`${search.year}\\s+${search.make}`, 'i'));
        return texts;
      });

      await test.step('Submit the search', async () => {
        await inventory.searchBar.submit();
        await results.assertOnResultsUrl();
      });

      await test.step(`Applied filters are year ${search.year}, ${search.make} ${search.model}`, async () => {
        results.assertFiltersMatch(search);
      });

      await test.step('Results are rendered for the searched vehicle', async () => {
        await results.waitForResultsFor(search);
      });

      const total = await test.step('Results count is greater than zero', async () => {
        const n = await results.totalResults();
        expect(n, 'Total matching cars').toBeGreaterThan(0);
        return n;
      });

      await test.step(`Every listed car is a ${search.year} ${search.make} ${search.model}`, async () => {
        await results.assertAllTilesMatch(search);
      });

      await test.step('Attach evidence to report', async () => {
        await results.attachScreenshot(testInfo, 'search-results');
        await results.attachJson(testInfo, 'search-results', {
          query: search.query,
          resultsUrl: results.currentUrl(),
          appliedFilters: results.appliedFilters(),
          totalResults: total,
          suggestions,
          tilesOnFirstPage: (await results.vehicleTitles()).length,
          firstVehicles: await results.tileDetails(5),
        });
      });
    });
  }
});
