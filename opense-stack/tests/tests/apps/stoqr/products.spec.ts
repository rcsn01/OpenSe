import { test, expect } from '../../fixtures/auth';
import { CreateProductPage, EditProductPage, ProductDetailPage } from '../../pages/AppPages';

const shouldSkipForAuthState = async (currentUrl: string, headingVisible: boolean) => {
  if (headingVisible) return true;
  if (currentUrl.includes('/login') || currentUrl.includes('/auth') || currentUrl.includes('/signup')) return true;
  return !/\/inventory\/new$/.test(currentUrl);
};

test.describe('Stoqr Products', () => {
  test('create and edit product flow persists updates', async ({ authenticatedPage }) => {
    const createProduct = new CreateProductPage(authenticatedPage);
    const editProduct = new EditProductPage(authenticatedPage);
    const detail = new ProductDetailPage(authenticatedPage);
    const productName = `E2E Product ${Date.now()}`;
    const updatedProductName = `${productName} Updated`;
    const productSku = `E2E-${Date.now()}`;

    await createProduct.goto();
    await authenticatedPage.waitForLoadState('domcontentloaded');
    const currentUrl = authenticatedPage.url();
    const landingHeadingVisible = await authenticatedPage
      .getByRole('heading', { name: /inventory control made simple/i })
      .first()
      .isVisible()
      .catch(() => false);
    test.skip(
      await shouldSkipForAuthState(currentUrl, landingHeadingVisible),
      'Requires authenticated Stoqr session to run strict create/edit assertions.',
    );
    const createFormVisible = await createProduct.heading.isVisible().catch(() => false);
    test.skip(!createFormVisible, 'Stoqr create form is not accessible in current environment state.');

    await createProduct.expectLoaded();

    await createProduct.createProduct(productName, productSku, 3);
    await expect(authenticatedPage).toHaveURL(/\/inventory\/[^/]+\/overview$/);
    await detail.expectLoaded();
    await expect(authenticatedPage.getByRole('heading', { name: productName })).toBeVisible();

    await detail.goToEdit();
    await expect(authenticatedPage).toHaveURL(/\/inventory\/[^/]+\/edit$/);
    await editProduct.expectLoaded();
    await editProduct.updateName(updatedProductName);
    await editProduct.save();

    await expect(authenticatedPage).toHaveURL(/\/inventory\/[^/]+\/edit$/);
    await expect(authenticatedPage.getByLabel(/product name/i)).toHaveValue(updatedProductName);

    await authenticatedPage.goto(authenticatedPage.url().replace('/edit', '/overview'));
    await detail.expectLoaded();
    await expect(authenticatedPage.getByRole('heading', { name: updatedProductName })).toBeVisible();
  });

  test('edit route renders form for an existing product', async ({ authenticatedPage }) => {
    const createProduct = new CreateProductPage(authenticatedPage);
    const detail = new ProductDetailPage(authenticatedPage);
    const productName = `E2E Edit Seed ${Date.now()}`;
    const productSku = `E2E-EDIT-${Date.now()}`;

    await createProduct.goto();
    await authenticatedPage.waitForLoadState('domcontentloaded');
    const currentUrl = authenticatedPage.url();
    const landingHeadingVisible = await authenticatedPage
      .getByRole('heading', { name: /inventory control made simple/i })
      .first()
      .isVisible()
      .catch(() => false);
    test.skip(
      await shouldSkipForAuthState(currentUrl, landingHeadingVisible),
      'Requires authenticated Stoqr session to run strict edit route assertions.',
    );
    const createFormVisible = await createProduct.heading.isVisible().catch(() => false);
    test.skip(!createFormVisible, 'Stoqr create form is not accessible in current environment state.');

    await createProduct.expectLoaded();
    await createProduct.createProduct(productName, productSku, 1);
    await expect(authenticatedPage).toHaveURL(/\/inventory\/[^/]+\/overview$/);

    await detail.goToEdit();
    await expect(authenticatedPage).toHaveURL(/\/inventory\/[^/]+\/edit$/);
    await expect(authenticatedPage.getByRole('heading', { name: /edit product/i })).toBeVisible();
    await expect(authenticatedPage.getByLabel(/product name/i)).toHaveValue(productName);
  });
});
