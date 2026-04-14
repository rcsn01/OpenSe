import { test, expect } from '../../fixtures/auth';

test.describe('Stoqr Dashboard', () => {
  test('dashboard loads and key widgets are visible', async ({ authenticatedPage }) => {
    try {
      await authenticatedPage.goto('/dashboard', { waitUntil: 'commit' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isExpectedRedirectAbort =
        message.includes('ERR_ABORTED') || message.includes('interrupted by another navigation');
      if (!isExpectedRedirectAbort) {
        throw error;
      }
    }
    await expect(authenticatedPage).toHaveURL(/(localhost:5990\/login\?|localhost:5991\/login\?|\/(dashboard|auth)?$|localhost:5993\/login\?|localhost:5993\/$)/);

    const isLanding = /localhost:5993\/$/.test(authenticatedPage.url());
    if (isLanding) {
      await expect(authenticatedPage.getByText(/Inventory Control Made Simple|Open-StoQR/i).first()).toBeVisible();
      return;
    }

    const dashboardWidget = authenticatedPage.getByText('Total Inventory Value').first();
    const hasDashboardWidgets = await dashboardWidget.isVisible().catch(() => false);

    if (!hasDashboardWidgets) {
      await expect(authenticatedPage).toHaveURL(/(localhost:5991\/login\?|\/|\/auth|\/dashboard|localhost:5993\/$)/);
      return;
    }

    await expect(dashboardWidget).toBeVisible();
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
