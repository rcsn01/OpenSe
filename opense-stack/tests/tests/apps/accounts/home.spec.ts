import { expect, test, type Page } from '@playwright/test';
import { installMockSupabaseSession } from '../../fixtures/mockSupabaseSession';

const accountsUrl = process.env.BASE_URL_ACCOUNTS || 'http://localhost:5991';
const etlUrl = process.env.BASE_URL_ETL || 'http://localhost:5992';
const stoqrUrl = process.env.BASE_URL_STOQR || 'http://localhost:5993';
const openseUrl = process.env.BASE_URL_OPENSE || 'http://localhost:5994';
const uiUrl = process.env.BASE_URL_UI_DESIGN || 'http://localhost:5999';

const gotoAccounts = async (page: Page, path: string) => {
  await page.goto(new URL(path, accountsUrl).toString());
};

test.describe('Accounts home', () => {
  test('shows app launch links as the account entry point', async ({ page }) => {
    await installMockSupabaseSession(page, {
      userId: 'e2e-accounts-home-user',
      email: 'e2e-accounts-home-user@example.com',
      initialMembershipRole: 'owner',
      onboardingCompleted: true,
    });

    await gotoAccounts(page, '/account');

    await expect(page).toHaveURL(/\/account\/home$/);
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Open-ETL/i })).toHaveAttribute('href', `${etlUrl}/dashboard`);
    await expect(page.getByRole('link', { name: /Open-StoQR/i })).toHaveAttribute('href', `${stoqrUrl}/dashboard`);
    await expect(page.getByRole('link', { name: /^OpenSe/i })).toHaveAttribute('href', openseUrl);
    await expect(page.getByRole('link', { name: /UI Design/i })).toHaveAttribute('href', uiUrl);
  });
});
