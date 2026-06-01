import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { test } from '../../fixtures/auth'
import { CreateProductPage, LabelStudioPage } from '../../pages/AppPages'

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const editTemplateControl = (page: Page, templateName: string) =>
  page.locator('tbody tr').filter({ hasText: templateName }).first()

const createTemplate = async (page: Page, templateName: string) => {
  await page.getByRole('button', { name: 'Create new template' }).click()
  await page.getByLabel('Template Name').fill(templateName)
  await page.getByRole('button', { name: 'Create Template' }).click()
  await expect(page.getByText('Template created. Click its name to edit it.')).toBeVisible()
  await expect(editTemplateControl(page, templateName)).toBeVisible()
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
    await expect(authenticatedPage.getByRole('button', { name: 'Create new template' })).toBeVisible()

    await createTemplate(authenticatedPage, templateName)
    await editTemplateControl(authenticatedPage, templateName).click()

    await expect(authenticatedPage.getByRole('heading', { name: templateName })).toBeVisible()
    await expect(authenticatedPage.getByLabel('Width (mm)')).toBeVisible()
    await expect(authenticatedPage.getByLabel('Content Padding (pt)')).toBeVisible()
    await expect(authenticatedPage.getByText('Identifiers')).toBeVisible()
    await expect(authenticatedPage.getByText('Live Canvas')).toBeVisible()
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
    await expect(authenticatedPage.getByRole('heading', { name: 'Export & Batch' })).toBeVisible()
    await expect(authenticatedPage.getByRole('radio', { name: 'Single' })).toBeVisible()
    await expect(authenticatedPage.getByRole('radio', { name: 'Folder' })).toBeVisible()
    await expect(authenticatedPage.getByRole('button', { name: 'Export PDF' })).toBeVisible()
    await expect(authenticatedPage.getByText('A4 Layout Preview')).toBeVisible()

    await authenticatedPage.getByRole('button', { name: 'Export PDF' }).click()
    await expect(authenticatedPage.getByText('Select template and valid quantity.')).toBeVisible()

    await authenticatedPage.getByLabel('Template', { exact: true }).selectOption({ label: templateName })
    await authenticatedPage.getByLabel('Product Search').fill(sku)
    await authenticatedPage.getByRole('button', { name: new RegExp(productName) }).click()

    const downloadPromise = authenticatedPage.waitForEvent('download')
    await authenticatedPage.getByRole('button', { name: 'Export PDF' }).click()

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
    await editTemplateControl(authenticatedPage, templateName).click()

    await expect(authenticatedPage.getByRole('heading', { name: templateName })).toBeVisible()
    await expect(authenticatedPage.getByText('Live Canvas')).toBeVisible()
    await expect(authenticatedPage.getByText('Visibility Settings')).toBeVisible()

    await authenticatedPage.getByLabel('Content Padding (pt)').fill('12')
    await authenticatedPage.getByLabel('Barcode Scale (%)').fill('130')
    await authenticatedPage.getByLabel('QR Scale (%)').fill('110')
    await authenticatedPage.getByRole('button', { name: 'Center aligned' }).click()
    await authenticatedPage.getByRole('switch', { name: 'Price Field' }).click()
    await authenticatedPage.getByRole('button', { name: 'Save Changes' }).click()

    await expect(authenticatedPage.getByRole('button', { name: 'Discard' })).toBeDisabled()
    await authenticatedPage.getByRole('button', { name: 'Back to templates' }).click()
    await editTemplateControl(authenticatedPage, templateName).click()

    await expect(authenticatedPage.getByLabel('Content Padding (pt)')).toHaveValue('12')
    await expect(authenticatedPage.getByLabel('Barcode Scale (%)')).toHaveValue('130')
    await expect(authenticatedPage.getByRole('button', { name: 'Center aligned' })).toHaveAttribute('aria-pressed', 'true')
    await expect(authenticatedPage.getByRole('switch', { name: 'Price Field' })).toHaveAttribute('aria-checked', 'true')
  })

  test('template search works from the library and the dedicated designer page', async ({ authenticatedPage }) => {
    const labelStudioPage = new LabelStudioPage(authenticatedPage)
    const templateOne = `Search Template ${Date.now()} A`
    const templateTwo = `Search Template ${Date.now()} B`

    await labelStudioPage.goto()
    await labelStudioPage.expectLoaded()
    await createTemplate(authenticatedPage, templateOne)
    await createTemplate(authenticatedPage, templateTwo)

    const searchInput = authenticatedPage.getByRole('combobox', { name: 'Search templates...' })
    await searchInput.fill(templateTwo)
    await authenticatedPage.getByRole('option', { name: new RegExp(escapeRegExp(templateTwo)) }).click()

    await expect(authenticatedPage).toHaveURL(/\/tools\/labels\/templates\/.+\?.*template=.+/)
    await expect(authenticatedPage.getByRole('heading', { name: templateTwo })).toBeVisible()

    await searchInput.fill(templateOne)
    await authenticatedPage.getByRole('option', { name: new RegExp(escapeRegExp(templateOne)) }).click()

    await expect(authenticatedPage.getByRole('heading', { name: templateOne })).toBeVisible()
  })
})
