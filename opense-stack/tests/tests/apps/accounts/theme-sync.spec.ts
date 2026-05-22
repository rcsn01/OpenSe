import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';

const ACCOUNTS_BASE_URL = process.env.BASE_URL_ACCOUNTS || 'http://localhost:5991';
const ETL_BASE_URL = process.env.BASE_URL_ETL || 'http://localhost:5992';
const STOQR_BASE_URL = process.env.BASE_URL_STOQR || 'http://localhost:5993';

const applications = [
  { name: 'Accounts', url: `${ACCOUNTS_BASE_URL}/login` },
  { name: 'ETL', url: ETL_BASE_URL },
  { name: 'StoQR', url: STOQR_BASE_URL },
];

const expectDarkTheme = async (page: Page, appName: string) => {
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark')), {
      message: `${appName} should resolve the shared dark theme`,
    })
    .toBe(true);

  await expect
    .poll(async () => page.evaluate(() => window.localStorage.getItem('opense-theme')), {
      message: `${appName} should sync local storage from the shared theme cookie`,
    })
    .toBe('dark');
};

const seedStaleLocalTheme = async (page: Page, url: string) => {
  await page.goto(url);
  await page.evaluate(() => window.localStorage.setItem('opense-theme', 'light'));
};

test.describe('Shared Theme Persistence', () => {
  test('shared cookie overrides stale per-app storage across Accounts, ETL, and StoQR', async ({ page, context }) => {
    for (const application of applications) {
      await seedStaleLocalTheme(page, application.url);
    }

    await context.addCookies([
      {
        name: 'opense-theme',
        value: 'dark',
        url: `${ACCOUNTS_BASE_URL}/`,
      },
    ]);

    for (const application of applications) {
      await page.goto(application.url);
      await expectDarkTheme(page, application.name);
    }
  });
});
