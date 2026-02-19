import { db, supabase } from '../supabaseClient'
import type { Folder, Tag } from '../types'
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
  page: number
  pageSize: number
  sortField: SortField
  sortDir: SortDirection
}

export type InventoryListResponse = {
  products: InventoryProduct[]
  totalCount: number
}

export type QuickCreateProductPayload = {
  name: string
  sku: string
  quantity_on_hand: number
  cost_price: number
  selling_price: number
}

export const fetchInventoryFilters = async (companyId: string): Promise<{ folders: Folder[]; tags: Tag[] }> => {
  const [{ data: folderData, error: folderError }, { data: tagData, error: tagError }] = await Promise.all([
    db.from('folders').select('id, name, parent_id').eq('company_id', companyId),
    db.from('tags').select('id, name, color').eq('company_id', companyId),
  ])

  if (folderError) throw folderError
  if (tagError) throw tagError

  return {
    folders: (folderData as Folder[] | null) ?? [],
    tags: (tagData as Tag[] | null) ?? [],
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
  page,
  pageSize,
  sortField,
  sortDir,
}: FetchInventoryProductsParams): Promise<InventoryListResponse> => {
  let query = db
    .from('products')
    .select('id, name, sku, quantity_on_hand, reorder_point, folder_id, cost_price, selling_price, category', { count: 'exact' })
    .eq('company_id', companyId)

  if (search.trim()) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
  }

  if (stockFilter === 'out') {
    query = query.eq('quantity_on_hand', 0)
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
    .select('id, name, sku, quantity_on_hand, reorder_point, folder_id, cost_price, selling_price, category')
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

export const createInventoryQuickProduct = async (
  companyId: string,
  payload: QuickCreateProductPayload,
) => {
  const { error } = await db.from('products').insert({
    company_id: companyId,
    ...payload,
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
