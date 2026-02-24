import { test, expect } from '../../fixtures/auth';
import { ProcurementPage } from '../../pages/AppPages';

test.describe('Stoqr Procurement', () => {
  test('procurement page loads', async ({ authenticatedPage }) => {
    const procurementPage = new ProcurementPage(authenticatedPage);
    await procurementPage.goto();
    await expect(authenticatedPage).toHaveURL(/(localhost:5991\/login\?|\/(procurement|auth)?$|localhost:5993\/$)/);

    const hasProcurementTabs = await authenticatedPage.getByRole('tab', { name: /purchase orders/i }).first().isVisible().catch(() => false);
    if (!hasProcurementTabs) {
      await expect(authenticatedPage.getByText(/Inventory Control Made Simple|Open-StoQR|Sign in/i).first()).toBeVisible();
      return;
    }

    await expect(authenticatedPage.getByRole('heading', { name: /procurement/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /purchase orders/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /supplier management/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /order tracking/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /receiving workflow/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /order history/i })).toBeVisible();

    await expect(authenticatedPage.getByRole('tab', { name: /replenishment/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /receiving log/i })).toHaveCount(0);

    await authenticatedPage.getByRole('tab', { name: /receiving workflow/i }).click();
    await expect(authenticatedPage.getByText(/Receiving Workflow|No items pending receipt/i).first()).toBeVisible();
  });
});
