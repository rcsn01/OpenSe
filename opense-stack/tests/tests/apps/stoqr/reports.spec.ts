import { test } from '../../fixtures/auth';
import { expect } from '@playwright/test';

const expectReportTabs = async (page: import('@playwright/test').Page) => {
  await expect(page.getByRole('button', { name: /inventory health/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /stock movement/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /purchasing/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /stock accuracy/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /saved reports/i })).toBeVisible();
};

test.describe('Stoqr Reports', () => {
  test('stock health and valuation page loads', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/reports/stock-health');

    await expectReportTabs(authenticatedPage);
    await expect(authenticatedPage).toHaveURL(/\/reports\/stock-health/);
    await expect(authenticatedPage.getByText('Total Inventory Value')).toBeVisible();
    await expect(authenticatedPage.getByText('Aging Stock Analysis')).toBeVisible();
    await expect(authenticatedPage.getByText('Category Breakdown')).toBeVisible();
  });

  test('movement and velocity page loads', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/reports/movement-velocity');

    await expectReportTabs(authenticatedPage);
    await expect(authenticatedPage).toHaveURL(/\/reports\/movement-velocity/);
    await expect(authenticatedPage.getByRole('button', { name: '7 Days' })).toBeVisible();
    await expect(authenticatedPage.getByText('Inbound vs. Outbound Volume')).toBeVisible();
    await expect(authenticatedPage.getByText('Top Moving SKUs')).toBeVisible();
    await expect(authenticatedPage.getByRole('heading', { name: 'Recent Transfers' })).toBeVisible();
  });

  test('procurement and suppliers page loads', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/reports/procurement-suppliers');

    await expectReportTabs(authenticatedPage);
    await expect(authenticatedPage).toHaveURL(/\/reports\/procurement-suppliers/);
    await expect(authenticatedPage.getByText('Pending PO Value')).toBeVisible();
    await expect(authenticatedPage.getByText('Supplier Scorecard')).toBeVisible();
    await expect(authenticatedPage.getByText(/Price Variance/i)).toBeVisible();
  });

  test('audits and shrinkage page loads', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/reports/audits-shrinkage');

    await expectReportTabs(authenticatedPage);
    await expect(authenticatedPage).toHaveURL(/\/reports\/audits-shrinkage/);
    await expect(authenticatedPage.getByText('Total Shrinkage Value (YTD)')).toBeVisible();
    await expect(authenticatedPage.getByText('Shrinkage Reason Codes')).toBeVisible();
    await expect(authenticatedPage.getByText('Recent Discrepancy Log')).toBeVisible();
  });

  test('custom and saved reports page loads', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/reports/custom-saved');

    await expectReportTabs(authenticatedPage);
    await expect(authenticatedPage).toHaveURL(/\/reports\/custom-saved/);
    await expect(authenticatedPage.getByRole('heading', { name: 'Saved Templates' })).toBeVisible();
    await expect(authenticatedPage.getByRole('heading', { name: 'Report Builder' }).first()).toBeVisible();
    await expect(authenticatedPage.getByRole('heading', { name: 'Scheduled Delivery' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Generate Report' })).toBeVisible();
  });

  test('report search jumps to the selected report tab', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/reports/stock-health');

    const searchInput = authenticatedPage.getByRole('combobox', { name: 'Search reports...' });
    await expect(searchInput).toBeVisible();

    await searchInput.fill('custom saved');
    await authenticatedPage.getByRole('option', { name: /Saved Reports/i }).click();

    await expect(authenticatedPage).toHaveURL(/\/reports\/custom-saved$/);
    await expect(authenticatedPage.getByRole('heading', { name: 'Saved Templates' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Generate Report' })).toBeVisible();
  });
});
