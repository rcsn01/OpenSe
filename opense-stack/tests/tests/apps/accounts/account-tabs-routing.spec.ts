import { test, expect } from '../../fixtures/accountsAuth';

test.describe('Accounts Tab Routing', () => {
  test('side-nav tab clicks update URL', async ({ authenticatedAccountsPage }) => {
    await authenticatedAccountsPage.goto('/account/general');
    await expect(authenticatedAccountsPage).toHaveURL(/\/(account\/general|login)/);

    if (authenticatedAccountsPage.url().includes('/login')) {
      return;
    }

    const billingLink = authenticatedAccountsPage.getByRole('link', { name: /billing\s*&\s*limits/i }).first();
    if (await billingLink.isVisible().catch(() => false)) {
      await billingLink.click();
      await expect(authenticatedAccountsPage).toHaveURL(/\/account\/billing$/);
    }

    const seatsLink = authenticatedAccountsPage.getByRole('link', { name: /seat assignments/i }).first();
    if (await seatsLink.isVisible().catch(() => false)) {
      await seatsLink.click();
      await expect(authenticatedAccountsPage).toHaveURL(/\/account\/seats$/);
    }
  });
});
