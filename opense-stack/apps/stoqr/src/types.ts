export type CompanyOption = {
  id: string
  name: string
}

export type Product = {
  id: string
  name: string
  sku: string
  description: string | null
  quantity_on_hand: number
  reorder_point: number
  cost_price: number | null
  selling_price: number | null
  folder_id: string | null
  image_urls: string[]
  custom_fields: Record<string, string | number | boolean | null>
  expiry_date: string | null
}

export type Folder = {
  id: string
  name: string
  parent_id: string | null
  sort_order?: number
}

export type Tag = {
  id: string
  name: string
  color: string
}

export type CustomFieldPrimitive = string | number | boolean

export type CustomFieldValueType = 'text' | 'number' | 'boolean' | 'date'

export type CustomFieldFilterOption = {
  key: string
  valueType: CustomFieldValueType
  values: CustomFieldPrimitive[]
}

export type CustomFieldActiveFilter = {
  key: string
  value: CustomFieldPrimitive
}

export type InventoryTransaction = {
  id: string
  transaction_type: string
  source?: string | null
  quantity_change: number
  stock_after: number | null
  notes: string | null
  created_at: string
  products?: { id: string; name: string; sku: string }
  profiles?: { id: string; full_name: string | null; username: string | null }
}
