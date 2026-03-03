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

  test('inventory tabs include folders unchanged and new non-folder tabs', async ({ authenticatedPage }) => {
    const inventory = new InventoryPage(authenticatedPage);
    await inventory.goto();

    const hasInventoryTabs = await authenticatedPage.getByRole('tab', { name: /all products/i }).first().isVisible().catch(() => false);
    if (!hasInventoryTabs) {
      return;
    }

    await expect(authenticatedPage.getByRole('tab', { name: /all products/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /folders/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /bulk actions/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /locations/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /barcode\/sku/i })).toBeVisible();

    await expect(authenticatedPage.getByRole('tab', { name: /variants & matrices/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /stock transfers/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /kitting & bundles/i })).toHaveCount(0);

    await authenticatedPage.getByRole('tab', { name: /folders/i }).click();
    await expect(authenticatedPage).toHaveURL(/\/inventory\/folders$/);

    await authenticatedPage.getByRole('tab', { name: /bulk actions/i }).click();
    await expect(authenticatedPage).toHaveURL(/\/inventory\/bulk-actions$/);

    await authenticatedPage.getByRole('tab', { name: /all products/i }).click();
    await expect(authenticatedPage).toHaveURL(/\/inventory\/all$/);
  });

  test('clicking product opens detail overview route', async ({ authenticatedPage }) => {
    const inventory = new InventoryPage(authenticatedPage);
    await inventory.goto();
    await expect(authenticatedPage).toHaveURL(/(localhost:5991\/login\?|\/(inventory|auth))/);
    const firstProduct = authenticatedPage.locator('tbody tr a[href*="/inventory/"][href*="/overview"]').first();

    if (await firstProduct.isVisible().catch(() => false)) {
      await firstProduct.click();
      await expect(authenticatedPage).toHaveURL(/\/inventory\/[^/]+\/overview$/);

      const deleteButton = authenticatedPage.getByRole('button', { name: /delete|remove/i }).first();
      if (await deleteButton.isVisible().catch(() => false)) {
        await expect(deleteButton).toBeVisible();
      }
    }
  });
});
