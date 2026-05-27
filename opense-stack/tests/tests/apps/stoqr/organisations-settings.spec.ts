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
      await expect(adminSession.page.getByRole('heading', { name: 'Activity Logs' })).toBeVisible()
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

      await expect(adminSession.page.getByRole('heading', { name: 'Organisation Permissions' })).toBeVisible()
      await expect(adminSession.page.getByRole('columnheader', { name: 'Role Rank' })).toBeVisible()

      const editButton = adminSession.page
        .locator('tbody tr', { hasNotText: 'Owner' })
        .getByRole('button', { name: /^edit$/i })
        .first()

      await expect(editButton).toBeVisible()
      await editButton.click()

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
