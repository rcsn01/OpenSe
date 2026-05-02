import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/auth';
import { InventoryPage } from '../../pages/AppPages';

const folderNavigation = (page: Page) => page.getByRole('complementary', { name: /folder navigation/i });

const folderRow = (page: Page, name: string) =>
  folderNavigation(page).locator('.tree-item-folder').filter({ hasText: name }).first();

const openFolderCreation = async (page: Page) => {
  const navigation = folderNavigation(page);
  await expect(navigation).toBeVisible();
  await navigation.getByRole('button', { name: /new folder/i }).click();
  const input = page.getByPlaceholder('Folder Name');
  await expect(input).toBeVisible();
  return input;
};

const createFolder = async (page: Page, name: string) => {
  const input = await openFolderCreation(page);
  await input.fill(name);
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(folderRow(page, name)).toBeVisible();
};

const openFolderDeleteChoices = async (page: Page, name: string) => {
  const row = folderRow(page, name);
  await expect(row).toBeVisible();
  await row.hover();
  await row.getByRole('button', { name: /delete/i }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`Delete \"${name}\"`) })).toBeVisible();
};

test.describe('User Journey: Inventory Folder Navigation', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    const inventory = new InventoryPage(authenticatedPage);
    await inventory.goto();
  });

  test('inventory shows the folder navigation with all products selected', async ({ authenticatedPage }) => {
    const navigation = folderNavigation(authenticatedPage);

    await expect(navigation).toBeVisible();
    await expect(navigation.getByText('All Products', { exact: true })).toBeVisible();
    await expect(navigation.getByText('Uncategorised', { exact: true })).toBeVisible();
    await expect(navigation.getByText('Folders', { exact: true })).toBeVisible();
    await expect(navigation.locator('.tree-item.active').filter({ hasText: 'All Products' })).toBeVisible();
  });

  test('switching to uncategorised updates the selected inventory view', async ({ authenticatedPage }) => {
    const navigation = folderNavigation(authenticatedPage);

    await navigation.getByText('Uncategorised', { exact: true }).click();

    await expect(navigation.locator('.tree-item.active').filter({ hasText: 'Uncategorised' })).toBeVisible();
    await expect(navigation.locator('.tree-item.active').filter({ hasText: 'All Products' })).toHaveCount(0);
  });

  test('creating a folder adds it to the navigation tree', async ({ authenticatedPage }) => {
    const name = `E2E Folder ${test.info().parallelIndex}-${Date.now()}`;

    await createFolder(authenticatedPage, name);
  });

  test('created folders stay visible after switching between inventory views', async ({ authenticatedPage }) => {
    const name = `Persistent Folder ${test.info().parallelIndex}-${Date.now()}`;
    const navigation = folderNavigation(authenticatedPage);

    await createFolder(authenticatedPage, name);
    await navigation.getByText('Uncategorised', { exact: true }).click();
    await navigation.getByText('All Products', { exact: true }).click();

    await expect(folderRow(authenticatedPage, name)).toBeVisible();
  });

  test('deleting a folder lets the user choose how to handle products inside it', async ({ authenticatedPage }) => {
    const name = `Delete Choice Folder ${test.info().parallelIndex}-${Date.now()}`;

    await createFolder(authenticatedPage, name);
    await openFolderDeleteChoices(authenticatedPage, name);

    await expect(authenticatedPage.getByRole('button', { name: 'Move products to Uncategorised' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Delete all products inside' })).toBeVisible();
  });

  test('choosing move and delete shows a confirmation dialog before deletion', async ({ authenticatedPage }) => {
    const name = `Move Delete Folder ${test.info().parallelIndex}-${Date.now()}`;

    await createFolder(authenticatedPage, name);
    await openFolderDeleteChoices(authenticatedPage, name);
    await authenticatedPage.getByRole('button', { name: 'Move products to Uncategorised' }).click();

    await expect(authenticatedPage.getByRole('heading', { name: 'Are you sure?' })).toBeVisible();
    await expect(authenticatedPage.getByText(`All products in "${name}"`, { exact: false })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Move & Delete Folder' })).toBeVisible();
  });

  test('cancelling folder deletion closes the delete dialog', async ({ authenticatedPage }) => {
    const name = `Cancel Delete Folder ${test.info().parallelIndex}-${Date.now()}`;

    await createFolder(authenticatedPage, name);
    await openFolderDeleteChoices(authenticatedPage, name);
    await authenticatedPage.getByRole('button', { name: /^cancel$/i }).click();

    await expect(authenticatedPage.getByRole('heading', { name: new RegExp(`Delete \"${name}\"`) })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('button', { name: 'Move products to Uncategorised' })).toHaveCount(0);
  });
});
