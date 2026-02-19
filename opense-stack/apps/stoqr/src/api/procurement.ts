import { db } from '../supabaseClient'
import type { Product } from '../types'

export type Supplier = {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
}

export type PurchaseOrder = {
  id: string
  po_number: number
  supplier_id: string | null
  status: 'draft' | 'sent' | 'partial' | 'closed' | 'cancelled'
  expected_date: string | null
  created_at: string
  suppliers?: { name: string }
  total_amount?: number
}

export type ReceivingLog = {
  quantity_received: number
  received_at: string
  products: { name: string; sku: string } | null
  purchase_orders: { po_number: number } | null
  profiles: { full_name: string | null; username: string | null } | null
}

export const fetchProcurementProducts = async (companyId: string): Promise<Product[]> => {
  const { data, error } = await db
    .from('products')
    .select('id, name, sku, quantity_on_hand, reorder_point')
    .eq('company_id', companyId)
    .order('name')

  if (error) throw error

  return (data as Product[] | null) ?? []
}

export const fetchSuppliers = async (companyId: string): Promise<Supplier[]> => {
  const { data, error } = await db
    .from('suppliers')
    .select('*')
    .eq('company_id', companyId)
    .order('name')

  if (error) throw error

  return (data as Supplier[] | null) ?? []
}

export const createSupplier = async (
  companyId: string,
  supplier: { name: string; contact_name: string; email: string; phone: string },
): Promise<void> => {
  const { error } = await db.from('suppliers').insert({
    company_id: companyId,
    ...supplier,
  })

  if (error) throw error
}

export const fetchPurchaseOrders = async (companyId: string): Promise<PurchaseOrder[]> => {
  const { data, error } = await db
    .from('purchase_orders')
    .select('*, suppliers(name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data as PurchaseOrder[] | null) ?? []
}

export const createPurchaseOrder = async (
  companyId: string,
  payload: { supplierId: string; expectedDate: string },
): Promise<void> => {
  const { error } = await db.from('purchase_orders').insert({
    company_id: companyId,
    supplier_id: payload.supplierId,
    expected_date: payload.expectedDate || null,
    status: 'draft',
  })

  if (error) throw error
}

type ReceivingLogRow = {
  quantity_received: number
  received_at: string
  products: { name: string; sku: string } | { name: string; sku: string }[] | null
  purchase_orders: { po_number: number } | { po_number: number }[] | null
  profiles: { full_name: string | null; username: string | null } | { full_name: string | null; username: string | null }[] | null
}

const normalizeSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export const fetchReceivingLogs = async (companyId: string): Promise<ReceivingLog[]> => {
  const { data, error } = await db
    .from('receiving_logs')
    .select(`
      quantity_received, received_at,
      products(name, sku),
      purchase_orders(po_number),
      profiles(full_name, username)
    `)
    .eq('company_id', companyId)
    .order('received_at', { ascending: false })
    .limit(20)

  if (error) throw error

  return ((data as ReceivingLogRow[] | null) ?? []).map((item) => ({
    quantity_received: item.quantity_received,
    received_at: item.received_at,
    products: normalizeSingle(item.products),
    purchase_orders: normalizeSingle(item.purchase_orders),
    profiles: normalizeSingle(item.profiles),
  }))
}
