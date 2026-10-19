import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

/**
 * Playwright configuration.
 * Reports:
 *   - reports/html/index.html      interactive HTML report (steps, screenshots, traces)
 *   - reports/json/results.json    full Playwright JSON report
 *   - reports/json/summary.json    compact JSON summary (custom reporter)
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: env.retries,
  workers: env.workers,
  timeout: env.testTimeout,
  expect: { timeout: env.actionTimeout },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/json/results.json' }],
    ['./src/reporters/summary-json-reporter.ts', { outputFile: 'reports/json/summary.json' }],
  ],

  use: {
    baseURL: env.baseUrl,
    headless: env.headless,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    viewport: { width: 1440, height: 900 },
    actionTimeout: env.actionTimeout,
    navigationTimeout: env.navigationTimeout,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
});
