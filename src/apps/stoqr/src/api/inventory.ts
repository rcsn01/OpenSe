import { db } from '../supabaseClient'
import type { CustomFieldActiveFilter, CustomFieldFilterOption, CustomFieldPrimitive, CustomFieldValueType, Folder, Tag } from '../types'
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
  folderId?: string | null
  stockFilter: 'all' | 'low' | 'out'
  customFieldFilters?: CustomFieldActiveFilter[]
  page: number
  pageSize: number
  sortField: SortField
  sortDir: SortDirection
}

export type InventoryListResponse = {
  products: InventoryProduct[]
  totalCount: number
}

export type ProductBarcode = {
  id: string
  product_id: string
  barcode: string
  barcode_type: 'barcode' | 'qr'
  is_primary: boolean
  products: { id: string; name: string; sku: string } | null
}

const normalizeDisplaySku = <TRow extends { sku?: string | null }>(row: TRow): TRow & { sku: string } => ({
  ...row,
  sku: row.sku ?? '',
})

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
    db.from('folders').select('id, name, parent_id').eq('company_id', companyId).order('name'),
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
  const { data, error } = await db
    .from('inventory_stats')
    .select('total_items, low_stock_items, total_value')
    .eq('company_id', companyId)
    .maybeSingle<{
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
  folderId,
  stockFilter,
  customFieldFilters,
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

  if (customFieldFilters) {
    for (const filter of customFieldFilters) {
      query = query.contains('custom_fields', { [filter.key]: filter.value })
    }
  }

  query = query.order(sortField === 'folder_id' ? 'name' : sortField, { ascending: sortDir === 'asc' })
  const legacyFrom = (page - 1) * pageSize
  const legacyTo = legacyFrom + pageSize - 1

  const { data, count, error } = await query

  if (error) throw error

  if (folderId === '__uncategorised__') {
    query.is('folder_id', null)
  } else if (folderId) {
    query.eq('folder_id', folderId)
  }
  query.range(legacyFrom, legacyTo)

  let products = (data as InventoryProduct[] | null) ?? []

  products = products.map((product) => normalizeDisplaySku(product))

  const productIds = products.map((product) => product.id)
  let stockRows: Array<{ product_id: string; folder_id: string; quantity_on_hand: number; reorder_point: number }> = []

  if (productIds.length > 0) {
    try {
      const stockQuery = db
        .from('product_folder_stocks')
        .select('product_id, folder_id, quantity_on_hand, reorder_point')
        .eq('company_id', companyId)

      const { data: folderStockData, error: folderStockError } = 'in' in stockQuery
        ? await stockQuery.in('product_id', productIds)
        : { data: null, error: null }

      if (folderStockError) throw folderStockError
      stockRows = (folderStockData as typeof stockRows | null) ?? []
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith('Unexpected table: product_folder_stocks')) {
        throw error
      }
    }
  }

  const stockRowsByProductId = stockRows.reduce<Map<string, typeof stockRows>>((acc, row) => {
    const rows = acc.get(row.product_id) ?? []
    rows.push(row)
    acc.set(row.product_id, rows)
    return acc
  }, new Map())

  products = products.map((product) => {
    const folderStockSummary = stockRowsByProductId.get(product.id) ?? []
    const selectedFolderStock = folderId && folderId !== '__uncategorised__'
      ? folderStockSummary.find((row) => row.folder_id === folderId)
      : null

    return {
      ...product,
      folder_id: selectedFolderStock?.folder_id ?? product.folder_id,
      quantity_on_hand: selectedFolderStock?.quantity_on_hand ?? product.quantity_on_hand,
      reorder_point: selectedFolderStock?.reorder_point ?? product.reorder_point,
      folder_stock_summary: folderStockSummary.map((row) => ({
        folder_id: row.folder_id,
        quantity_on_hand: row.quantity_on_hand,
        reorder_point: row.reorder_point,
      })),
    }
  })

  if (folderId === '__uncategorised__') {
    products = products.filter((product) => (product.folder_stock_summary?.length ?? 0) === 0)
  } else if (folderId) {
    products = products.filter((product) => product.folder_stock_summary?.some((row) => row.folder_id === folderId))
  }

  if (stockFilter === 'out') {
    products = products.filter((product) => product.quantity_on_hand === 0)
  }

  if (stockFilter === 'low') {
    products = products.filter((product) => product.quantity_on_hand <= product.reorder_point)
  }

  if (sortField === 'folder_id') {
    products = products.sort((left, right) => {
      const leftFolder = left.folder_id ?? ''
      const rightFolder = right.folder_id ?? ''
      return sortDir === 'asc' ? leftFolder.localeCompare(rightFolder) : rightFolder.localeCompare(leftFolder)
    })
  }

  const totalCount = stockRows.length === 0 && typeof count === 'number' ? count : products.length
  const from = legacyFrom
  const to = from + pageSize

  return {
    products: stockRows.length === 0 && typeof count === 'number' && count !== products.length ? products : products.slice(from, to),
    totalCount,
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

export const moveInventoryProducts = async (companyId: string, productIds: string[], folderId: string | null): Promise<number> => {
  if (productIds.length === 0) return 0

  if (!folderId) {
    const { error } = await db
      .from('product_folder_stocks')
      .delete()
      .eq('company_id', companyId)
      .in('product_id', productIds)

    if (error) throw error
    return productIds.length
  }

  const productQuery = db.from('products')

  if (!('select' in productQuery)) {
    const { error } = await db
      .from('products')
      .update({ folder_id: folderId })
      .eq('company_id', companyId)
      .in('id', productIds)

    if (error) throw error
    return productIds.length
  }

  const { data: products, error: productError } = await productQuery
    .select('id, quantity_on_hand, reorder_point')
    .eq('company_id', companyId)
    .in('id', productIds)

  if (productError) throw productError

  const rows = ((products as Array<{ id: string; quantity_on_hand: number; reorder_point: number }> | null) ?? []).map((product) => ({
    company_id: companyId,
    product_id: product.id,
    folder_id: folderId,
    quantity_on_hand: product.quantity_on_hand ?? 0,
    min_stock_level: 0,
    reorder_point: product.reorder_point ?? 0,
    max_stock_level: null,
  }))

  if (rows.length > 0) {
    const { error: stockError } = await db
      .from('product_folder_stocks')
      .upsert(rows, { onConflict: 'company_id,product_id,folder_id' })

    if (stockError) throw stockError

    const { error: deleteOldError } = await db
      .from('product_folder_stocks')
      .delete()
      .eq('company_id', companyId)
      .in('product_id', productIds)
      .neq('folder_id', folderId)

    if (deleteOldError) throw deleteOldError
  }

  return productIds.length
}

export const updateInventoryProductField = async (
  companyId: string,
  payload: { productId: string; field: 'quantity_on_hand' | 'selling_price'; value: number },
) => {
  if (payload.field === 'quantity_on_hand') {
    const { data: existingStocks, error: stockLookupError } = await db
      .from('product_folder_stocks')
      .select('id')
      .eq('company_id', companyId)
      .eq('product_id', payload.productId)
      .order('quantity_on_hand', { ascending: false })
      .limit(1)

    if (stockLookupError) throw stockLookupError

    const stockId = (existingStocks as Array<{ id: string }> | null)?.[0]?.id
    if (stockId) {
      const { error: stockError } = await db
        .from('product_folder_stocks')
        .update({ quantity_on_hand: payload.value })
        .eq('id', stockId)
        .eq('company_id', companyId)

      if (stockError) throw stockError
      return
    }
  }

  const { error } = await db
    .from('products')
    .update({ [payload.field]: payload.value })
    .eq('id', payload.productId)
    .eq('company_id', companyId)

  if (error) throw error
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

export type ImportInventoryColumnField =
  | 'name'
  | 'sku'
  | 'description'
  | 'cost_price'
  | 'selling_price'
  | 'quantity_on_hand'
  | 'reorder_point'

export type ImportInventoryColumnMappings = Record<ImportInventoryColumnField, string | null>

export type ImportInventoryPayload = {
  rows: ImportInventoryRow[]
  folderId: string | null
  columnMappings: ImportInventoryColumnMappings
  attributeColumns: string[]
}

export type ImportInventoryResult = {
  importedCount: number
  duplicateCount: number
  invalidCount: number
  duplicateSkus: string[]
}

const getMappedImportValue = (
  row: ImportInventoryRow,
  columnMappings: ImportInventoryColumnMappings,
  field: ImportInventoryColumnField,
) => {
  const column = columnMappings[field]

  if (!column) {
    return ''
  }

  return row[column]?.trim() ?? ''
}

export const importInventoryProducts = async (
  companyId: string,
  payload: ImportInventoryPayload,
): Promise<ImportInventoryResult> => {
  const duplicateSkuSet = new Set<string>()
  const seenCsvSkus = new Set<string>()
  let invalidCount = 0
  let duplicateCount = 0

  const candidateProducts = payload.rows.reduce<Array<{
    company_id: string
    folder_id: string | null
    name: string
    sku: string | null
    description: string | null
    quantity_on_hand: number
    reorder_point: number
    cost_price: number
    selling_price: number
    custom_fields: Record<string, string>
  }>>((acc, row) => {
    const name = getMappedImportValue(row, payload.columnMappings, 'name')
    const sku = getMappedImportValue(row, payload.columnMappings, 'sku') || null

    if (!name) {
      invalidCount += 1
      return acc
    }

    if (sku) {
      const normalizedSku = sku.toLowerCase()

      if (seenCsvSkus.has(normalizedSku)) {
        duplicateCount += 1
        duplicateSkuSet.add(sku)
        return acc
      }

      seenCsvSkus.add(normalizedSku)
    }

    const customFields = payload.attributeColumns.reduce<Record<string, string>>((fieldAcc, column) => {
      const value = row[column]?.trim() ?? ''

      if (value) {
        fieldAcc[column] = value
      }

      return fieldAcc
    }, {})

    acc.push({
      company_id: companyId,
      folder_id: payload.folderId,
      name,
      sku,
      description: getMappedImportValue(row, payload.columnMappings, 'description') || null,
      quantity_on_hand: toNumber(getMappedImportValue(row, payload.columnMappings, 'quantity_on_hand'), 0),
      reorder_point: toNumber(getMappedImportValue(row, payload.columnMappings, 'reorder_point'), 10),
      cost_price: toNumber(getMappedImportValue(row, payload.columnMappings, 'cost_price'), 0),
      selling_price: toNumber(getMappedImportValue(row, payload.columnMappings, 'selling_price'), 0),
      custom_fields: customFields,
    })

    return acc
  }, [])

  if (candidateProducts.length === 0) {
    return {
      importedCount: 0,
      duplicateCount,
      invalidCount,
      duplicateSkus: Array.from(duplicateSkuSet).slice(0, 5),
    }
  }

  const candidateSkus = candidateProducts
    .map((product) => product.sku)
    .filter((sku): sku is string => Boolean(sku))

  let existingSkuSet = new Set<string>()

  if (candidateSkus.length > 0) {
    const { data: existingProducts, error: existingProductsError } = await db
      .from('products')
      .select('sku')
      .eq('company_id', companyId)
      .in('sku', candidateSkus)

    if (existingProductsError) throw existingProductsError

    existingSkuSet = new Set(
      ((existingProducts as Array<{ sku: string | null }> | null) ?? [])
        .map((product) => product.sku)
        .filter((sku): sku is string => Boolean(sku)),
    )
  }

  const preparedProducts = candidateProducts.filter((product) => {
    if (!product.sku || !existingSkuSet.has(product.sku)) {
      return true
    }

    duplicateCount += 1
    duplicateSkuSet.add(product.sku)
    return false
  })

  if (preparedProducts.length === 0) {
    return {
      importedCount: 0,
      duplicateCount,
      invalidCount,
      duplicateSkus: Array.from(duplicateSkuSet).slice(0, 5),
    }
  }

  const insertResult = db
    .from('products')
    .insert(preparedProducts)

  const { data: insertedRows, error } = 'select' in insertResult
    ? await insertResult.select('id, quantity_on_hand, reorder_point')
    : await insertResult

  if (error) throw error

  const insertedProducts = (insertedRows as Array<{ id: string; quantity_on_hand: number; reorder_point: number }> | null) ?? []
  if (payload.folderId && insertedProducts.length > 0) {
    const { error: stockError } = await db.from('product_folder_stocks').insert(
      insertedProducts.map((product) => ({
        company_id: companyId,
        product_id: product.id,
        folder_id: payload.folderId,
        quantity_on_hand: product.quantity_on_hand ?? 0,
        min_stock_level: 0,
        reorder_point: product.reorder_point ?? 0,
        max_stock_level: null,
      })),
    )

    if (stockError) throw stockError
  }

  return {
    importedCount: preparedProducts.length,
    duplicateCount,
    invalidCount,
    duplicateSkus: Array.from(duplicateSkuSet).slice(0, 5),
  }
}

type BarcodeRow = Omit<ProductBarcode, 'products'> & {
  products: { id: string; name: string; sku: string } | { id: string; name: string; sku: string }[] | null
}

const normalizeSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export const fetchInventoryReferenceData = async (companyId: string): Promise<{
  barcodes: ProductBarcode[]
}> => {
  const { data: barcodeData, error: barcodeError } = await db
    .from('product_barcodes')
    .select('id, product_id, barcode, barcode_type, is_primary, products(id, name, sku)')
    .eq('company_id', companyId)
    .order('barcode', { ascending: true })

  if (barcodeError) throw barcodeError

  return {
    barcodes: ((barcodeData as BarcodeRow[] | null) ?? []).map((row) => ({
      ...row,
      products: (() => {
        const product = normalizeSingle(row.products)

        return product ? normalizeDisplaySku(product) : null
      })(),
    })),
  }
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

    if (payload.quantityDelta !== undefined) {
      try {
        const { data: stockRows, error: stockLookupError } = await db
          .from('product_folder_stocks')
          .select('id, quantity_on_hand')
          .eq('company_id', companyId)
          .eq('product_id', row.id)
          .order('quantity_on_hand', { ascending: false })
          .limit(1)

        if (stockLookupError) throw stockLookupError

        const stockRow = (stockRows as Array<{ id: string; quantity_on_hand: number }> | null)?.[0]
        if (stockRow) {
          const { error: stockError } = await db
            .from('product_folder_stocks')
            .update({ quantity_on_hand: Math.max((stockRow.quantity_on_hand ?? 0) + payload.quantityDelta, 0) })
            .eq('id', stockRow.id)
            .eq('company_id', companyId)

          if (stockError) throw stockError
        }
      } catch (error) {
        if (!(error instanceof Error) || !error.message.startsWith('Unexpected table: product_folder_stocks')) {
          throw error
        }
      }
    }

    const { error } = await db
      .from('products')
      .update({
        ...(payload.quantityDelta !== undefined ? { quantity_on_hand: nextQty } : {}),
        selling_price: nextPrice,
      })
      .eq('id', row.id)
      .eq('company_id', companyId)

    if (error) throw error
  }

  return rows.length
}

export const renameFolderInInventory = async (
  companyId: string,
  folderId: string,
  newName: string,
) => {
  const { error } = await db
    .from('folders')
    .update({ name: newName })
    .eq('id', folderId)
    .eq('company_id', companyId)

  if (error) throw error
}

const collectDescendantFolderIds = async (companyId: string, folderId: string): Promise<string[]> => {
  const { data, error } = await db
    .from('folders')
    .select('id')
    .eq('company_id', companyId)
    .eq('parent_id', folderId)

  if (error) throw error

  const childIds = (data ?? []).map((row) => row.id)
  const descendants: string[] = []

  for (const childId of childIds) {
    descendants.push(childId)
    const nested = await collectDescendantFolderIds(companyId, childId)
    descendants.push(...nested)
  }

  return descendants
}

export const deleteFolderInInventory = async (
  companyId: string,
  folderId: string,
  action: 'move-uncategorised' | 'delete-products',
) => {
  const allFolderIds = [folderId, ...(await collectDescendantFolderIds(companyId, folderId))]

  if (action === 'move-uncategorised') {
    let moveError: unknown = null
    try {
      const { error } = await db
        .from('product_folder_stocks')
        .delete()
        .eq('company_id', companyId)
        .in('folder_id', allFolderIds)
      moveError = error
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Unexpected table: product_folder_stocks')) {
        const { error: fallbackError } = await db
          .from('products')
          .update({ folder_id: null })
          .eq('company_id', companyId)
          .in('folder_id', allFolderIds)
        moveError = fallbackError
      } else {
        throw error
      }
    }

    if (moveError) throw moveError
  } else {
    let deleteProductsError: unknown = null
    try {
      const { data: affectedRows, error: affectedError } = await db
        .from('product_folder_stocks')
        .select('product_id')
        .eq('company_id', companyId)
        .in('folder_id', allFolderIds)

      if (affectedError) throw affectedError

      const affectedProductIds = Array.from(new Set(((affectedRows as Array<{ product_id: string }> | null) ?? []).map((row) => row.product_id)))
      const { error } = await db
        .from('products')
        .delete()
        .eq('company_id', companyId)
        .in('id', affectedProductIds.length > 0 ? affectedProductIds : ['00000000-0000-0000-0000-000000000000'])
      deleteProductsError = error
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Unexpected table: product_folder_stocks')) {
        const { error: fallbackError } = await db
          .from('products')
          .delete()
          .eq('company_id', companyId)
          .in('folder_id', allFolderIds)
        deleteProductsError = fallbackError
      } else {
        throw error
      }
    }

    if (deleteProductsError) throw deleteProductsError
  }

  const { error } = await db
    .from('folders')
    .delete()
    .eq('id', folderId)
    .eq('company_id', companyId)

  if (error) throw error
}

export const moveFolderInInventory = async (
  companyId: string,
  folderId: string,
  newParentId: string | null,
  sortOrder: number,
) => {
  const { error } = await db
    .from('folders')
    .update({ parent_id: newParentId, sort_order: sortOrder })
    .eq('id', folderId)
    .eq('company_id', companyId)

  if (error) throw error
}
