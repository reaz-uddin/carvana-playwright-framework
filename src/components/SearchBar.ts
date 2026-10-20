import { expect, type Locator, type Page } from '@playwright/test';
import { createLogger } from '../utils/logger';

/**
 * Header search bar shared by Carvana listing pages.
 *
 * Live DOM (verified 2026-10-19):
 *   - Collapsed trigger: textbox, accessible name "Open search",
 *     placeholder "Search make, model, or keyword"
 *   - Clicking it opens a modal with a combobox, accessible name
 *     "Search make, model, or keyword"
 *   - Suggestions: data-testid="Search Bar - Suggestion"
 *   - Submitting navigates to /cars/filters?cvnaid=<base64 filter JSON>
 *
 * Kept as a component (not a page) so any page object can reuse it.
 */
export class SearchBar {
  private readonly log = createLogger('SearchBar');

  readonly trigger: Locator;
  readonly input: Locator;
  readonly suggestions: Locator;

  constructor(private readonly page: Page) {
    this.trigger = page.getByRole('textbox', { name: 'Open search' });
    this.input = page.getByRole('combobox', { name: /search make, model, or keyword/i });
    this.suggestions = page.getByTestId('Search Bar - Suggestion');
  }

  /** Open the search modal and type the query, then wait for suggestions. */
  async typeQuery(query: string): Promise<void> {
    this.log.info(`Opening search and typing "${query}"`);
    await this.trigger.click();
    await expect(this.input, 'Search modal input').toBeVisible();
    await this.input.fill(query);
    await expect(this.suggestions.first(), 'Search suggestions appear').toBeVisible();
  }

  /** Text of the visible suggestions (useful for reporting). */
  async suggestionTexts(): Promise<string[]> {
    return (await this.suggestions.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  }

  /** Submit the typed query with Enter and wait for the results URL. */
  async submit(): Promise<void> {
    await this.input.press('Enter');
    await this.page.waitForURL(/\/cars\/filters/, { waitUntil: 'domcontentloaded' });
    this.log.info(`Search submitted, now at ${this.page.url()}`);
  }

  /** Type and submit in one call. */
  async search(query: string): Promise<void> {
    await this.typeQuery(query);
    await this.submit();
  }
}
