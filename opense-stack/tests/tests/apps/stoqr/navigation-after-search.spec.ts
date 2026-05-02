import { expect, type Page } from '@playwright/test';
import { test } from '../../fixtures/auth';

const safeGoto = async (page: Page, url: string) => {
  try {
    await page.goto(url, { waitUntil: 'commit' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isExpectedRedirectAbort =
      message.includes('ERR_ABORTED') || message.includes('interrupted by another navigation');

    if (!isExpectedRedirectAbort) {
      throw error;
    }
  }
};

test.describe('Stoqr navigation after search', () => {
  test('changing pages still works after using top-bar search on multiple routes', async ({ authenticatedPage }) => {
    await safeGoto(authenticatedPage, '/inventory/all');

    const inventorySearch = authenticatedPage.getByRole('combobox', { name: 'Search items...' });
    await expect(inventorySearch).toBeVisible();
    await inventorySearch.fill('30123301');
    await expect(inventorySearch).toHaveValue('30123301');

    await authenticatedPage.getByRole('link', { name: 'Alerts' }).click();
    await expect(authenticatedPage).toHaveURL(/\/alerts\/feed$/);

    const alertsSearch = authenticatedPage.getByRole('combobox', { name: 'Search alerts...' });
    await expect(alertsSearch).toBeVisible();
    await alertsSearch.fill('scanner');
    await expect(alertsSearch).toHaveValue('scanner');
    await expect(authenticatedPage.getByText('Showing 1 of 7 alerts')).toBeVisible();

    await authenticatedPage.getByRole('link', { name: 'Procurement' }).click();
    await expect(authenticatedPage).toHaveURL(/\/procurement\/purchase-orders$/);
    await expect(authenticatedPage.getByRole('combobox', { name: 'Search POs...' })).toBeVisible();

    await authenticatedPage.getByRole('link', { name: 'Scanner' }).click();
    await expect(authenticatedPage).toHaveURL(/\/scan\/scan-actions$/);
    await expect(authenticatedPage.getByRole('combobox', { name: 'Search products...' })).toBeVisible();

    await authenticatedPage.getByRole('link', { name: 'Reports' }).click();
    await expect(authenticatedPage).toHaveURL(/\/reports\/stock-health$/);
    await expect(authenticatedPage.getByRole('combobox', { name: 'Search reports...' })).toBeVisible();
  });
});
