import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test as base, type Browser, type Page } from '@playwright/test';

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

type WorkerFixtures = {
  stoqrStorageStatePath: string;
};

const STOQR_BASE_URL = process.env.BASE_URL_STOQR || 'http://localhost:5993';
const ACCOUNTS_BASE_URL = process.env.BASE_URL_ACCOUNTS || 'http://localhost:5991';

export const hasStoqrCredentials = () => Boolean(TEST_USER.email && TEST_USER.password);

const getSupabaseServiceConfig = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return { supabaseUrl, serviceRoleKey };
};

const buildHeaders = (serviceRoleKey: string, extra?: Record<string, string>) => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  ...extra,
});

const isExpectedRedirectAbort = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('ERR_ABORTED') || message.includes('interrupted by another navigation');
};

const safeGoto = async (page: Page, url: string) => {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  } catch (error) {
    if (!isExpectedRedirectAbort(error)) {
      throw error;
    }
  }
};

const isAuthenticatedStoqrUrl = (url: string) =>
  /\/((dashboard|inventory|reports|procurement|scan|tools|alerts|settings)(\/|$))/.test(url);

const getWorkerUser = (workerKey?: string): TestUser | undefined => {
  if (!workerKey) {
    return undefined;
  }

  return {
    email: `stoqr-e2e-${workerKey}@example.com`,
    password: process.env.E2E_STOQR_WORKER_PASSWORD || 'StoqrE2E!234',
  };
};

const getCredentialCandidates = (...preferredUsers: Array<TestUser | undefined>): TestUser[] => {
  const candidates = [...preferredUsers, TEST_USER, DEMO_USER].filter(
    (candidate): candidate is TestUser => Boolean(candidate?.email?.trim() && candidate.password?.trim()),
  );

  const deduped = new Map<string, TestUser>();
  for (const candidate of candidates) {
    deduped.set(candidate.email.trim().toLowerCase(), {
      email: candidate.email.trim(),
      password: candidate.password.trim(),
    });
  }

  return [...deduped.values()];
};

const ensureAuthUserId = async (supabaseUrl: string, serviceRoleKey: string, user: TestUser) => {
  const adminBase = `${supabaseUrl}/auth/v1/admin/users`;

  const createUserResponse = await fetch(adminBase, {
    method: 'POST',
    headers: buildHeaders(serviceRoleKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: 'E2E StoQR User',
      },
    }),
  });

  if (createUserResponse.ok) {
    const created = (await createUserResponse.json()) as { id?: string };
    return created.id ?? null;
  }

  const listUsersResponse = await fetch(`${adminBase}?page=1&per_page=1000`, {
    headers: buildHeaders(serviceRoleKey),
  });

  if (!listUsersResponse.ok) {
    return null;
  }

  const payload = (await listUsersResponse.json()) as {
    users?: Array<{ id: string; email?: string | null }>;
  };

  const matchedUser = payload.users?.find(
    (candidate) => (candidate.email ?? '').toLowerCase() === user.email.toLowerCase(),
  );

  return matchedUser?.id ?? null;
};

const ensureProfileRecord = async (supabaseUrl: string, serviceRoleKey: string, userId: string, user: TestUser) => {
  await fetch(`${supabaseUrl}/rest/v1/profiles?on_conflict=id`, {
    method: 'POST',
    headers: buildHeaders(serviceRoleKey, {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    }),
    body: JSON.stringify({
      id: userId,
      email: user.email,
      full_name: 'E2E StoQR User',
      username: `e2e-stoqr-${userId.slice(0, 8)}`,
    }),
  });
};

const ensureOwnedOrganisation = async (supabaseUrl: string, serviceRoleKey: string, userId: string) => {
  const selectResponse = await fetch(
    `${supabaseUrl}/rest/v1/organisations?owner_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`,
    {
      headers: buildHeaders(serviceRoleKey),
    },
  );

  if (selectResponse.ok) {
    const organisations = (await selectResponse.json()) as Array<{ id: string }>;
    if (organisations[0]?.id) {
      return organisations[0].id;
    }
  }

  const createResponse = await fetch(`${supabaseUrl}/rest/v1/organisations`, {
    method: 'POST',
    headers: buildHeaders(serviceRoleKey, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify({
      name: 'E2E StoQR Organisation',
      owner_id: userId,
    }),
  });

  if (!createResponse.ok) {
    return null;
  }

  const createdOrgs = (await createResponse.json()) as Array<{ id: string }>;
  return createdOrgs[0]?.id ?? null;
};

const ensureStoqrUserAccess = async (user: TestUser) => {
  const serviceConfig = getSupabaseServiceConfig();
  if (!serviceConfig) {
    return false;
  }

  const { supabaseUrl, serviceRoleKey } = serviceConfig;
  const userId = await ensureAuthUserId(supabaseUrl, serviceRoleKey, user);
  if (!userId) {
    return false;
  }

  await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: buildHeaders(serviceRoleKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: 'E2E StoQR User',
      },
    }),
  });

  await ensureProfileRecord(supabaseUrl, serviceRoleKey, userId, user);

  const organisationId = await ensureOwnedOrganisation(supabaseUrl, serviceRoleKey, userId);
  return Boolean(organisationId);
};

