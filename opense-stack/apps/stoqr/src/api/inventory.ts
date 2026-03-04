import { db, supabase } from '../supabaseClient'
import type { CustomFieldFilterOption, CustomFieldPrimitive, CustomFieldValueType, Folder, Tag } from '../types'
import { toNumber } from '../utils'
import type { InventoryProduct, SortDirection, SortField } from '../components/Inventory/types'

export type InventoryStats = {
  totalItems: number
  lowStockItems: number
  totalValue: number
}

export type FetchInventoryProductsParams = {
  companyId: string
  search: string
  stockFilter: 'all' | 'low' | 'out'
  customFieldKey?: string | null
  customFieldValue?: CustomFieldPrimitive | null
  page: number
  pageSize: number
  sortField: SortField
  sortDir: SortDirection
}

export type InventoryListResponse = {
  products: InventoryProduct[]
  totalCount: number
}

export type InventoryLocation = {
  id: string
  name: string
  code: string | null
  description: string | null
}

export type ProductBarcode = {
  id: string
  product_id: string
  barcode: string
  barcode_type: 'barcode' | 'qr'
  is_primary: boolean
  products: { id: string; name: string; sku: string } | null
}

const inferCustomFieldType = (value: CustomFieldPrimitive): CustomFieldValueType => {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date'
  return 'text'
}

const isCustomFieldPrimitive = (value: unknown): value is CustomFieldPrimitive => (
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
)

const normalizeCustomFieldString = (value: string): string | null => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export const fetchInventoryFilters = async (companyId: string): Promise<{ folders: Folder[]; tags: Tag[]; customFieldFilters: CustomFieldFilterOption[] }> => {
  const [{ data: folderData, error: folderError }, { data: tagData, error: tagError }, { data: customFieldRows, error: customFieldError }] = await Promise.all([
    db.from('folders').select('id, name, parent_id').eq('company_id', companyId),
    db.from('tags').select('id, name, color').eq('company_id', companyId),
    db.from('products').select('custom_fields').eq('company_id', companyId),
  ])

  if (folderError) throw folderError
  if (tagError) throw tagError
  if (customFieldError) throw customFieldError

  const customFieldMap = new Map<string, { valueType: CustomFieldValueType; values: Map<string, CustomFieldPrimitive> }>()

  ;((customFieldRows as Array<{ custom_fields: Record<string, unknown> | null }> | null) ?? []).forEach((row) => {
    const customFields = row.custom_fields ?? {}

    Object.entries(customFields).forEach(([key, rawValue]) => {
      if (!isCustomFieldPrimitive(rawValue)) return

      const value = typeof rawValue === 'string' ? normalizeCustomFieldString(rawValue) : rawValue
      if (value === null) return

      const existing = customFieldMap.get(key)
      const nextType = inferCustomFieldType(value)

      if (!existing) {
        customFieldMap.set(key, {
          valueType: nextType,
          values: new Map([[JSON.stringify(value), value]]),
        })
        return
      }

      existing.valueType = existing.valueType === nextType ? existing.valueType : 'text'
      existing.values.set(JSON.stringify(value), value)
    })
  })

  const customFieldFilters = Array.from(customFieldMap.entries())
    .map(([key, config]) => ({
      key,
      valueType: config.valueType,
      values: Array.from(config.values.values()).sort((left, right) => String(left).localeCompare(String(right))),
    }))
    .sort((left, right) => left.key.localeCompare(right.key))

  return {
    folders: (folderData as Folder[] | null) ?? [],
    tags: (tagData as Tag[] | null) ?? [],
    customFieldFilters,
  }
}

export const fetchInventoryStats = async (companyId: string): Promise<InventoryStats> => {
  const { data, error } = await supabase
    .rpc('get_inventory_stats', { target_company_id: companyId })
    .single<{
      total_items: number | string | null
      low_stock_items: number | string | null
      total_value: number | string | null
    }>()

  if (error) throw error

  return {
    totalItems: toNumber(data?.total_items, 0),
    lowStockItems: toNumber(data?.low_stock_items, 0),
    totalValue: toNumber(data?.total_value, 0),
  }
}

export const fetchInventoryProducts = async ({
  companyId,
  search,
  stockFilter,
  customFieldKey,
  customFieldValue,
  page,
  pageSize,
  sortField,
  sortDir,
}: FetchInventoryProductsParams): Promise<InventoryListResponse> => {
  let query = db
    .from('products')
    .select('id, name, sku, quantity_on_hand, reorder_point, folder_id, cost_price, selling_price', { count: 'exact' })
    .eq('company_id', companyId)

  if (search.trim()) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
  }

  if (stockFilter === 'out') {
    query = query.eq('quantity_on_hand', 0)
  }

  if (customFieldKey && customFieldValue !== null && customFieldValue !== undefined) {
    query = query.contains('custom_fields', { [customFieldKey]: customFieldValue })
  }

  query = query.order(sortField, { ascending: sortDir === 'asc' })

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) throw error

  let products = (data as InventoryProduct[] | null) ?? []

  if (stockFilter === 'low') {
    products = products.filter((product) => product.quantity_on_hand <= product.reorder_point)
  }

  return {
    products,
    totalCount: count ?? 0,
  }
}

export const deleteInventoryProducts = async (companyId: string, productIds: string[]) => {
  const { error } = await db
    .from('products')
    .delete()
    .in('id', productIds)
    .eq('company_id', companyId)

  if (error) throw error
}

export const updateInventoryProductField = async (
  companyId: string,
  payload: { productId: string; field: 'quantity_on_hand' | 'selling_price'; value: number },
) => {
  const { error } = await db
    .from('products')
    .update({ [payload.field]: payload.value })
    .eq('id', payload.productId)
    .eq('company_id', companyId)

  if (error) throw error
}

