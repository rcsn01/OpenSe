import { test as base } from '@playwright/test';
import { Page } from '@playwright/test';

export type TestUser = {
  email: string;
  password: string;
};

export const TEST_USER: TestUser = {
  email: process.env.E2E_TEST_EMAIL || 'test@example.com',
  password: process.env.E2E_TEST_PASSWORD || 'testpassword123',
};

export const DEMO_USER: TestUser = {
  email: process.env.E2E_DEMO_EMAIL || 'demo@example.com',
  password: process.env.E2E_DEMO_PASSWORD || 'demo',
};

export interface AuthFixtures {
  authenticatedPage: Page;
}

export const hasStoqrCredentials = () => Boolean(TEST_USER.email && TEST_USER.password);

const loginWithSupabaseClient = async (page: Page, email: string, password: string) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const hasClient = await page
    .waitForFunction(() => Boolean((window as Window & { supabase?: { auth?: { signInWithPassword?: unknown } } }).supabase?.auth?.signInWithPassword), undefined, {
      timeout: 10000,
    })
    .then(() => true)
    .catch(() => false);

  if (!hasClient) {
    return false;
  }

  const result = await page.evaluate(async ({ email, password }) => {
    const supabase = (window as Window & {
      supabase?: {
        auth?: {
          signOut?: (options?: { scope?: string }) => Promise<unknown>;
          signInWithPassword?: (credentials: { email: string; password: string }) => Promise<{
            data: { session: unknown | null };
            error: { message?: string } | null;
          }>;
        };
      };
    }).supabase;

    if (!supabase?.auth?.signInWithPassword) {
      return { ok: false, reason: 'missing-supabase-client' };
    }

    await supabase.auth.signOut?.({ scope: 'local' }).catch(() => undefined);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { ok: false, reason: error.message ?? 'sign-in-failed' };
    }

    return { ok: Boolean(data.session) };
  }, { email, password });

  if (!result.ok) {
    return false;
  }

  await page.waitForURL(/\/(dashboard|inventory|reports|procurement|scan|tools|alerts)(\/|$)/, { timeout: 15000 }).catch(() => undefined);
  await page.waitForLoadState('networkidle').catch(() => undefined);
  return true;
};

export const loginToStoqr = async (page: Page, email = TEST_USER.email, password = TEST_USER.password) => {
  const loggedInWithClient = await loginWithSupabaseClient(page, email, password).catch(() => false);
  if (loggedInWithClient) {
    return;
  }

  await page.goto('/auth', { waitUntil: 'domcontentloaded' });

  const emailInput = page.locator('input#email, input[name="email"]').first();
  const passwordInput = page.locator('input#password, input[name="password"]').first();
  const demoButton = page.getByRole('button', { name: /demo/i }).first();

  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(email);
    await passwordInput.fill(password);
    await page.getByRole('button', { name: /sign in|log in|continue/i }).first().click();
  } else if (await demoButton.isVisible().catch(() => false)) {
    await demoButton.click();
  }

  await page.waitForURL((url) => !/\/(auth|login|signin)\b/.test(url.pathname), { timeout: 15000 }).catch(() => undefined);
  await page.waitForLoadState('networkidle').catch(() => undefined);
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await loginToStoqr(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
