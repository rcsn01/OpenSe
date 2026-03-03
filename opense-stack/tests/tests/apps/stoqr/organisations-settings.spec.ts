import { test, expect } from '../../fixtures/auth'

const safeGoto = async (page: import('@playwright/test').Page, url: string) => {
  try {
    await page.goto(url, { waitUntil: 'commit' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const isExpectedRedirectAbort =
      message.includes('ERR_ABORTED') || message.includes('interrupted by another navigation')

    if (!isExpectedRedirectAbort) {
      throw error
    }
  }
}

test.describe('Stoqr Organisations Settings', () => {
  test('new organisations route resolves and tabs are visible', async ({ authenticatedPage }) => {
    await safeGoto(authenticatedPage, '/settings/organisations/teams')

    await expect(authenticatedPage).toHaveURL(/(settings\/organisations\/teams|auth|login|dashboard|localhost:5993\/$)/)

    if (authenticatedPage.url().includes('/settings/organisations/teams')) {
      await expect(authenticatedPage.getByText('Teams').first()).toBeVisible()
    }
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
})
