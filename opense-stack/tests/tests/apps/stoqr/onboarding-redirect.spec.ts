import { test, expect, type Page } from '@playwright/test';
import { installMockSupabaseSession } from '../../fixtures/mockSupabaseSession';

const accountsUrl = process.env.BASE_URL_ACCOUNTS || 'http://localhost:5991';
const stoqrUrl = process.env.BASE_URL_STOQR || 'http://localhost:5993';
const accountsOrigin = new URL(accountsUrl).origin;

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

test.describe('StoQR onboarding redirects', () => {
  test('authenticated user with no companies is sent to Accounts onboarding with current route returnTo', async ({ page }) => {
    await installMockSupabaseSession(page, {
      userId: 'e2e-stoqr-zero-org-user',
      email: 'e2e-stoqr-zero-org@example.com',
    });

    await safeGoto(page, '/inventory/all?tab=low-stock');

    await page.waitForURL(
      (url) => url.origin === accountsOrigin && url.pathname.startsWith('/onboarding'),
      { timeout: 15000 },
    );

    const current = new URL(page.url());
    expect(current.searchParams.get('app')).toBe('Open-StoQR');
    expect(current.searchParams.get('returnTo')).toBe(`${stoqrUrl}/inventory/all?tab=low-stock`);
  });

  test('company load failures do not redirect to Accounts onboarding', async ({ page }) => {
    await installMockSupabaseSession(page, {
      userId: 'e2e-stoqr-company-error-user',
      email: 'e2e-stoqr-company-error@example.com',
      membershipMode: 'error',
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle').catch(() => undefined);

    expect(new URL(page.url()).origin).toBe(new URL(stoqrUrl).origin);
    expect(page.url()).not.toContain('/onboarding');
  });
});
