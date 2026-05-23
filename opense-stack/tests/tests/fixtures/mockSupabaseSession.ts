import type { Page, Route } from '@playwright/test';

type MembershipMode = 'empty' | 'error';

interface MockSupabaseSessionOptions {
  userId?: string;
  email?: string;
  membershipMode?: MembershipMode;
}

const defaultSupabaseUrl = 'https://sllrsicziiasebqhytfr.supabase.co';

const getSupabaseStorageKey = (supabaseUrl: string) => {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  return `sb-${projectRef}-auth-token`;
};

const json = (body: unknown, status = 200) => ({
  status,
  headers: {
    'access-control-allow-origin': '*',
    'content-type': 'application/json',
  },
  body: JSON.stringify(body),
});

const continuePreflight = async (route: Route) => {
  if (route.request().method() === 'OPTIONS') {
    await route.fulfill(json({}));
    return true;
  }

  return false;
};

export const installMockSupabaseSession = async (
  page: Page,
  {
    userId = 'e2e-zero-org-user',
    email = 'e2e-zero-org@example.com',
    membershipMode = 'empty',
  }: MockSupabaseSessionOptions = {},
) => {
  const supabaseUrl = process.env.SUPABASE_URL || defaultSupabaseUrl;
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {
      full_name: 'E2E Zero Org User',
      accounts_onboarding_completed: false,
      accounts_onboarding_stage: 'create',
    },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const session = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user,
  };

  await page.addInitScript(
    ({ storageKey, session }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
      window.sessionStorage.setItem('system_check_passed', 'true');
    },
    {
      storageKey: getSupabaseStorageKey(supabaseUrl),
      session,
    },
  );

  await page.route('**/auth/v1/user**', async (route) => {
    if (await continuePreflight(route)) return;
    await route.fulfill(json({ user }));
  });

  await page.route('**/rest/v1/rpc/has_users**', async (route) => {
    if (await continuePreflight(route)) return;
    await route.fulfill(json(true));
  });

  await page.route('**/rest/v1/organisation_members**', async (route) => {
    if (await continuePreflight(route)) return;
    if (membershipMode === 'error') {
      await route.fulfill(json({ message: 'mock organisation membership failure' }, 500));
      return;
    }

    await route.fulfill(json([]));
  });

  await page.route('**/rest/v1/organisation_invites**', async (route) => {
    if (await continuePreflight(route)) return;
    await route.fulfill(json([]));
  });
};
