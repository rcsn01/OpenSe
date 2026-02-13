import { defineConfig, devices } from '@playwright/test';

const withAccounts = process.env.E2E_WITH_ACCOUNTS === 'true';

const webServers = [
  {
    command: 'pnpm dev:admin',
    url: process.env.BASE_URL_ADMIN || 'http://localhost:5993',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  {
    command: 'pnpm dev:etl',
    url: process.env.BASE_URL_ETL || 'http://localhost:5991',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  {
    command: 'pnpm dev:stoqr',
    url: process.env.BASE_URL_STOQR || 'http://localhost:5992',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
];

if (withAccounts) {
  webServers.push({
    command: 'pnpm dev:accounts',
    url: process.env.BASE_URL_ACCOUNTS || 'http://localhost:5990',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  });
}

export default defineConfig({
  testDir: '.',
  outputDir: '../test-results',
  testMatch: 'apps/**/*.spec.ts',
  tsconfig: './tsconfig.json',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: '../playwright-report' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'admin-chromium',
      testMatch: 'apps/admin/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL_ADMIN || 'http://localhost:5993',
      },
    },
    {
      name: 'etl-chromium',
      testMatch: 'apps/etl/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL_ETL || 'http://localhost:5991',
      },
    },
    {
      name: 'stoqr-chromium',
      testMatch: 'apps/stoqr/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL_STOQR || 'http://localhost:5992',
      },
    },
  ],
  webServer: webServers,
});
