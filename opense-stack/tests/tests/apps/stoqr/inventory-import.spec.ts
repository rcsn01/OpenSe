import { expect } from '@playwright/test';
import { test } from '../../fixtures/auth';
import { InventoryPage } from '../../pages/AppPages';

test.describe('Stoqr Inventory Import', () => {
  test('shared top-bar search filters the import mapping workspace', async ({ authenticatedPage }) => {
    const inventoryPage = new InventoryPage(authenticatedPage);

    await inventoryPage.goto();

    await authenticatedPage.getByLabel('Upload inventory CSV').setInputFiles({
      name: 'inventory-import.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        [
          'Product Name,SKU,Description,Color',
          'Widget One,SKU-1,Main widget,Blue',
          'Widget Two,SKU-2,Backup widget,Green',
        ].join('\n'),
      ),
    });

    await expect(authenticatedPage).toHaveURL(/\/inventory\/import$/);
    await expect(authenticatedPage.getByText('Map Columns')).toBeVisible();

    const searchInput = authenticatedPage.getByRole('combobox', { name: 'Search import data...' });
    await searchInput.fill('Color');

    await expect(authenticatedPage.getByLabel('Map Color column')).toBeVisible();
    await expect(authenticatedPage.getByText('Blue')).toBeVisible();
    await expect(authenticatedPage.getByLabel('Map Product Name column')).toHaveCount(0);
    await expect(authenticatedPage.getByText('Widget One')).toHaveCount(0);
  });
});
