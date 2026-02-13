import { test } from '../../fixtures/auth';
import { AlertsPage } from '../../pages/AppPages';

test.describe('Stoqr Alerts', () => {
  test('alerts page loads', async ({ authenticatedPage }) => {
    const alertsPage = new AlertsPage(authenticatedPage);
    await alertsPage.goto();
    await alertsPage.expectLoaded();
  });
});
