import { db, supabase } from '../supabaseClient'
import type { Product } from '../types'
import { inferScanReasonLabel, toSignedScanChange, type ScanUpdateReason } from '../lib/scanReason'

type ScanHistoryItem = {
  id: string
  created_at: string
  barcode: string | null
  scan_type: 'lookup' | 'stock_in' | 'stock_out'
  quantity: number | null
  entry_method: 'camera' | 'manual'
  product: { id: string; name: string; sku: string } | null
  actorName: string
  transactionType: string | null
  reason: string | null
  reasonLabel: string
  note: string | null
  change: number
  stockAfter: number | null
}

type ScanEventMetadata = {
  reason?: string | null
  note?: string | null
}

const normalizeProduct = (row: Partial<Product>): Product => ({
  id: String(row.id ?? ''),
  name: row.name ?? 'Unknown Product',
  sku: row.sku ?? '',
  description: row.description ?? null,
  quantity_on_hand: Number(row.quantity_on_hand ?? 0),
  reorder_point: Number(row.reorder_point ?? 0),
  cost_price: row.cost_price ?? null,
  selling_price: row.selling_price ?? null,
  folder_id: row.folder_id ?? null,
  image_urls: row.image_urls ?? [],
  custom_fields: row.custom_fields ?? {},
  expiry_date: row.expiry_date ?? null,
})