const ensureAuthenticatedShell = async (page: Page) => {
  await safeGoto(page, '/dashboard');
  await page.waitForLoadState('networkidle').catch(() => undefined);

  if (isAuthenticatedStoqrUrl(page.url())) {
    return true;
  }

  const hasSession = await page
    .evaluate(async () => {
      const supabase = (window as Window & {
        supabase?: {
          auth?: {
            getSession?: () => Promise<{ data: { session: unknown | null } }>;
          };
        };
      }).supabase;

      if (!supabase?.auth?.getSession) {
        return false;
      }

      const { data } = await supabase.auth.getSession();
      return Boolean(data.session);
    })
    .catch(() => false);

  if (!hasSession) {
    return false;
  }

  await safeGoto(page, '/inventory/all');
  await page.waitForLoadState('networkidle').catch(() => undefined);
  return isAuthenticatedStoqrUrl(page.url());
};

const loginWithSupabaseClient = async (page: Page, email: string, password: string) => {
  await safeGoto(page, `${ACCOUNTS_BASE_URL}/login`);

  const hasClient = await page
    .waitForFunction(
      () =>
        Boolean(
          (window as Window & { supabase?: { auth?: { signInWithPassword?: unknown } } }).supabase?.auth
            ?.signInWithPassword,
        ),
      undefined,
      {
        timeout: 10000,
      },
    )
    .then(() => true)
    .catch(() => false);

  if (!hasClient) {
    return false;
  }

  const result = await page.evaluate(
    async ({ email, password }) => {
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
    },
    { email, password },
  );

  if (!result.ok) {
    return false;
  }

  return ensureAuthenticatedShell(page);
};

const loginViaAccountsRedirect = async (page: Page, email: string, password: string) => {
  await safeGoto(page, '/auth');

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
  return ensureAuthenticatedShell(page);
};

const createAuthenticatedStorageState = async (browser: Browser, workerKey: string) => {
  const candidates = getCredentialCandidates(getWorkerUser(workerKey));

  for (const candidate of candidates) {
    const tempDirectory = mkdtempSync(join(tmpdir(), 'opense-stoqr-auth-'));
    const storageStatePath = join(tempDirectory, `${workerKey}.json`);
    const context = await browser.newContext({
      baseURL: STOQR_BASE_URL,
    });

    try {
      const page = await context.newPage();
      await ensureStoqrUserAccess(candidate).catch(() => undefined);

      const loggedInWithClient = await loginWithSupabaseClient(page, candidate.email, candidate.password).catch(() => false);
      if (!loggedInWithClient) {
        const loggedInWithRedirect = await loginViaAccountsRedirect(page, candidate.email, candidate.password).catch(() => false);
        if (!loggedInWithRedirect) {
          await context.close();
          rmSync(tempDirectory, { recursive: true, force: true });
          continue;
        }
      }

      await context.storageState({ path: storageStatePath });
      await context.close();
      return { storageStatePath, tempDirectory };
    } catch (error) {
      await context.close().catch(() => undefined);
      rmSync(tempDirectory, { recursive: true, force: true });
      throw error;
    }
  }

  throw new Error('Unable to create StoQR worker storage state with the available credentials.');
};

export const loginToStoqr = async (
  page: Page,
  email = TEST_USER.email,
  password = TEST_USER.password,
  workerKey?: string,
) => {
  const workerUser = getWorkerUser(workerKey);
  const candidates = getCredentialCandidates(workerUser, { email, password });

  for (const candidate of candidates) {
    await ensureStoqrUserAccess(candidate).catch(() => undefined);

    const loggedInWithClient = await loginWithSupabaseClient(page, candidate.email, candidate.password).catch(() => false);
    if (loggedInWithClient) {
      return;
    }

    const loggedInWithRedirect = await loginViaAccountsRedirect(page, candidate.email, candidate.password).catch(() => false);
    if (loggedInWithRedirect) {
      return;
    }
  }

  throw new Error('Unable to authenticate StoQR Playwright fixture with the available credentials.');
};

export const test = base.extend<AuthFixtures, WorkerFixtures>({
  stoqrStorageStatePath: [
    async ({ browser }, use, workerInfo) => {
      const workerKey = `${workerInfo.project.name}-${workerInfo.parallelIndex}`;
      const { storageStatePath, tempDirectory } = await createAuthenticatedStorageState(browser, workerKey);

      try {
        await use(storageStatePath);
      } finally {
        rmSync(tempDirectory, { recursive: true, force: true });
      }
    },
    { scope: 'worker', timeout: 120000 },
  ],
  authenticatedPage: async ({ browser, stoqrStorageStatePath }, use) => {
    const context = await browser.newContext({
      baseURL: STOQR_BASE_URL,
      storageState: stoqrStorageStatePath,
    });
    const page = await context.newPage();

    try {
      const hasAuthenticatedShell = await ensureAuthenticatedShell(page);
      if (!hasAuthenticatedShell) {
        throw new Error('StoQR worker storage state did not open an authenticated shell.');
      }

      await use(page);
    } finally {
      await context.close();
    }
  },
});

export { expect } from '@playwright/test';
