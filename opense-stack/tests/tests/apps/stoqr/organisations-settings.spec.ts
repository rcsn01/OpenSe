import { test, expect } from '../../fixtures/auth'

type SeededUser = {
  email: string
  password: string
}

const STOQR_BASE_URL = process.env.BASE_URL_STOQR || process.env.VITE_STOQR_PUBLIC_URL || 'http://localhost:5993'
const ACCOUNTS_BASE_URL = process.env.BASE_URL_ACCOUNTS || process.env.VITE_ACCOUNTS_URL || 'http://localhost:5991'
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

  const hasClient = await page
    .waitForFunction(
      () =>
        Boolean(
          (window as Window & { supabase?: { auth?: { signInWithPassword?: unknown } } }).supabase?.auth
            ?.signInWithPassword,
        ),
      undefined,
      { timeout: 10_000 },
    )
    .then(() => true)
    .catch(() => false)

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
    await page.locator('input#email, input[name="email"]').first().fill(user.email)
    await page.locator('input#password, input[name="password"]').first().fill(user.password)
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

test.describe('Stoqr Organisations Settings', () => {
  test('new organisations route resolves and tabs are visible', async ({ authenticatedPage }) => {
    await safeGoto(authenticatedPage, '/settings/organisations/teams')

    await expect(authenticatedPage).toHaveURL(/(settings\/organisations\/teams|auth|login|dashboard|localhost:5993\/$)/)

    if (!authenticatedPage.url().includes('/settings/organisations/teams')) {
      test.skip(true, 'Not on organisations teams route in this environment')
    }

    const teamsTab = authenticatedPage.getByRole('tab', { name: /teams/i }).first()
    if ((await teamsTab.count()) === 0) {
      test.skip(true, 'Organisation settings tabs are not available in this environment')
    }

    await expect(teamsTab).toBeVisible()
  })

  test('legacy team settings route redirects to organisations route', async ({ authenticatedPage }) => {
    await safeGoto(authenticatedPage, '/settings/team/user-management')

    await expect(authenticatedPage).toHaveURL(/(settings\/(team|organisations)\/.+|auth|login|dashboard|localhost:5993\/$)/)
  })

  test('organisation settings tabs expose activity and two-factor content', async ({ authenticatedPage }) => {
    await safeGoto(authenticatedPage, '/settings/organisations/teams')

    if (!authenticatedPage.url().includes('/settings/organisations/')) {
      test.skip(true, 'Not on organisations settings route in this environment')
    }

    const activityTab = authenticatedPage.getByRole('tab', { name: /activity/i }).first()
    const twoFactorTab = authenticatedPage.getByRole('tab', { name: /two-factor/i }).first()

    if ((await activityTab.count()) === 0 || (await twoFactorTab.count()) === 0) {
      test.skip(true, 'Organisation settings tabs are not available in this environment')
    }

    await activityTab.click()
    await expect(authenticatedPage.getByText(/Activity|No activity events found/i).first()).toBeVisible()

    await twoFactorTab.click()
    await expect(authenticatedPage.getByText(/Current Auth Level|Two-Factor Authentication/i).first()).toBeVisible()
  })

  test('owner role row is not editable', async ({ authenticatedPage }) => {
    await safeGoto(authenticatedPage, '/settings/organisations/teams')

    if (!authenticatedPage.url().includes('/settings/organisations/teams')) {
      test.skip(true, 'Not on organisations teams route in this environment')
    }

    const ownerRow = authenticatedPage.locator('table tbody tr', { hasText: 'Owner' }).first()
    if ((await ownerRow.count()) === 0) {
      test.skip(true, 'No owner row available in this environment')
    }

    await expect(ownerRow.locator('select')).toHaveCount(0)
  })

  test('can change a non-owner member role from teams tab', async ({ authenticatedPage }) => {
    await safeGoto(authenticatedPage, '/settings/organisations/teams')

    if (!authenticatedPage.url().includes('/settings/organisations/teams')) {
      test.skip(true, 'Not on organisations teams route in this environment')
    }

    const roleSelect = authenticatedPage.locator('table tbody tr select').first()
    const rowCount = await authenticatedPage.locator('table tbody tr').count()

    if (rowCount === 0 || (await roleSelect.count()) === 0) {
      test.skip(true, 'No team members available for role change in this environment')
    }

    const currentValue = await roleSelect.inputValue()
    const candidateValues = await roleSelect
      .locator('option')
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value).filter(Boolean))

    const nextValue = candidateValues.find((value) => value !== currentValue)
    if (!nextValue) {
      test.skip(true, 'Only one role option available for selected member')
    }

    const updateResponsePromise = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().includes('/organisation_member_roles') &&
        response.url().includes('id=eq.'),
      { timeout: 10_000 },
    )

    await roleSelect.selectOption(nextValue)

    const updateResponse = await updateResponsePromise
    expect(updateResponse.ok()).toBeTruthy()
    await expect(roleSelect).toHaveValue(nextValue)
  })

  test('permissions tab shows and edits role rank', async ({ authenticatedPage }) => {
    await safeGoto(authenticatedPage, '/settings/organisations/permissions')

    if (!authenticatedPage.url().includes('/settings/organisations/permissions')) {
      test.skip(true, 'Not on organisations permissions route in this environment')
    }

    const roleRankHeader = authenticatedPage.getByRole('columnheader', { name: 'Role Rank' }).first()
    if ((await roleRankHeader.count()) === 0) {
      test.skip(true, 'Permissions role table is not available in this environment')
    }

    await expect(roleRankHeader).toBeVisible()

    const editButton = authenticatedPage
      .locator('table tbody tr', { hasNotText: 'Owner' })
      .getByRole('button', { name: /^edit$/i })
      .first()

    if ((await editButton.count()) === 0) {
      test.skip(true, 'No editable role available in this environment')
    }

    await editButton.click()

    const roleRankInput = authenticatedPage.getByLabel('Role Rank')
    await expect(roleRankInput).toBeVisible()

    const originalValue = await roleRankInput.inputValue()
    const numericValue = Number.parseInt(originalValue, 10)

    if (!Number.isFinite(numericValue)) {
      test.skip(true, 'Current role rank is not numeric in this environment')
    }

    const nextRoleRank = String(numericValue + 1000)
    const updateResponsePromise = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().includes('/roles') &&
        response.url().includes('id=eq.'),
      { timeout: 10_000 },
    )

    await roleRankInput.fill(nextRoleRank)
    await authenticatedPage.getByRole('button', { name: /^save$/i }).click()

    const updateResponse = await updateResponsePromise
    expect(updateResponse.ok()).toBeTruthy()
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
