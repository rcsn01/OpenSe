import { db } from '../supabaseClient'
import type { Product } from '../types'

export type LabelTemplate = {
  id: string
  company_id: string | null
  name: string
  template_type: 'product' | 'shelf' | 'bin' | 'shipping'
  is_system: boolean
  layout: Record<string, unknown>
  variable_fields: string[]
  created_at: string
}

export type LabelPrintJob = {
  id: string
  company_id: string
  template_id: string | null
  format: 'pdf' | 'png'
  status: 'queued' | 'processing' | 'completed' | 'failed'
  quantity: number
  output_url: string | null
  created_at: string
}

export const fetchLabelProducts = async (
  companyId: string,
  search: string,
): Promise<Array<Pick<Product, 'id' | 'name' | 'sku'>>> => {
  let query = db
    .from('products')
    .select('id, name, sku')
    .eq('company_id', companyId)
    .order('name')

  if (search.trim()) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) throw error

  return (data as Array<Pick<Product, 'id' | 'name' | 'sku'>> | null) ?? []
}

export const fetchLabelTemplates = async (companyId: string): Promise<LabelTemplate[]> => {
  const { data, error } = await db
    .from('label_templates')
    .select('id, company_id, name, template_type, is_system, layout, variable_fields, created_at')
    .or(`company_id.is.null,company_id.eq.${companyId}`)
    .order('is_system', { ascending: false })
    .order('name', { ascending: true })

  if (error) throw error

  return (data as LabelTemplate[] | null) ?? []
}

export const createLabelTemplate = async (params: {
  companyId: string
  name: string
  templateType: 'product' | 'shelf' | 'bin' | 'shipping'
  layout: Record<string, unknown>
  variableFields: string[]
}) => {
  const { error } = await db.from('label_templates').insert({
    company_id: params.companyId,
    name: params.name,
    template_type: params.templateType,
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
}) => {
  const { error } = await db
    .from('label_templates')
    .update({
      layout: params.layout,
      variable_fields: params.variableFields,
    })
    .eq('id', params.templateId)
    .eq('company_id', params.companyId)

  if (error) throw error
}

export const createLabelPrintJob = async (params: {
  companyId: string
  templateId: string | null
  format: 'pdf' | 'png'
  quantity: number
  payload: Record<string, unknown>
}) => {
  const { error } = await db.from('label_print_jobs').insert({
    company_id: params.companyId,
    template_id: params.templateId,
    format: params.format,
    quantity: params.quantity,
    payload: params.payload,
    status: 'queued',
  })

  if (error) throw error
}

export const fetchLabelPrintJobs = async (companyId: string): Promise<LabelPrintJob[]> => {
  const { data, error } = await db
    .from('label_print_jobs')
    .select('id, company_id, template_id, format, status, quantity, output_url, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error

  return (data as LabelPrintJob[] | null) ?? []
}
