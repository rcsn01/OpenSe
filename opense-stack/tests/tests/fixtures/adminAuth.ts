import { test as base } from '@playwright/test';
import { Page } from '@playwright/test';

export type AdminUser = {
  email: string;
  password: string;
};

export const SUPER_ADMIN_USER: AdminUser = {
  email: process.env.E2E_SUPER_ADMIN_EMAIL || 'super-admin@example.com',
  password: process.env.E2E_SUPER_ADMIN_PASSWORD || 'testpassword123',
};

export const NON_ADMIN_USER: AdminUser = {
  email: process.env.E2E_NON_ADMIN_EMAIL || 'user@example.com',
  password: process.env.E2E_NON_ADMIN_PASSWORD || 'testpassword123',
};

export const hasSuperAdminCredentials = () => Boolean(SUPER_ADMIN_USER.email && SUPER_ADMIN_USER.password);

export const loginToAdmin = async (page: Page, user: AdminUser = SUPER_ADMIN_USER) => {
  await page.goto('/login');

  const emailInput = page.locator('input#email, input[name="email"]').first();
  const passwordInput = page.locator('input#password, input[name="password"]').first();

  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(user.email);
    await passwordInput.fill(user.password);
    await page.getByRole('button', { name: /sign in|log in/i }).first().click();
  }

  await page.waitForURL(/\/(platform|login|god-mode)/);
};

export interface AdminAuthFixtures {
  authenticatedAdminPage: Page;
}

export const test = base.extend<AdminAuthFixtures>({
  authenticatedAdminPage: async ({ page }, use) => {
    await loginToAdmin(page, SUPER_ADMIN_USER);
    await page.goto('/platform');
    await use(page);
  },
});

export { expect } from '@playwright/test';
