import { expect } from '@playwright/test'
import { test } from '../../fixtures/auth'
import { LabelStudioPage } from '../../pages/AppPages'

test.describe('Stoqr Label Studio', () => {
  test('label studio shows new tabs and hides legacy tabs', async ({ authenticatedPage }) => {
    const labelStudioPage = new LabelStudioPage(authenticatedPage)

    try {
      await labelStudioPage.goto()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const isExpectedRedirectAbort =
        message.includes('ERR_ABORTED') || message.includes('interrupted by another navigation')
      if (!isExpectedRedirectAbort) {
        throw error
      }
    }

    await labelStudioPage.expectLoaded()

    const canRenderStudio = await authenticatedPage.getByRole('tab', { name: /^Templates$/i }).first().isVisible().catch(() => false)
    if (!canRenderStudio) {
      await expect(authenticatedPage.getByText(/Inventory Control Made Simple|Open-StoQR|Sign in/i).first()).toBeVisible()
      return
    }

    await expect(authenticatedPage.getByRole('heading', { name: /label studio/i })).toBeVisible()

    await expect(authenticatedPage.getByRole('tab', { name: /^Templates$/i })).toBeVisible()
    await expect(authenticatedPage.getByRole('tab', { name: /^Design$/i })).toBeVisible()
    await expect(authenticatedPage.getByRole('tab', { name: /^Preview & Batch$/i })).toBeVisible()

    await expect(authenticatedPage.getByRole('tab', { name: /item labels/i })).toHaveCount(0)
    await expect(authenticatedPage.getByRole('tab', { name: /bin \/ shelf/i })).toHaveCount(0)
    await expect(authenticatedPage.getByRole('tab', { name: /shipping/i })).toHaveCount(0)

    await expect(authenticatedPage.getByText(/Create Template/i)).toBeVisible()

    await authenticatedPage.getByRole('tab', { name: /^Design$/i }).click()
    await expect(authenticatedPage.getByText(/Label Designer|Create a template first/i).first()).toBeVisible()

    await authenticatedPage.getByRole('tab', { name: /^Preview & Batch$/i }).click()
    await expect(authenticatedPage.getByText(/Preview & Batch Print|Recent Print Jobs/i).first()).toBeVisible()
  })
})
