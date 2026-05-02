import { test as baseTest, expect as baseExpect, type Page } from '@playwright/test';

const authenticatedRoutes = [
  '/dashboard/personal',
  '/dashboard/org',
  '/organisation/team',
  '/organisation/permissions',
  '/organisation/usage',
  '/organisation/logs',
  '/activity/usage',
  '/activity/logs',
  '/settings/profile',
];

const safeGoto = async (page: Page, url: string) => {
  try {
    await page.goto(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isExpectedRedirectAbort =
      message.includes('ERR_ABORTED') || message.includes('interrupted by another navigation');

    if (!isExpectedRedirectAbort) {
      throw error;
    }
  }
};

baseTest.describe('ETL Public Route Coverage', () => {
  baseTest('root and auth routes resolve', async ({ page }) => {
    await safeGoto(page, '/');
    await baseExpect(page).toHaveURL(/\/(login|dashboard(?:\/(?:personal|org))?)(\?|$)/);

    await safeGoto(page, '/login');
    await baseExpect(page).toHaveURL(/\/(login|dashboard)/);

    await safeGoto(page, '/register');
    await baseExpect(page).toHaveURL(/\/(register|dashboard|login)/);
  });
});
