import { test as base } from '@playwright/test';
import { CarvanaInventoryPage } from '../pages/CarvanaInventoryPage';
import { SearchResultsPage } from '../pages/SearchResultsPage';
import { VehicleDetailsPage } from '../pages/VehicleDetailsPage';
import { locations } from '../data/locations';

/**
 * Custom fixtures: tests receive ready-made page objects instead of
 * constructing them, which keeps specs short and setup in one place.
 */
type PageFixtures = {
  richmondInventoryPage: CarvanaInventoryPage;
  searchResultsPage: SearchResultsPage;
  vehicleDetailsPage: VehicleDetailsPage;
};

export const test = base.extend<PageFixtures>({
  richmondInventoryPage: async ({ page }, use) => {
    await use(new CarvanaInventoryPage(page, locations.richmondVA));
  },
  searchResultsPage: async ({ page }, use) => {
    await use(new SearchResultsPage(page));
  },
  vehicleDetailsPage: async ({ page }, use) => {
    await use(new VehicleDetailsPage(page));
  },
});

export { expect } from '@playwright/test';
