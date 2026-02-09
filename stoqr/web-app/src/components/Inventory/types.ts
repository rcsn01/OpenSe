export type InventoryProduct = {
  id: string
  name: string
  sku: string
  quantity_on_hand: number
  reorder_point: number
  folder_id: string | null
  cost_price: number | null
  selling_price: number | null
  category: string | null
}

export type SortField = 'name' | 'sku' | 'quantity_on_hand' | 'selling_price'
export type SortDirection = 'asc' | 'desc'
