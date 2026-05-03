import { test, expect } from '../../fixtures/auth';
import { CreateProductPage, ScanPage } from '../../pages/AppPages';

const createProductForScan = async (page: import('@playwright/test').Page, name: string, sku: string) => {
  const createProductPage = new CreateProductPage(page);

  await createProductPage.goto();
  await createProductPage.expectLoaded();
  await createProductPage.createProduct(name, sku, 6);
  await expect(page).toHaveURL(/\/inventory\/[^/]+\/overview$/);
};

test.describe('Stoqr Scan', () => {
  test('scan actions shows camera controls, top-bar search, and history navigation', async ({ authenticatedPage }) => {
    const scanPage = new ScanPage(authenticatedPage);
    await scanPage.goto();
    await scanPage.expectLoaded();

    const searchInput = authenticatedPage.getByRole('combobox', { name: 'Search products...' });

    await expect(authenticatedPage.getByRole('button', { name: 'Scan' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'History' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /pick & pack/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('button', { name: /cycle count/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('button', { name: /putaway/i })).toHaveCount(0);

    await expect(searchInput).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /start camera/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /stop camera/i })).toHaveCount(0);
    await expect(authenticatedPage.getByText(/manual entry/i)).toHaveCount(0);

    await searchInput.fill('TEST-SKU-001');

    await expect(authenticatedPage.getByText('No product found for:')).toBeVisible();
    await expect(authenticatedPage.getByText('TEST-SKU-001')).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /search again/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /start camera/i })).toHaveCount(0);

    await authenticatedPage.keyboard.press('Escape');
    await authenticatedPage.getByRole('button', { name: 'History' }).click();
    await expect(authenticatedPage).toHaveURL(/\/scan\/scan-history(?:\?|$)/);
    await expect(authenticatedPage.getByText('No scan history yet.')).toBeVisible();

    await authenticatedPage.getByRole('button', { name: 'Scan' }).click();
    await expect(authenticatedPage).toHaveURL(/\/scan\/scan-actions(?:\?|$)/);
  });

  test('manual SKU entry shows stock controls for a seeded product', async ({ authenticatedPage }) => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const productName = `Scan Product ${uniqueId}`;
    const productSku = `SCAN-${uniqueId}`;

    await createProductForScan(authenticatedPage, productName, productSku);

    const scanPage = new ScanPage(authenticatedPage);
    await scanPage.goto();
    await scanPage.expectLoaded();

    const input = authenticatedPage.getByRole('combobox', { name: 'Search products...' });
    await input.fill(productSku);

    await expect(authenticatedPage.getByRole('heading', { name: productName })).toBeVisible();
    await expect(authenticatedPage.getByText(`SKU: ${productSku}`)).toBeVisible();
    await expect(authenticatedPage.getByText(/in stock/i)).toBeVisible();
    await expect(authenticatedPage.getByRole('radio', { name: /manual/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('radio', { name: /receive/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('radio', { name: /dispatch/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /mark out of stock/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /full restock/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /cancel/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /confirm update/i })).toBeDisabled();

    await authenticatedPage.getByRole('button', { name: /mark out of stock/i }).click();
    await expect(authenticatedPage.getByText('New stock level:')).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /confirm update/i })).toBeEnabled();
  });

  test('search again returns to initial scan view', async ({ authenticatedPage }) => {
    const scanPage = new ScanPage(authenticatedPage);
    await scanPage.goto();
    await scanPage.expectLoaded();

    const searchInput = authenticatedPage.getByRole('combobox', { name: 'Search products...' });
    await searchInput.fill('SOME-SKU');

    await expect(authenticatedPage.getByRole('button', { name: /search again/i })).toBeVisible();

    await authenticatedPage.getByRole('button', { name: /search again/i }).click();

    await expect(searchInput).toHaveValue('');
    await expect(authenticatedPage.getByText(/manual entry/i)).toHaveCount(0);
    await expect(authenticatedPage.getByRole('button', { name: /start camera/i })).toBeVisible();
  });
});
