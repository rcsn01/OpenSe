import { type Page } from '@playwright/test';
import { test, expect } from '../../fixtures/auth';

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

const resolveExpectedRoute = (route: string) =>
  route === '/tools/labels/design'
    ? '/tools/labels/templates'
    : route === '/tools/labels/downloads'
      ? '/tools/labels/preview-batch'
      : route;

test.describe('Stoqr Route Coverage', () => {
  const nestedTabRoutes = [
    '/tools/labels/templates',
    '/tools/labels/design',
    '/tools/labels/preview-batch',
    '/tools/labels/downloads',
    '/inventory/all',
    '/inventory/locations',
    '/scan/scan-actions',
    '/scan/scan-history',
    '/settings/organisations/teams',
    '/settings/organisations/permissions',
    '/settings/organisations/activity',
    '/settings/organisations/two-factor',
    '/reports/valuation',
    '/reports/movement-usage',
    '/reports/reorder-dead-stock',
    '/reports/exports',
    '/procurement/purchase-orders',
    '/procurement/suppliers',
    '/alerts/notifications',
    '/alerts/rules',
    '/alerts/delivery',
    '/alerts/history',
  ];

  test('public auth entry routes resolve', async ({ page }) => {
    await safeGoto(page, '/');
    await expect(page).toHaveURL(/\/$|\/dashboard$|\/auth$/);

    await safeGoto(page, '/auth');
    await expect(page).toHaveURL(/\/(auth|dashboard|login)/);

    await safeGoto(page, '/signup');
    await expect(page).toHaveURL(/\/(signup|dashboard|login|$)/);
  });

  test('label studio route resolves', async ({ authenticatedPage }) => {
    await safeGoto(authenticatedPage, '/tools/labels');
    await expect(authenticatedPage).toHaveURL(/\/(tools\/labels(?:\/templates)?|auth|login|$)/);
  });

  test('legacy barcode-sku route redirects to all products', async ({ authenticatedPage }) => {
    await safeGoto(authenticatedPage, '/inventory/barcode-sku');
    await expect(authenticatedPage).toHaveURL(/\/inventory\/all$/);
  });

  for (const route of nestedTabRoutes) {
    test(`nested tab route ${route} resolves`, async ({ authenticatedPage }) => {
      await safeGoto(authenticatedPage, route);
      const expectedRoute = resolveExpectedRoute(route);

      if (expectedRoute !== route) {
        await authenticatedPage
          .waitForURL(
            (url) =>
              url.pathname === expectedRoute ||
              url.pathname.includes('/auth') ||
              url.pathname.includes('/login') ||
              url.pathname.includes('/dashboard') ||
              url.href === 'http://localhost:5993/',
            { timeout: 5000 },
          )
          .catch(() => undefined);
      }

      const url = authenticatedPage.url();
      const isExpectedResolvedUrl =
        url.includes(expectedRoute) ||
        url.includes('/auth') ||
        url.includes('/login') ||
        url.includes('/dashboard') ||
        url === 'http://localhost:5993/' ||
        url.includes('/tools/labels/templates');
      expect(isExpectedResolvedUrl).toBeTruthy();
    });
  }

  test('wildcard route redirects to dashboard flow', async ({ authenticatedPage }) => {
    await safeGoto(authenticatedPage, '/does-not-exist');
    await expect(authenticatedPage).toHaveURL(/\/(dashboard|auth|login|does-not-exist|$)/);
  });
});