export const fetchFolderProducts = async (
  companyId: string,
  folderId: string | null,
): Promise<InventoryProduct[]> => {
  let query = db
    .from('products')
    .select('id, name, sku, quantity_on_hand, reorder_point, folder_id, cost_price, selling_price')
    .eq('company_id', companyId)

  if (folderId) {
    query = query.eq('folder_id', folderId)
  } else {
    query = query.is('folder_id', null)
  }

  const { data, error } = await query.order('name', { ascending: true })

  if (error) throw error

  return (data as InventoryProduct[] | null) ?? []
}

export const createFolderInInventory = async (
  companyId: string,
  name: string,
  parentId: string | null,
) => {
  const { error } = await db.from('folders').insert({
    company_id: companyId,
    name,
    parent_id: parentId,
  })

  if (error) throw error
}

export type ImportInventoryRow = Record<string, string>

export const importInventoryProducts = async (companyId: string, rows: ImportInventoryRow[]): Promise<number> => {
  const preparedProducts = rows
    .map((row) => ({
      company_id: companyId,
      name: row.name || row.Name,
      sku: row.sku || row.SKU,
      quantity_on_hand: toNumber(row.quantity_on_hand || row.qty || row.quantity),
      reorder_point: toNumber(row.reorder_point, 10),
      cost_price: toNumber(row.cost_price, 0),
      selling_price: toNumber(row.selling_price, 0),
    }))
    .filter((product) => product.name && product.sku)

  if (preparedProducts.length === 0) return 0

  const { error } = await db.from('products').insert(preparedProducts)

  if (error) throw error

  return preparedProducts.length
}

type BarcodeRow = Omit<ProductBarcode, 'products'> & {
  products: { id: string; name: string; sku: string } | { id: string; name: string; sku: string }[] | null
}

const normalizeSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export const fetchInventoryReferenceData = async (companyId: string): Promise<{
  locations: InventoryLocation[]
  barcodes: ProductBarcode[]
}> => {
  const [
    { data: locationData, error: locationError },
    { data: barcodeData, error: barcodeError },
  ] = await Promise.all([
    db.from('inventory_locations').select('id, name, code, description').eq('company_id', companyId).order('name'),
    db
      .from('product_barcodes')
      .select('id, product_id, barcode, barcode_type, is_primary, products(id, name, sku)')
      .eq('company_id', companyId)
      .order('barcode', { ascending: true }),
  ])

  if (locationError) throw locationError
  if (barcodeError) throw barcodeError

  return {
    locations: (locationData as InventoryLocation[] | null) ?? [],
    barcodes: ((barcodeData as BarcodeRow[] | null) ?? []).map((row) => ({
      ...row,
      products: normalizeSingle(row.products),
    })),
  }
}

export const createInventoryLocation = async (
  companyId: string,
  payload: { name: string; code: string; description: string },
) => {
  const { error } = await db.from('inventory_locations').insert({
    company_id: companyId,
    name: payload.name,
    code: payload.code || null,
    description: payload.description || null,
  })

  if (error) throw error
}

export const upsertProductBarcode = async (
  companyId: string,
  payload: {
    productId: string
    barcode: string
    barcodeType: 'barcode' | 'qr'
    isPrimary: boolean
  },
) => {
  const { data: existing, error: existingError } = await db
    .from('product_barcodes')
    .select('id')
    .eq('company_id', companyId)
    .eq('product_id', payload.productId)
    .eq('barcode', payload.barcode)
    .maybeSingle()

  if (existingError) throw existingError

  if (existing?.id) {
    const { error } = await db
      .from('product_barcodes')
      .update({
        barcode_type: payload.barcodeType,
        is_primary: payload.isPrimary,
      })
      .eq('id', existing.id)

    if (error) throw error
  } else {
    const { error } = await db.from('product_barcodes').insert({
      company_id: companyId,
      product_id: payload.productId,
      barcode: payload.barcode,
      barcode_type: payload.barcodeType,
      is_primary: payload.isPrimary,
    })

    if (error) throw error
  }

  if (payload.isPrimary) {
    const { error } = await db
      .from('products')
      .update({ primary_barcode: payload.barcode })
      .eq('id', payload.productId)
      .eq('company_id', companyId)

    if (error) throw error
  }
}

export const bulkUpdateInventoryProducts = async (
  companyId: string,
  payload: {
    productIds: string[]
    quantityDelta?: number
    priceMultiplier?: number
  },
): Promise<number> => {
  if (payload.productIds.length === 0) return 0

  const { data: existingRows, error: existingError } = await db
    .from('products')
    .select('id, quantity_on_hand, selling_price')
    .eq('company_id', companyId)
    .in('id', payload.productIds)

  if (existingError) throw existingError

  const rows = (existingRows as Array<{ id: string; quantity_on_hand: number; selling_price: number | null }> | null) ?? []

  for (const row of rows) {
    const nextQty = payload.quantityDelta !== undefined ? Math.max((row.quantity_on_hand ?? 0) + payload.quantityDelta, 0) : row.quantity_on_hand
    const nextPrice = payload.priceMultiplier !== undefined
      ? Math.max(Number((((row.selling_price ?? 0) * payload.priceMultiplier).toFixed(2))), 0)
      : row.selling_price

    const { error } = await db
      .from('products')
      .update({
        quantity_on_hand: nextQty,
        selling_price: nextPrice,
      })
      .eq('id', row.id)
      .eq('company_id', companyId)

    if (error) throw error
  }

  return rows.length
}
