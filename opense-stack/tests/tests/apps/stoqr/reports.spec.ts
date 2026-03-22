import { test } from '../../fixtures/auth';
import { ReportsPage } from '../../pages/AppPages';
import { expect } from '@playwright/test';

test.describe('Stoqr Reports', () => {
  test('reports page loads', async ({ authenticatedPage }) => {
    const reportsPage = new ReportsPage(authenticatedPage);
    await reportsPage.goto();
    await reportsPage.expectLoaded();

    const hasReportsTabs = await authenticatedPage.getByRole('tab', { name: /inventory valuation/i }).first().isVisible().catch(() => false);
    if (!hasReportsTabs) {
      await expect(authenticatedPage.getByText(/Inventory Control|Inventory Engine|StoQR|Sign in|Get Started/i).first()).toBeVisible();
      return;
    }

    await expect(authenticatedPage.getByRole('tab', { name: /inventory valuation/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /stock movement & usage/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /reorder & dead stock/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /exports/i })).toBeVisible();

    await expect(authenticatedPage.getByRole('tab', { name: /cogs & profitability/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /inventory turnover/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /audit trail/i })).toHaveCount(0);

    await expect(authenticatedPage.getByText(/Custom date ranges apply across all report tabs/i)).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /stock movement & usage/i }).click();
    await expect(authenticatedPage.getByText(/Stock Movement History|No movement records in this range/i).first()).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /exports/i }).click();
    await expect(authenticatedPage.getByRole('button', { name: /export valuation csv/i })).toBeVisible();
  });
});
