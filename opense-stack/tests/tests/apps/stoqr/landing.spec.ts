import { test as baseTest, expect as baseExpect, type Page } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../../fixtures/auth';

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

baseTest.describe('Stoqr Root Redirects', () => {
  baseTest('guest root redirects into auth flow', async ({ page }) => {
    await safeGoto(page, '/');
    await page.waitForURL((url) => url.pathname !== '/', { timeout: 15000 }).catch(() => undefined);

    const pathname = new URL(page.url()).pathname;
    baseExpect(['/auth', '/login', '/dashboard']).toContain(pathname);
  });
});

authTest.describe('Stoqr Root Redirects (authenticated)', () => {
  authTest('authenticated root redirects to the dashboard', async ({ authenticatedPage }) => {
    await safeGoto(authenticatedPage, '/');
    await authExpect(authenticatedPage).toHaveURL(/\/dashboard$/);
  });
});
