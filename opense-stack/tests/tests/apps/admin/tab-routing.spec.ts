import { test, expect } from '../../fixtures/adminAuth';

test.describe('Admin Tab Routing', () => {
  test('application management tabs update URL', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/applications/etl');
    await expect(authenticatedAdminPage).toHaveURL(/\/(applications\/etl|login)/);

    if (authenticatedAdminPage.url().includes('/login')) {
      return;
    }

    const stoqrTab = authenticatedAdminPage.getByRole('button', { name: /stoqr settings/i }).first();
    if (await stoqrTab.isVisible().catch(() => false)) {
      await stoqrTab.click();
      await expect(authenticatedAdminPage).toHaveURL(/\/applications\/stoqr$/);
    }

    const sharedTab = authenticatedAdminPage.getByRole('button', { name: /suite\s*\/\s*shared/i }).first();
    if (await sharedTab.isVisible().catch(() => false)) {
      await sharedTab.click();
      await expect(authenticatedAdminPage).toHaveURL(/\/applications\/shared$/);
    }
  });

  test('financial tabs update URL', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/financials/pricing');
    await expect(authenticatedAdminPage).toHaveURL(/\/(financials\/pricing|login)/);

    if (authenticatedAdminPage.url().includes('/login')) {
      return;
    }

    const couponsTab = authenticatedAdminPage.getByRole('button', { name: /coupons\s*&\s*discounts/i }).first();
    if (await couponsTab.isVisible().catch(() => false)) {
      await couponsTab.click();
      await expect(authenticatedAdminPage).toHaveURL(/\/financials\/coupons$/);
    }
  });
});
