import type { Page } from '@playwright/test';
import { NEW_ISSUE_ID, NEW_PROJECT_ID, expect, test } from '../../fixtures/openKb';

const fillLastEditor = async (page: Page, text: string) => {
  const editor = page.locator('.open-kb-editor [contenteditable="true"]').last();
  await editor.click();
  await page.keyboard.type(text);
};

test.describe('Open-KB Interactions', () => {
  test('creates an organisation-scoped project and opens the new project detail page', async ({ openKbPage }) => {
    await openKbPage.goto('/projects/new', { waitUntil: 'domcontentloaded' });

    await openKbPage.getByLabel('Name').fill('Customer Knowledge Base');
    await openKbPage.getByLabel('Identifier').fill('CKB');
    await fillLastEditor(openKbPage, 'Shared customer support and product knowledge.');
    await openKbPage.getByRole('button', { name: 'Create project' }).click();

    await expect(openKbPage).toHaveURL(new RegExp(`/projects/${NEW_PROJECT_ID}(?:[?#].*)?$`));
    await expect(openKbPage.getByText('Customer Knowledge Base').first()).toBeVisible();
  });

  test('creates an issue and redirects to the new issue detail page', async ({ openKbPage }) => {
    await openKbPage.goto('/issues/new', { waitUntil: 'domcontentloaded' });

    await openKbPage.getByLabel('Title').fill('Write importer acceptance tests');
    await openKbPage.getByLabel('Priority').selectOption('high');
    await fillLastEditor(openKbPage, 'Verify importer state, redirects, and permissions.');
    await openKbPage.getByRole('button', { name: 'Create issue' }).click();

    await expect(openKbPage).toHaveURL(new RegExp(`/issues/${NEW_ISSUE_ID}(?:[?#].*)?$`));
    await expect(openKbPage.getByLabel('Title', { exact: true })).toHaveValue('Write importer acceptance tests');
    await expect(openKbPage.getByLabel('Priority')).toHaveValue('high');
  });

  test('updates an issue and adds a rich text comment', async ({ openKbPage }) => {
    await openKbPage.goto('/issues/11110000-0000-4000-8000-00000000e2e2', { waitUntil: 'domcontentloaded' });

    await openKbPage.getByLabel('Title', { exact: true }).fill('Updated issue title from Playwright');
    await openKbPage.getByLabel('Priority').selectOption('urgent');
    const saveResponse = openKbPage.waitForResponse((response) =>
      response.url().includes('/rest/v1/issues') && response.request().method() === 'PATCH',
    );
    await openKbPage.getByRole('button', { name: 'Save changes' }).click();
    await expect((await saveResponse).ok()).toBeTruthy();

    await expect(openKbPage.getByLabel('Title', { exact: true })).toHaveValue('Updated issue title from Playwright');
    await expect(openKbPage.getByLabel('Priority')).toHaveValue('urgent');
    await expect(openKbPage.getByRole('button', { name: 'Save changes' })).toBeEnabled();

    await fillLastEditor(openKbPage, 'This comment was created by the interaction coverage.');
    const commentResponse = openKbPage.waitForResponse((response) =>
      response.url().includes('/rest/v1/issue_comments') && response.request().method() === 'POST',
    );
    await openKbPage.getByRole('button', { name: 'Add comment' }).click();
    await expect((await commentResponse).ok()).toBeTruthy();

    await expect(openKbPage.getByText('This comment was created by the interaction coverage.')).toBeVisible();
  });
});
