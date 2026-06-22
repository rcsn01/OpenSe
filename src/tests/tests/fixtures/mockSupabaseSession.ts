import type { Page, Route } from '@playwright/test';

type MembershipMode = 'empty' | 'error';
type MemberRole = 'owner' | 'admin' | 'editor' | 'member';

interface MockSupabaseSessionOptions {
  userId?: string;
  email?: string;
  membershipMode?: MembershipMode;
  initialMembershipRole?: MemberRole;
  pendingInvite?: {
    id?: string;
    orgId?: string;
    orgName?: string;
    inviterName?: string;
    role?: Exclude<MemberRole, 'owner'>;
  };
  onboardingCompleted?: boolean;
  canCreateOrganisation?: boolean;
}

const defaultSupabaseUrl = 'http://127.0.0.1:54321';

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
    initialMembershipRole,
    pendingInvite,
    onboardingCompleted = false,
    canCreateOrganisation = true,
  }: MockSupabaseSessionOptions = {},
) => {
  const supabaseUrl = process.env.SUPABASE_URL || defaultSupabaseUrl;
  const now = Math.floor(Date.now() / 1000);
  const createdAt = new Date().toISOString();
  const invite = pendingInvite
    ? {
        id: pendingInvite.id ?? 'mock-invite-1',
        org_id: pendingInvite.orgId ?? 'mock-org-1',
        org_name: pendingInvite.orgName ?? 'Mock Invited Org',
        inviter_name: pendingInvite.inviterName ?? 'Mock Owner',
        role: pendingInvite.role ?? 'member',
        created_at: createdAt,
      }
    : null;
  let membershipRole = initialMembershipRole ?? null;
  let pendingInviteRows = invite ? [invite] : [];
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
      accounts_onboarding_completed: onboardingCompleted,
      accounts_onboarding_stage: onboardingCompleted ? 'done' : initialMembershipRole ? 'invite-members' : 'create',
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
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() as { data?: Record<string, unknown> } | null;
      user.user_metadata = {
        ...user.user_metadata,
        ...(body?.data ?? {}),
      };
    }

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

    if (!membershipRole) {
      await route.fulfill(json([]));
      return;
    }

    await route.fulfill(json([
      {
        org_id: invite?.org_id ?? 'mock-org-1',
        role: membershipRole,
        organisations: { name: invite?.org_name ?? 'Mock Organisation' },
      },
    ]));
  });

  await page.route('**/rest/v1/organisation_invites**', async (route) => {
    if (await continuePreflight(route)) return;
    if (route.request().method() === 'DELETE') {
      const requestUrl = new URL(route.request().url());
      const idFilter = requestUrl.searchParams.get('id');
      const inviteId = idFilter?.startsWith('eq.') ? idFilter.slice(3) : null;
      pendingInviteRows = inviteId
        ? pendingInviteRows.filter((row) => row.id !== inviteId)
        : [];
      await route.fulfill(json([]));
      return;
    }

    await route.fulfill(json(pendingInviteRows.map((row) => ({
      id: row.id,
      org_id: row.org_id,
      created_at: row.created_at,
      organisations: { name: row.org_name },
      inviter: { full_name: row.inviter_name, email: null },
      role: row.role,
    }))));
  });

  await page.route('**/rest/v1/rpc/accept_invite', async (route) => {
    if (await continuePreflight(route)) return;
    const acceptedInvite = pendingInviteRows[0] ?? invite;
    membershipRole = acceptedInvite?.role ?? 'member';
    pendingInviteRows = [];
    await route.fulfill(json(null));
  });

  await page.route('**/rest/v1/rpc/accounts_get_onboarding_instance_policy', async (route) => {
    if (await continuePreflight(route)) return;
    await route.fulfill(json([
      {
        can_create_organisation: canCreateOrganisation,
        organisation_count: canCreateOrganisation ? 0 : 1,
        max_organisations: 1,
        free_seat_limit: null,
      },
    ]));
  });

  await page.route('**/rest/v1/profiles*', async (route) => {
    if (await continuePreflight(route)) return;
    const profile = {
      id: userId,
      email,
      full_name: user.user_metadata.full_name,
      username: null,
      avatar_url: null,
      avatar_storage_path: null,
      recovery_email: null,
      created_at: createdAt,
      updated_at: null,
    };
    await route.fulfill(json(route.request().method() === 'PATCH' ? profile : profile));
  });
};
