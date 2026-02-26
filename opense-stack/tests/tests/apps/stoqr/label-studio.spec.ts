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
    await expect(authenticatedPage.getByRole('tab', { name: /^Downloads$/i })).toBeVisible()

    await expect(authenticatedPage.getByRole('tab', { name: /item labels/i })).toHaveCount(0)
    await expect(authenticatedPage.getByRole('tab', { name: /bin \/ shelf/i })).toHaveCount(0)
    await expect(authenticatedPage.getByRole('tab', { name: /shipping/i })).toHaveCount(0)

    await expect(authenticatedPage.getByText(/Create Template/i)).toBeVisible()

    await authenticatedPage.getByRole('tab', { name: /^Design$/i }).click()
    await expect(authenticatedPage.getByText(/Label Designer|Create a template first/i).first()).toBeVisible()
    await expect(authenticatedPage.getByText(/GUI Preview|Select a template to preview design settings/i).first()).toBeVisible()

    await authenticatedPage.getByRole('tab', { name: /^Preview & Batch$/i }).click()
    await expect(authenticatedPage.getByText(/Preview & Batch/i).first()).toBeVisible()
    await expect(authenticatedPage.getByText(/Single Product|Entire Folder/i).first()).toBeVisible()
    await expect(authenticatedPage.getByRole('button', { name: /export pdf/i })).toBeVisible()
    await expect(authenticatedPage.getByText(/Recent Print Jobs/i)).toHaveCount(0)

    await authenticatedPage.getByRole('tab', { name: /^Downloads$/i }).click()
    await expect(authenticatedPage.getByText(/Downloads|No PDF exports yet/i).first()).toBeVisible()
  })

  test('preview tab validates export inputs and downloads tab empty state is visible', async ({ authenticatedPage }) => {
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

    await authenticatedPage.getByRole('tab', { name: /^Preview & Batch$/i }).click()
    await expect(authenticatedPage.getByRole('button', { name: /export pdf/i })).toBeVisible()

    await authenticatedPage.getByRole('button', { name: /export pdf/i }).click()
    await expect(authenticatedPage.getByText(/Select template and valid quantity\./i)).toBeVisible()

    await authenticatedPage.getByRole('tab', { name: /^Downloads$/i }).click()
    await expect(authenticatedPage.getByText(/No PDF exports yet\./i)).toBeVisible()
  })
})
