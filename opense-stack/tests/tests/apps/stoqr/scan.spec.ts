import { test } from '../../fixtures/auth';
import { ScanPage } from '../../pages/AppPages';

test.describe('Stoqr Scan', () => {
  test('scan page and scan UI visible', async ({ authenticatedPage }) => {
    const scanPage = new ScanPage(authenticatedPage);
    await scanPage.goto();
    await scanPage.expectLoaded();
  });
});
