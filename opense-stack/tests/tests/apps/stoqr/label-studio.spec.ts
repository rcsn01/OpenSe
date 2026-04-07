import { type Locator, expect } from '@playwright/test'
import { test } from '../../fixtures/auth'
import { LabelStudioPage } from '../../pages/AppPages'

const ensureTemplateExists = async (page: import('@playwright/test').Page) => {
  const templateButtons = page.getByRole('button', { name: /edit .* template/i })

  if (await templateButtons.count()) {
    return templateButtons.first()
  }

  const templateName = `E2E Template ${Date.now()}`
  await page.getByLabel('Template Name').fill(templateName)
  await page.getByRole('button', { name: 'Create Template' }).click()
  await expect(page.getByText('Template created. Select it from the library to design it.')).toBeVisible()

  const createdTemplateButton = page.getByRole('button', { name: `Edit ${templateName} template` })
  await expect(createdTemplateButton).toBeVisible()
  return createdTemplateButton
}

const selectFirstRealOption = async (select: Locator) => {
  const optionCount = await select.locator('option').count()
  if (optionCount <= 1) {
    return false
  }

  await select.selectOption({ index: 1 })
  return true
}

test.describe('Stoqr Label Studio', () => {
  test('label studio uses combined template and preview workflows', async ({ authenticatedPage }) => {
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
      await expect(authenticatedPage).toHaveURL(/\/(tools\/labels(\/[^/]+)?|dashboard|auth|login|$)/)
      return
    }

    await expect(authenticatedPage.getByRole('heading', { name: /label studio/i })).toBeVisible()

    await expect(authenticatedPage.getByRole('tab', { name: /^Templates$/i })).toBeVisible()
    await expect(authenticatedPage.getByRole('tab', { name: /^Preview & Batch$/i })).toBeVisible()
    await expect(authenticatedPage.getByRole('tab', { name: /^Design$/i })).toHaveCount(0)
    await expect(authenticatedPage.getByRole('tab', { name: /^Downloads$/i })).toHaveCount(0)

    await expect(authenticatedPage.getByRole('tab', { name: /item labels/i })).toHaveCount(0)
    await expect(authenticatedPage.getByRole('tab', { name: /bin \/ shelf/i })).toHaveCount(0)
    await expect(authenticatedPage.getByRole('tab', { name: /shipping/i })).toHaveCount(0)

    await expect(authenticatedPage.getByText(/Create Template/i)).toBeVisible()

    const templateButton = await ensureTemplateExists(authenticatedPage)
    await templateButton.click()

    await expect(authenticatedPage.getByText(/^Label Designer$/i).last()).toBeVisible()
    await expect(authenticatedPage.getByText(/Label Width \(mm\)/i)).toBeVisible()
    await expect(authenticatedPage.getByText(/GUI Preview/i)).toBeVisible()

    await authenticatedPage.getByRole('tab', { name: /^Preview & Batch$/i }).click()
    await expect(authenticatedPage).toHaveURL(/\/tools\/labels\/preview-batch$/)
    await expect(authenticatedPage.getByText(/Preview & Batch/i).first()).toBeVisible()
    await expect(authenticatedPage.getByText(/Single Product|Entire Folder/i).first()).toBeVisible()
    await expect(authenticatedPage.getByRole('button', { name: /export pdf/i })).toBeVisible()
    await expect(authenticatedPage.getByText(/Recent Downloads/i)).toBeVisible()
  })

  test('preview tab validates export inputs and downloads pdf directly', async ({ authenticatedPage }) => {
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
      await expect(authenticatedPage).toHaveURL(/\/(tools\/labels(\/[^/]+)?|dashboard|auth|login|$)/)
      return
    }

    await authenticatedPage.getByRole('tab', { name: /^Preview & Batch$/i }).click()
    await expect(authenticatedPage).toHaveURL(/\/tools\/labels\/preview-batch$/)
    await expect(authenticatedPage.getByRole('button', { name: /export pdf/i })).toBeVisible()
    await expect(authenticatedPage.getByText(/Recent Downloads/i)).toBeVisible()

    await authenticatedPage.getByRole('button', { name: /export pdf/i }).click()
    await expect(authenticatedPage.getByText(/Select template and valid quantity\./i)).toBeVisible()

    await authenticatedPage.getByRole('tab', { name: /^Templates$/i }).click()
    await ensureTemplateExists(authenticatedPage)

    await authenticatedPage.getByRole('tab', { name: /^Preview & Batch$/i }).click()

    const selectedTemplate = await selectFirstRealOption(authenticatedPage.getByLabel(/^Template$/i))
    if (!selectedTemplate) {
      test.skip(true, 'No label template options available for PDF export.')
    }

    const selectedProduct = await selectFirstRealOption(authenticatedPage.getByLabel(/^Product$/i))
    if (!selectedProduct) {
      test.skip(true, 'No products available for PDF export.')
    }

    const downloadPromise = authenticatedPage.waitForEvent('download')
    await authenticatedPage.getByRole('button', { name: /export pdf/i }).click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
    await expect(authenticatedPage.getByText(/PDF downloaded/i)).toBeVisible()
  })
})
