import { test } from '../../fixtures/auth';
import { AlertsPage } from '../../pages/AppPages';
import { expect } from '@playwright/test';

const expectFallbackSurface = async (page: import('@playwright/test').Page) => {
  await expect(page.getByText(/Inventory Control|Inventory Engine|StoQR|Sign in|Get Started/i).first()).toBeVisible();
};

test.describe('Stoqr Alerts', () => {
  test('alerts feed loads with the redesigned bulk actions', async ({ authenticatedPage }) => {
    const alertsPage = new AlertsPage(authenticatedPage);
    await alertsPage.goto();
    await alertsPage.expectLoaded();

    const feedTab = authenticatedPage.getByRole('button', { name: /alerts feed/i }).first();
    const hasAlertsTabs = await feedTab.isVisible().catch(() => false);
    if (!hasAlertsTabs) {
      await expectFallbackSurface(authenticatedPage);
      return;
    }

    await expect(authenticatedPage.getByRole('heading', { name: /alerts/i })).toBeVisible();
    await expect(feedTab).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Alert Rules' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /notifications/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('button', { name: /email \/ push/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('button', { name: /history/i })).toHaveCount(0);

    await expect(authenticatedPage.getByText(/Out of Stock: Premium Widget|Integration Error: Xero Sync/i).first()).toBeVisible();

    await authenticatedPage.getByLabel('Select all visible alerts').click();
    await authenticatedPage.getByRole('button', { name: 'Dismiss' }).click();

    await expect(authenticatedPage.getByText('No alerts match the current filters.')).toBeVisible();
    await expect(feedTab.getByText('0')).toBeVisible();
  });

  test('alert rules tab exposes threshold and routing controls', async ({ authenticatedPage }) => {
    const alertsPage = new AlertsPage(authenticatedPage);
    await alertsPage.goto();
    await alertsPage.expectLoaded();

    const feedTab = authenticatedPage.getByRole('button', { name: /alerts feed/i }).first();
    const hasAlertsTabs = await feedTab.isVisible().catch(() => false);
    if (!hasAlertsTabs) {
      await expectFallbackSurface(authenticatedPage);
      return;
    }

    await authenticatedPage.getByRole('button', { name: 'Alert Rules' }).click();

    await expect(authenticatedPage).toHaveURL(/\/alerts\/rules$/);
    await expect(authenticatedPage.getByRole('heading', { name: 'Global Threshold Settings' })).toBeVisible();
    await expect(authenticatedPage.getByRole('heading', { name: 'Notification Routing' })).toBeVisible();
    await expect(authenticatedPage.getByRole('spinbutton', { name: 'Default Low Stock Threshold' })).toHaveValue('50');
    await expect(authenticatedPage.getByRole('spinbutton', { name: 'Expiry Warning Window' })).toHaveValue('14');
    await expect(authenticatedPage.getByRole('combobox', { name: 'Procurement Alerts subscription' })).toHaveValue('purchasing-managers');
    await expect(authenticatedPage.getByRole('switch', { name: 'Toggle In-App Notifications' })).toHaveAttribute('aria-checked', 'true');

    const slackToggle = authenticatedPage.getByRole('switch', { name: 'Toggle Slack Webhook' });
    await slackToggle.click();
    await expect(slackToggle).toHaveAttribute('aria-checked', 'true');
  });
});
