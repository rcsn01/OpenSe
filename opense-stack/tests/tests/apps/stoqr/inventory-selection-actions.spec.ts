import type { Page } from '@playwright/test';
import { CreateProductPage, InventoryPage } from '../../pages/AppPages';
import { test, expect } from '../../fixtures/auth';

const openInventoryList = async (page: Page) => {
  const inventory = new InventoryPage(page);
  await inventory.goto();
};

const createInventoryProduct = async (page: Page, name: string, sku: string, quantity: number) => {
  const createProductPage = new CreateProductPage(page);

  await createProductPage.goto();
  await createProductPage.expectLoaded();
  await createProductPage.createProduct(name, sku, quantity);
  await expect(page).toHaveURL(/\/inventory\/[^/]+\/overview$/);
};

const createFolder = async (page: Page, folderName: string) => {
  await openInventoryList(page);
  const navigation = page.getByRole('complementary', { name: /folder navigation/i });
  const folderRows = navigation.locator('.tree-item-folder');
  const input = navigation.getByPlaceholder('Folder Name');

  if (await folderRows.count()) {
    const firstFolder = folderRows.first();
    await expect(firstFolder).toBeVisible();
    await firstFolder.hover();
    await firstFolder.getByRole('button', { name: /add subfolder to/i }).click();
  } else {
    await navigation.getByRole('button', { name: /create first folder/i }).click();
  }

  await input.fill(folderName);
  await input.press('Enter');
  await expect(page.locator('.explorer-sidebar')).toContainText(folderName);
};

test.describe('Stoqr Inventory selection actions', () => {
  test('select-all checkbox selects and clears visible products', async ({ authenticatedPage }) => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await createInventoryProduct(
      authenticatedPage,
      `Selection Product ${uniqueId}`,
      `SEL-${uniqueId}`,
      4,
    );
    await openInventoryList(authenticatedPage);

    const productRows = authenticatedPage.locator('tbody tr');
    const visibleProductCount = await productRows.count();
    const selectAll = authenticatedPage.getByLabel('Select all visible products');

    await expect(selectAll).toBeVisible();
    expect(visibleProductCount).toBeGreaterThan(0);

    await selectAll.check();
    await expect(selectAll).toBeChecked();
    await expect(authenticatedPage.getByText(`${visibleProductCount} selected`)).toBeVisible();

    for (let index = 0; index < visibleProductCount; index += 1) {
      await expect(productRows.nth(index).locator('input[type="checkbox"]')).toBeChecked();
    }

    await selectAll.uncheck();
    await expect(selectAll).not.toBeChecked();
    await expect(authenticatedPage.getByRole('button', { name: /^Move$/ })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('button', { name: /^Delete$/ })).toHaveCount(0);
  });

  test('selected products can be moved and deleted from the toolbar', async ({ authenticatedPage }) => {
    test.slow();

    const uniqueId = `${Date.now()}`;
    const folderName = `E2E Move Folder ${uniqueId}`;
    const productName = `!!! E2E Move Product ${uniqueId}`;
    const sku = `E2E-${uniqueId}`;

    await createFolder(authenticatedPage, folderName);
    await createInventoryProduct(authenticatedPage, productName, sku, 5);

    await openInventoryList(authenticatedPage);

    const productRow = authenticatedPage
      .locator('tbody tr')
      .filter({ has: authenticatedPage.getByRole('link', { name: productName }) })
      .first();
    const selectionTopRow = authenticatedPage.locator('thead tr').filter({ hasText: '1 selected' });

    await expect(productRow).toBeVisible();
    await productRow.locator('input[type="checkbox"]').check();

    await expect(selectionTopRow.getByRole('button', { name: /^Delete$/ })).toBeVisible();
    await expect(selectionTopRow.getByRole('button', { name: /^Move$/ })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Print Labels' })).toHaveCount(0);
    await expect(selectionTopRow.getByRole('button', { name: /^Export CSV$/ })).toBeVisible();

    await selectionTopRow.getByRole('button', { name: /^Move$/ }).click();

    const moveDialog = authenticatedPage.locator('[role="dialog"]').filter({ hasText: 'Move 1 selected product' });
    await expect(moveDialog).toBeVisible();
    const destinationFolder = authenticatedPage.getByLabel('Destination folder');
    const destinationValue = await destinationFolder
      .locator('option')
      .filter({ hasText: folderName })
      .last()
      .getAttribute('value');
    expect(destinationValue).toBeTruthy();
    await destinationFolder.selectOption(destinationValue!);
    await authenticatedPage.getByRole('button', { name: /move 1 product/i }).click();

    await expect(selectionTopRow.getByRole('button', { name: /^Move$/ })).toHaveCount(0);
    await openInventoryList(authenticatedPage);
    await expect(productRow).toBeVisible();
    await expect(productRow).toContainText(folderName);

    await productRow.locator('input[type="checkbox"]').check();
    await expect(selectionTopRow.getByRole('button', { name: /^Delete$/ })).toBeVisible();
    await expect(authenticatedPage.locator('[data-sonner-toast]')).toHaveCount(0);

    authenticatedPage.once('dialog', (dialog) => {
      expect(dialog.message()).toContain('Are you sure you want to delete 1 items?');
      void dialog.accept();
    });
    await selectionTopRow.getByRole('button', { name: /^Delete$/ }).click();

    await expect(productRow).toHaveCount(0);
  });
});
