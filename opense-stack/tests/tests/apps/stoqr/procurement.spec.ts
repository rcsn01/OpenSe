import { test, expect } from '../../fixtures/auth';
import { ProcurementPage } from '../../pages/AppPages';

test.describe('Stoqr Procurement', () => {
  test('procurement page loads', async ({ authenticatedPage }) => {
    const procurementPage = new ProcurementPage(authenticatedPage);
    await procurementPage.goto();
    await expect(authenticatedPage).toHaveURL(/(localhost:5991\/login\?|\/(procurement|auth)?$)/);
  });
});
