import { db, supabase } from '../supabaseClient'
import type { Product } from '../types'

type ProfileRef = {
  full_name: string | null
  username: string | null
}

type TransactionProfileRow = {
  profiles: ProfileRef | ProfileRef[] | null
}

const normalizeSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export const fetchCurrentUserId = async (): Promise<string | null> => {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user?.id ?? null
}

export const lookupProductByScanValue = async (
  companyId: string,
  scanValue: string,
): Promise<{ product: Product | null; lastHandledBy: string; notFoundSku: string | null }> => {
  const cleanValue = scanValue.trim()
  if (!cleanValue) {
    return { product: null, lastHandledBy: '—', notFoundSku: null }
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, quantity_on_hand, reorder_point, description')
    .eq('company_id', companyId)
    .or(`sku.eq."${cleanValue}",id.eq."${cleanValue}"`)
    .maybeSingle()

  if (error || !data) {
    return { product: null, lastHandledBy: '—', notFoundSku: cleanValue }
  }

  const { data: transactionData } = await supabase
    .from('inventory_transactions')
    .select('created_at, profiles (full_name, username)')
    .eq('company_id', companyId)
    .eq('product_id', data.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const profile = normalizeSingle((transactionData?.[0] as TransactionProfileRow | undefined)?.profiles)

  return {
    product: data as Product,
    lastHandledBy: profile?.full_name ?? profile?.username ?? 'Unknown',
    notFoundSku: null,
  }
}

export const createQuickScanTransaction = async (params: {
  companyId: string
  productId: string
  userId: string
  transactionType: 'purchase' | 'return' | 'sale' | 'loss'
  quantity: number
}) => {
  const { error } = await db.from('inventory_transactions').insert({
    company_id: params.companyId,
    product_id: params.productId,
    performed_by: params.userId,
    transaction_type: params.transactionType,
    quantity_change: params.quantity,
    notes: 'Scanner quick action',
  })

  if (error) throw error
}
