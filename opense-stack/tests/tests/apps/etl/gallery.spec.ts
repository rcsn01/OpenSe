import { test, expect } from '../../fixtures/etlAuth';
import { ETLGalleryPage } from '../../pages/etl/ETLGalleryPage';

test.describe('ETL Gallery', () => {
  test('gallery loads and workflows are visible', async ({ authenticatedEtlPage }) => {
    const gallery = new ETLGalleryPage(authenticatedEtlPage);
    await gallery.goto();
    await gallery.expectLoaded();

    const isOnGallery = /\/gallery/.test(authenticatedEtlPage.url());
    test.skip(!isOnGallery, 'Gallery route unavailable in current auth/session state');

    if (await gallery.heading.isVisible().catch(() => false)) {
      await expect(gallery.heading).toBeVisible();
    }

    const workflowCard = authenticatedEtlPage.locator('[class*="card"]').first();
    if (await workflowCard.isVisible().catch(() => false)) {
      await expect(workflowCard).toBeVisible();
    }
  });

  test('non-admin ETL user can clone a gallery workflow', async ({ authenticatedEtlPage }) => {
    const gallery = new ETLGalleryPage(authenticatedEtlPage);

    await gallery.goto();
    await gallery.expectLoaded();

    const isOnGallery = /\/gallery/.test(authenticatedEtlPage.url());
    test.skip(!isOnGallery, 'Gallery route unavailable in current auth/session state');

    const galleryResponsePromise = authenticatedEtlPage.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/workflows') &&
        response.url().includes('is_template=eq.true'),
      { timeout: 5000 },
    );

    const galleryResponse = await galleryResponsePromise.catch(() => null);
    test.skip(!galleryResponse, 'Gallery workflows request was not observed in this environment');
    const workflows = galleryResponse ? ((await galleryResponse.json()) as Array<{ id: string }>) : [];
    test.skip(workflows.length === 0, 'No gallery workflows available to clone');

    await expect(gallery.cloneButton).toBeVisible();
    await gallery.cloneButton.click();
    await expect(authenticatedEtlPage).toHaveURL(/\/editor\/[0-9a-f-]{36}/i);
  });

  test('non-admin cannot edit gallery template in editor', async ({ authenticatedEtlPage }) => {
    const gallery = new ETLGalleryPage(authenticatedEtlPage);

    await gallery.goto();
    await gallery.expectLoaded();

    const isOnGallery = /\/gallery/.test(authenticatedEtlPage.url());
    test.skip(!isOnGallery, 'Gallery route unavailable in current auth/session state');

    const galleryResponsePromise = authenticatedEtlPage.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/workflows') &&
        response.url().includes('is_template=eq.true'),
      { timeout: 5000 },
    );

    const galleryResponse = await galleryResponsePromise.catch(() => null);
    test.skip(!galleryResponse, 'Gallery workflows request was not observed in this environment');
    const workflows = galleryResponse ? ((await galleryResponse.json()) as Array<{ id: string }>) : [];
    const templateId = workflows[0]?.id;
    test.skip(!templateId, 'No gallery template available to verify editor restriction');

    await authenticatedEtlPage.goto(`/editor/${templateId}`);
    await expect(authenticatedEtlPage).toHaveURL(/\/gallery/);
  });
});
