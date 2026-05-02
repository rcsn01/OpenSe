import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/auth';
import { CreateProductPage, InventoryPage } from '../../pages/AppPages';

const createInventoryProduct = async (page: Page, name: string, sku: string, quantity: number) => {
  const createProductPage = new CreateProductPage(page);

  await createProductPage.goto();
  await createProductPage.expectLoaded();
  await createProductPage.createProduct(name, sku, quantity);
  await expect(page).toHaveURL(/\/inventory\/[^/]+\/overview$/);
};

test.describe('Stoqr Inventory', () => {
  test('inventory list opens with folder navigation and product actions', async ({ authenticatedPage }) => {
    const inventory = new InventoryPage(authenticatedPage);
    const sidebar = authenticatedPage.getByRole('complementary', { name: /folder navigation/i });

    await inventory.goto();

    await expect(authenticatedPage).toHaveURL(/\/inventory\/all(?:\?|$)/);
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText('All Products', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('Folders', { exact: true })).toBeVisible();
    await expect(authenticatedPage.getByText('All Tags')).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /all products/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /folders/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('button', { name: /new product/i })).toBeVisible();
  });

  test('new product action opens the create product form', async ({ authenticatedPage }) => {
    const inventory = new InventoryPage(authenticatedPage);
    const createProductPage = new CreateProductPage(authenticatedPage);

    await inventory.goto();
    await inventory.addProductButton.click();

    await expect(authenticatedPage).toHaveURL(/\/inventory\/new(?:\?|$)/);
    await createProductPage.expectLoaded();
  });

  test('created product appears in inventory and opens its overview page', async ({ authenticatedPage }) => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const productName = `Inventory Product ${uniqueId}`;
    const productSku = `INV-${uniqueId}`;
    const inventory = new InventoryPage(authenticatedPage);

    await createInventoryProduct(authenticatedPage, productName, productSku, 3);
    await inventory.goto();

    const productLink = authenticatedPage.getByRole('link', { name: productName }).first();
    await expect(productLink).toBeVisible();
    await productLink.click();

    await expect(authenticatedPage).toHaveURL(/\/inventory\/[^/]+\/overview$/);
    await expect(authenticatedPage.getByRole('heading', { name: productName })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /edit/i })).toBeVisible();
  });

  test('items per page selector offers the supported inventory sizes', async ({ authenticatedPage }) => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const inventory = new InventoryPage(authenticatedPage);

    await createInventoryProduct(
      authenticatedPage,
      `Pagination Product ${uniqueId}`,
      `PAGE-${uniqueId}`,
      5,
    );
    await inventory.goto();

    const itemsPerPage = authenticatedPage.getByRole('combobox', { name: 'Items per page' });
    await expect(itemsPerPage).toBeVisible();

    const optionValues = await itemsPerPage.locator('option').evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    );

    expect(optionValues).toEqual(['10', '20', '50']);

    await itemsPerPage.selectOption('20');
    await expect(itemsPerPage).toHaveValue('20');

    await itemsPerPage.selectOption('50');
    await expect(itemsPerPage).toHaveValue('50');
  });
});
