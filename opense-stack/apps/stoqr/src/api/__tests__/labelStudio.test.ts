import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDbFrom = vi.fn()
const mockSupabaseFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('../../supabaseClient', () => ({
  db: {
    from: (...args: unknown[]) => mockDbFrom(...args),
  },
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}))

import {
  createLabelPrintJob,
  createLabelTemplate,
  fetchLabelProductFolders,
  fetchLabelPrintJobs,
  fetchLabelProducts,
  fetchLabelTemplates,
  updateLabelTemplateLayout,
} from '../labelStudio'

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
})

describe('label studio api', () => {
  it('fetches label products with search filter', async () => {
    const queryResult = {
      data: [{ id: 'p-1', name: 'Label Product', sku: 'LBL-1', folder_id: 'folder-a' }],
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

    expect(rows).toEqual([{ id: 'p-1', name: 'Label Product', sku: 'LBL-1', folder_id: 'folder-a' }])
    expect(query.or).toHaveBeenCalledWith('name.ilike.%LBL%,sku.ilike.%LBL%')
  })

  it('fetches label products scoped to selected folder', async () => {
    const queryResult = {
      data: [{ id: 'p-2', name: 'Folder Product', sku: 'FLD-1', folder_id: 'folder-b' }],
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

    const rows = await fetchLabelProducts('company-1', 'FLD', 'folder-b')

    expect(rows).toEqual([{ id: 'p-2', name: 'Folder Product', sku: 'FLD-1', folder_id: 'folder-b' }])
    expect(query.eq).toHaveBeenCalledWith('folder_id', 'folder-b')
  })

  it('fetches label product folders', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: 'folder-a', name: 'Beverages' }],
      error: null,
    })

    const eq = vi.fn(() => ({ order }))

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'folders') {
        return {
          select: vi.fn(() => ({ eq })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const rows = await fetchLabelProductFolders('company-1')

    expect(rows).toEqual([{ id: 'folder-a', name: 'Beverages' }])
    expect(eq).toHaveBeenCalledWith('company_id', 'company-1')
    expect(order).toHaveBeenCalledWith('name')
  })

  it('fetches templates from system and company scope', async () => {
    const orderByName = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'tpl-1',
          company_id: null,
          name: 'System Product',
          is_system: true,
          layout: {},
          variable_fields: ['name', 'sku'],
          created_at: '2026-02-24T00:00:00Z',
          updated_at: null,
        },
        {
          id: 'tpl-2',
          company_id: 'company-1',
          name: 'System Product',
          is_system: false,
          layout: { width: 100 },
          variable_fields: ['name', 'sku', 'barcode'],
          created_at: '2026-02-25T00:00:00Z',
          updated_at: '2026-02-26T00:00:00Z',
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
    expect(rows[0]?.id).toBe('tpl-2')
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
      layout: { width: 100 },
      variableFields: ['name', 'sku'],
    })

    expect(insert).toHaveBeenCalledWith({
      company_id: 'company-1',
      name: 'Custom Product',
      layout: { width: 100 },
      variable_fields: ['name', 'sku'],
      is_system: false,
    })
  })

  it('updates company-owned template layout scoped by template and company', async () => {
    const existingMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'tpl-1',
        company_id: 'company-1',
        name: 'Custom Product',
        is_system: false,
      },
      error: null,
    })
    const existingEqId = vi.fn(() => ({ maybeSingle: existingMaybeSingle }))
    const selectExisting = vi.fn(() => ({ eq: existingEqId }))

    const updateSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'tpl-1',
        company_id: 'company-1',
        name: 'Custom Product',
        is_system: false,
        layout: { elements: [] },
        variable_fields: ['name', 'barcode'],
        created_at: '2026-02-24T00:00:00Z',
        updated_at: '2026-02-25T00:00:00Z',
      },
      error: null,
    })
    const updateSelect = vi.fn(() => ({ single: updateSingle }))
    const updateEqCompany = vi.fn(() => ({ select: updateSelect }))
    const updateEqTemplate = vi.fn(() => ({ eq: updateEqCompany }))
    const update = vi.fn(() => ({ eq: updateEqTemplate }))

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'label_templates') {
        return {
          select: selectExisting,
          update,
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const updatedTemplate = await updateLabelTemplateLayout({
      templateId: 'tpl-1',
      companyId: 'company-1',
      layout: { elements: [] },
      variableFields: ['name', 'barcode'],
    })

    expect(updatedTemplate.id).toBe('tpl-1')
    expect(selectExisting).toHaveBeenCalledWith('id, company_id, name, is_system')
    expect(existingEqId).toHaveBeenCalledWith('id', 'tpl-1')
    expect(update).toHaveBeenCalledWith({
      layout: { elements: [] },
      variable_fields: ['name', 'barcode'],
    })
    expect(updateEqTemplate).toHaveBeenCalledWith('id', 'tpl-1')
    expect(updateEqCompany).toHaveBeenCalledWith('company_id', 'company-1')
  })

  it('creates or updates a company override when saving a system template', async () => {
    const existingMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'tpl-system',
        company_id: null,
        name: 'Standard Shelf Label',
        is_system: true,
      },
      error: null,
    })
    const existingEqId = vi.fn(() => ({ maybeSingle: existingMaybeSingle }))
    const selectExisting = vi.fn(() => ({ eq: existingEqId }))

    const upsertSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'tpl-company',
        company_id: 'company-1',
        name: 'Standard Shelf Label',
        is_system: false,
        layout: { width: 120 },
        variable_fields: ['name', 'barcode'],
        created_at: '2026-02-24T00:00:00Z',
        updated_at: '2026-02-25T00:00:00Z',
      },
      error: null,
    })
    const upsertSelect = vi.fn(() => ({ single: upsertSingle }))
    const upsert = vi.fn(() => ({ select: upsertSelect }))

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'label_templates') {
        return {
          select: selectExisting,
          upsert,
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const updatedTemplate = await updateLabelTemplateLayout({
      templateId: 'tpl-system',
      companyId: 'company-1',
      layout: { width: 120 },
      variableFields: ['name', 'barcode'],
    })

    expect(updatedTemplate.id).toBe('tpl-company')
    expect(upsert).toHaveBeenCalledWith(
      {
        company_id: 'company-1',
        name: 'Standard Shelf Label',
        is_system: false,
        layout: { width: 120 },
        variable_fields: ['name', 'barcode'],
      },
      {
        onConflict: 'company_id,name',
      },
    )
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
          requested_by: 'user-1',
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

    const inProfiles = vi.fn().mockResolvedValue({
      data: [{ id: 'user-1', full_name: 'Demo User', username: 'demo' }],
      error: null,
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({ in: inProfiles })),
        }
      }

      throw new Error(`Unexpected supabase table: ${table}`)
    })

    await createLabelPrintJob({
      companyId: 'company-1',
      templateId: 'tpl-1',
      format: 'pdf',
      quantity: 2,
      payload: { productId: 'p-1' },
      outputUrl: 'data:application/pdf;base64,abc',
      status: 'completed',
    })

    expect(insert).toHaveBeenCalledWith({
      company_id: 'company-1',
      template_id: 'tpl-1',
      format: 'pdf',
      quantity: 2,
      payload: { productId: 'p-1' },
      status: 'completed',
      output_url: 'data:application/pdf;base64,abc',
      requested_by: 'user-1',
      completed_at: expect.any(String),
    })

    const jobs = await fetchLabelPrintJobs('company-1')
    expect(jobs).toHaveLength(1)
    expect(jobs[0]?.requester?.full_name).toBe('Demo User')
    expect(eq).toHaveBeenCalledWith('company_id', 'company-1')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(limit).toHaveBeenCalledWith(50)
  })
})
