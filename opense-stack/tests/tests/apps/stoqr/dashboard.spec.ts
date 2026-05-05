import { test, expect } from '../../fixtures/auth';
import { DashboardPage } from '../../pages/AppPages';

test.describe('Stoqr Dashboard', () => {
  test('dashboard shows the key inventory and alert widgets', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);

    await dashboard.goto();
    await expect(authenticatedPage).toHaveURL(/\/dashboard(?:\?|$)/);

    await expect(authenticatedPage.getByText('Total Value').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Total Items').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Pending POs').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Out of Stock').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Low Stock').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Inbound vs Outbound Volume').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Actionable Alerts').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Item Velocity').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Expected Deliveries').first()).toBeVisible();
  });
});
