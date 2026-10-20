import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import type { VehicleSearch } from '../data/searches';
import type { VehicleTile } from './SearchResultsPage';

/**
 * Carvana vehicle details page (VDP): /vehicle/<id>
 *
 * Live DOM (verified 2026-10-20):
 *   - <title>  "2019 Toyota RAV4 | Carvana"
 *   - <h1>     "2019 Toyota RAV4"
 *   - below it the trim line, e.g. "XLE Sport Utility 4D", then "79,990 miles"
 *   - CTA      data-testid="sticky-cta" ("Get Started")
 */
export class VehicleDetailsPage extends BasePage {
  /** The VDP is reached by clicking a result, so it has no fixed path. */
  protected readonly path = '/vehicle';

  readonly heading: Locator;
  readonly mileage: Locator;
  readonly getStartedButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 }).first();
    this.mileage = page.getByText(/^[\d,]+ miles$/).first();
    this.getStartedButton = page.getByTestId('sticky-cta');
  }

  /** Trim line that starts with the given trim, e.g. "XLE Sport Utility 4D". */
  trimLine(trim: string): Locator {
    return this.page.getByText(new RegExp(`^${escapeRegex(trim)}\\b`)).first();
  }

  /** Numeric vehicle id from the URL, e.g. 4810933. */
  vehicleId(): string | null {
    return this.page.url().match(/\/vehicle\/(\d+)/)?.[1] ?? null;
  }

  async assertIsVehicle(clicked: VehicleTile): Promise<void> {
    const expectedId = clicked.href?.match(/\/vehicle\/(\d+)/)?.[1];
    expect(expectedId, 'Clicked tile had a vehicle link').toBeTruthy();
    expect(this.vehicleId(), 'VDP vehicle id matches the clicked tile').toBe(expectedId);
  }

  async assertHeading(search: VehicleSearch): Promise<void> {
    const title = `${search.year} ${search.make} ${search.model}`;
    await expect(this.page).toHaveTitle(new RegExp(escapeRegex(title), 'i'));
    await expect(this.heading).toHaveText(new RegExp(`^\\s*${escapeRegex(title)}\\s*$`, 'i'));
  }

  /** Trim line starts with the trim and is not a longer trim (e.g. "XLE Premium"). */
  async assertTrim(trim: string, notTrims: string[] = []): Promise<string> {
    const line = this.trimLine(trim);
    await expect(line, `Trim line starting with "${trim}"`).toBeVisible();
    const text = (await line.innerText()).trim();
    for (const other of notTrims) {
      expect(text.startsWith(other), `Trim should be "${trim}", not "${other}"`).toBe(false);
    }
    return text;
  }

  /** VDP mileage ("79,990 miles") agrees with the tile ("80k miles"), to the nearest 1k. */
  async assertMileageMatches(clicked: VehicleTile): Promise<string> {
    await expect(this.mileage, 'Mileage on VDP').toBeVisible();
    const vdpText = (await this.mileage.innerText()).trim();
    const vdpMiles = Number(vdpText.replace(/[^\d]/g, ''));
    const tileK = Number(clicked.mileage?.match(/(\d+)\s*k/i)?.[1]);
    if (!Number.isNaN(tileK) && clicked.mileage) {
      expect(Math.abs(vdpMiles / 1000 - tileK), `VDP ${vdpText} vs tile ${clicked.mileage}`).toBeLessThanOrEqual(1);
    }
    return vdpText;
  }

  async assertGetStartedVisible(): Promise<void> {
    await expect(this.getStartedButton, '"Get Started" button').toBeVisible();
  }
}

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
