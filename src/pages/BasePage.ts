import { expect, type Page, type Response, type TestInfo } from '@playwright/test';
import { createLogger, type Logger } from '../utils/logger';

/** Page-level facts captured after a navigation, attached to the report as JSON. */
export interface PageSnapshot {
  requestedUrl: string;
  finalUrl: string;
  httpStatus: number | null;
  title: string;
  loadTimeMs: number;
  capturedAt: string;
}

/** Text patterns that indicate a bot-protection / access-denied interstitial. */
const BLOCK_PAGE_PATTERNS: RegExp[] = [
  /access denied/i,
  /press (&|and) hold/i,
  /verify you are (a )?human/i,
  /attention required/i,
  /request unsuccessful/i,
];

/**
 * Shared behaviour for every page object: navigation with timing,
 * block-page detection, and report attachments.
 */
export abstract class BasePage {
  protected readonly log: Logger;
  protected lastResponse: Response | null = null;

  /** Path relative to baseURL, e.g. "/cars/in-richmond-va". */
  protected abstract readonly path: string;

  constructor(protected readonly page: Page) {
    this.log = createLogger(this.constructor.name);
  }

  /** Navigate to this page and return a snapshot of what loaded. */
  async open(): Promise<PageSnapshot> {
    this.log.info(`Navigating to ${this.path}`);
    const started = Date.now();
    this.lastResponse = await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
    const loadTimeMs = Date.now() - started;

    const snapshot: PageSnapshot = {
      requestedUrl: this.path,
      finalUrl: this.page.url(),
      httpStatus: this.lastResponse?.status() ?? null,
      title: await this.page.title(),
      loadTimeMs,
      capturedAt: new Date().toISOString(),
    };
    this.log.info(`Loaded ${snapshot.finalUrl} (HTTP ${snapshot.httpStatus}) in ${loadTimeMs} ms`);
    return snapshot;
  }

  /** Fail fast, with a clear message, if the site served a bot-protection page. */
  async assertNotBlocked(): Promise<void> {
    const bodyText = (await this.page.locator('body').innerText().catch(() => '')).slice(0, 5000);
    const hit = BLOCK_PAGE_PATTERNS.find((p) => p.test(bodyText));
    expect(
      hit,
      `Site served a bot-protection page (matched ${hit}). Run headed, from a residential network, or ask for an allowlisted test environment.`,
    ).toBeUndefined();
  }

  /** Assert the main document responded with a non-error status. */
  async assertHttpOk(): Promise<void> {
    const status = this.lastResponse?.status();
    expect(status, 'Main document HTTP status').toBeDefined();
    expect(status!, `Expected HTTP < 400 but got ${status}`).toBeLessThan(400);
  }

  /** Attach a full-page screenshot to the HTML report. */
  async attachScreenshot(testInfo: TestInfo, name = 'page'): Promise<void> {
    const body = await this.page.screenshot({ fullPage: false });
    await testInfo.attach(`${name}-screenshot`, { body, contentType: 'image/png' });
  }

  /** Attach any object as pretty JSON to the report. */
  async attachJson(testInfo: TestInfo, name: string, data: unknown): Promise<void> {
    await testInfo.attach(name, {
      body: Buffer.from(JSON.stringify(data, null, 2)),
      contentType: 'application/json',
    });
  }
}
