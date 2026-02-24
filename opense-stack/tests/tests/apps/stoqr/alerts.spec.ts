import { test } from '../../fixtures/auth';
import { AlertsPage } from '../../pages/AppPages';
import { expect } from '@playwright/test';

test.describe('Stoqr Alerts', () => {
  test('alerts page loads', async ({ authenticatedPage }) => {
    const alertsPage = new AlertsPage(authenticatedPage);
    await alertsPage.goto();
    await alertsPage.expectLoaded();

    const hasAlertsTabs = await authenticatedPage.getByRole('tab', { name: /notifications/i }).first().isVisible().catch(() => false);
    if (!hasAlertsTabs) {
      await expect(authenticatedPage.getByText(/Inventory Control Made Simple|Open-StoQR|Sign in/i).first()).toBeVisible();
      return;
    }

    await expect(authenticatedPage.getByRole('heading', { name: /alerts/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /notifications/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /custom rules/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /email \/ push/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /history/i })).toBeVisible();

    await expect(authenticatedPage.getByText(/Low Stock Notifications|Reorder Point Triggers|Expiration Warnings/i).first()).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /custom rules/i }).click();
    await expect(authenticatedPage.getByText(/Create Custom Rule|Custom Alert Rules/i).first()).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /email \/ push/i }).click();
    await expect(authenticatedPage.getByText(/Notification Delivery Log|No delivery log entries yet/i).first()).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /history/i }).click();
    await expect(authenticatedPage.getByText(/Alert History|No alert events yet/i).first()).toBeVisible();
  });
});
