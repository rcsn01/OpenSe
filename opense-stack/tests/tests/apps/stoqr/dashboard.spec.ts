import { test, expect } from '../../fixtures/auth';
import { DashboardPage } from '../../pages/AppPages';

test.describe('Stoqr Dashboard', () => {
  test('dashboard shows the key inventory and alert widgets', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);

    await dashboard.goto();
    await expect(authenticatedPage).toHaveURL(/\/dashboard(?:\?|$)/);

    await expect(authenticatedPage.getByText('Total Inventory Value').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Total Items / SKUs').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Items Out of Stock').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Low Stock Items').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Inbound vs. Outbound Volume').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Needs Attention').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Item Velocity').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Expected Deliveries').first()).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /view all alerts/i })).toBeVisible();
  });
});
