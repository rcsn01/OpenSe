# Playwright Setup

## Installation

Playwright is already installed as a dev dependency:

```bash
pnpm add -wD @playwright/test
```

## Browser Installation

Install Chromium for testing:

```bash
pnpm playwright install chromium
```

## Configuration

The main configuration file is at `tests/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'apps/stoqr/**/*.spec.ts',
  tsconfig: './tsconfig.json',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5992',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev:stoqr',
    url: 'http://localhost:5992',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

## Key Settings

| Setting | Description |
|---------|-------------|
| `testDir` | Root directory for tests |
| `baseURL` | Base URL for tests (defaults to localhost:5992) |
| `webServer` | Auto-starts dev server before tests |
| `trace: 'on-first-retry'` | Records trace on first test failure |
| `screenshot: 'only-on-failure'` | Captures screenshots on failure |

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with Playwright UI
pnpm test:e2e:ui

# Run specific test file
npx playwright test tests/apps/stoqr/auth.spec.ts

# Run in headed mode
npx playwright test --headed

# Run with debug
npx playwright test --debug
```

## CI Configuration

In CI, tests run with:
- 2 retries on failure
- Single worker (sequential)
- Existing server is not reused
