import { supabase } from '../supabaseClient'
import type { Product } from '../types'

export const fetchAlertProducts = async (companyId: string): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, quantity_on_hand, reorder_point, expiry_date')
    .eq('company_id', companyId)

  if (error) throw error

  return (data as Product[] | null) ?? []
}
