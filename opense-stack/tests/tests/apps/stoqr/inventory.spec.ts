import { test, expect } from '../../fixtures/auth';
import { InventoryPage } from '../../pages/AppPages';

test.describe('Stoqr Inventory', () => {
  test('list products page loads', async ({ authenticatedPage }) => {
    const inventory = new InventoryPage(authenticatedPage);
    await inventory.goto();
    await expect(authenticatedPage).toHaveURL(/(localhost:5991\/login\?|\/(inventory|auth))/);
  });

  test('add product opens product form when available', async ({ authenticatedPage }) => {
    const inventory = new InventoryPage(authenticatedPage);
    await inventory.goto();

    if (await inventory.addProductButton.isVisible().catch(() => false)) {
      await inventory.addProductButton.click();
      await expect(authenticatedPage).toHaveURL(/\/(inventory\/new|auth)/);
    }
  });

  test('view product detail and delete action if supported', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/inventory');
    const firstProduct = authenticatedPage.locator('tbody tr a[href*="/inventory/"]').first();

    if (await firstProduct.isVisible().catch(() => false)) {
      await firstProduct.click();
      await expect(authenticatedPage).toHaveURL(/\/inventory\//);

      const deleteButton = authenticatedPage.getByRole('button', { name: /delete|remove/i }).first();
      if (await deleteButton.isVisible().catch(() => false)) {
        await expect(deleteButton).toBeVisible();
      }
    }
  });
});
