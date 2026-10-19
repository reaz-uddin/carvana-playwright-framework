/**
 * Central runtime configuration.
 * Every value can be overridden with an environment variable, so the same
 * suite can run locally, in CI, or against another environment unchanged.
 */
const toBool = (v: string | undefined, fallback: boolean): boolean =>
  v === undefined ? fallback : ['1', 'true', 'yes'].includes(v.toLowerCase());

const toInt = (v: string | undefined, fallback: number): number => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isNaN(n) ? fallback : n;
};

export const env = {
  /** Root of the application under test. */
  baseUrl: process.env.BASE_URL ?? 'https://www.carvana.com',
  /** Run browsers without a visible window. */
  headless: toBool(process.env.HEADLESS, true),
  /** Retries per failed test (CI defaults to 2). */
  retries: toInt(process.env.RETRIES, process.env.CI ? 2 : 0),
  /** Parallel workers. */
  workers: toInt(process.env.WORKERS, process.env.CI ? 2 : 4),
  /** Max time for a single test, in ms. */
  testTimeout: toInt(process.env.TEST_TIMEOUT, 90_000),
  /** Max time for navigation, in ms. */
  navigationTimeout: toInt(process.env.NAV_TIMEOUT, 60_000),
  /** Max time for a single action / expect, in ms. */
  actionTimeout: toInt(process.env.ACTION_TIMEOUT, 15_000),
} as const;
