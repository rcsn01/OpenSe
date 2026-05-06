import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  outputDir: '../test-results',
  testMatch: 'apps/stoqr/**/*.spec.ts',
  tsconfig: './tsconfig.json',
  fullyParallel: true,
  reporter: [['html', { outputFolder: '../playwright-report', open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'stoqr-chromium',
      testMatch: 'apps/stoqr/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL_STOQR || 'http://localhost:5995',
      },
    },
  ],
});
