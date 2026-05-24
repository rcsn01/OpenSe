import { test, expect, type Page } from '@playwright/test';
import { installMockSupabaseSession } from '../../fixtures/mockSupabaseSession';

const accountsUrl = process.env.BASE_URL_ACCOUNTS || 'http://localhost:5991';
const etlUrl = process.env.BASE_URL_ETL || 'http://localhost:5992';
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

test.describe('ETL onboarding redirects', () => {
  test('authenticated user with no organisations is sent to Accounts onboarding with current route returnTo', async ({ page }) => {
    await installMockSupabaseSession(page, {
      userId: 'e2e-etl-zero-org-user',
      email: 'e2e-etl-zero-org@example.com',
      canCreateOrganisation: false,
    });

    await safeGoto(page, '/activity/usage?range=7d');

    await page.waitForURL(
      (url) => url.origin === accountsOrigin && url.pathname === '/onboarding/blocked',
      { timeout: 15000 },
    );

    const current = new URL(page.url());
    expect(current.searchParams.get('app')).toBe('Open-ETL');
    expect(current.searchParams.get('returnTo')).toBe(`${etlUrl}/activity/usage?range=7d`);
  });

  test('organisation query failures do not redirect to Accounts onboarding', async ({ page }) => {
    await installMockSupabaseSession(page, {
      userId: 'e2e-etl-org-error-user',
      email: 'e2e-etl-org-error@example.com',
      membershipMode: 'error',
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle').catch(() => undefined);

    expect(new URL(page.url()).origin).toBe(new URL(etlUrl).origin);
    expect(page.url()).not.toContain('/onboarding');
  });
});
