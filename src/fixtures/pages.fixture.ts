import { test as base } from '@playwright/test';
import { CarvanaInventoryPage } from '../pages/CarvanaInventoryPage';
import { locations } from '../data/locations';

/**
 * Custom fixtures: tests receive ready-made page objects instead of
 * constructing them, which keeps specs short and setup in one place.
 */
type PageFixtures = {
  richmondInventoryPage: CarvanaInventoryPage;
};

export const test = base.extend<PageFixtures>({
  richmondInventoryPage: async ({ page }, use) => {
    await use(new CarvanaInventoryPage(page, locations.richmondVA));
  },
});

export { expect } from '@playwright/test';
