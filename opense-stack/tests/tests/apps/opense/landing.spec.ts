import { test, expect } from '@playwright/test';

const openseUrl = process.env.BASE_URL_OPENSE || 'http://localhost:5994';

test.describe('OpenSe Landing', () => {
  test('landing page explains the suite and exposes product entry points', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /the open source\s+saas stack\s+for modern teams/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /own your infrastructure/i })).toBeVisible();
    await expect(page.getByTestId('nav-opense-product')).toBeVisible();
    await expect(page.getByTestId('nav-open-etl-product')).toBeVisible();
    await expect(page.getByTestId('nav-open-stoqr-product')).toBeVisible();
    await expect(page.getByTestId('nav-opense-product')).toHaveAttribute('href', '/');
    await expect(page.getByTestId('nav-open-etl-product')).toHaveAttribute('href', '/etl');
    await expect(page.getByTestId('nav-open-stoqr-product')).toHaveAttribute('href', '/stoqr');
    await expect(page.getByText(/Open-ETL/i).first()).toBeVisible();
    await expect(page.getByText(/Open-StoQR/i).first()).toBeVisible();
    await expect(page.getByTestId('launch-etl')).toBeVisible();
    await expect(page.getByTestId('launch-stoqr')).toBeVisible();
    await expect(page.getByTestId('launch-etl')).toHaveAttribute('href', '/etl');
    await expect(page.getByTestId('launch-stoqr')).toHaveAttribute('href', '/stoqr');

    await page.getByTestId('nav-open-etl-product').click();
    await expect(page).toHaveURL(`${openseUrl}/etl`);
    await expect(page.getByRole('heading', { name: /open-etl/i })).toBeVisible();

    await page.goto('/');
    await page.getByTestId('nav-open-stoqr-product').click();
    await expect(page).toHaveURL(`${openseUrl}/stoqr`);
    await expect(page.getByRole('heading', { name: /open-stoqr/i })).toBeVisible();
    await expect(page.getByTestId('product-feature-preview')).toHaveCount(8);
    for (const heading of [
      'Dashboard',
      'Inventory',
      'Scanner',
      'Label Studio',
      'Reports',
      'Procurement',
      'Alerts',
      'Organisation RBAC',
    ]) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
  });
});
