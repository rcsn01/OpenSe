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

  test('inventory uses sidebar navigation without a top tab bar', async ({ authenticatedPage }) => {
    const inventory = new InventoryPage(authenticatedPage);
    await inventory.goto();

    const sidebar = authenticatedPage.locator('.explorer-sidebar');
    const hasSidebar = await sidebar.isVisible().catch(() => false);
    if (!hasSidebar) {
      return;
    }

    await expect(sidebar.getByText('All Products')).toBeVisible();
    await expect(sidebar.getByText('Folders')).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /all products/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /folders/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /locations/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /variants & matrices/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /stock transfers/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /kitting & bundles/i })).toHaveCount(0);
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

  test('inventory table supports choosing page size options', async ({ authenticatedPage }) => {
    const inventory = new InventoryPage(authenticatedPage);
    await inventory.goto();

    const productRows = authenticatedPage.locator('tbody tr');
    if ((await productRows.count()) === 0) {
      return;
    }

    const itemsPerPage = authenticatedPage.getByRole('combobox', { name: 'Items per page' });
    if (!(await itemsPerPage.isVisible().catch(() => false))) {
      return;
    }

    const optionValues = await itemsPerPage.locator('option').evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    );

    expect(optionValues).toEqual(['10', '20', '50']);

    await itemsPerPage.selectOption('20');
    await expect(itemsPerPage).toHaveValue('20');

    await itemsPerPage.selectOption('50');
    await expect(itemsPerPage).toHaveValue('50');
  });

  test('inventory keeps vertical scrolling inside the table', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 1280, height: 640 });

    const inventory = new InventoryPage(authenticatedPage);
    await inventory.goto();

    const productRows = authenticatedPage.locator('tbody tr');
    if ((await productRows.count()) === 0) {
      return;
    }

    const itemsPerPage = authenticatedPage.getByRole('combobox', { name: 'Items per page' });
    if (await itemsPerPage.isVisible().catch(() => false)) {
      await itemsPerPage.selectOption('20');
      await expect(itemsPerPage).toHaveValue('20');
    }

    const tableWrap = authenticatedPage.locator('.table-wrap').first();
    await expect(tableWrap).toBeVisible();

    await expect
      .poll(async () => tableWrap.evaluate((element) => element.scrollHeight - element.clientHeight))
      .toBeGreaterThan(0);

    const pageScroller = authenticatedPage.locator('main.app-layout-main > div').first();
    await expect(pageScroller).toBeVisible();

    const pageScrollMetrics = await pageScroller.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));

    expect(pageScrollMetrics.scrollHeight).toBeLessThanOrEqual(pageScrollMetrics.clientHeight + 1);

    const tableScrollTop = await tableWrap.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      return element.scrollTop;
    });

    expect(tableScrollTop).toBeGreaterThan(0);
  });

  test('inventory custom field filter uses stepped + flow', async ({ authenticatedPage }) => {
    const inventory = new InventoryPage(authenticatedPage);
    await inventory.goto();

    const hasSidebar = await authenticatedPage.locator('.explorer-sidebar').isVisible().catch(() => false);
    if (!hasSidebar) {
      return;
    }

    await expect(authenticatedPage.getByText('All Tags')).toHaveCount(0);

    // Step 1: Click "+ Filter" to open attribute dropdown
    const addFilterButton = authenticatedPage.getByRole('button', { name: /add custom field filter/i });
    const hasAddFilterButton = await addFilterButton.first().isVisible().catch(() => false);
    if (!hasAddFilterButton) {
      return;
    }

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

    // Step 4: + Filter button should still be visible after adding a filter
    const addFilterButtonAfter = authenticatedPage.getByRole('button', { name: /add custom field filter/i });
    const stillVisible = await addFilterButtonAfter.isVisible().catch(() => false);
    // The button stays visible as long as there are remaining unused fields
    if (attrCount > 1) {
      expect(stillVisible).toBe(true);
    }

    // Step 5: Remove the filter — "+" should remain
    const removeButton = authenticatedPage.getByRole('button', { name: new RegExp(`remove ${chosenAttrLabel} filter`, 'i') });
    await expect(removeButton).toBeVisible();
    await removeButton.click();
    await expect(addFilterButton.first()).toBeVisible();
  });

  test('inventory supports adding multiple custom field filters', async ({ authenticatedPage }) => {
    const inventory = new InventoryPage(authenticatedPage);
    await inventory.goto();

    const hasSidebar = await authenticatedPage.locator('.explorer-sidebar').isVisible().catch(() => false);
    if (!hasSidebar) {
      return;
    }

    const addFilterButton = authenticatedPage.getByRole('button', { name: /add custom field filter/i });
    if (!(await addFilterButton.first().isVisible().catch(() => false))) {
      return;
    }

    // Add first filter
    await addFilterButton.first().click();
    const firstDropdown = authenticatedPage.locator('div.absolute.z-50').last().locator('button');
    const firstAttrCount = await firstDropdown.count();
    if (firstAttrCount < 2) {
      return;
    }

    const firstAttr = (await firstDropdown.first().innerText()).trim();
    await firstDropdown.first().click();

    const firstValueOptions = authenticatedPage.locator('div.absolute.z-50').last().locator('button');
    if ((await firstValueOptions.count()) === 0) {
      return;
    }

    const firstValue = (await firstValueOptions.first().innerText()).trim();
    await firstValueOptions.first().click();

    await expect(authenticatedPage.getByText(`${firstAttr}:${firstValue}`)).toBeVisible();

    // + Filter button should still be visible for adding a second filter
    await expect(addFilterButton.first()).toBeVisible();

    // Add second filter
    await addFilterButton.first().click();
    const secondDropdown = authenticatedPage.locator('div.absolute.z-50').last().locator('button');
    const secondAttrCount = await secondDropdown.count();
    if (secondAttrCount === 0) {
      return;
    }

    // The first attribute should not appear in the dropdown
    const secondDropdownTexts: string[] = [];
    for (let i = 0; i < secondAttrCount; i++) {
      secondDropdownTexts.push((await secondDropdown.nth(i).innerText()).trim());
    }
    expect(secondDropdownTexts).not.toContain(firstAttr);

    const secondAttr = secondDropdownTexts[0]!;
    await secondDropdown.first().click();

    const secondValueOptions = authenticatedPage.locator('div.absolute.z-50').last().locator('button');
    if ((await secondValueOptions.count()) === 0) {
      return;
    }

    const secondValue = (await secondValueOptions.first().innerText()).trim();
    await secondValueOptions.first().click();

    // Both filter chips should be visible
    await expect(authenticatedPage.getByText(`${firstAttr}:${firstValue}`)).toBeVisible();
    await expect(authenticatedPage.getByText(`${secondAttr}:${secondValue}`)).toBeVisible();
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
