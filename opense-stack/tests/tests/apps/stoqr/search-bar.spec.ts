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

test.describe('Stoqr Top-Bar Search', () => {
  test('top-bar search updates the URL and shows fuzzy suggestions', async ({ authenticatedPage }) => {
    await safeGoto(authenticatedPage, '/inventory/all');

    const searchInput = authenticatedPage.getByRole('combobox', { name: 'Search items...' });
    await expect(searchInput).toBeVisible();

    await searchInput.fill('30123301');

    await expect(searchInput).toHaveValue('30123301');
    await expect.poll(() => new URL(authenticatedPage.url()).searchParams.get('q')).toBe('30123301');

    await searchInput.fill('low st');

    await expect(searchInput).toHaveValue('low st');
    await expect(authenticatedPage.getByRole('option', { name: /Low Stock/i })).toBeVisible();
  });

  test('inventory search persists in the URL and can be cleared from the top bar', async ({ authenticatedPage }) => {
    await safeGoto(authenticatedPage, '/inventory/all');

    const searchInput = authenticatedPage.getByPlaceholder('Search items...');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('30123301');

    await expect.poll(() => new URL(authenticatedPage.url()).searchParams.get('q')).toBe('30123301');
    await expect(searchInput).toHaveValue('30123301');

    await authenticatedPage.reload({ waitUntil: 'domcontentloaded' });
    await expect(searchInput).toHaveValue('30123301');
    await expect.poll(() => new URL(authenticatedPage.url()).searchParams.get('q')).toBe('30123301');

    await authenticatedPage.getByRole('button', { name: 'Clear search' }).click();

    await expect(searchInput).toHaveValue('');
    await expect.poll(() => new URL(authenticatedPage.url()).searchParams.get('q')).toBeNull();
  });

  test('search placeholder changes by route and alerts support fuzzy filtering', async ({ authenticatedPage }) => {
    await safeGoto(authenticatedPage, '/procurement/purchase-orders');
    await expect(authenticatedPage.getByPlaceholder('Search POs...')).toBeVisible();
    await expect(authenticatedPage.getByPlaceholder('Search items...')).toHaveCount(0);

    await safeGoto(authenticatedPage, '/alerts/feed');

    const alertsSearch = authenticatedPage.getByPlaceholder('Search alerts...');
    await expect(alertsSearch).toBeVisible();
    await expect(authenticatedPage.getByPlaceholder('Search POs...')).toHaveCount(0);

    await alertsSearch.fill('scanner');

    await expect.poll(() => new URL(authenticatedPage.url()).searchParams.get('q')).toBe('scanner');
    await expect(authenticatedPage.getByText('Showing 1 of 7 alerts')).toBeVisible();
    await expect(authenticatedPage.getByRole('table').getByText('Hardware Offline: Main Dock Scanner')).toBeVisible();
    await expect(authenticatedPage.getByText('Out of Stock: Premium Widget')).toHaveCount(0);

    await authenticatedPage.getByRole('button', { name: 'Clear search' }).click();

    await expect(alertsSearch).toHaveValue('');
    await expect.poll(() => new URL(authenticatedPage.url()).searchParams.get('q')).toBeNull();
    await expect(authenticatedPage.getByText('Out of Stock: Premium Widget')).toBeVisible();
  });

  test('shared page shell keeps search visible on default app sections', async ({ authenticatedPage }) => {
    const defaultSections = [
      { nav: 'Dashboard', placeholder: 'Search items...' },
      { nav: 'Scanner', placeholder: 'Search products...' },
      { nav: 'Label Studio', placeholder: 'Search templates...' },
      { nav: 'Reports', placeholder: 'Search reports...' },
      { nav: 'Organisations', placeholder: 'Search team members...' },
    ];

    await safeGoto(authenticatedPage, '/dashboard');

    for (const section of defaultSections) {
      await authenticatedPage.getByRole('link', { name: section.nav }).click();
      await expect(authenticatedPage.getByRole('combobox', { name: section.placeholder })).toBeVisible();
    }
  });
});
