import { test, expect } from '../../fixtures/auth';
import { CreateProductPage, EditProductPage, ProductDetailPage } from '../../pages/AppPages';

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
});
