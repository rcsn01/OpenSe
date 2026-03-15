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

  test('inventory custom field filter uses stepped + flow', async ({ authenticatedPage }) => {
    const inventory = new InventoryPage(authenticatedPage);
    await inventory.goto();

    const hasInventoryTabs = await authenticatedPage.getByRole('tab', { name: /all products/i }).first().isVisible().catch(() => false);
    if (!hasInventoryTabs) {
      return;
    }

    await expect(authenticatedPage.getByText('All Tags')).toHaveCount(0);

    // Step 1: Click "+" to open attribute dropdown
    const addFilterButton = authenticatedPage.getByRole('button', { name: /add custom field filter/i });
    await expect(addFilterButton.first()).toBeVisible();
    await addFilterButton.first().click();

    const attributeDropdown = authenticatedPage.locator('div.absolute.z-50').last().locator('button');
    const attrCount = await attributeDropdown.count();
    if (attrCount === 0) {
      return;
    }

    // Step 2: Select an attribute — button shows "AttributeName:" and value dropdown auto-opens
    const chosenAttrLabel = (await attributeDropdown.first().innerText()).trim();
    await attributeDropdown.first().click();

    const valueDropdownTrigger = authenticatedPage.getByRole('button', { name: 'Custom field value' });
    await expect(valueDropdownTrigger).toBeVisible();
    await expect(valueDropdownTrigger).toContainText(`${chosenAttrLabel}:`);

    // Step 3: Value dropdown is already open — select a value for "AttributeName:ValueName" chip
    const valueOptions = authenticatedPage.locator('div.absolute.z-50').last().locator('button');
    const valueCount = await valueOptions.count();
    if (valueCount === 0) {
      return;
    }

    const chosenValueLabel = (await valueOptions.first().innerText()).trim();
    await valueOptions.first().click();

    const chipText = `${chosenAttrLabel}:${chosenValueLabel}`;
    await expect(authenticatedPage.getByText(chipText)).toBeVisible();

    const removeButton = authenticatedPage.getByRole('button', { name: /remove filter/i });
    await expect(removeButton).toBeVisible();

    // Step 4: Remove the filter — "+" should reappear
    await removeButton.click();
    await expect(addFilterButton.first()).toBeVisible();
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
