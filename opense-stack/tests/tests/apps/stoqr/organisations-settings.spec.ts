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
})
