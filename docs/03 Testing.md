Testing Suite (Playwright E2E)
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
npx playwright test --config=tests/tests/playwright.config.ts apps/admin
npx playwright test --config=tests/tests/playwright.config.ts apps/etl
```
Environment Files
Tests auto-load env vars from (in order, later overrides):
1. tests/tests/.env.test
2. tests/tests/.env.test.local (create this for local overrides)
How It Works
- Web servers: Playwright automatically starts the dev servers (pnpm dev:admin, pnpm dev:etl, pnpm dev:stoqr) before running tests
- Parallel: Tests run in parallel by default (use --workers=1 to disable)
- Retries: 2 retries on CI, 0 locally
- Tracing: On first retry, trace is captured for debugging
- Screenshots: Only on failure
Test Structure
```
tests/tests/
├── apps/
│   ├── admin/      # Admin app tests
│   ├── etl/       # ETL app tests
│   └── stoqr/     # StoQR app tests
├── fixtures/       # Auth helpers (auth.ts, adminAuth.ts, etlAuth.ts)
├── pages/         # Page objects (LoginPage, ETLDashboardPage, etc.)
└── playwright.config.ts
```
Viewing Reports
# Open HTML report
open tests/playwright-report/index.html