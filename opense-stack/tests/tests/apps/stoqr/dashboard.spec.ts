import { test, expect } from '../../fixtures/auth';
import { CreateProductPage, DashboardPage } from '../../pages/AppPages';

const createProduct = async (
  page: import('@playwright/test').Page,
  name: string,
  sku: string,
) => {
  const createProductPage = new CreateProductPage(page);

  await createProductPage.goto();
  await createProductPage.expectLoaded();
  await createProductPage.createProduct(name, sku, 5);
  await expect(page).toHaveURL(/\/inventory\/[^/]+\/overview$/);
};

test.describe('Stoqr Dashboard', () => {
  test('dashboard shows the key inventory and alert widgets', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);

    await dashboard.goto();
    await expect(authenticatedPage).toHaveURL(/\/dashboard(?:\?|$)/);

    await expect(authenticatedPage.getByText('Total Value').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Total Items').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Pending POs').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Out of Stock').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Low Stock').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Inbound vs Outbound Volume').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Actionable Alerts').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Item Velocity').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Expected Deliveries').first()).toBeVisible();
  });

  test('dashboard search opens the matching product overview', async ({ authenticatedPage }) => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const productName = `Dashboard Search Product ${uniqueId}`;
    const productSku = `DASH-${uniqueId}`;
    const dashboard = new DashboardPage(authenticatedPage);

    await createProduct(authenticatedPage, productName, productSku);
    await dashboard.goto();
    await dashboard.expectLoaded();

    const searchInput = authenticatedPage.getByRole('combobox', { name: 'Search items...' });
    await searchInput.fill(productName);
    await authenticatedPage.getByRole('option', { name: new RegExp(productName) }).click();

    await expect(authenticatedPage).toHaveURL(/\/inventory\/[^/]+\/overview$/);
    await expect(authenticatedPage.getByRole('heading', { name: productName })).toBeVisible();
  });
});
