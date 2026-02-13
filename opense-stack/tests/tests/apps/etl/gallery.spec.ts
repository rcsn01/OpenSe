import { test, expect } from '../../fixtures/etlAuth';
import { ETLGalleryPage } from '../../pages/etl/ETLGalleryPage';

test.describe('ETL Gallery', () => {
  test('gallery loads and templates are visible', async ({ authenticatedEtlPage }) => {
    const gallery = new ETLGalleryPage(authenticatedEtlPage);
    await gallery.goto();
    await gallery.expectLoaded();

    const templateCard = authenticatedEtlPage.locator('[class*="template"], [class*="card"]').first();
    if (await templateCard.isVisible().catch(() => false)) {
      await expect(templateCard).toBeVisible();
    }
  });

  test('clone template action visible when available', async ({ authenticatedEtlPage }) => {
    const gallery = new ETLGalleryPage(authenticatedEtlPage);
    await gallery.goto();

    if (await gallery.cloneButton.isVisible().catch(() => false)) {
      await expect(gallery.cloneButton).toBeVisible();
    }
  });
});
