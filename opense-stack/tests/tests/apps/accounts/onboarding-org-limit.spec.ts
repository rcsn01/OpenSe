import { expect, test } from '@playwright/test';

test.setTimeout(90000);

const serviceConfig = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return supabaseUrl && serviceRoleKey ? { supabaseUrl, serviceRoleKey } : null;
};

const serviceHeaders = (serviceRoleKey: string, extra?: Record<string, string>) => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  ...extra,
});

const uniqueUser = (suffix: string) => ({
  email: `accounts-org-limit-${suffix}-${Date.now()}@example.com`,
  password: 'AccountsLimit!234',
});

const findUserIdByEmail = async (email: string) => {
  const config = serviceConfig();
  if (!config) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

  const response = await fetch(`${config.supabaseUrl}/auth/v1/admin/users?per_page=200`, {
    headers: serviceHeaders(config.serviceRoleKey),
  });
  expect(response.ok).toBeTruthy();
  const body = await response.json() as { users?: Array<{ id: string; email?: string }> };
  return body.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
};

const confirmUser = async (email: string) => {
  const config = serviceConfig();
  if (!config) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const userId = await findUserIdByEmail(email);
    if (userId) {
      const response = await fetch(`${config.supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: serviceHeaders(config.serviceRoleKey, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email_confirm: true }),
      });
      expect(response.ok).toBeTruthy();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`Could not find signed-up user ${email}`);
};

const signUpAndSignIn = async (page: import('@playwright/test').Page, user: { email: string; password: string }) => {
  await page.goto('/register');
  await page.getByLabel('Full Name').fill('Accounts Limit User');
  await page.getByLabel('Email').fill(user.email);
  const passwordFields = page.locator('input[type="password"][autocomplete="new-password"]');
  await passwordFields.nth(0).fill(user.password);
  await passwordFields.nth(1).fill(user.password);
  await page.getByRole('button', { name: /create account/i }).click();

  await confirmUser(user.email);
  await page.context().clearCookies();
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/(onboarding|account)/, { timeout: 10000 }).catch(async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/(onboarding|account)/, { timeout: 20000 });
  });
};

const restGet = async <T>(path: string): Promise<T> => {
  const config = serviceConfig();
  if (!config) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    headers: serviceHeaders(config.serviceRoleKey),
  });
  expect(response.ok).toBeTruthy();
  return await response.json() as T;
};

const openCreateOrganisationPage = async (page: import('@playwright/test').Page) => {
  await page.goto('/onboarding/create-organisation');
  await page.getByRole('heading', { name: /create your organisation/i }).waitFor({ timeout: 15000 }).catch(async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /create your organisation/i }).waitFor({ timeout: 20000 });
  });
};

test.describe.configure({ mode: 'serial' });

test.describe('Accounts onboarding organisation limit', () => {
  test.beforeEach(() => {
    test.skip(!serviceConfig(), 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  });

  test('first user can create the only fresh-install organisation with unlimited selected app seats', async ({ page }) => {
    const user = uniqueUser('first');
    const orgName = `Fresh Install Org ${Date.now()}`;

    await signUpAndSignIn(page, user);
    await openCreateOrganisationPage(page);
    await page.locator('#onboarding-org-name').fill(orgName);
    await page.locator('#onboarding-estimated-people').selectOption('1-5');
    await page.getByRole('button', { name: /create organisation/i }).click();
    await expect(page).toHaveURL(/\/onboarding\/invite-members/);

    const orgs = await restGet<Array<{ id: string; name: string }>>(`organisations?select=id,name&name=eq.${encodeURIComponent(orgName)}`);
    expect(orgs).toHaveLength(1);

    const seats = await restGet<Array<{ app_code: string; seat_limit: number | null }>>(
      `organisation_app_seats?select=app_code,seat_limit&org_id=eq.${orgs[0].id}&order=app_code.asc`,
    );
    expect(seats.filter((row) => row.app_code === 'etl' || row.app_code === 'stoqr')).toEqual([
      { app_code: 'etl', seat_limit: null },
      { app_code: 'stoqr', seat_limit: null },
    ]);
  });

  test('second user is blocked from creating another organisation', async ({ page }) => {
    const user = uniqueUser('second');

    await signUpAndSignIn(page, user);
    await expect(page).toHaveURL(/\/onboarding\/blocked/);

    await expect(page.getByRole('heading', { name: /organisation limit reached/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /create your organisation/i })).toHaveCount(0);
    await expect(page.getByLabel(/organisation name/i)).toHaveCount(0);
    await expect(page.getByText(/setup summary/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /create organisation/i })).toHaveCount(0);

    const orgs = await restGet<Array<{ id: string }>>('organisations?select=id');
    expect(orgs).toHaveLength(1);
  });

  test('direct create route redirects blocked users to the blocked onboarding screen', async ({ page }) => {
    const user = uniqueUser('direct-blocked');

    await signUpAndSignIn(page, user);
    await page.goto('/onboarding/create-organisation');

    await expect(page).toHaveURL(/\/onboarding\/blocked/);
    await expect(page.getByRole('heading', { name: /organisation limit reached/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /create your organisation/i })).toHaveCount(0);
  });
});
