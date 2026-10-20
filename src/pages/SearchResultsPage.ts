import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import type { VehicleSearch } from '../data/searches';

/** Filters Carvana encodes in the `cvnaid` URL parameter (base64 JSON). */
export interface AppliedFilters {
  year?: { min?: number; max?: number };
  makes?: { name: string; parentModels?: { name: string }[] }[];
  [key: string]: unknown;
}

/** One vehicle tile, parsed from its visible text. */
export interface VehicleTile {
  title: string;
  trim?: string;
  mileage?: string;
  price?: string;
  href?: string;
}

/**
 * Carvana search results page: /cars/filters?cvnaid=...
 * Locators use the site's data-testid attributes (verified on the live site).
 */
export class SearchResultsPage extends BasePage {
  protected readonly path = '/cars/filters';

  readonly resultsCount: Locator;
  readonly tiles: Locator;
  readonly tileLinks: Locator;

  constructor(page: Page) {
    super(page);
    this.resultsCount = page.getByTestId('results-count');
    this.tiles = page.getByTestId('result-tile');
    this.tileLinks = page.getByTestId('tile-link');
  }

  async assertOnResultsUrl(): Promise<void> {
    await expect(this.page).toHaveURL(/\/cars\/filters\/?\?cvnaid=/);
  }

  /** Decode the `cvnaid` URL parameter into the filters Carvana applied. */
  appliedFilters(): AppliedFilters {
    const raw = new URL(this.page.url()).searchParams.get('cvnaid');
    if (!raw) return {};
    const json = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    return (json.filters ?? json) as AppliedFilters;
  }

  /** Total number of matching cars, from the "103 cars" label. */
  async totalResults(): Promise<number> {
    await expect(this.resultsCount, 'Results count label').toBeVisible();
    const text = (await this.resultsCount.innerText()).replace(/,/g, '');
    const match = text.match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  /** Wait until the first tile shows the searched vehicle (results re-render client-side). */
  async waitForResultsFor(search: VehicleSearch): Promise<void> {
    await expect(this.tileLinks.first(), 'First result shows the searched vehicle').toHaveAttribute(
      'aria-label',
      titlePattern(search),
    );
  }

  /** Titles of the rendered tiles, e.g. "2019 Toyota RAV4". */
  async vehicleTitles(): Promise<string[]> {
    const labels = await this.tileLinks.evaluateAll((links) =>
      links.map((a) => a.getAttribute('aria-label') ?? ''),
    );
    return labels.map((l) => l.replace(/^View\s+/i, '').trim()).filter(Boolean);
  }

  /**
   * Read one tile through its data-testid fields (verified on the live site):
   *   make-model   -> "2019 Toyota RAV4"
   *   trim-mileage -> <p>XLE</p> ... <span>80k miles</span>
   *   price        -> "Current price:$23,590"
   *   tile-link    -> href "/vehicle/4810933?refSource=srp"
   */
  async readTile(tile: Locator): Promise<VehicleTile> {
    const text = async (l: Locator) => ((await l.first().textContent().catch(() => null)) ?? '').trim();
    const priceText = await text(tile.getByTestId('price'));
    return {
      title: await text(tile.getByTestId('make-model')),
      trim: (await text(tile.getByTestId('trim-mileage').locator('p'))) || undefined,
      mileage: (await text(tile.getByTestId('trim-mileage').locator('span'))) || undefined,
      price: priceText.match(/\$[\d,]+/)?.[0],
      href: (await tile.getByTestId('tile-link').getAttribute('href').catch(() => null)) ?? undefined,
    };
  }

  /** Parsed details of the first `limit` tiles, for the JSON report. */
  async tileDetails(limit = 5): Promise<VehicleTile[]> {
    const count = Math.min(await this.tiles.count(), limit);
    const out: VehicleTile[] = [];
    for (let i = 0; i < count; i++) out.push(await this.readTile(this.tiles.nth(i)));
    return out;
  }

  /**
   * First tile whose title is exactly "<year> <make> <model>" (so "RAV4 Hybrid" is excluded)
   * and whose trim is exactly `trim` (so "XLE Premium" is excluded when asking for "XLE").
   */
  tileFor(search: VehicleSearch, trim: string): Locator {
    const title = `${search.year} ${search.make} ${search.model}`;
    return this.tiles
      .filter({ has: this.page.getByTestId('make-model').getByText(title, { exact: true }) })
      .filter({ has: this.page.getByTestId('trim-mileage').locator('p').getByText(trim, { exact: true }) })
      .first();
  }

  /** Click the first matching tile and return what it showed before the click. */
  async openVehicle(search: VehicleSearch, trim: string): Promise<VehicleTile> {
    const tile = this.tileFor(search, trim);
    await expect(
      tile,
      `A "${search.year} ${search.make} ${search.model} ${trim}" in the results`,
    ).toBeVisible();
    const details = await this.readTile(tile);
    this.log.info(`Opening ${details.title} ${details.trim} (${details.mileage}, ${details.price}) -> ${details.href}`);
    await tile.getByTestId('tile-link').click();
    await this.page.waitForURL(/\/vehicle\/\d+/, { waitUntil: 'domcontentloaded' });
    return details;
  }

  /** Carvana applied the year, make and model filters from the search. */
  assertFiltersMatch(search: VehicleSearch): void {
    const f = this.appliedFilters();
    expect(f.year?.min, 'Year filter (min)').toBe(search.year);
    expect(f.year?.max, 'Year filter (max)').toBe(search.year);
    const make = f.makes?.find((m) => m.name.toLowerCase() === search.make.toLowerCase());
    expect(make, `Make filter "${search.make}"`).toBeDefined();
    const model = make?.parentModels?.find((m) => normalise(m.name) === normalise(search.model));
    expect(model, `Model filter "${search.model}"`).toBeDefined();
  }

  /** Every rendered tile is the searched year / make / model. */
  async assertAllTilesMatch(search: VehicleSearch): Promise<void> {
    const titles = await this.vehicleTitles();
    expect(titles.length, 'Rendered vehicle tiles').toBeGreaterThan(0);
    const mismatches = titles.filter((t) => !titlePattern(search).test(t));
    expect(mismatches, `Tiles that are not a ${search.query}`).toEqual([]);
  }
}

const normalise = (s: string): string => s.toLowerCase().replace(/[\s-]/g, '');

/** "2019 Toyota RAV4" also matches "RAV 4" / "RAV-4" and variants like "RAV4 Hybrid". */
const titlePattern = (s: VehicleSearch): RegExp => {
  const model = s.model
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/([A-Za-z])(\d)/g, '$1[\\s-]?$2');
  return new RegExp(`${s.year}\\s+${s.make}\\s+${model}`, 'i');
};
