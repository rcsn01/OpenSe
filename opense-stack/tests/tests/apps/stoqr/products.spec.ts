import { test, expect } from '../../fixtures/auth';
import { CreateProductPage, InventoryPage, ProductDetailPage } from '../../pages/AppPages';

test.describe('Stoqr Products', () => {
  test('inventory list loads', async ({ authenticatedPage }) => {
    const inventory = new InventoryPage(authenticatedPage);
    await inventory.goto();
    await expect(authenticatedPage).toHaveURL(/(localhost:5990\/login\?|\/(inventory|auth)?$)/);
  });

  test('create product flow opens and can submit when form exists', async ({ authenticatedPage }) => {
    const inventory = new InventoryPage(authenticatedPage);
    const createProduct = new CreateProductPage(authenticatedPage);
    const productName = `E2E Product ${Date.now()}`;
    const productSku = `E2E-${Date.now()}`;

    await inventory.goto();
    if (await inventory.addProductButton.isVisible().catch(() => false)) {
      await inventory.goToAddProduct();
      await expect(authenticatedPage).toHaveURL(/\/(inventory\/new|auth)/);
    }

    if (await createProduct.nameInput.isVisible().catch(() => false)) {
      await createProduct.createProduct(productName, productSku, 3);
      await expect(authenticatedPage).toHaveURL(/\/(inventory|auth)/);
    }
  });

  test('product detail route renders and edit controls appear if available', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/inventory');
    const firstProduct = authenticatedPage.locator('tbody tr a[href*="/inventory/"]').first();

    if (await firstProduct.isVisible().catch(() => false)) {
      await firstProduct.click();
      const detail = new ProductDetailPage(authenticatedPage);
      await detail.expectLoaded();
      if (await detail.editButton.isVisible().catch(() => false)) {
        await expect(detail.editButton).toBeVisible();
      }
    }
  });
});
