import { test as base } from '@playwright/test';
import { Page } from '@playwright/test';

export type AccountsUser = {
  email: string;
  password: string;
};

export const ACCOUNTS_USER: AccountsUser = {
  email: process.env.E2E_TEST_EMAIL || 'test@example.com',
  password: process.env.E2E_TEST_PASSWORD || 'testpassword123',
};

export const hasAccountsCredentials = () => Boolean(ACCOUNTS_USER.email && ACCOUNTS_USER.password);

interface LoginOptions {
  requireAuthenticated?: boolean;
}

const getSupabaseServiceConfig = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return { supabaseUrl, serviceRoleKey };
};

const buildHeaders = (serviceRoleKey: string, extra?: Record<string, string>) => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  ...extra,
});

const isAuthenticatedUrl = (url: string) => /\/(account|billing|onboarding)/.test(url) && !/\/login$/.test(url);

const getAccountsCredentialCandidates = (): AccountsUser[] => {
  const candidates: AccountsUser[] = [
    ACCOUNTS_USER,
    {
      email: process.env.E2E_SUPER_ADMIN_EMAIL || '',
      password: process.env.E2E_SUPER_ADMIN_PASSWORD || '',
    },
    {
      email: process.env.E2E_NON_ADMIN_EMAIL || '',
      password: process.env.E2E_NON_ADMIN_PASSWORD || '',
    },
    {
      email: process.env.E2E_DEMO_EMAIL || '',
      password: process.env.E2E_DEMO_PASSWORD || '',
    },
  ];

  const deduped = new Map<string, AccountsUser>();
  for (const candidate of candidates) {
    const email = candidate.email.trim();
    const password = candidate.password.trim();
    if (!email || !password) continue;
    deduped.set(email, { email, password });
  }

  return [...deduped.values()];
};

const attemptAccountsLogin = async (page: Page, user: AccountsUser) => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto('/login');

    const emailInput = page.locator('input#email, input[name="email"]').first();
    const passwordInput = page.locator('input#password, input[name="password"]').first();
    const submit = page.getByRole('button', { name: /sign in|log in|continue/i }).first();

    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill(user.email);
      await passwordInput.fill(user.password);
      await submit.click();
    }

    await page.waitForURL(/\/(account|billing|onboarding|login)/, { timeout: 15000 });
    if (isAuthenticatedUrl(page.url())) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return false;
};

const createAccountsUserViaSignup = async (page: Page): Promise<AccountsUser | null> => {
  const uniqueToken = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const user: AccountsUser = {
    email: `e2e-mobile-${uniqueToken}@example.com`,
    password: 'MobileE2E!234',
  };

  await page.goto('/register');

  await page.getByLabel('Full Name').fill('E2E Mobile User');
  await page.getByLabel('Email').fill(user.email);
  const passwordFields = page.locator('input[type="password"][autocomplete="new-password"]');
  await passwordFields.nth(0).fill(user.password);
  await passwordFields.nth(1).fill(user.password);
  await page.getByRole('button', { name: /create account/i }).click();

  const successMessage = page.getByText(/check your email to confirm your account/i);
  if (await successMessage.isVisible().catch(() => false)) {
    return null;
  }

  const loggedIn = await attemptAccountsLogin(page, user);
  return loggedIn ? user : null;
};

const ensureAccountsGeneralPageAccess = async (page: Page) => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.goto('/account/profile');
    await page.waitForURL(/\/(account\/profile|onboarding\/create-organisation|onboarding\/invite-members|onboarding\/invitations|login)/, {
      timeout: 15000,
    });

    const currentUrl = page.url();
    if (/\/account\/profile$/.test(currentUrl)) return true;
    if (/\/login$/.test(currentUrl)) return false;

    if (/\/onboarding\/create-organisation$/.test(currentUrl)) {
      await page.locator('#onboarding-org-name').fill('E2E Mobile Org');
      await page.locator('#onboarding-estimated-people').selectOption('1-5');
      await page.getByRole('button', { name: /create organisation/i }).click();
      continue;
    }

    if (/\/onboarding\/invite-members$/.test(currentUrl)) {
      await page.getByRole('button', { name: /finish onboarding/i }).click();
      continue;
    }

    if (/\/onboarding\/invitations$/.test(currentUrl)) {
      const createOwnOrgButton = page.getByRole('button', { name: /decline all and create my own organisation/i }).first();
      if (await createOwnOrgButton.isVisible().catch(() => false)) {
        await createOwnOrgButton.click();
        continue;
      }

      const acceptInviteButton = page.getByRole('button', { name: /accept invitation/i }).first();
      if (await acceptInviteButton.isVisible().catch(() => false)) {
        await acceptInviteButton.click();
        continue;
      }
    }
  }

  return false;
};

