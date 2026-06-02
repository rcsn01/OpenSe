export type InventoryProduct = {
  id: string
  name: string
  sku: string
  quantity_on_hand: number
  reorder_point: number
  folder_id: string | null
  folder_stock_summary?: Array<{
    folder_id: string
    quantity_on_hand: number
    reorder_point: number
  }>
  cost_price: number | null
  selling_price: number | null
}

export type SortField = 'name' | 'sku' | 'quantity_on_hand' | 'selling_price' | 'folder_id' | 'reorder_point'
export type SortDirection = 'asc' | 'desc'
