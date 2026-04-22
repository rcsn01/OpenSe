import { test, expect } from '@playwright/test';

const openseUrl = process.env.BASE_URL_OPENSE || 'http://localhost:5994';

test.describe('OpenSe Landing', () => {
  test('landing page explains the suite and exposes product entry points', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /data pipelines and inventory operations, assembled into one suite/i })).toBeVisible();
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
    await expect(page.getByText(/Open-ETL/i).first()).toBeVisible();

    await page.goto('/');
    await page.getByTestId('nav-open-stoqr-product').click();
    await expect(page).toHaveURL(`${openseUrl}/stoqr`);
    await expect(page.getByText(/Inventory Control|Inventory Engine|Control your/i).first()).toBeVisible();
  });
});