const ensureAccountsMobileUser = async (user: AccountsUser) => {
  const serviceConfig = getSupabaseServiceConfig();
  if (!serviceConfig) return;

  const { supabaseUrl, serviceRoleKey } = serviceConfig;
  const adminBase = `${supabaseUrl}/auth/v1/admin/users`;
  let userId: string | null = null;

  const createUserResponse = await fetch(adminBase, {
    method: 'POST',
    headers: buildHeaders(serviceRoleKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: 'E2E Accounts Mobile User',
      },
    }),
  });

  if (createUserResponse.ok) {
    const created = (await createUserResponse.json()) as { id?: string };
    userId = created.id ?? null;
  }

  if (!userId) {
    const listUsersResponse = await fetch(`${adminBase}?page=1&per_page=1000`, {
      headers: buildHeaders(serviceRoleKey),
    });

    if (listUsersResponse.ok) {
      const payload = (await listUsersResponse.json()) as { users?: Array<{ id: string; email?: string | null }> };
      const matched = payload.users?.find((candidate) => (candidate.email ?? '').toLowerCase() === user.email.toLowerCase());
      userId = matched?.id ?? null;
    }
  }

  if (!userId) {
    const profilesResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(user.email)}&select=id&limit=1`,
      {
        headers: buildHeaders(serviceRoleKey),
      },
    );

    if (profilesResponse.ok) {
      const profiles = (await profilesResponse.json()) as Array<{ id: string }>;
      userId = profiles[0]?.id ?? null;
    }
  }

  if (!userId) return;

  await fetch(`${adminBase}/${userId}`, {
    method: 'PUT',
    headers: buildHeaders(serviceRoleKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: 'E2E Accounts Mobile User',
        accounts_onboarding_completed: true,
        accounts_onboarding_stage: 'done',
      },
    }),
  });

  const membershipsResponse = await fetch(
    `${supabaseUrl}/rest/v1/organisation_members?user_id=eq.${userId}&select=id,org_id&limit=1`,
    {
      headers: buildHeaders(serviceRoleKey),
    },
  );

  let orgId: string | null = null;
  if (membershipsResponse.ok) {
    const memberships = (await membershipsResponse.json()) as Array<{ org_id: string }>;
    orgId = memberships[0]?.org_id ?? null;
  }

  if (!orgId) {
    const createOrgResponse = await fetch(`${supabaseUrl}/rest/v1/organisations`, {
      method: 'POST',
      headers: buildHeaders(serviceRoleKey, {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify({
        name: 'E2E Accounts Mobile Org',
        owner_id: userId,
      }),
    });

    if (createOrgResponse.ok) {
      const createdOrgs = (await createOrgResponse.json()) as Array<{ id: string }>;
      orgId = createdOrgs[0]?.id ?? null;
    }
  }

  if (!orgId) return;

  await fetch(`${supabaseUrl}/rest/v1/organisation_members?on_conflict=org_id,user_id`, {
    method: 'POST',
    headers: buildHeaders(serviceRoleKey, {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    }),
    body: JSON.stringify([
      {
        org_id: orgId,
        user_id: userId,
        role: 'owner',
      },
    ]),
  });

  await new Promise((resolve) => setTimeout(resolve, 400));
};

export const loginToAccounts = async (
  page: Page,
  user: AccountsUser = ACCOUNTS_USER,
  options: LoginOptions = {},
) => {
  if (options.requireAuthenticated) {
    const candidates = getAccountsCredentialCandidates();

    if (candidates.length === 0) {
      throw new Error('No e2e credentials configured. Set E2E_TEST_EMAIL/E2E_TEST_PASSWORD (or E2E_SUPER_ADMIN_*).');
    }

    for (const candidate of candidates) {
      await ensureAccountsMobileUser(candidate);
      const success = await attemptAccountsLogin(page, candidate);
      if (success) return candidate;
    }

    const createdUser = await createAccountsUserViaSignup(page);
    if (createdUser) {
      return createdUser;
    }

    const attempted = candidates.map((candidate) => candidate.email).join(', ');
    throw new Error(`Accounts login failed for strict authenticated fixture. Tried: ${attempted}. Signup fallback also failed (likely email confirmation required).`);
  }

  await attemptAccountsLogin(page, user);
  return user;
};

export interface AccountsAuthFixtures {
  authenticatedAccountsPage: Page;
  authenticatedRequiredAccountsPage: Page;
}

export const test = base.extend<AccountsAuthFixtures>({
  authenticatedAccountsPage: async ({ page }, use) => {
    await loginToAccounts(page);
    await page.goto('/billing');
    await use(page);
  },
  authenticatedRequiredAccountsPage: async ({ page }, use) => {
    await loginToAccounts(page, ACCOUNTS_USER, { requireAuthenticated: true });
    const hasGeneralAccess = await ensureAccountsGeneralPageAccess(page);
    if (!hasGeneralAccess) {
      throw new Error('Authenticated mobile fixture could not reach /account/profile.');
    }
    await use(page);
  },
});

export { expect } from '@playwright/test';
