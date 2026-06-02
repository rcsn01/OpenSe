import { test, expect } from '../../fixtures/auth';
import { CreateProductPage, InventoryPage } from '../../pages/AppPages';

test.describe('User Journey: Inventory Table Sorting', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    const createProduct = new CreateProductPage(authenticatedPage);
    const inventory = new InventoryPage(authenticatedPage);

    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await createProduct.goto();
    await createProduct.expectLoaded();
    await createProduct.createProduct(`Inventory Table Product ${uniqueSuffix}`, `INV-TABLE-${uniqueSuffix}`, 7);
    await expect(authenticatedPage).toHaveURL(/\/inventory\/[^/]+\/overview$/);

    await inventory.goto();
    await expect(authenticatedPage.getByRole('table').first()).toBeVisible();
  });

  test('inventory table shows the key product columns', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.getByRole('columnheader', { name: 'Name / SKU' })).toBeVisible();
    await expect(authenticatedPage.getByRole('columnheader', { name: 'Folder' })).toBeVisible();
    await expect(authenticatedPage.getByRole('columnheader', { name: 'Price' })).toBeVisible();
    await expect(authenticatedPage.getByRole('columnheader', { name: 'Available' })).toBeVisible();
  });

  test('available stock is shown as current stock over reorder point', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.getByRole('columnheader', { name: 'Available' })).toBeVisible();
    await expect(authenticatedPage.getByRole('cell', { name: /^\d+\s*\/\s*\d+$/ }).first()).toBeVisible();
  });

  test('sorting by folder updates the table sort direction', async ({ authenticatedPage }) => {
    const nameHeader = authenticatedPage.getByRole('columnheader', { name: 'Name / SKU' });
    const folderHeader = authenticatedPage.getByRole('columnheader', { name: 'Folder' });

    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    await expect(folderHeader).toHaveAttribute('aria-sort', 'none');

    await folderHeader.click();
    await expect(folderHeader).toHaveAttribute('aria-sort', 'ascending');
    await expect(nameHeader).toHaveAttribute('aria-sort', 'none');

    await folderHeader.click();
    await expect(folderHeader).toHaveAttribute('aria-sort', 'descending');
  });
});
