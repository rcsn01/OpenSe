import { test } from '../../fixtures/auth';
import { expect } from '@playwright/test';

const expectReportTabs = async (page: import('@playwright/test').Page) => {
  await expect(page.getByRole('button', { name: /stock health & valuation/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /movement & velocity/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /procurement & suppliers/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /audits & shrinkage/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /custom & saved reports/i })).toBeVisible();
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
    await expect(authenticatedPage.getByText('Saved Templates')).toBeVisible();
    await expect(authenticatedPage.getByText('Report Builder')).toBeVisible();
    await expect(authenticatedPage.getByText('Scheduled Delivery')).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Generate Report' })).toBeVisible();
  });
});
