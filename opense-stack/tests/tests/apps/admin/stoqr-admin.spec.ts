import { test, expect } from '../../fixtures/adminAuth';

test.describe('Admin Organization Profile', () => {
  test('users tab is reachable from organization profile', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/organisations');
    const firstOrg = authenticatedAdminPage.locator('tbody tr').first();
    test.skip(!(await firstOrg.isVisible().catch(() => false)), 'No organization rows available for profile navigation');

    await firstOrg.click();
    await expect(authenticatedAdminPage).toHaveURL(/\/organisations\/[^/]+/);

    const usersTab = authenticatedAdminPage.getByRole('button', { name: /users/i }).first();
    await usersTab.click();
    await expect(authenticatedAdminPage.getByRole('heading', { name: /users/i })).toBeVisible();
  });

  test('billing and invoices tab is reachable from organization profile', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/organisations');
    const firstOrg = authenticatedAdminPage.locator('tbody tr').first();
    test.skip(!(await firstOrg.isVisible().catch(() => false)), 'No organization rows available for profile navigation');

    await firstOrg.click();
    await expect(authenticatedAdminPage).toHaveURL(/\/organisations\/[^/]+/);

    const billingTab = authenticatedAdminPage.getByRole('button', { name: /billing\s*&\s*invoices/i }).first();
    await billingTab.click();
    await expect(authenticatedAdminPage.getByRole('heading', { name: /billing\s*&\s*invoices/i })).toBeVisible();
  });
});
