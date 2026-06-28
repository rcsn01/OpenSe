import type { Page } from '@playwright/test';
import { ISSUE_ID, NEW_ISSUE_ID, NEW_PROJECT_ID, PROJECT_ID, expect, test } from '../../fixtures/openKb';

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

  test('creates a task from the project list and opens the task detail page', async ({ openKbPage }) => {
    await openKbPage.goto(`/projects/${PROJECT_ID}/list`, { waitUntil: 'domcontentloaded' });

    await openKbPage.getByRole('button', { name: 'Add task', exact: true }).click();
    await openKbPage.getByLabel('Title').fill('Write importer acceptance tests');
    await openKbPage.getByLabel('Priority').selectOption('high');
    await fillLastEditor(openKbPage, 'Verify importer state, redirects, and permissions.');
    await openKbPage.getByRole('button', { name: 'Create task' }).click();

    await expect(openKbPage).toHaveURL(new RegExp(`/projects/${PROJECT_ID}/issues/${NEW_ISSUE_ID}(?:[?#].*)?$`));
    await expect(openKbPage.getByLabel('Title', { exact: true })).toHaveValue('Write importer acceptance tests');
    await expect(openKbPage.getByLabel('Priority')).toHaveValue('high');
  });

  test('updates a task and adds a rich text comment', async ({ openKbPage }) => {
    await openKbPage.goto(`/projects/${PROJECT_ID}/issues/11110000-0000-4000-8000-00000000e2e2`, { waitUntil: 'domcontentloaded' });

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

  test('opens a task preview pane from the project list and expands it', async ({ openKbPage }) => {
    await openKbPage.goto(`/projects/${PROJECT_ID}/list`, { waitUntil: 'domcontentloaded' });

    await openKbPage.getByRole('button', { name: /Mock Open-KB issue/ }).click();
    await expect(openKbPage).toHaveURL(new RegExp(`/projects/${PROJECT_ID}/list/[^/]+/issues/${ISSUE_ID}(?:[?#].*)?$`));
    await expect(openKbPage.locator('.bg-blue-50').filter({ hasText: 'Mock Open-KB issue' })).toBeVisible();
    await expect(openKbPage.getByRole('button', { name: 'Close issue detail' })).toBeVisible();
    await expect(openKbPage.getByLabel('Title', { exact: true })).toHaveValue('Mock Open-KB issue');

    await openKbPage.getByRole('button', { name: 'Close issue detail' }).click();
    await expect(openKbPage).toHaveURL(new RegExp(`/projects/${PROJECT_ID}/list/[^/?#]+(?:[?#].*)?$`));

    await openKbPage.getByRole('button', { name: /Mock Open-KB issue/ }).click();
    await openKbPage.getByRole('button', { name: 'Expand issue' }).click();
    await expect(openKbPage).toHaveURL(new RegExp(`/projects/${PROJECT_ID}/issues/${ISSUE_ID}(?:[?#].*)?$`));
    await expect(openKbPage.getByLabel('Title', { exact: true })).toHaveValue('Mock Open-KB issue');
  });

  test('adds, removes, and protects configurable project tabs', async ({ openKbPage }) => {
    await openKbPage.goto(`/projects/${PROJECT_ID}/list`, { waitUntil: 'domcontentloaded' });

    await openKbPage.getByRole('tab', { name: /^List/ }).click({ button: 'right' });
    await expect(openKbPage.getByRole('button', { name: 'Rename' })).toBeVisible();
    await expect(openKbPage.getByRole('button', { name: 'Make a copy' })).toBeVisible();
    await expect(openKbPage.getByRole('button', { name: 'Remove tab' })).toHaveCount(0);

    await openKbPage.getByLabel('Add project tab').click();
    await expect(openKbPage.getByRole('button', { name: 'Pages', exact: true })).toHaveCount(0);
    await expect(openKbPage.getByRole('button', { name: 'Note', exact: true })).toHaveCount(0);
    const addResponse = openKbPage.waitForResponse((response) =>
      response.url().includes('/rest/v1/project_tabs') && response.request().method() === 'POST',
    );
    await openKbPage.getByRole('button', { name: 'Board', exact: true }).click();
    await expect((await addResponse).ok()).toBeTruthy();
    await expect(openKbPage.getByRole('tab', { name: /^Board$/ })).toBeVisible();

    await openKbPage.getByRole('tab', { name: /^Board$/ }).click();
    await expect(openKbPage).toHaveURL(new RegExp(`/projects/${PROJECT_ID}/board/[^/?#]+(?:[?#].*)?$`));

    await openKbPage.getByRole('tab', { name: /^Board$/ }).click({ button: 'right' });
    await expect(openKbPage.getByRole('button', { name: 'Rename' })).toBeVisible();
    await expect(openKbPage.getByRole('button', { name: 'Make a copy' })).toBeVisible();
    const removeResponse = openKbPage.waitForResponse((response) =>
      response.url().includes('/rest/v1/project_tabs') && response.request().method() === 'PATCH',
    );
    await openKbPage.getByRole('button', { name: 'Remove tab' }).click();
    await expect((await removeResponse).ok()).toBeTruthy();
    await expect(openKbPage).toHaveURL(new RegExp(`/projects/${PROJECT_ID}/list(?:[?#].*)?$`));
  });
});
