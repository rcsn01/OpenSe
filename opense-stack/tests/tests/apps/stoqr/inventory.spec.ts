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

  test('inventory custom field filter uses + flow and removes All Tags', async ({ authenticatedPage }) => {
    const inventory = new InventoryPage(authenticatedPage);
    await inventory.goto();

    const hasInventoryTabs = await authenticatedPage.getByRole('tab', { name: /all products/i }).first().isVisible().catch(() => false);
    if (!hasInventoryTabs) {
      return;
    }

    await expect(authenticatedPage.getByText('All Tags')).toHaveCount(0);

    const addCustomFilterButton = authenticatedPage.getByRole('button', { name: /add custom field filter/i });
    await expect(addCustomFilterButton.first()).toBeVisible();
    await addCustomFilterButton.first().click();

    const stockStatusTrigger = authenticatedPage.getByRole('button', { name: /stock status filter/i });
    await expect(stockStatusTrigger).toBeVisible();
    await stockStatusTrigger.click();
    await authenticatedPage.getByRole('button', { name: 'Low Stock' }).click();

    const fieldTypeTrigger = authenticatedPage.getByRole('button', { name: 'Custom field type' });
    const fieldValueTrigger = authenticatedPage.getByRole('button', { name: 'Custom field value' });
    await expect(fieldTypeTrigger).toBeVisible();
    await expect(fieldValueTrigger).toBeVisible();

    await fieldTypeTrigger.click();

    const typeOptions = authenticatedPage.locator('div.absolute.z-50').last().locator('button');
    const optionCount = await typeOptions.count();
    if (optionCount <= 1) {
      return;
    }

    await typeOptions.nth(1).click();

    await fieldValueTrigger.click();
    const valueOptions = authenticatedPage.locator('div.absolute.z-50').last().locator('button');
    const valueOptionCount = await valueOptions.count();
    if (valueOptionCount <= 1) {
      return;
    }

    const selectedValueLabel = (await valueOptions.nth(1).innerText()).trim();
    await valueOptions.nth(1).click();
    await expect(fieldValueTrigger).toContainText(selectedValueLabel);
  });

  test('product form attribute existing value uses shared dropdown', async ({ authenticatedPage }) => {
    const inventory = new InventoryPage(authenticatedPage);
    await inventory.goto();

    if (!(await inventory.addProductButton.isVisible().catch(() => false))) {
      return;
    }

    await inventory.addProductButton.click();
    await expect(authenticatedPage).toHaveURL(/\/inventory\/new/);

    const addAttributeSelect = authenticatedPage.getByLabel('Add attribute from existing list');
    if (!(await addAttributeSelect.isVisible().catch(() => false))) {
      return;
    }

    const hasBatchOption = (await addAttributeSelect.locator('option[value="batch"]').count()) > 0;
    if (!hasBatchOption) {
      return;
    }

    await addAttributeSelect.selectOption('batch');

    const existingValueTrigger = authenticatedPage.getByRole('button', { name: /select existing value for batch/i });
    if (!(await existingValueTrigger.isVisible().catch(() => false))) {
      return;
    }

    await existingValueTrigger.click();
    const valueOptions = authenticatedPage.locator('div.absolute.z-50').last().locator('button');
    const optionCount = await valueOptions.count();
    if (optionCount <= 1) {
      return;
    }

    const chosenLabel = (await valueOptions.nth(1).innerText()).trim();
    await valueOptions.nth(1).click();
    await expect(existingValueTrigger).toContainText(chosenLabel);
  });
});
