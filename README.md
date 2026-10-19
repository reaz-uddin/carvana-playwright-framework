# Carvana Playwright Framework

End-to-end UI automation for [carvana.com](https://www.carvana.com) built with **Playwright + TypeScript** on Node.js, using the **Page Object Model** with custom fixtures, JSON reporting and an HTML report.

## Project structure

```
carvana-playwright-framework/
├── .github/workflows/playwright.yml    # CI: type check, run tests, upload reports
├── playwright.config.ts                # browsers, timeouts, reporters
├── src/
│   ├── config/env.ts                   # env-driven settings (BASE_URL, HEADLESS, ...)
│   ├── data/locations.ts               # test data (Carvana location slugs)
│   ├── fixtures/pages.fixture.ts       # injects page objects into tests
│   ├── pages/
│   │   ├── BasePage.ts                 # navigation, timing, block detection, attachments
│   │   └── CarvanaInventoryPage.ts     # /cars/in-<city>-<state> page object
│   ├── reporters/summary-json-reporter.ts  # compact JSON summary reporter
│   └── utils/logger.ts
└── tests/carvana/open-richmond-inventory.spec.ts   # Scenario 1
```

## Scenario 1 — Open the Richmond, VA inventory page

`TC-001` opens <https://www.carvana.com/cars/in-richmond-va> and verifies:

1. The page is not a bot-protection / access-denied interstitial
2. The main document returns HTTP < 400
3. Cookie banner is dismissed if shown
4. URL is `/cars/in-richmond-va`
5. Title is Carvana-branded
6. Main `h1` heading is visible
7. Page references "Richmond"
8. Vehicle listings render (soft check — reported, does not fail the test)

A screenshot and a `page-details` JSON (final URL, HTTP status, title, load time, heading, vehicle count) are attached to every run.

## Setup

```bash
npm install
npx playwright install --with-deps chromium
```

## Run

| Command | What it does |
| --- | --- |
| `npm test` | All tests, all configured browsers |
| `npm run test:chromium` | Chromium only |
| `npm run test:smoke` | Tests tagged `@smoke` |
| `npm run test:headed` | Visible browser |
| `npm run report` | Open the HTML report |
| `npm run typecheck` | TypeScript check |

## Reports

| Report | Path |
| --- | --- |
| HTML (steps, screenshots, video, trace) | `reports/html/index.html` |
| Full Playwright JSON | `reports/json/results.json` |
| Compact JSON summary | `reports/json/summary.json` |

`summary.json` shape:

```json
{
  "status": "passed",
  "totals": { "total": 1, "passed": 1, "failed": 0, "flaky": 0, "skipped": 0 },
  "tests": [
    {
      "title": "TC-001 Open the Richmond, VA inventory page @smoke",
      "project": "chromium",
      "status": "passed",
      "steps": [{ "title": "Open https://www.carvana.com/cars/in-richmond-va", "status": "passed", "durationMs": 2140 }],
      "attachments": [{ "name": "page-details", "data": { "httpStatus": 200, "title": "..." } }]
    }
  ]
}
```

## Configuration

All settings are environment variables (see `src/config/env.ts`):

| Variable | Default |
| --- | --- |
| `BASE_URL` | `https://www.carvana.com` |
| `HEADLESS` | `true` |
| `RETRIES` | `0` locally, `2` in CI |
| `WORKERS` | `4` locally, `2` in CI |
| `TEST_TIMEOUT` / `NAV_TIMEOUT` / `ACTION_TIMEOUT` | `90000` / `60000` / `15000` ms |

Example: `HEADLESS=false npm run test:chromium`

## Adding a scenario

1. Add test data to `src/data/` if needed.
2. Add locators and actions to a page object in `src/pages/` (extend `BasePage`).
3. Register it in `src/fixtures/pages.fixture.ts`.
4. Write the spec in `tests/` using `test.step` for readable reports.

## Note on bot protection

Carvana uses bot protection. Headless runs from cloud/CI IP ranges can be challenged; the suite detects this and fails with a clear message instead of a vague timeout. If it happens, run headed from a residential network or ask for an allowlisted test environment.
