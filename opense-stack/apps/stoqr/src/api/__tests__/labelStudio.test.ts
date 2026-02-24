import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDbFrom = vi.fn()

vi.mock('../../supabaseClient', () => ({
  db: {
    from: (...args: unknown[]) => mockDbFrom(...args),
  },
}))

import {
  createLabelPrintJob,
  createLabelTemplate,
  fetchLabelPrintJobs,
  fetchLabelProducts,
  fetchLabelTemplates,
  updateLabelTemplateLayout,
} from '../labelStudio'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('label studio api', () => {
  it('fetches label products with search filter', async () => {
    const queryResult = {
      data: [{ id: 'p-1', name: 'Label Product', sku: 'LBL-1' }],
      error: null,
    }

    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      or: vi.fn(),
    }

    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.or.mockResolvedValue(queryResult)

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'products') {
        return query
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const rows = await fetchLabelProducts('company-1', 'LBL')

    expect(rows).toEqual([{ id: 'p-1', name: 'Label Product', sku: 'LBL-1' }])
    expect(query.or).toHaveBeenCalledWith('name.ilike.%LBL%,sku.ilike.%LBL%')
  })

  it('fetches templates from system and company scope', async () => {
    const orderByName = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'tpl-1',
          company_id: null,
          name: 'System Product',
          template_type: 'product',
          is_system: true,
          layout: {},
          variable_fields: ['name', 'sku'],
          created_at: '2026-02-24T00:00:00Z',
        },
      ],
      error: null,
    })

    const orderBySystem = vi.fn(() => ({ order: orderByName }))
    const or = vi.fn(() => ({ order: orderBySystem }))

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'label_templates') {
        return {
          select: vi.fn(() => ({ or })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const rows = await fetchLabelTemplates('company-1')

    expect(rows).toHaveLength(1)
    expect(or).toHaveBeenCalledWith('company_id.is.null,company_id.eq.company-1')
    expect(orderBySystem).toHaveBeenCalledWith('is_system', { ascending: false })
    expect(orderByName).toHaveBeenCalledWith('name', { ascending: true })
  })

  it('creates template with expected insert payload', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'label_templates') {
        return { insert }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    await createLabelTemplate({
      companyId: 'company-1',
      name: 'Custom Product',
      templateType: 'product',
      layout: { width: 100 },
      variableFields: ['name', 'sku'],
    })

    expect(insert).toHaveBeenCalledWith({
      company_id: 'company-1',
      name: 'Custom Product',
      template_type: 'product',
      layout: { width: 100 },
      variable_fields: ['name', 'sku'],
      is_system: false,
    })
  })

  it('updates template layout scoped by template and company', async () => {
    const eqCompany = vi.fn().mockResolvedValue({ error: null })
    const eqTemplate = vi.fn(() => ({ eq: eqCompany }))
    const update = vi.fn(() => ({ eq: eqTemplate }))

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'label_templates') {
        return { update }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    await updateLabelTemplateLayout({
      templateId: 'tpl-1',
      companyId: 'company-1',
      layout: { elements: [] },
      variableFields: ['name', 'barcode'],
    })

    expect(update).toHaveBeenCalledWith({
      layout: { elements: [] },
      variable_fields: ['name', 'barcode'],
    })
    expect(eqTemplate).toHaveBeenCalledWith('id', 'tpl-1')
    expect(eqCompany).toHaveBeenCalledWith('company_id', 'company-1')
  })

  it('creates and fetches print jobs', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })

    const limit = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'job-1',
          company_id: 'company-1',
          template_id: 'tpl-1',
          format: 'pdf',
          status: 'queued',
          quantity: 2,
          output_url: null,
          created_at: '2026-02-24T00:00:00Z',
        },
      ],
      error: null,
    })

    const order = vi.fn(() => ({ limit }))
    const eq = vi.fn(() => ({ order }))

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'label_print_jobs') {
        return {
          insert,
          select: vi.fn(() => ({ eq })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    await createLabelPrintJob({
      companyId: 'company-1',
      templateId: 'tpl-1',
      format: 'pdf',
      quantity: 2,
      payload: { productId: 'p-1' },
    })

    expect(insert).toHaveBeenCalledWith({
      company_id: 'company-1',
      template_id: 'tpl-1',
      format: 'pdf',
      quantity: 2,
      payload: { productId: 'p-1' },
      status: 'queued',
    })

    const jobs = await fetchLabelPrintJobs('company-1')
    expect(jobs).toHaveLength(1)
    expect(eq).toHaveBeenCalledWith('company_id', 'company-1')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(limit).toHaveBeenCalledWith(50)
  })
})
