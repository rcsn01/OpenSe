import { test, expect } from '../../fixtures/auth';
import { CreateProductPage, EditProductPage, ProductDetailPage } from '../../pages/AppPages';

const createProduct = async (
  page: import('@playwright/test').Page,
  name: string,
  sku: string,
) => {
  const createProductPage = new CreateProductPage(page);

  await createProductPage.goto();
  await createProductPage.expectLoaded();
  await createProductPage.createProduct(name, sku, 3);
  await expect(page).toHaveURL(/\/inventory\/[^/]+\/overview$/);
};

const searchAndOpenProduct = async (
  page: import('@playwright/test').Page,
  productName: string,
) => {
  await page.getByRole('combobox', { name: 'Search items...' }).fill(productName);
  await page.getByRole('option', { name: new RegExp(productName) }).click();
};

test.describe('Stoqr Products', () => {
  test('create product flow opens an editable product form with saved changes', async ({ authenticatedPage }) => {
    const createProduct = new CreateProductPage(authenticatedPage);
    const editProduct = new EditProductPage(authenticatedPage);
    const detail = new ProductDetailPage(authenticatedPage);
    const productName = `E2E Product ${Date.now()}`;
    const updatedProductName = `${productName} Updated`;
    const productSku = `E2E-${Date.now()}`;

    await createProduct.goto();
    await createProduct.expectLoaded();

    await createProduct.createProduct(productName, productSku, 3);
    await expect(authenticatedPage).toHaveURL(/\/inventory\/[^/]+\/overview$/);
    await detail.expectLoaded();
    await expect(authenticatedPage.getByRole('heading', { name: productName })).toBeVisible();

    await detail.goToEdit();
    await expect(authenticatedPage).toHaveURL(/\/inventory\/[^/]+\/edit$/);
    await editProduct.expectLoaded();
    await expect(authenticatedPage.getByRole('heading', { name: /edit product/i })).toBeVisible();
    await expect(authenticatedPage.getByLabel(/product name/i)).toHaveValue(productName);
    await editProduct.updateName(updatedProductName);
    await editProduct.save();

    await expect(authenticatedPage).toHaveURL(/\/inventory\/[^/]+\/edit$/);
    await expect(authenticatedPage.getByLabel(/product name/i)).toHaveValue(updatedProductName);
  });

  test('shared search on create, detail, and edit pages can open another product', async ({ authenticatedPage }) => {
    const firstId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const secondId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const firstProductName = `Search Origin ${firstId}`;
    const secondProductName = `Search Target ${secondId}`;
    const firstProductSku = `SRC-${firstId}`;
    const secondProductSku = `DST-${secondId}`;
    const editProduct = new EditProductPage(authenticatedPage);

    await createProduct(authenticatedPage, firstProductName, firstProductSku);
    await createProduct(authenticatedPage, secondProductName, secondProductSku);

    await authenticatedPage.goto('/inventory/new');
    await expect(authenticatedPage.getByRole('heading', { name: /add product|add new product|new product|create product/i })).toBeVisible();
    await searchAndOpenProduct(authenticatedPage, secondProductName);
    await expect(authenticatedPage.getByRole('heading', { name: secondProductName })).toBeVisible();

    await searchAndOpenProduct(authenticatedPage, firstProductName);
    await expect(authenticatedPage.getByRole('heading', { name: firstProductName })).toBeVisible();

    await authenticatedPage.getByRole('button', { name: /edit product/i }).click();
    await editProduct.expectLoaded();
    await searchAndOpenProduct(authenticatedPage, secondProductName);

    await expect(authenticatedPage).toHaveURL(/\/inventory\/[^/]+\/overview$/);
    await expect(authenticatedPage.getByRole('heading', { name: secondProductName })).toBeVisible();
  });
});
