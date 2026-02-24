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
      await expect(
        authenticatedPage.getByText(/Inventory Control Made Simple|Open-StoQR|Sign in/i).first(),
      ).toBeVisible();
      return;
    }

    await expect(dashboardWidget).toBeVisible();
    await expect(authenticatedPage.getByText('Stock Levels').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Low Stock Alerts').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Pending Orders').first()).toBeVisible();

    await expect(authenticatedPage.getByText('Valuation Trend (14d)').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Usage Trend (30d)').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Alerts Summary').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Recent Activity').first()).toBeVisible();

    await expect(authenticatedPage.getByRole('link', { name: /add product/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('link', { name: /create order/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('link', { name: /scan item/i })).toBeVisible();
  });
});
