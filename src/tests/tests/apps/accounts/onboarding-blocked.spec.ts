import { expect, test, type Page } from '@playwright/test';
import { installMockSupabaseSession } from '../../fixtures/mockSupabaseSession';

const accountsUrl = process.env.BASE_URL_ACCOUNTS || 'http://localhost:5991';
const etlUrl = process.env.BASE_URL_ETL || 'http://localhost:5992';

const gotoAccounts = async (page: Page, path: string) => {
  await page.goto(new URL(path, accountsUrl).toString());
};

test.describe('Accounts blocked onboarding', () => {
  test('no-org user who cannot create an organisation lands on blocked onboarding after login resolution', async ({ page }) => {
    await installMockSupabaseSession(page, {
      userId: 'e2e-accounts-blocked-login',
      email: 'e2e-accounts-blocked-login@example.com',
      canCreateOrganisation: false,
    });

    await gotoAccounts(page, '/login');

    await expect(page).toHaveURL(/\/onboarding\/blocked$/);
    await expect(page.getByRole('heading', { name: /organisation limit reached/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /create your organisation/i })).toHaveCount(0);
    await expect(page.getByLabel(/organisation name/i)).toHaveCount(0);
  });

  test('direct create route for a blocked user redirects to blocked onboarding', async ({ page }) => {
    await installMockSupabaseSession(page, {
      userId: 'e2e-accounts-blocked-create',
      email: 'e2e-accounts-blocked-create@example.com',
      canCreateOrganisation: false,
    });

    await gotoAccounts(page, '/onboarding/create-organisation');

    await expect(page).toHaveURL(/\/onboarding\/blocked$/);
    await expect(page.getByRole('heading', { name: /create your organisation/i })).toHaveCount(0);
    await expect(page.getByLabel(/organisation name/i)).toHaveCount(0);
  });

  test('onboarding start preserves safe app forwarding before landing on blocked onboarding', async ({ page }) => {
    const returnTo = `${etlUrl}/activity/usage?range=7d`;
    await installMockSupabaseSession(page, {
      userId: 'e2e-accounts-blocked-forwarding',
      email: 'e2e-accounts-blocked-forwarding@example.com',
      canCreateOrganisation: false,
    });

    await gotoAccounts(page, `/onboarding?app=Open-ETL&returnTo=${encodeURIComponent(returnTo)}`);

    await expect(page).toHaveURL((url) => {
      return (
        url.pathname === '/onboarding/blocked' &&
        url.searchParams.get('app') === 'Open-ETL' &&
        url.searchParams.get('returnTo') === returnTo
      );
    });
  });
});
