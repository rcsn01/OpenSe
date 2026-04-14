import { db } from '../supabaseClient'
import type { Product } from '../types'

export type Supplier = {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
}

export type PurchaseOrderApprovalStatus = 'pending' | 'approved' | 'denied'
export type PurchaseOrderReturnStatus = 'none' | 'awaiting_return' | 'shipped' | 'resolved'

export type PurchaseOrder = {
  id: string
  po_number: number
  supplier_id: string | null
  status: 'draft' | 'sent' | 'partial' | 'closed' | 'cancelled'
  approval_status?: PurchaseOrderApprovalStatus
  return_status?: PurchaseOrderReturnStatus
  expected_date: string | null
  created_at: string
  suppliers?: { name: string }
  total_amount?: number
}

export type ReceivingLog = {
  id?: string
  po_id?: string | null
  product_id?: string | null
  quantity_received: number
  received_at: string
  notes?: string | null
  products: { name: string; sku: string } | null
  purchase_orders: { po_number: number } | null
  profiles: { full_name: string | null; username: string | null } | null
}

export type PurchaseOrderItem = {
  id: string
  po_id: string
  product_id: string | null
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  products: { id: string; name: string; sku: string } | null
  purchase_orders: { id: string; po_number: number; status: PurchaseOrder['status']; expected_date: string | null } | null
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
    approval_status: 'pending',
    return_status: 'none',
  })

  if (error) throw error
}

type ReceivingLogRow = {
  id: string
  po_id: string | null
  product_id: string | null
  quantity_received: number
  received_at: string
  notes: string | null
  products: { name: string; sku: string } | { name: string; sku: string }[] | null
  purchase_orders: { po_number: number } | { po_number: number }[] | null
  profiles: { full_name: string | null; username: string | null } | { full_name: string | null; username: string | null }[] | null
}

type PurchaseOrderItemRow = {
  id: string
  po_id: string
  product_id: string | null
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  products: { id: string; name: string; sku: string } | { id: string; name: string; sku: string }[] | null
  purchase_orders: { id: string; po_number: number; status: PurchaseOrder['status']; expected_date: string | null } | { id: string; po_number: number; status: PurchaseOrder['status']; expected_date: string | null }[] | null
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
    id: item.id,
    po_id: item.po_id,
    product_id: item.product_id,
    quantity_received: item.quantity_received,
    received_at: item.received_at,
    notes: item.notes,
    products: normalizeSingle(item.products),
    purchase_orders: normalizeSingle(item.purchase_orders),
    profiles: normalizeSingle(item.profiles),
  }))
}

export const fetchPurchaseOrderItems = async (companyId: string): Promise<PurchaseOrderItem[]> => {
  const { data, error } = await db
    .from('purchase_order_items')
    .select(`
      id,
      po_id,
      product_id,
      quantity_ordered,
      quantity_received,
      unit_cost,
      products(id, name, sku),
      purchase_orders(id, po_number, status, expected_date)
    `)
    .eq('purchase_orders.company_id', companyId)
    .order('id', { ascending: false })

  if (error) throw error

  return ((data as PurchaseOrderItemRow[] | null) ?? []).map((item) => ({
    id: item.id,
    po_id: item.po_id,
    product_id: item.product_id,
    quantity_ordered: item.quantity_ordered,
    quantity_received: item.quantity_received,
    unit_cost: item.unit_cost,
    products: normalizeSingle(item.products),
    purchase_orders: normalizeSingle(item.purchase_orders),
  }))
}

export const createPurchaseOrderItem = async (
  companyId: string,
  payload: { poId: string; productId: string; quantityOrdered: number; unitCost: number },
): Promise<void> => {
  const { data: orderData, error: orderError } = await db
    .from('purchase_orders')
    .select('id')
    .eq('id', payload.poId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (orderError) throw orderError
  if (!orderData) throw new Error('Purchase order not found')

  const { error } = await db.from('purchase_order_items').insert({
    po_id: payload.poId,
    product_id: payload.productId,
    quantity_ordered: payload.quantityOrdered,
    quantity_received: 0,
    unit_cost: payload.unitCost,
  })

  if (error) throw error
}

const updatePurchaseOrderStatusFromItems = async (poId: string) => {
  const { data: items, error: itemsError } = await db
    .from('purchase_order_items')
    .select('quantity_ordered, quantity_received')
    .eq('po_id', poId)

  if (itemsError) throw itemsError

  const rows = (items as Array<{ quantity_ordered: number; quantity_received: number }> | null) ?? []
  let status: PurchaseOrder['status'] = 'sent'

  if (rows.length > 0) {
    const allReceived = rows.every((item) => item.quantity_received >= item.quantity_ordered && item.quantity_ordered > 0)
    const anyReceived = rows.some((item) => item.quantity_received > 0)

    if (allReceived) status = 'closed'
    else if (anyReceived) status = 'partial'
  }

  const { error: updateError } = await db
    .from('purchase_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', poId)

  if (updateError) throw updateError
}

export const recordPurchaseOrderReceipt = async (
  companyId: string,
  payload: { poId: string; productId: string; quantityReceived: number; notes?: string },
): Promise<void> => {
  if (payload.quantityReceived <= 0) {
    throw new Error('Received quantity must be greater than zero')
  }

  const { data: item, error: itemError } = await db
    .from('purchase_order_items')
    .select('id, quantity_ordered, quantity_received')
    .eq('po_id', payload.poId)
    .eq('product_id', payload.productId)
    .maybeSingle()

  if (itemError) throw itemError

  if (!item) {
    throw new Error('Purchase order item not found')
  }

  const remaining = Math.max(item.quantity_ordered - item.quantity_received, 0)
  if (payload.quantityReceived > remaining) {
    throw new Error('Received quantity exceeds remaining quantity')
  }

  const nextReceived = item.quantity_received + payload.quantityReceived

  const { error: updateItemError } = await db
    .from('purchase_order_items')
    .update({ quantity_received: nextReceived })
    .eq('id', item.id)

  if (updateItemError) throw updateItemError

  const { error: logError } = await db.from('receiving_logs').insert({
    company_id: companyId,
    po_id: payload.poId,
    product_id: payload.productId,
    quantity_received: payload.quantityReceived,
    notes: payload.notes ?? null,
  })

  if (logError) throw logError

  const { data: product, error: readError } = await db
    .from('products')
    .select('quantity_on_hand')
    .eq('id', payload.productId)
    .eq('company_id', companyId)
    .maybeSingle()

  if (readError) throw readError

  const nextQty = (product?.quantity_on_hand ?? 0) + payload.quantityReceived
  const { error: updateProductError } = await db
    .from('products')
    .update({ quantity_on_hand: nextQty })
    .eq('id', payload.productId)
    .eq('company_id', companyId)

  if (updateProductError) throw updateProductError

  const { error: txError } = await db.from('inventory_transactions').insert({
    company_id: companyId,
    product_id: payload.productId,
    transaction_type: 'purchase',
    source: 'receiving',
    quantity_change: payload.quantityReceived,
    notes: payload.notes ?? null,
  })

  if (txError) throw txError

  await updatePurchaseOrderStatusFromItems(payload.poId)
}

export const fetchPurchaseOrderHistory = async (companyId: string): Promise<PurchaseOrder[]> => {
  const { data, error } = await db
    .from('purchase_orders')
    .select('*, suppliers(name)')
    .eq('company_id', companyId)
    .in('status', ['closed', 'cancelled'])
    .order('updated_at', { ascending: false })

  if (error) throw error

  return (data as PurchaseOrder[] | null) ?? []
}
