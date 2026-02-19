import { supabase } from '../supabaseClient'

export type SupplierSummary = {
  supplier_id: string
  supplier_name: string
  last_po_date: string
  last_unit_cost: number
  total_quantity: number
}

export type BatchHistoryItem = {
  created_at: string
  quantity_change: number
  notes: string | null
  profiles: { full_name: string | null } | null
}

export type ProductAttachment = {
  name: string
  id: string
  created_at: string
  mimetype: string
  size: number
}

type PurchaseOrderItemRow = {
  unit_cost: number
  quantity_ordered: number
  purchase_orders:
    | {
        created_at: string
        suppliers: { id: string; name: string } | { id: string; name: string }[]
      }
    | {
        created_at: string
        suppliers: { id: string; name: string } | { id: string; name: string }[]
      }[]
}

type BatchHistoryRow = {
  created_at: string
  quantity_change: number
  notes: string | null
  profiles: { full_name: string | null } | { full_name: string | null }[] | null
}

const normalizeSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export const fetchProductSuppliers = async (companyId: string, productId: string): Promise<SupplierSummary[]> => {
  const { data, error } = await supabase
    .from('purchase_order_items')
    .select(`
      unit_cost, quantity_ordered,
      purchase_orders!inner(created_at, suppliers!inner(id, name))
    `)
    .eq('purchase_orders.company_id', companyId)
    .eq('product_id', productId)
    .order('created_at', { ascending: false, foreignTable: 'purchase_orders' })

  if (error) throw error

  const rows = (data as unknown as PurchaseOrderItemRow[] | null) ?? []
  const summaryMap: Record<string, SupplierSummary> = {}

  rows.forEach((item) => {
    const purchaseOrder = normalizeSingle(item.purchase_orders)
    const supplier = normalizeSingle(purchaseOrder?.suppliers)
    const supplierId = supplier?.id
    const supplierName = supplier?.name
    const date = purchaseOrder?.created_at

    if (!supplierId || !supplierName || !date) return

    if (!summaryMap[supplierId]) {
      summaryMap[supplierId] = {
        supplier_id: supplierId,
        supplier_name: supplierName,
        last_po_date: date,
        last_unit_cost: item.unit_cost,
        total_quantity: 0,
      }
    }

    summaryMap[supplierId].total_quantity += item.quantity_ordered

    if (new Date(date) > new Date(summaryMap[supplierId].last_po_date)) {
      summaryMap[supplierId].last_po_date = date
      summaryMap[supplierId].last_unit_cost = item.unit_cost
    }
  })

  return Object.values(summaryMap)
}

export const fetchProductBatchHistory = async (companyId: string, productId: string): Promise<BatchHistoryItem[]> => {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select(`
      created_at, quantity_change, notes,
      profiles (full_name)
    `)
    .eq('company_id', companyId)
    .eq('product_id', productId)
    .eq('transaction_type', 'sale')
    .order('created_at', { ascending: false })

  if (error) throw error

  return ((data as unknown as BatchHistoryRow[] | null) ?? []).map((item) => ({
    created_at: item.created_at,
    quantity_change: item.quantity_change,
    notes: item.notes,
    profiles: normalizeSingle(item.profiles),
  }))
}

const getStoragePath = (companyId: string, productId: string) => `${companyId}/${productId}`

export const fetchProductAttachments = async (companyId: string, productId: string): Promise<ProductAttachment[]> => {
  const { data, error } = await supabase.storage
    .from('product-images')
    .list(getStoragePath(companyId, productId))

  if (error) throw error

  return data.map((file) => ({
    name: file.name,
    id: file.id,
    created_at: file.created_at,
    mimetype: file.metadata?.mimetype ?? 'application/octet-stream',
    size: file.metadata?.size ?? 0,
  }))
}

export const uploadProductAttachment = async (companyId: string, productId: string, file: File): Promise<void> => {
  const { error } = await supabase.storage
    .from('product-images')
    .upload(`${getStoragePath(companyId, productId)}/${file.name}`, file, {
      upsert: true,
    })

  if (error) throw error
}

export const getProductAttachmentPublicUrl = (companyId: string, productId: string, fileName: string): string => {
  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(`${getStoragePath(companyId, productId)}/${fileName}`)

  return data.publicUrl
}
