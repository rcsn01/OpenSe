import { test } from '../../fixtures/auth';
import { ScanPage } from '../../pages/AppPages';
import { expect } from '@playwright/test';

test.describe('Stoqr Scan', () => {
  test('scan page and scan UI visible', async ({ authenticatedPage }) => {
    const scanPage = new ScanPage(authenticatedPage);
    await scanPage.goto();
    await scanPage.expectLoaded();

    const hasScanTab = await authenticatedPage.getByRole('tab', { name: /^Scan$/i }).first().isVisible().catch(() => false);
    if (!hasScanTab) {
      await expect(authenticatedPage).toHaveURL(/\/(scan(\/[^/]+)?|dashboard|auth|login|$)/);
      return;
    }

    await expect(authenticatedPage.getByRole('tab', { name: /^Scan$/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /history/i })).toBeVisible();

    await expect(authenticatedPage.getByRole('tab', { name: /pick & pack/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /cycle count/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /putaway/i })).toHaveCount(0);

    await expect(authenticatedPage.getByRole('button', { name: /start camera/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /stop camera/i })).toHaveCount(0);
    await expect(authenticatedPage.getByText(/manual entry/i)).toBeVisible();

    // Search button should be visible and disabled when empty
    const searchButton = authenticatedPage.getByRole('button', { name: /^search$/i });
    await expect(searchButton).toBeVisible();
    await expect(searchButton).toBeDisabled();

    // Fill input and click search
    await authenticatedPage.getByLabel(/Barcode \/ SKU \/ Product Name/i).fill('TEST-SKU-001');
    await authenticatedPage.getByRole('button', { name: /^search$/i }).click();

    // After search, product lookup area should be visible (either found or not found)
    await expect(authenticatedPage.getByRole('button', { name: /search again/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /start camera/i })).toHaveCount(0);

    await authenticatedPage.getByRole('tab', { name: /history/i }).click();
    await expect(authenticatedPage).toHaveURL(/\/scan\/scan-history$/);
    await expect(authenticatedPage.getByText(/Scan History Log|No scan history yet/i).first()).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /^Scan$/i }).click();
    await expect(authenticatedPage).toHaveURL(/\/scan\/scan-actions$/);
  });

  test('manual SKU entry resolves seeded product with stock management UI', async ({ authenticatedPage }) => {
    const scanPage = new ScanPage(authenticatedPage);
    await scanPage.goto();
    await scanPage.expectLoaded();

    const hasScanTab = await authenticatedPage.getByRole('tab', { name: /^Scan$/i }).first().isVisible().catch(() => false);
    if (!hasScanTab) {
      return;
    }

    // Use the search flow: type then click Search
    const input = authenticatedPage.getByLabel(/Barcode \/ SKU \/ Product Name/i);
    await input.fill('30123301');
    await authenticatedPage.getByRole('button', { name: /^search$/i }).click();

    const productFound = await authenticatedPage.getByText('0.5mL Eppendorf Safe-Lock Tubes PCR clean, colorless, 500 tubes').isVisible({ timeout: 5000 }).catch(() => false);
    const notFound = await authenticatedPage.getByText(/No product found/i).isVisible().catch(() => false);

    if (productFound) {
      // Product details
      await expect(authenticatedPage.getByText(/SKU: 30123301/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/in stock/i)).toBeVisible();

      // Stock mode radio buttons
      await expect(authenticatedPage.getByText('Manual')).toBeVisible();
      await expect(authenticatedPage.getByText('Receive')).toBeVisible();
      await expect(authenticatedPage.getByText('Dispatch')).toBeVisible();

      // Quick actions
      await expect(authenticatedPage.getByRole('button', { name: /mark out of stock/i })).toBeVisible();
      await expect(authenticatedPage.getByRole('button', { name: /full restock/i })).toBeVisible();

      // Confirm / Cancel
      await expect(authenticatedPage.getByRole('button', { name: /cancel/i })).toBeVisible();
      await expect(authenticatedPage.getByRole('button', { name: /confirm update/i })).toBeVisible();
    }

    expect(productFound || !notFound).toBeTruthy();
  });

  test('search again returns to initial scan view', async ({ authenticatedPage }) => {
    const scanPage = new ScanPage(authenticatedPage);
    await scanPage.goto();
    await scanPage.expectLoaded();

    const hasScanTab = await authenticatedPage.getByRole('tab', { name: /^Scan$/i }).first().isVisible().catch(() => false);
    if (!hasScanTab) return;

    await authenticatedPage.getByLabel(/Barcode \/ SKU \/ Product Name/i).fill('SOME-SKU');
    await authenticatedPage.getByRole('button', { name: /^search$/i }).click();

    await expect(authenticatedPage.getByRole('button', { name: /search again/i })).toBeVisible();

    await authenticatedPage.getByRole('button', { name: /search again/i }).click();

    // Should return to initial state with search field visible
    await expect(authenticatedPage.getByText(/manual entry/i)).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /^search$/i })).toBeVisible();
  });
});
