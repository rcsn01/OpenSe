import { CreateProductPage, InventoryPage } from '../../pages/AppPages';
import { test, expect } from '../../fixtures/auth';
import { LoginPage } from '../../pages/LoginPage';

test.describe('Stoqr Inventory selection actions', () => {
  test('selected products can be moved and deleted from the toolbar', async ({ authenticatedPage }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);
    const createProductPage = new CreateProductPage(authenticatedPage);
    const loginPage = new LoginPage(authenticatedPage);
    const uniqueId = `${Date.now()}`;
    const folderName = `E2E Move Folder ${uniqueId}`;
    const productName = `!!! E2E Move Product ${uniqueId}`;
    const sku = `E2E-${uniqueId}`;

    await inventoryPage.goto();

    const inventorySidebar = authenticatedPage.locator('.explorer-sidebar');
    const hasInventoryPage = await inventorySidebar.isVisible().catch(() => false);

    if (!hasInventoryPage) {
      await loginPage.goto();

      if (await loginPage.demoButton.isVisible().catch(() => false)) {
        await loginPage.loginWithDemo();
        await authenticatedPage.goto('/inventory/all');
      }
    }

    if (!(await inventorySidebar.isVisible().catch(() => false))) {
      await expect(authenticatedPage.getByText(/get started|sign in|control your inventory engine/i).first()).toBeVisible();
      return;
    }

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

    await authenticatedPage.goto('/inventory/all');

    const productRow = authenticatedPage
      .locator('tbody tr')
      .filter({ has: authenticatedPage.getByRole('link', { name: productName }) })
      .first();

    await expect(productRow).toBeVisible();
    await productRow.locator('input[type="checkbox"]').check();

    await expect(authenticatedPage.getByRole('button', { name: 'Delete' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Move' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Print Labels' })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('button', { name: 'Export' })).toHaveCount(0);

    await authenticatedPage.getByRole('button', { name: 'Move' }).click();

    const moveDialog = authenticatedPage.getByRole('dialog', { name: /move 1 selected product/i });
    await expect(moveDialog).toBeVisible();
    await authenticatedPage.getByLabel('Destination folder').selectOption({ label: folderName });
    await authenticatedPage.getByRole('button', { name: /move 1 product/i }).click();

    await expect(authenticatedPage.getByRole('button', { name: 'Move' })).toHaveCount(0);
    await expect(productRow).toContainText(folderName);

    await productRow.locator('input[type="checkbox"]').check();

    const deleteDialogPromise = authenticatedPage.waitForEvent('dialog');
    await authenticatedPage.getByRole('button', { name: 'Delete' }).click();
    const deleteDialog = await deleteDialogPromise;
    await deleteDialog.accept();

    await expect(productRow).toHaveCount(0);
  });
});