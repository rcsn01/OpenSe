import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { test } from '../../fixtures/auth'
import { CreateProductPage, LabelStudioPage } from '../../pages/AppPages'

const createTemplate = async (page: Page, templateName: string) => {
  await page.getByRole('button', { name: '+ New Template' }).click()
  await page.getByLabel('Template Name').fill(templateName)
  await page.getByRole('button', { name: 'Create Template' }).click()
  await expect(page.getByText('Template created. Select it from the library to design it.')).toBeVisible()
  await expect(page.getByRole('button', { name: `Open ${templateName} template` })).toBeVisible()
}

const createProductForLabelExport = async (page: Page, productName: string, sku: string) => {
  const createProductPage = new CreateProductPage(page)

  await createProductPage.goto()
  await createProductPage.expectLoaded()
  await createProductPage.createProduct(productName, sku, 4)
  await expect(page).toHaveURL(/\/inventory\/[^/]+\/overview$/)
}

test.describe('Stoqr Label Studio', () => {
  test('templates view opens the designer for a created template', async ({ authenticatedPage }) => {
    const labelStudioPage = new LabelStudioPage(authenticatedPage)
    const templateName = `E2E Template ${Date.now()}`

    await labelStudioPage.goto()
    await labelStudioPage.expectLoaded()

    await expect(authenticatedPage.getByRole('button', { name: 'Templates' })).toBeVisible()
    await expect(authenticatedPage.getByRole('button', { name: 'Preview & Batch' })).toBeVisible()
    await expect(authenticatedPage.getByRole('button', { name: 'Design' })).toHaveCount(0)
    await expect(authenticatedPage.getByRole('button', { name: 'Downloads' })).toHaveCount(0)
    await expect(authenticatedPage.getByRole('heading', { name: 'Template Library' })).toBeVisible()

    await createTemplate(authenticatedPage, templateName)
    await authenticatedPage.getByRole('button', { name: `Open ${templateName} template` }).click()

    await expect(authenticatedPage.getByRole('heading', { name: 'Label Designer' }).first()).toBeVisible()
    await expect(authenticatedPage.getByLabel('Label Width (mm)')).toBeVisible()
    await expect(authenticatedPage.getByLabel('Content Padding (pt)')).toBeVisible()
    await expect(authenticatedPage.getByRole('heading', { name: 'Machine-readable' })).toBeVisible()
    await expect(authenticatedPage.getByRole('heading', { name: 'Live Design Preview' })).toBeVisible()
  })

  test('preview and batch validates selections and exports a pdf for a product', async ({ authenticatedPage }) => {
    const labelStudioPage = new LabelStudioPage(authenticatedPage)
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const templateName = `E2E Export ${uniqueId}`
    const productName = `Label Product ${uniqueId}`
    const sku = `LBL-${uniqueId}`

    await createProductForLabelExport(authenticatedPage, productName, sku)
    await labelStudioPage.goto()
    await labelStudioPage.expectLoaded()
    await createTemplate(authenticatedPage, templateName)

    await authenticatedPage.getByRole('button', { name: 'Preview & Batch' }).click()

    await expect(authenticatedPage).toHaveURL(/\/tools\/labels\/preview-batch(?:\?|$)/)
    await expect(authenticatedPage.getByRole('heading', { name: 'Export Configuration' })).toBeVisible()
    await expect(authenticatedPage.getByRole('radio', { name: 'Single Product' })).toBeVisible()
    await expect(authenticatedPage.getByRole('radio', { name: 'Entire Folder' })).toBeVisible()
    await expect(authenticatedPage.getByRole('button', { name: /export pdf batch/i })).toBeVisible()
    await expect(authenticatedPage.getByRole('heading', { name: 'Recent Exports' })).toBeVisible()

    await authenticatedPage.getByRole('button', { name: /export pdf batch/i }).click()
    await expect(authenticatedPage.getByText('Select template and valid quantity.')).toBeVisible()

    await authenticatedPage.getByLabel('Template', { exact: true }).selectOption({ label: templateName })
    await authenticatedPage.getByLabel('Product', { exact: true }).selectOption({ label: `${productName} (${sku})` })

    const downloadPromise = authenticatedPage.waitForEvent('download')
    await authenticatedPage.getByRole('button', { name: /export pdf batch/i }).click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
    await expect(authenticatedPage.getByText(/PDF downloaded/i)).toBeVisible()
  })

  test('designer saves updated layout controls for the selected template', async ({ authenticatedPage }) => {
    const labelStudioPage = new LabelStudioPage(authenticatedPage)
    const templateName = `E2E Designer ${Date.now()}`

    await labelStudioPage.goto()
    await labelStudioPage.expectLoaded()
    await createTemplate(authenticatedPage, templateName)
    await authenticatedPage.getByRole('button', { name: `Open ${templateName} template` }).click()

    await expect(authenticatedPage.getByRole('heading', { name: 'Live Design Preview' })).toBeVisible()
    await expect(authenticatedPage.getByRole('heading', { name: 'Visible fields' })).toBeVisible()

    await authenticatedPage.getByLabel('Content Padding (pt)').fill('12')
    await authenticatedPage.getByLabel('Barcode Scale (%)').fill('130')
    await authenticatedPage.getByLabel('QR Scale (%)').fill('110')
    await authenticatedPage.getByLabel('Text Alignment').selectOption('center')
    await authenticatedPage.getByRole('button', { name: /Price/i }).click()
    await authenticatedPage.getByRole('button', { name: 'Save Design' }).click()

    await authenticatedPage.getByRole('button', { name: 'Close dialog' }).click()
    await authenticatedPage.getByRole('button', { name: `Open ${templateName} template` }).click()

    await expect(authenticatedPage.getByLabel('Content Padding (pt)')).toHaveValue('12')
    await expect(authenticatedPage.getByLabel('Barcode Scale (%)')).toHaveValue('130')
    await expect(authenticatedPage.getByLabel('Text Alignment')).toHaveValue('center')
    await expect(authenticatedPage.getByRole('button', { name: /Price/i })).toHaveAttribute('aria-pressed', 'true')
  })
})
