import { test, expect } from '../../fixtures/auth'

type SeededUser = {
  email: string
  password: string
}

const STOQR_BASE_URL = process.env.BASE_URL_STOQR || 'http://localhost:5993'
const ACCOUNTS_BASE_URL = process.env.BASE_URL_ACCOUNTS || 'http://localhost:5991'
const FEATURE_UNAVAILABLE_MESSAGE = 'Feature unavailable, please contact your admin for assistance.'

const ACME_ADMIN_USER: SeededUser = {
  email: 'admin@acme.test',
  password: '!Password1',
}

const ACME_MEMBER_USER: SeededUser = {
  email: 'member@acme.test',
  password: '!Password1',
}

const ACME_ORG_NAME = 'Acme Distribution'

const serviceConfig = () => {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return supabaseUrl && serviceRoleKey ? { supabaseUrl, serviceRoleKey } : null
}

const serviceHeaders = (serviceRoleKey: string, extra?: Record<string, string>) => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  ...extra,
})

const serviceFetch = async (path: string, init?: RequestInit) => {
  const config = serviceConfig()
  if (!config) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for seeded StoQR organisation tests')
  }

  return fetch(`${config.supabaseUrl}${path}`, {
    ...init,
    headers: serviceHeaders(config.serviceRoleKey, {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    }),
  })
}

