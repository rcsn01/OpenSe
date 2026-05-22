Testing Suite (Playwright E2E)

For UI-specific implementation and verification expectations, see [UI Implementation Guide.md](./UI%20Implementation%20Guide.md).

# Security Check
```bash
pnpm security:check-secrets
```
# Run unit tests
```bash
pnpm test
```
# Run all tests
```bash
pnpm test:e2e
```
# Run tests with UI (interactive mode)
```bash
pnpm test:e2e:ui
```
# Run specific app tests only
```bash
npx playwright test --config=tests/tests/playwright.config.ts apps/stoqr
npx playwright test --config=tests/tests/playwright.config.ts apps/etl
npx playwright test --config=tests/tests/playwright.config.ts apps/accounts
npx playwright test --config=tests/tests/playwright.config.ts apps/ui-design
```
Environment Files
Tests auto-load env vars from (in order, later overrides):
1. tests/tests/.env.test
2. tests/tests/.env.test.local (create this for local overrides)
How It Works
- Web servers: Playwright automatically starts the dev servers (`pnpm dev:etl`, `pnpm dev:opense`, `pnpm dev:stoqr`, `pnpm dev:ui-design`, and optionally `pnpm dev:accounts`) before running tests
- Parallel: Tests run in parallel by default (use --workers=1 to disable)
- Retries: 2 retries on CI, 0 locally
- Tracing: On first retry, trace is captured for debugging
- Screenshots: Only on failure
Test Structure
```
tests/tests/
├── apps/
│   ├── accounts/   # Accounts app tests
│   ├── etl/       # ETL app tests
│   ├── stoqr/     # StoQR app tests
│   └── ui-design/ # UI design system app tests
├── fixtures/       # Auth helpers (auth.ts, etlAuth.ts, accountsAuth.ts)
├── pages/         # Page objects (LoginPage, ETLDashboardPage, etc.)
└── playwright.config.ts
```

Environment toggles:
- `E2E_WITH_ACCOUNTS=true|false`: include or exclude Accounts project.
- `E2E_ACCOUNTS_DEEP=true|false`: run mutation-heavy Accounts deep tests (`billing-seats.spec.ts`).

UI verification rules:
- For UI changes, do not stop at passing unit tests. Verify the affected route in a real browser.
- Prefer focused tests for the affected app/route before running the full suite.
- For StoQR UI changes, the usual minimum is: focused tests, `pnpm --dir opense-stack/apps/stoqr build`, and a browser pass on the changed route.

Viewing Reports
# Open HTML report
open tests/playwright-report/index.html
