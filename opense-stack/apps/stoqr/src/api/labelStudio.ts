import { db, supabase } from '../supabaseClient'
import type { Product } from '../types'

export type LabelProduct = Pick<Product, 'id' | 'name' | 'sku' | 'folder_id' | 'selling_price'>

export type LabelProductFolder = {
  id: string
  name: string
}

export type LabelTemplate = {
  id: string
  company_id: string | null
  name: string
  is_system: boolean
  layout: Record<string, unknown>
  variable_fields: string[]
  created_at: string
  updated_at: string | null
}

export type LabelPrintJob = {
  id: string
  company_id: string
  template_id: string | null
  format: 'pdf' | 'png'
  status: 'queued' | 'processing' | 'completed' | 'failed'
  quantity: number
  output_url: string | null
  requested_by: string | null
  requester: {
    full_name: string | null
    username: string | null
  } | null
  created_at: string
}

const labelTemplateSelectFields = 'id, company_id, name, is_system, layout, variable_fields, created_at, updated_at'

const normalizeTemplateName = (value: string) => value.trim().toLowerCase()

export const fetchLabelProducts = async (
  companyId: string,
  search: string,
  folderId?: string,
): Promise<LabelProduct[]> => {
  let folderProductIds: string[] | null = null

  if (folderId?.trim()) {
    try {
      const { data: stockRows, error: stockError } = await db
        .from('product_folder_stocks')
        .select('product_id')
        .eq('company_id', companyId)
        .eq('folder_id', folderId)

      if (stockError) throw stockError
      folderProductIds = ((stockRows as Array<{ product_id: string }> | null) ?? []).map((row) => row.product_id)
      if (folderProductIds.length === 0) return []
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Unexpected table: product_folder_stocks')) {
        folderProductIds = null
      } else {
        throw error
      }
    }
  }

  let query = db
    .from('products')
    .select('id, name, sku, folder_id, selling_price')
    .eq('company_id', companyId)
    .order('name')

  if (folderProductIds) {
    query = query.in('id', folderProductIds)
  } else if (folderId?.trim()) {
    query = query.eq('folder_id', folderId)
  }

  if (search.trim()) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) throw error

  return (((data as LabelProduct[] | null) ?? []).map((product) => ({
    ...product,
    sku: product.sku ?? '',
  })))
}

export const fetchLabelProductFolders = async (companyId: string): Promise<LabelProductFolder[]> => {
  const { data, error } = await db
    .from('folders')
    .select('id, name')
    .eq('company_id', companyId)
    .order('name')

  if (error) throw error

  return (data as LabelProductFolder[] | null) ?? []
}

export const fetchLabelTemplates = async (companyId: string): Promise<LabelTemplate[]> => {
  const { data, error } = await db
    .from('label_templates')
    .select(labelTemplateSelectFields)
    .or(`company_id.is.null,company_id.eq.${companyId}`)
    .order('is_system', { ascending: false })
    .order('name', { ascending: true })

  if (error) throw error

  const rows = (data as LabelTemplate[] | null) ?? []
  const prioritizedRows = [...rows].sort((left, right) => {
    const leftPriority = left.company_id === companyId ? 0 : 1
    const rightPriority = right.company_id === companyId ? 0 : 1

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    return left.name.localeCompare(right.name)
  })

  const dedupedRows: LabelTemplate[] = []
  const seenTemplateNames = new Set<string>()

  for (const row of prioritizedRows) {
    const normalizedName = normalizeTemplateName(row.name)
    if (seenTemplateNames.has(normalizedName)) {
      continue
    }

    seenTemplateNames.add(normalizedName)
    dedupedRows.push(row)
  }

  return dedupedRows.sort((left, right) => left.name.localeCompare(right.name))
}

export const createLabelTemplate = async (params: {
  companyId: string
  name: string
  layout: Record<string, unknown>
  variableFields: string[]
}) => {
  const { error } = await db.from('label_templates').insert({
    company_id: params.companyId,
    name: params.name,
    layout: params.layout,
    variable_fields: params.variableFields,
    is_system: false,
  })

  if (error) throw error
}

export const updateLabelTemplateLayout = async (params: {
  templateId: string
  companyId: string
  layout: Record<string, unknown>
  variableFields: string[]
}): Promise<LabelTemplate> => {
  const { data: existingTemplate, error: existingTemplateError } = await db
    .from('label_templates')
    .select('id, company_id, name, is_system')
    .eq('id', params.templateId)
    .maybeSingle()

  if (existingTemplateError) throw existingTemplateError
  if (!existingTemplate) throw new Error('Template not found.')

  if (existingTemplate.company_id === params.companyId) {
    const { data, error } = await db
      .from('label_templates')
      .update({
        layout: params.layout,
        variable_fields: params.variableFields,
      })
      .eq('id', params.templateId)
      .eq('company_id', params.companyId)
      .select(labelTemplateSelectFields)
      .single()

    if (error) throw error

    return data as LabelTemplate
  }

  const { data, error } = await db
    .from('label_templates')
    .upsert(
      {
        company_id: params.companyId,
        name: existingTemplate.name,
        is_system: false,
        layout: params.layout,
        variable_fields: params.variableFields,
      },
      {
        onConflict: 'company_id,name',
      },
    )
    .select(labelTemplateSelectFields)
    .single()

  if (error) throw error

  return data as LabelTemplate
}

export const createLabelPrintJob = async (params: {
  companyId: string
  templateId: string | null
  format: 'pdf' | 'png'
  quantity: number
  payload: Record<string, unknown>
  outputUrl?: string | null
  status?: 'queued' | 'processing' | 'completed' | 'failed'
}) => {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const { error } = await db.from('label_print_jobs').insert({
    company_id: params.companyId,
    template_id: params.templateId,
    format: params.format,
    quantity: params.quantity,
    payload: params.payload,
    status: params.status ?? 'queued',
    output_url: params.outputUrl ?? null,
    requested_by: userData.user?.id ?? null,
    completed_at: params.status === 'completed' ? new Date().toISOString() : null,
  })

  if (error) throw error
}

export const fetchLabelPrintJobs = async (companyId: string): Promise<LabelPrintJob[]> => {
  const { data, error } = await db
    .from('label_print_jobs')
    .select('id, company_id, template_id, format, status, quantity, output_url, requested_by, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error

  const rows =
    (data as Array<Omit<LabelPrintJob, 'requester'> | null> | null)?.filter(
      (job): job is Omit<LabelPrintJob, 'requester'> => Boolean(job),
    ) ?? []
  const requesterIds = Array.from(
    new Set(rows.map((job) => job.requested_by).filter((value): value is string => !!value)),
  )

  let requesterById = new Map<string, { full_name: string | null; username: string | null }>()
  if (requesterIds.length > 0) {
    const { data: requesterRows, error: requesterError } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', requesterIds)

    if (requesterError) throw requesterError

    requesterById = new Map(
      ((requesterRows ?? []) as Array<{ id: string; full_name: string | null; username: string | null }>).map((row) => [
        row.id,
        { full_name: row.full_name, username: row.username },
      ]),
    )
  }

  return rows.map((job) => ({
    ...job,
    requester: job.requested_by ? requesterById.get(job.requested_by) ?? null : null,
  })) as LabelPrintJob[]
}
