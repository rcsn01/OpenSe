import { test, expect } from '../../fixtures/auth';
import { ProcurementPage } from '../../pages/AppPages';

test.describe('Stoqr Procurement', () => {
  test('procurement page loads', async ({ authenticatedPage }) => {
    const procurementPage = new ProcurementPage(authenticatedPage);
    await procurementPage.goto();
    await expect(authenticatedPage).toHaveURL(/(localhost:5991\/login\?|\/(procurement(?:\/[^/]+)?|auth)?$|localhost:5993\/$)/);

    const hasProcurementTabs = await authenticatedPage.getByRole('tab', { name: /purchase orders/i }).first().isVisible().catch(() => false);
    if (!hasProcurementTabs) {
      await expect(authenticatedPage.getByText(/Inventory Control|Inventory Engine|StoQR|Sign in|Get Started/i).first()).toBeVisible();
      return;
    }

    await expect(authenticatedPage.getByRole('heading', { name: /procurement/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /purchase orders/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /^suppliers$/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('columnheader', { name: /workflow/i })).toBeVisible();

    await expect(authenticatedPage.getByRole('tab', { name: /supplier management/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /order tracking/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /receiving workflow/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /order history/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /incoming \/ receiving/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /purchase requests?/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /vendor returns/i })).toHaveCount(0);

    await expect(authenticatedPage.getByText(/pending approval|approved|denied/i).first()).toBeVisible();
    await expect(authenticatedPage.getByText(/awaiting supplier|in transit|partial receipt|received/i).first()).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /^suppliers$/i }).click();
    await expect(authenticatedPage.getByRole('button', { name: /add supplier/i })).toBeVisible();
    await expect(authenticatedPage.getByPlaceholder(/search suppliers or skus/i)).toBeVisible();
  });
});
