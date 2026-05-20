import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const workspaceRoot = process.cwd();

const loadEnvFromFile = (filePath: string) => {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const equalsIndex = line.indexOf('=');
    if (equalsIndex <= 0) continue;

    const key = line.slice(0, equalsIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    const rawValue = line.slice(equalsIndex + 1).trim();
    const unquoted =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;

    process.env[key] = unquoted;
  }
};

loadEnvFromFile(resolve(workspaceRoot, 'tests/tests/.env.test'));
loadEnvFromFile(resolve(workspaceRoot, 'tests/tests/.env.test.local'));

const withAccounts = process.env.E2E_WITH_ACCOUNTS !== 'false';
const reuseExistingServer = process.env.E2E_REUSE_SERVER === 'true';

const webServers = [
  {
    command: 'pnpm dev:admin',
    url: process.env.BASE_URL_ADMIN || 'http://localhost:5990',
    reuseExistingServer,
    timeout: 120000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 },
  },
  {
    command: 'pnpm dev:etl',
    url: process.env.BASE_URL_ETL || 'http://localhost:5992',
    reuseExistingServer,
    timeout: 120000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 },
  },
  {
    command: 'pnpm dev:opense',
    url: process.env.BASE_URL_OPENSE || 'http://localhost:5994',
    reuseExistingServer,
    timeout: 120000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 },
  },
  {
    command: 'pnpm dev:stoqr',
    url: process.env.BASE_URL_STOQR || 'http://localhost:5993',
    reuseExistingServer,
    timeout: 120000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 },
  },
  {
    command: 'pnpm dev:ui-design',
    url: process.env.BASE_URL_UI_DESIGN || 'http://localhost:5999',
    reuseExistingServer,
    timeout: 120000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 },
  },
];

if (withAccounts) {
  webServers.push({
    command: 'pnpm dev:accounts',
    url: process.env.BASE_URL_ACCOUNTS || 'http://localhost:5991',
    reuseExistingServer,
    timeout: 120000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10000 },
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
  reporter: [['html', { outputFolder: '../playwright-report', open: 'never' }]],
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
        baseURL: process.env.BASE_URL_ADMIN || 'http://localhost:5990',
      },
    },
    {
      name: 'etl-chromium',
      testMatch: 'apps/etl/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL_ETL || 'http://localhost:5992',
      },
    },
    {
      name: 'opense-chromium',
      testMatch: 'apps/opense/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL_OPENSE || 'http://localhost:5994',
      },
    },
    {
      name: 'stoqr-chromium',
      testMatch: 'apps/stoqr/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL_STOQR || 'http://localhost:5993',
      },
    },
    {
      name: 'ui-design-chromium',
      testMatch: 'apps/ui-design/**/*.spec.ts',
      testIgnore: 'apps/ui-design/mobile-side-nav.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL_UI_DESIGN || 'http://localhost:5999',
      },
    },
    {
      name: 'ui-design-mobile-chromium',
      testMatch: 'apps/ui-design/mobile-side-nav.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        baseURL: process.env.BASE_URL_UI_DESIGN || 'http://localhost:5999',
      },
    },
    ...(withAccounts
      ? [
          {
            name: 'accounts-chromium',
            testMatch: 'apps/accounts/**/*.spec.ts',
            testIgnore: 'apps/accounts/general-mobile-nav.spec.ts',
            use: {
              ...devices['Desktop Chrome'],
              baseURL: process.env.BASE_URL_ACCOUNTS || 'http://localhost:5991',
            },
          },
          {
            name: 'accounts-mobile-chromium',
            testMatch: 'apps/accounts/general-mobile-nav.spec.ts',
            use: {
              ...devices['Desktop Chrome'],
              viewport: { width: 390, height: 844 },
              isMobile: true,
              hasTouch: true,
              baseURL: process.env.BASE_URL_ACCOUNTS || 'http://localhost:5991',
            },
          },
        ]
      : []),
  ],
  webServer: webServers,
});
