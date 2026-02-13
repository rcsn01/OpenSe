import { test } from '../../fixtures/auth';
import { ReportsPage } from '../../pages/AppPages';

test.describe('Stoqr Reports', () => {
  test('reports page loads', async ({ authenticatedPage }) => {
    const reportsPage = new ReportsPage(authenticatedPage);
    await reportsPage.goto();
    await reportsPage.expectLoaded();
  });
});
