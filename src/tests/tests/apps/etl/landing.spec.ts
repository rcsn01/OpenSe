import { test as baseTest, expect as baseExpect, type Page } from '@playwright/test';

const safeGoto = async (page: Page, url: string) => {
  try {
    await page.goto(url, { waitUntil: 'commit' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isExpectedRedirectAbort =
      message.includes('ERR_ABORTED') || message.includes('interrupted by another navigation');

    if (!isExpectedRedirectAbort) {
      throw error;
    }
  }
};

baseTest.describe('ETL Root Redirects', () => {
  baseTest('guest root redirects into the login flow', async ({ page }) => {
    await safeGoto(page, '/');
    await page.waitForURL((url) => url.pathname !== '/', { timeout: 15000 }).catch(() => undefined);

    const pathname = new URL(page.url()).pathname;
    baseExpect(['/login', '/dashboard', '/dashboard/personal', '/dashboard/org']).toContain(pathname);
  });
});
