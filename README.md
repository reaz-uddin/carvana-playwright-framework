# Carvana Playwright Framework

End-to-end UI automation for [carvana.com](https://www.carvana.com) built with **Playwright + TypeScript** on Node.js, using the **Page Object Model** with custom fixtures, JSON reporting and an HTML report.

## Project structure

```
carvana-playwright-framework/
├── .github/workflows/playwright.yml    # CI: type check, run tests, upload reports
├── playwright.config.ts                # browsers, timeouts, reporters
├── src/
│   ├── components/SearchBar.ts         # reusable header search bar component
│   ├── config/env.ts                   # env-driven settings (BASE_URL, HEADLESS, ...)
│   ├── data/locations.ts               # test data (Carvana location slugs)
│   ├── data/searches.ts                # test data (vehicle searches, one test per row)
│   ├── fixtures/pages.fixture.ts       # injects page objects into tests
│   ├── pages/
│   │   ├── BasePage.ts                 # navigation, timing, block detection, attachments
│   │   ├── CarvanaInventoryPage.ts     # /cars/in-<city>-<state> page object
│   │   ├── SearchResultsPage.ts        # /cars/filters?cvnaid=... results page object
│   │   └── VehicleDetailsPage.ts       # /vehicle/<id> details page object
│   ├── reporters/summary-json-reporter.ts  # compact JSON summary reporter
│   └── utils/logger.ts
└── tests/carvana/
    ├── open-richmond-inventory.spec.ts # Scenario 1
    ├── search-vehicle.spec.ts          # Scenario 2 (data-driven)
    └── open-vehicle-details.spec.ts    # Scenario 3 (data-driven)
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

## Scenario 2 — Search for "2019 Toyota Rav4"

`TC-002` starts on the Richmond, VA page, then:

1. Opens the search bar and types `2019 Toyota Rav4`; checks the top suggestion is a 2019 Toyota
2. Presses Enter and lands on `/cars/filters?cvnaid=...`
3. Decodes `cvnaid` (base64 JSON) and asserts filters: year 2019–2019, make Toyota, model RAV4
4. Waits for results to re-render, checks the results count is > 0
5. Asserts **every** listed car is a 2019 Toyota RAV4 (RAV4 Hybrid counts)

Attached `search-results` JSON: query, results URL, decoded filters, total results, suggestions, and the first 5 vehicles (title, trim, mileage, price, link).

To search for more cars, add a row to `src/data/searches.ts`:

```ts
{ query: '2020 Honda CR-V', year: 2020, make: 'Honda', model: 'CR-V' },
```

Run only search tests: `npx playwright test --grep @search`

## Scenario 3 — Search "2019 Toyota Rav4" and open a 2019 Toyota RAV4 XLE

`TC-003` searches as in Scenario 2, then:

1. Finds the first result tile whose title is exactly `2019 Toyota RAV4` and trim exactly `XLE`
   (skips `RAV4 Hybrid` and `XLE Premium`; results order changes between loads, so it selects by data, not position)
2. Records the tile's trim, mileage, price and link, then clicks it
3. On `/vehicle/<id>` asserts: same vehicle id as the clicked tile, title and `h1` are `2019 Toyota RAV4`,
   trim line starts with `XLE` (not `XLE Premium`), mileage matches the tile (e.g. `80k` vs `79,990 miles`),
   and the **Get Started** button is visible

Attached `vehicle-details` JSON: the clicked tile and what the details page showed.

To open other trims, add a row to `vehicleSelections` in `src/data/searches.ts`:

```ts
{ search: vehicleSearches[0], trim: 'Limited' },
```

Run only this scenario: `npx playwright test --grep @vdp`

## Setup

Requires **Node.js 20 or higher** (LTS recommended).


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
