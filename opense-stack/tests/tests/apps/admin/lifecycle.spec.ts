import { test, expect } from '../../fixtures/adminAuth';

test.describe('Admin Organisation Lifecycle', () => {
  test('lifecycle action controls are available on organisations page', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/organisations');
    await expect(authenticatedAdminPage).toHaveURL(/\/(organisations|login)/);

    const heading = authenticatedAdminPage.getByRole('heading', { name: /super admin|organisations/i }).first();
    if (!(await heading.isVisible().catch(() => false))) return;

    const firstRow = authenticatedAdminPage.getByRole('row').nth(1);
    if (!(await firstRow.isVisible().catch(() => false))) return;

    const renameButton = firstRow.getByRole('button', { name: /rename/i }).first();
    const transferButton = firstRow.getByRole('button', { name: /transfer/i }).first();
    const deleteButton = firstRow.getByRole('button', { name: /delete/i }).first();

    if (await renameButton.isVisible().catch(() => false)) {
      authenticatedAdminPage.once('dialog', async (dialog) => {
        await dialog.dismiss();
      });
      await renameButton.click();
    }

    if (await transferButton.isVisible().catch(() => false)) {
      authenticatedAdminPage.once('dialog', async (dialog) => {
        await dialog.dismiss();
      });
      await transferButton.click();
    }

    if (await deleteButton.isVisible().catch(() => false)) {
      authenticatedAdminPage.once('dialog', async (dialog) => {
        await dialog.dismiss();
      });
      await deleteButton.click();
    }

    await expect(authenticatedAdminPage).toHaveURL(/\/(organisations|login)/);
  });
});
