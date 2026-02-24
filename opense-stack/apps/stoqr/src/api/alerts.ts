import { supabase } from '../supabaseClient'
import type { Product } from '../types'

export const fetchAlertProducts = async (companyId: string): Promise<Product[]> => {
  const { data, error } = await supabase
    .rpc('get_stoqr_alert_products', { target_company_id: companyId })

  if (error) throw error

  return ((data as Product[] | null) ?? []).map((product) => ({
    ...product,
    description: null,
    category: null,
    cost_price: null,
    selling_price: null,
    folder_id: null,
    image_urls: [],
    custom_fields: {},
  }))
}
