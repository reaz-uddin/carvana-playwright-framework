import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import type { InventoryLocation } from '../data/locations';

/**
 * Carvana location inventory page, e.g. https://www.carvana.com/cars/in-richmond-va
 *
 * Locators prefer user-facing roles and stable data attributes, with
 * fallbacks, because the site is a frequently deployed React app.
 */
export class CarvanaInventoryPage extends BasePage {
  protected readonly path: string;

  readonly mainHeading: Locator;
  readonly vehicleTiles: Locator;
  readonly cookieAcceptButton: Locator;

  constructor(page: Page, private readonly location: InventoryLocation) {
    super(page);
    this.path = `/cars/${location.slug}`;

    this.mainHeading = page.getByRole('heading', { level: 1 }).first();
    this.vehicleTiles = page.locator(
      '[data-qa="result-tile"], [data-testid*="result-tile"], a[href*="/vehicle/"]',
    );
    this.cookieAcceptButton = page.getByRole('button', { name: /accept( all)?( cookies)?/i });
  }

  /** Dismiss a cookie / consent banner if one is shown. Never fails the test. */
  async dismissCookieBannerIfPresent(): Promise<void> {
    if (await this.cookieAcceptButton.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      this.log.info('Cookie banner found, dismissing');
      await this.cookieAcceptButton.first().click().catch(() => undefined);
    }
  }

  async assertOnLocationUrl(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/cars/${this.location.slug}`, 'i'));
  }

  async assertBrandedTitle(): Promise<void> {
    await expect(this.page).toHaveTitle(/carvana/i);
  }

  async assertHeadingVisible(): Promise<void> {
    await expect(this.mainHeading, 'Main page heading (h1)').toBeVisible();
  }

  /** The page should mention the city it was opened for (heading, title or body). */
  async assertMentionsCity(): Promise<void> {
    const cityPattern = new RegExp(this.location.city, 'i');
    const title = await this.page.title();
    const heading = (await this.mainHeading.textContent().catch(() => '')) ?? '';
    const mentioned =
      cityPattern.test(title) ||
      cityPattern.test(heading) ||
      (await this.page.getByText(cityPattern).first().isVisible().catch(() => false));
    expect(mentioned, `Page should reference "${this.location.city}"`).toBe(true);
  }

  async headingText(): Promise<string> {
    return ((await this.mainHeading.textContent().catch(() => '')) ?? '').trim();
  }

  /** Number of vehicle result tiles rendered once results settle. */
  async vehicleCount(): Promise<number> {
    await this.vehicleTiles.first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);
    return this.vehicleTiles.count();
  }
}