export const fetchCurrentUserId = async (): Promise<string | null> => {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user?.id ?? null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const lookupProductByScanValue = async (
  companyId: string,
  scanValue: string,
): Promise<{ product: Product | null; lastHandledBy: string; lastUpdatedAt: string | null; notFoundSku: string | null }> => {
  const cleanValue = scanValue.trim()
  if (!cleanValue) {
    return { product: null, lastHandledBy: '—', lastUpdatedAt: null, notFoundSku: null }
  }

  const orFilters = [`sku.eq."${cleanValue}"`, `primary_barcode.eq."${cleanValue}"`]
  if (UUID_RE.test(cleanValue)) {
    orFilters.push(`id.eq."${cleanValue}"`)
  }

  const { data, error } = await db
    .from('products')
    .select('id, name, sku, quantity_on_hand, reorder_point, description, cost_price, selling_price, folder_id, image_urls, custom_fields, expiry_date, primary_barcode')
    .eq('company_id', companyId)
    .or(orFilters.join(','))
    .maybeSingle()

  let resolvedProduct = !error && data ? normalizeProduct(data as Partial<Product>) : null

  if (!resolvedProduct) {
    const { data: barcodeRow } = await db
      .from('product_barcodes')
      .select(`
        barcode,
        product_id,
        products (
          id,
          name,
          sku,
          quantity_on_hand,
          reorder_point,
          description,
          cost_price,
          selling_price,
          folder_id,
          image_urls,
          custom_fields,
          expiry_date
        )
      `)
      .eq('company_id', companyId)
      .eq('barcode', cleanValue)
      .maybeSingle()

    const nestedProduct = (barcodeRow as { products?: Partial<Product> | Partial<Product>[] } | null)?.products
    const fromBarcode = Array.isArray(nestedProduct) ? nestedProduct[0] : nestedProduct
    if (fromBarcode) {
      resolvedProduct = normalizeProduct(fromBarcode)
    }
  }

  if (!resolvedProduct) {
    const { data: nameMatch } = await db
      .from('products')
      .select('id, name, sku, quantity_on_hand, reorder_point, description, cost_price, selling_price, folder_id, image_urls, custom_fields, expiry_date, primary_barcode')
      .eq('company_id', companyId)
      .ilike('name', `%${cleanValue}%`)
      .order('name', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (nameMatch) {
      resolvedProduct = normalizeProduct(nameMatch as Partial<Product>)
    }
  }

  if (!resolvedProduct) {
    return { product: null, lastHandledBy: '—', lastUpdatedAt: null, notFoundSku: cleanValue }
  }

  const { data: transactionData } = await db
    .from('inventory_transactions')
    .select('performed_by, created_at')
    .eq('company_id', companyId)
    .eq('product_id', resolvedProduct.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const performerId = (transactionData as { performed_by?: string | null; created_at?: string | null } | null)?.performed_by
  const lastUpdatedAt = (transactionData as { created_at?: string | null } | null)?.created_at ?? null
  let lastHandledBy = 'Unknown'

  if (performerId) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', performerId)
      .maybeSingle()

    lastHandledBy = profileData?.full_name ?? profileData?.username ?? 'Unknown'
  }

  return {
    product: resolvedProduct,
    lastHandledBy,
    lastUpdatedAt,
    notFoundSku: null,
  }
}

export const createQuickScanTransaction = async (params: {
  companyId: string
  productId: string
  userId: string
  transactionType: 'scan_in' | 'scan_out' | 'lookup'
  quantity: number
  barcode?: string | null
  entryMethod?: 'camera' | 'manual'
  reason?: ScanUpdateReason | null
  note?: string | null
  stockAfter?: number | null
}) => {
  const metadata: ScanEventMetadata = {
    reason: params.reason ?? null,
    note: params.note?.trim() ? params.note.trim() : null,
  }

  if (params.transactionType === 'lookup') {
    const { error: lookupEventError } = await db.from('scan_events').insert({
      company_id: params.companyId,
      product_id: params.productId,
      barcode: params.barcode ?? null,
      scan_type: 'lookup',
      quantity: 0,
      entry_method: params.entryMethod ?? 'manual',
      scanned_by: params.userId,
      metadata,
    })

    if (lookupEventError) throw lookupEventError
    return
  }

  const quantityChange = params.transactionType === 'scan_out'
    ? -Math.abs(params.quantity)
    : Math.abs(params.quantity)

  const transactionNote = params.note?.trim() || inferScanReasonLabel({
    reason: params.reason ?? null,
    scanType: params.transactionType === 'scan_in' ? 'stock_in' : 'stock_out',
    transactionType: params.transactionType,
  })

  const { data: transactionRow, error } = await db.from('inventory_transactions').insert({
    company_id: params.companyId,
    product_id: params.productId,
    performed_by: params.userId,
    transaction_type: params.transactionType,
    quantity_change: quantityChange,
    stock_after: params.stockAfter ?? null,
    source: 'scan',
    notes: transactionNote,
  }).select('id').single()

  if (error) throw error

  const { error: scanEventError } = await db.from('scan_events').insert({
    company_id: params.companyId,
    product_id: params.productId,
    barcode: params.barcode ?? null,
    scan_type: params.transactionType === 'scan_in' ? 'stock_in' : 'stock_out',
    quantity: Math.abs(params.quantity),
    entry_method: params.entryMethod ?? 'manual',
    scanned_by: params.userId,
    transaction_id: transactionRow?.id,
    metadata,
  })

  if (scanEventError) throw scanEventError
}

export const fetchScanHistory = async (companyId: string): Promise<ScanHistoryItem[]> => {
  const { data, error } = await db
    .from('scan_events')
    .select(`
      id,
      created_at,
      barcode,
      scan_type,
      quantity,
      entry_method,
      scanned_by,
      metadata,
      products (id, name, sku),
      inventory_transactions (transaction_type, notes, stock_after)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error

  const rows = (data ?? []) as Array<{
    id: string
    created_at: string
    barcode: string | null
    scan_type: 'lookup' | 'stock_in' | 'stock_out'
    quantity: number | null
    entry_method: 'camera' | 'manual'
    scanned_by: string | null
    metadata?: ScanEventMetadata | null
    products?: { id: string; name: string; sku: string } | { id: string; name: string; sku: string }[] | null
    inventory_transactions?:
      | { transaction_type: string; notes: string | null; stock_after: number | null }
      | { transaction_type: string; notes: string | null; stock_after: number | null }[]
      | null
  }>

  const scannedByIds = Array.from(new Set(rows.map((row) => row.scanned_by).filter(Boolean))) as string[]
  let profilesById = new Map<string, { full_name: string | null; username: string | null }>()

  if (scannedByIds.length) {
    const { data: profilesData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', scannedByIds)

    if (!profileError) {
      profilesById = new Map(
        ((profilesData ?? []) as Array<{ id: string; full_name: string | null; username: string | null }>).map((profile) => [
          profile.id,
          { full_name: profile.full_name, username: profile.username },
        ]),
      )
    }
  }

  return rows.map((row) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products
    const tx = Array.isArray(row.inventory_transactions) ? row.inventory_transactions[0] : row.inventory_transactions
    const actor = row.scanned_by ? profilesById.get(row.scanned_by) : null
    const metadata = row.metadata ?? null

    return {
      id: row.id,
      created_at: row.created_at,
      barcode: row.barcode,
      scan_type: row.scan_type,
      quantity: row.quantity,
      entry_method: row.entry_method,
      product: product ? { id: product.id, name: product.name, sku: product.sku } : null,
      actorName: actor?.full_name ?? actor?.username ?? 'System',
      transactionType: tx?.transaction_type ?? null,
      reason: metadata?.reason ?? null,
      reasonLabel: inferScanReasonLabel({
        reason: metadata?.reason ?? null,
        scanType: row.scan_type,
        transactionType: tx?.transaction_type ?? null,
      }),
      note: metadata?.note ?? tx?.notes ?? null,
      change: toSignedScanChange(row.scan_type, row.quantity),
      stockAfter: tx?.stock_after ?? null,
    }
  })
}
