import type { Page } from '@playwright/test';
import { CreateProductPage, InventoryPage } from '../../pages/AppPages';
import { test, expect } from '../../fixtures/auth';

const openInventoryList = async (page: Page) => {
  const inventorySidebar = page.locator('.explorer-sidebar');
  const inventoryLink = page.getByRole('link', { name: /^Inventory$/i }).first();

  if (await inventoryLink.isVisible().catch(() => false)) {
    await inventoryLink.click();
  } else {
    await page.goto('/inventory/all', { waitUntil: 'domcontentloaded' });
  }

  await expect(page).toHaveURL(/\/inventory\/all(?:\?.*)?$/);
  await expect(inventorySidebar).toBeVisible();
};

test.describe('Stoqr Inventory selection actions', () => {
  test('select-all checkbox selects and clears visible products', async ({ authenticatedPage }) => {
    await openInventoryList(authenticatedPage);

    const productRows = authenticatedPage.locator('tbody tr');
    const visibleProductCount = await productRows.count();
    if (visibleProductCount === 0) {
      return;
    }

    const selectAll = authenticatedPage.getByLabel('Select all visible products');
    const selectionToolbar = authenticatedPage.locator('.inventory-toolbar.selection-mode');
    await expect(selectAll).toBeVisible();

    await selectAll.check();
    await expect(selectAll).toBeChecked();
    await expect(authenticatedPage.getByText(`${visibleProductCount} selected`)).toBeVisible();

    for (let index = 0; index < visibleProductCount; index += 1) {
      await expect(productRows.nth(index).locator('input[type="checkbox"]')).toBeChecked();
    }

    await selectAll.uncheck();
    await expect(selectAll).not.toBeChecked();
    await expect(selectionToolbar.getByRole('button', { name: /^Move$/ })).toHaveCount(0);
    await expect(selectionToolbar.getByRole('button', { name: /^Delete$/ })).toHaveCount(0);
  });

  test('selected products can be moved and deleted from the toolbar', async ({ authenticatedPage }) => {
    test.slow();

    const inventoryPage = new InventoryPage(authenticatedPage);
    const createProductPage = new CreateProductPage(authenticatedPage);
    const uniqueId = `${Date.now()}`;
    const folderName = `E2E Move Folder ${uniqueId}`;
    const productName = `!!! E2E Move Product ${uniqueId}`;
    const sku = `E2E-${uniqueId}`;

    await openInventoryList(authenticatedPage);

    await authenticatedPage.locator('button[title="New folder"]').click();

    const folderInput = authenticatedPage.locator('input[placeholder="Folder Name"]');
    await expect(folderInput).toBeVisible();
    await folderInput.fill(folderName);
    await authenticatedPage.getByRole('button', { name: 'Save' }).click();
    await expect(authenticatedPage.locator('.explorer-sidebar')).toContainText(folderName);

    await inventoryPage.addProductButton.click();
    await createProductPage.expectLoaded();
    await createProductPage.nameInput.fill(productName);
    await createProductPage.skuInput.fill(sku);
    await createProductPage.quantityInput.fill('5');
    await createProductPage.saveButton.click();

    await expect(authenticatedPage).toHaveURL(/\/inventory\/[^/]+\/overview$/);

    await openInventoryList(authenticatedPage);

    const productRow = authenticatedPage
      .locator('tbody tr')
      .filter({ has: authenticatedPage.getByRole('link', { name: productName }) })
      .first();
    const selectionToolbar = authenticatedPage.locator('.inventory-toolbar.selection-mode');

    await expect(productRow).toBeVisible();
    await productRow.locator('input[type="checkbox"]').check();

    await expect(selectionToolbar.getByRole('button', { name: /^Delete$/ })).toBeVisible();
    await expect(selectionToolbar.getByRole('button', { name: /^Move$/ })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Print Labels' })).toHaveCount(0);
    await expect(selectionToolbar.getByRole('button', { name: /^Export CSV$/ })).toBeVisible();

    await selectionToolbar.getByRole('button', { name: /^Move$/ }).click();

    const moveDialog = authenticatedPage.getByRole('dialog', { name: /move 1 selected product/i });
    await expect(moveDialog).toBeVisible();
    await authenticatedPage.getByLabel('Destination folder').selectOption({ label: folderName });
    await authenticatedPage.getByRole('button', { name: /move 1 product/i }).click();

    await expect(selectionToolbar.getByRole('button', { name: /^Move$/ })).toHaveCount(0);
    await openInventoryList(authenticatedPage);
    await expect(productRow).toBeVisible();
    await expect(productRow).toContainText(folderName);

    await productRow.locator('input[type="checkbox"]').check();
    await expect(selectionToolbar.getByRole('button', { name: /^Delete$/ })).toBeVisible();
    await expect(authenticatedPage.locator('[data-sonner-toast]')).toHaveCount(0);
    await authenticatedPage.evaluate(() => {
      window.confirm = () => true;
    });
    await selectionToolbar.getByRole('button', { name: /^Delete$/ }).click();

    await expect(productRow).toHaveCount(0);
  });
});