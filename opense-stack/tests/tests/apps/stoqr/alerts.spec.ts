import { test, expect } from '../../fixtures/auth';
import { AlertsPage } from '../../pages/AppPages';

test.describe('Stoqr Alerts', () => {
  test('alerts feed shows visible alerts and bulk dismiss controls', async ({ authenticatedPage }) => {
    const alertsPage = new AlertsPage(authenticatedPage);
    await alertsPage.goto();
    await alertsPage.expectLoaded();

    const feedTab = authenticatedPage.getByRole('button', { name: /alerts feed/i }).first();

    await expect(authenticatedPage.getByRole('heading', { name: /alerts/i })).toBeVisible();
    await expect(feedTab).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Alert Rules' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /notifications/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('button', { name: /email \/ push/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('button', { name: /history/i })).toHaveCount(0);

    await expect(authenticatedPage.getByText(/Out of Stock: Premium Widget|Integration Error: Xero Sync/i).first()).toBeVisible();

    await authenticatedPage.getByLabel('Select all visible alerts').click();
    await expect(authenticatedPage.getByRole('button', { name: 'Dismiss' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Dismiss' })).toBeEnabled();
  });

  test('alert rules exposes threshold and routing controls', async ({ authenticatedPage }) => {
    const alertsPage = new AlertsPage(authenticatedPage);
    await alertsPage.goto();
    await alertsPage.expectLoaded();

    await authenticatedPage.getByRole('button', { name: 'Alert Rules' }).click();

    await expect(authenticatedPage).toHaveURL(/\/alerts\/rules$/);
    await expect(authenticatedPage.getByRole('heading', { name: 'Global Threshold Settings' })).toBeVisible();
    await expect(authenticatedPage.getByRole('heading', { name: 'Notification Routing' })).toBeVisible();
    await expect(authenticatedPage.getByRole('spinbutton', { name: 'Default Low Stock Threshold' })).toHaveValue('50');
    await expect(authenticatedPage.getByRole('spinbutton', { name: 'Expiry Warning Window' })).toHaveValue('14');
    await expect(authenticatedPage.getByRole('combobox', { name: 'Procurement Alerts subscription' })).toHaveValue('purchasing-managers');
    await expect(authenticatedPage.getByRole('switch', { name: 'Toggle In-App Notifications' })).toHaveAttribute('aria-checked', 'true');
    await expect(authenticatedPage.getByRole('switch', { name: 'Toggle Slack Webhook' })).toBeVisible();
  });

  test('alert rules search filters the visible rule controls', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/alerts/rules');

    const searchInput = authenticatedPage.getByRole('combobox', { name: 'Search alert rules...' });
    await expect(searchInput).toBeVisible();

    await searchInput.fill('slack');

    await expect(authenticatedPage.getByText('Slack Webhook')).toBeVisible();
    await expect(authenticatedPage.getByRole('switch', { name: 'Toggle Slack Webhook' })).toBeVisible();
    await expect(authenticatedPage.getByText('In-App Notifications')).toHaveCount(0);
    await expect(authenticatedPage.getByLabel('Default Low Stock Threshold')).toHaveCount(0);
  });
});
