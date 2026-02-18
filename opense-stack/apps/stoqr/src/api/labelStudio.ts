import { supabase } from '../supabaseClient'
import type { Product } from '../types'

export const fetchLabelProducts = async (
  companyId: string,
  search: string,
): Promise<Array<Pick<Product, 'id' | 'name' | 'sku'>>> => {
  let query = supabase
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
