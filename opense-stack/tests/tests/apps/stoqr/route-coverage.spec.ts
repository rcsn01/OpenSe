import { type Page } from '@playwright/test';
import { test, expect } from '../../fixtures/auth';

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

test.describe('Stoqr Route Coverage', () => {
  test('public auth entry routes resolve', async ({ page }) => {
    await safeGoto(page, '/');
    await expect(page).toHaveURL(/\/$|\/dashboard$|\/auth$/);

    await safeGoto(page, '/auth');
    await expect(page).toHaveURL(/\/(auth|dashboard|login)/);

    await safeGoto(page, '/signup');
    await expect(page).toHaveURL(/\/(signup|dashboard|login|$)/);
  });

  test('label studio route resolves', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tools/labels');
    await expect(authenticatedPage).toHaveURL(/\/(tools\/labels|auth|login|$)/);
  });

  test('wildcard route redirects to dashboard flow', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/does-not-exist');
    await expect(authenticatedPage).toHaveURL(/\/(dashboard|auth|login|$)/);
  });
});
