import { test, expect } from '../../fixtures/auth';
import { AlertsPage } from '../../pages/AppPages';

test.describe('Stoqr Alerts', () => {
  test('alerts feed shows delivered in-app alerts and bulk status controls', async ({ authenticatedPage }) => {
    const alertsPage = new AlertsPage(authenticatedPage);
    await alertsPage.goto();
    await alertsPage.expectLoaded();

    const feedTab = authenticatedPage.getByRole('button', { name: /alerts feed/i }).first();

    await expect(feedTab).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Alert Rules' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /notifications/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('button', { name: /email \/ push/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('button', { name: /history/i })).toHaveCount(0);

    await expect(authenticatedPage.getByText(/Low Stock Alert|No delivered alerts yet|is at .*Low Stock Alert level/i).first()).toBeVisible();

    await authenticatedPage.getByLabel('Select all visible alerts').click();
    await expect(authenticatedPage.getByRole('button', { name: 'Acknowledge' }).first()).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Resolve' }).first()).toBeVisible();
  });

  test('alert rules exposes low-stock trigger and role recipients', async ({ authenticatedPage }) => {
    const alertsPage = new AlertsPage(authenticatedPage);
    await alertsPage.goto();
    await alertsPage.expectLoaded();

    await authenticatedPage.getByRole('button', { name: 'Alert Rules' }).click();

    await expect(authenticatedPage).toHaveURL(/\/alerts\/rules$/);
    await expect(authenticatedPage.getByRole('heading', { name: 'Alert Triggers' })).toBeVisible();
    await expect(authenticatedPage.getByRole('heading', { name: /Low-Stock Trigger/i })).toBeVisible();
    await expect(authenticatedPage.getByLabel('Trigger type')).toHaveValue('low_stock');
    await expect(authenticatedPage.getByRole('switch', { name: 'In-app notifications enabled' })).toHaveAttribute('aria-checked', 'true');
    await expect(authenticatedPage.getByRole('button', { name: /Trigger/i })).toBeVisible();
  });

  test('alert rules search filters low-stock triggers', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/alerts/rules');

    const searchInput = authenticatedPage.getByRole('combobox', { name: 'Search alert rules...' });
    await expect(searchInput).toBeVisible();

    await searchInput.fill('low stock');

    await expect(authenticatedPage.getByText('Low stock alert').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Quantity on hand reaches Low Stock Alert level')).toBeVisible();
  });
});