const ensureAuthUserId = async (user: SeededUser, fullName: string) => {
  const createResponse = await serviceFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    }),
  })

  if (createResponse.ok) {
    const created = (await createResponse.json()) as { id?: string }
    if (created.id) return created.id
  }

  const listResponse = await serviceFetch('/auth/v1/admin/users?page=1&per_page=1000')
  expect(listResponse.ok).toBeTruthy()
  const payload = (await listResponse.json()) as { users?: Array<{ id: string; email?: string | null }> }
  const existing = payload.users?.find((candidate) => (candidate.email ?? '').toLowerCase() === user.email.toLowerCase())
  expect(existing?.id).toBeTruthy()

  const updateResponse = await serviceFetch(`/auth/v1/admin/users/${existing!.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    }),
  })
  expect(updateResponse.ok).toBeTruthy()

  return existing!.id
}

const upsertRows = async (path: string, rows: unknown) => {
  const response = await serviceFetch(path, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  })
  expect(response.ok).toBeTruthy()
  return response
}

const ensureE2EOrganisationSettingsUsers = async () => {
  const adminId = await ensureAuthUserId(ACME_ADMIN_USER, 'Acme Admin')
  const memberId = await ensureAuthUserId(ACME_MEMBER_USER, 'Acme Member')

  await upsertRows('/rest/v1/profiles?on_conflict=id', [
    { id: adminId, email: ACME_ADMIN_USER.email, full_name: 'Acme Admin', username: 'e2e-acme-admin' },
    { id: memberId, email: ACME_MEMBER_USER.email, full_name: 'Acme Member', username: 'e2e-acme-member' },
  ])

  const orgLookupResponse = await serviceFetch(
    `/rest/v1/organisations?select=id&name=eq.${encodeURIComponent(ACME_ORG_NAME)}&limit=1`,
  )
  expect(orgLookupResponse.ok).toBeTruthy()
  const existingOrgs = (await orgLookupResponse.json()) as Array<{ id: string }>

  let orgId = existingOrgs[0]?.id
  if (!orgId) {
    const createOrgResponse = await serviceFetch('/rest/v1/organisations', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ name: ACME_ORG_NAME, owner_id: adminId }),
    })
    expect(createOrgResponse.ok).toBeTruthy()
    const createdOrgs = (await createOrgResponse.json()) as Array<{ id: string }>
    orgId = createdOrgs[0]?.id
  }
  expect(orgId).toBeTruthy()

  const stoqrSystemRolesResponse = await serviceFetch(
    `/rest/v1/roles?select=name&company_id=eq.${orgId}&name=in.(Owner,Default)`,
    { headers: { 'Accept-Profile': 'stoqr' } },
  )
  expect(stoqrSystemRolesResponse.ok).toBeTruthy()
  const stoqrSystemRoles = (await stoqrSystemRolesResponse.json()) as Array<{ name: string }>
  expect(new Set(stoqrSystemRoles.map((role) => role.name))).toEqual(new Set(['Owner', 'Default']))

  const etlOwnerRoleResponse = await serviceFetch(
    `/rest/v1/roles?select=id&org_id=eq.${orgId}&name=eq.Owner&limit=1`,
    { headers: { 'Accept-Profile': 'etl' } },
  )
  expect(etlOwnerRoleResponse.ok).toBeTruthy()
  const etlOwnerRoles = (await etlOwnerRoleResponse.json()) as Array<{ id: string }>
  expect(etlOwnerRoles[0]?.id).toBeTruthy()

  const customRoleResponse = await serviceFetch('/rest/v1/roles?on_conflict=company_id,name', {
    method: 'POST',
    headers: {
      'Accept-Profile': 'stoqr',
      'Content-Profile': 'stoqr',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      company_id: orgId,
      name: 'E2E Manager',
      description: 'Editable role for organisation settings e2e coverage',
      role_rank: 500,
    }),
  })
  expect(customRoleResponse.ok).toBeTruthy()
  const customRoles = (await customRoleResponse.json()) as Array<{ id: string }>
  const customRoleId = customRoles[0]?.id
  expect(customRoleId).toBeTruthy()

  const customRolePermissionResponse = await serviceFetch('/rest/v1/role_permissions?on_conflict=role_id,permission_code', {
    method: 'POST',
    headers: {
      'Accept-Profile': 'stoqr',
      'Content-Profile': 'stoqr',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify([
      'dashboard.view',
      'inventory.view',
      'reports.view',
      'procurement.view',
      'alerts.view',
      'organisation.view',
    ].map((permission_code) => ({ role_id: customRoleId, permission_code }))),
  })
  expect(customRolePermissionResponse.ok).toBeTruthy()

  const membersResponse = await upsertRows('/rest/v1/organisation_members?on_conflict=org_id,user_id', [
    { org_id: orgId, user_id: adminId, role: 'owner' },
    { org_id: orgId, user_id: memberId, role: 'member' },
  ])
  const members = (await membersResponse.json()) as Array<{ id: string; user_id: string }>

  await upsertRows('/rest/v1/organisation_app_seats?on_conflict=org_id,app_code', [
    { org_id: orgId, app_code: 'etl', seat_limit: null },
    { org_id: orgId, app_code: 'stoqr', seat_limit: null },
  ])

  await upsertRows('/rest/v1/organisation_member_app_seats?on_conflict=org_member_id,app_code', members.flatMap((member) => [
    { org_member_id: member.id, app_code: 'stoqr' },
  ]))

  const ownerRoleResponse = await serviceFetch(
    `/rest/v1/roles?select=id&company_id=eq.${orgId}&name=eq.Owner&limit=1`,
    { headers: { 'Accept-Profile': 'stoqr' } },
  )
  expect(ownerRoleResponse.ok).toBeTruthy()
  const ownerRoles = (await ownerRoleResponse.json()) as Array<{ id: string }>
  const ownerRoleId = ownerRoles[0]?.id
  expect(ownerRoleId).toBeTruthy()

  const memberRolesResponse = await serviceFetch('/rest/v1/organisation_member_roles?on_conflict=user_id,company_id', {
    method: 'POST',
    headers: {
      'Accept-Profile': 'stoqr',
      'Content-Profile': 'stoqr',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify([
      { user_id: adminId, company_id: orgId, role_id: ownerRoleId },
      { user_id: memberId, company_id: orgId, role_id: customRoleId },
    ]),
  })
  expect(memberRolesResponse.ok).toBeTruthy()

  const pageSettingsResponse = await serviceFetch('/rest/v1/organisation_page_settings?on_conflict=company_id', {
    method: 'POST',
    headers: {
      'Accept-Profile': 'stoqr',
      'Content-Profile': 'stoqr',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      company_id: orgId,
      reports_enabled: true,
      procurement_enabled: true,
      alerts_enabled: true,
    }),
  })
  expect(pageSettingsResponse.ok).toBeTruthy()
}

const organisationPageRoutes = [
  { label: 'Reports', route: '/reports/stock-health' },
  { label: 'Procurement', route: '/procurement/purchase-orders' },
  { label: 'Alerts', route: '/alerts/feed' },
] as const

const isExpectedRedirectAbort = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('ERR_ABORTED') || message.includes('interrupted by another navigation')
}

const safeGoto = async (page: import('@playwright/test').Page, url: string) => {
  try {
    await page.goto(url, { waitUntil: 'commit' })
  } catch (error) {
    if (!isExpectedRedirectAbort(error)) {
      throw error
    }
  }
}

const loginAsSeededUser = async (
  page: import('@playwright/test').Page,
  user: SeededUser,
) => {
  await safeGoto(page, `${ACCOUNTS_BASE_URL}/login`)

  let hasClient = false
  try {
    await page.waitForFunction(
      () =>
        Boolean(
          (window as Window & { supabase?: { auth?: { signInWithPassword?: unknown } } }).supabase?.auth
            ?.signInWithPassword,
        ),
      undefined,
      { timeout: 10_000 },
    )
    hasClient = true
  } catch {
    hasClient = false
  }

  if (hasClient) {
    const result = await page.evaluate(
      async ({ email, password }) => {
        const supabase = (window as Window & {
          supabase?: {
            auth?: {
              signOut?: (options?: { scope?: string }) => Promise<unknown>
              signInWithPassword?: (credentials: { email: string; password: string }) => Promise<{
                data: { session: unknown | null }
                error: { message?: string } | null
              }>
            }
          }
        }).supabase

        if (!supabase?.auth?.signInWithPassword) {
          return { ok: false, reason: 'missing-supabase-client' }
        }

        await supabase.auth.signOut?.({ scope: 'local' }).catch(() => undefined)

        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          return { ok: false, reason: error.message ?? 'sign-in-failed' }
        }

        return { ok: Boolean(data.session) }
      },
      user,
    )

    if (!result.ok) {
      throw new Error(`Unable to sign in ${user.email}: ${result.reason}`)
    }
  } else {
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password').fill(user.password)
    await page.getByRole('button', { name: /sign in|log in|continue/i }).first().click()
  }

  await safeGoto(page, '/dashboard')
  await page.waitForURL((url) => !/\/(auth|login|signin)\b/.test(url.pathname), { timeout: 15_000 }).catch(() => undefined)
  await page.waitForLoadState('networkidle').catch(() => undefined)
}

const openAuthenticatedPageForUser = async (
  browser: import('@playwright/test').Browser,
  user: SeededUser,
) => {
  const context = await browser.newContext({ baseURL: STOQR_BASE_URL })
  const page = await context.newPage()
  await loginAsSeededUser(page, user)
  return { context, page }
}

const setPageAvailability = async (
  page: import('@playwright/test').Page,
  label: (typeof organisationPageRoutes)[number]['label'],
  enabled: boolean,
) => {
  const toggle = page.getByRole('switch', { name: `Toggle ${label} page` })
  await expect(toggle).toBeVisible()

  const isChecked = (await toggle.getAttribute('aria-checked')) === 'true'
  if (isChecked === enabled) {
    return
  }

  const updateResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && response.url().includes('/organisation_page_settings'),
    { timeout: 10_000 },
  )

  await toggle.click()

  const updateResponse = await updateResponsePromise
  expect(updateResponse.ok()).toBeTruthy()
  await expect(toggle).toHaveAttribute('aria-checked', String(enabled))
  await expect(page.getByText(`${label} page ${enabled ? 'enabled' : 'disabled'} for the organisation.`)).toBeVisible()
}

const expectFeatureUnavailable = async (
  page: import('@playwright/test').Page,
  route: string,
) => {
  await safeGoto(page, route)
  await expect(page).toHaveURL(new RegExp(`${route.replace(/\//g, '\\/')}$`))
  await expect(page.getByText(FEATURE_UNAVAILABLE_MESSAGE)).toBeVisible()
}

const openOrganisationPagesSettings = async (
  page: import('@playwright/test').Page,
) => {
  await safeGoto(page, '/settings/organisations/pages')
  await expect(page).toHaveURL(/\/settings\/organisations\/pages$/, { timeout: 20_000 })
  await expect(page.getByText('Page Access')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('switch', { name: 'Toggle Reports page' })).toBeVisible({ timeout: 20_000 })
}

const openOrganisationSettingsTab = async (
  page: import('@playwright/test').Page,
  tab: 'teams' | 'permissions' | 'activity' | 'pages' | 'two-factor',
) => {
  await safeGoto(page, `/settings/organisations/${tab}`)
  await expect(page).toHaveURL(new RegExp(`/settings/organisations/${tab}$`), { timeout: 20_000 })
}

test.describe('Stoqr Organisations Settings', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    await ensureE2EOrganisationSettingsUsers()
  })

  test('teams settings shows organisation navigation and the owner row is read-only', async ({ browser }) => {
    const adminSession = await openAuthenticatedPageForUser(browser, ACME_ADMIN_USER)

    try {
      await openOrganisationSettingsTab(adminSession.page, 'teams')

      await expect(adminSession.page.getByRole('button', { name: 'Teams' })).toBeVisible()
      await expect(adminSession.page.getByRole('button', { name: 'Permissions' })).toBeVisible()
      await expect(adminSession.page.getByRole('button', { name: 'Activity Logs' })).toBeVisible()
      await expect(adminSession.page.getByRole('button', { name: 'Pages' })).toBeVisible()
      await expect(adminSession.page.getByRole('button', { name: 'Two-Factor Authentication' })).toBeVisible()
      await expect(adminSession.page.getByRole('button', { name: /invite member/i })).toHaveCount(0)

      const ownerRow = adminSession.page.locator('tbody tr').filter({ hasText: 'Owner' }).first()
      await expect(ownerRow).toBeVisible()
      await expect(ownerRow.locator('select')).toHaveCount(0)
    } finally {
      await adminSession.context.close()
    }
  })

  test('legacy team settings route redirects to the new organisations route', async ({ browser }) => {
    const adminSession = await openAuthenticatedPageForUser(browser, ACME_ADMIN_USER)

    try {
      await safeGoto(adminSession.page, '/settings/team/user-management')
      await expect(adminSession.page).toHaveURL(/\/settings\/organisations\/teams$/, { timeout: 20_000 })
    } finally {
      await adminSession.context.close()
    }
  })

  test('activity logs and two-factor tabs are reachable from organisation settings', async ({ browser }) => {
    const adminSession = await openAuthenticatedPageForUser(browser, ACME_ADMIN_USER)

    try {
      await openOrganisationSettingsTab(adminSession.page, 'teams')

      await adminSession.page.getByRole('button', { name: 'Activity Logs' }).click()
      await expect(adminSession.page).toHaveURL(/\/settings\/organisations\/activity$/, { timeout: 20_000 })
      await expect(adminSession.page.getByRole('columnheader', { name: 'Timestamp' })).toBeVisible()
      await expect(adminSession.page.getByRole('button', { name: 'Export Logs' })).toHaveCount(0)

      await adminSession.page.getByRole('button', { name: 'Two-Factor Authentication' }).click()
      await expect(adminSession.page).toHaveURL(/\/settings\/organisations\/two-factor$/, { timeout: 20_000 })
      await expect(adminSession.page.getByRole('heading', { name: 'Current Auth Level' })).toBeVisible()
      await expect(adminSession.page.getByRole('heading', { name: 'Two-Factor Authentication' })).toBeVisible()
    } finally {
      await adminSession.context.close()
    }
  })

  test('permissions tab shows role ranks and editable role controls', async ({ browser }) => {
    const adminSession = await openAuthenticatedPageForUser(browser, ACME_ADMIN_USER)

    try {
      await openOrganisationSettingsTab(adminSession.page, 'permissions')

      await expect(adminSession.page.getByRole('columnheader', { name: 'Role Rank' })).toBeVisible()

      const editableRoleRow = adminSession.page.getByRole('row', { name: /E2E Manager/ })
      await expect(editableRoleRow).toBeVisible()
      await editableRoleRow.click()

      await expect(adminSession.page).toHaveURL(/\/settings\/organisations\/permissions\/[^/]+$/, { timeout: 20_000 })
      await expect(adminSession.page.getByRole('heading', { name: 'Edit Role Permissions' })).toBeVisible()
      await expect(adminSession.page.getByText('Role Rank').last()).toBeVisible()
      await expect(adminSession.page.getByRole('button', { name: /^save$/i })).toBeVisible()
      await adminSession.page.getByRole('button', { name: /^cancel$/i }).click()
    } finally {
      await adminSession.context.close()
    }
  })

  test('pages tab search filters organisation page controls from the shared top bar', async ({ browser }) => {
    const adminSession = await openAuthenticatedPageForUser(browser, ACME_ADMIN_USER)

    try {
      await openOrganisationSettingsTab(adminSession.page, 'pages')

      const searchInput = adminSession.page.getByRole('combobox', { name: 'Search page access...' })
      await expect(searchInput).toBeVisible()

      await searchInput.fill('procurement')

      await expect(adminSession.page.getByRole('heading', { name: 'Procurement' })).toBeVisible()
      await expect(adminSession.page.getByText('purchase orders, suppliers, and receiving workflows', { exact: false })).toBeVisible()
      await expect(adminSession.page.getByRole('heading', { name: 'Reports' })).toHaveCount(0)
      await expect(adminSession.page.getByRole('heading', { name: 'Alerts' })).toHaveCount(0)
    } finally {
      await adminSession.context.close()
    }
  })

  test('pages tab disables routes for the whole organisation', async ({ browser }) => {
    test.setTimeout(90_000)

    const adminSession = await openAuthenticatedPageForUser(browser, ACME_ADMIN_USER)

    try {
      await openOrganisationPagesSettings(adminSession.page)

      for (const pageConfig of organisationPageRoutes) {
        await setPageAvailability(adminSession.page, pageConfig.label, false)
      }

      for (const pageConfig of organisationPageRoutes) {
        await expectFeatureUnavailable(adminSession.page, pageConfig.route)
      }

      const memberSession = await openAuthenticatedPageForUser(browser, ACME_MEMBER_USER)

      try {
        for (const pageConfig of organisationPageRoutes) {
          await expectFeatureUnavailable(memberSession.page, pageConfig.route)
        }
      } finally {
        await memberSession.context.close()
      }
    } finally {
      await openOrganisationPagesSettings(adminSession.page)

      for (const pageConfig of organisationPageRoutes) {
        await setPageAvailability(adminSession.page, pageConfig.label, true)
      }

      await adminSession.context.close()
    }
  })
})
