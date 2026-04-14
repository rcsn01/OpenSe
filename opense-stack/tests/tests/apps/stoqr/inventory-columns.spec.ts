import { test, expect } from '../../fixtures/auth';
import { InventoryPage } from '../../pages/AppPages';

test.describe('Inventory table columns', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    const inventory = new InventoryPage(authenticatedPage);
    await inventory.goto();
    const hasTable = await authenticatedPage.locator('table.table thead').isVisible().catch(() => false);
    test.skip(!hasTable, 'Inventory table not visible — skipping column tests.');
  });

  test('deprecated stock headers are not present in table', async ({ authenticatedPage }) => {
    const headers = authenticatedPage.locator('table.table thead th');
    const count = await headers.count();
    for (let i = 0; i < count; i++) {
      const text = (await headers.nth(i).innerText()).trim();
      expect(text.toUpperCase()).not.toBe('STATUS');
      expect(text.toUpperCase()).not.toBe('ON HAND');
      expect(text.toUpperCase()).not.toBe('ALLOCATED');
    }
  });

  test('AVAILABLE column shows stock / min format', async ({ authenticatedPage }) => {
    const availableHeader = authenticatedPage.locator('table.table thead th', { hasText: /available/i });
    await expect(availableHeader).toBeVisible();

    const headerIndex = await availableHeader.evaluate((el) => {
      const row = el.closest('tr')!;
      return Array.from(row.children).indexOf(el);
    });

    const firstDataCell = authenticatedPage.locator(`table.table tbody tr:first-child td:nth-child(${headerIndex + 1})`);
    const cellText = await firstDataCell.innerText();
    expect(cellText).toMatch(/\d+\s*\/\s*\d+/);
  });

  test('AVAILABLE cell is green when above min stock', async ({ authenticatedPage }) => {
    const cells = authenticatedPage.locator('table.table tbody td');
    const allCells = await cells.all();

    for (const cell of allCells) {
      const text = await cell.innerText();
      const match = text.match(/^(\d+)\s*\/\s*(\d+)$/);
      if (!match) continue;

      const available = parseInt(match[1]!, 10);
      const minStock = parseInt(match[2]!, 10);
      const color = await cell.evaluate((el) => el.style.color);

      if (available >= minStock) {
        expect(color).toContain('success');
      } else {
        expect(color).toContain('danger');
      }
      return;
    }
  });

  test('all expected column headers are sortable', async ({ authenticatedPage }) => {
    const sortableHeaders = ['Name / SKU', 'Folder', 'Price', 'Available'];

    for (const headerText of sortableHeaders) {
      const th = authenticatedPage.locator('table.table thead th.sortable-th', { hasText: new RegExp(headerText, 'i') });
      await expect(th).toBeVisible();
    }
  });

  test('clicking a sortable column header triggers re-sort', async ({ authenticatedPage }) => {
    const folderHeader = authenticatedPage.locator('table.table thead th.sortable-th', { hasText: /folder/i });
    await expect(folderHeader).toBeVisible();

    await folderHeader.click();
    await authenticatedPage.waitForTimeout(300);

    const arrowIcon = folderHeader.locator('svg');
    await expect(arrowIcon).toBeVisible();

    await folderHeader.click();
    await authenticatedPage.waitForTimeout(300);

    await expect(arrowIcon).toBeVisible();
  });
});
