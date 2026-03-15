import type { CustomFieldFilterOption, CustomFieldPrimitive, Folder } from '../../../types'
import type { InventoryProduct, SortDirection, SortField } from '../types'

export type ProductListViewProps = {
  companyId: string | null
  products: InventoryProduct[]
  isLoading: boolean
  selectedRowIds: Set<string>
  toggleSelection: (id: string) => void
  toggleAll: () => void
  sortField: SortField
  setSortField: (value: SortField) => void
  sortDir: SortDirection
  setSortDir: (value: SortDirection) => void
  page: number
  pageSize: number
  totalCount: number
  setPage: (page: number) => void
  folders: Folder[]
  handleBulkDelete: () => void
  onRefresh: () => void
}

export type InventoryFiltersBarProps = {
  isSelectionMode: boolean
  selectedRowIds: Set<string>
  stockFilter: 'all' | 'low' | 'out'
  setStockFilter: (value: 'all' | 'low' | 'out') => void
  selectedCustomFieldKey: string | null
  setSelectedCustomFieldKey: (value: string | null) => void
  selectedCustomFieldValue: CustomFieldPrimitive | null
  setSelectedCustomFieldValue: (value: CustomFieldPrimitive | null) => void
  customFieldFilters: CustomFieldFilterOption[]
  onImportOpen: () => void
  onCreateOpen: () => void
  handleBulkDelete: () => void
}

export type AllProductsTabProps = {
  companyId: string | null
  stockFilter: 'all' | 'low' | 'out'
  setStockFilter: (value: 'all' | 'low' | 'out') => void
  selectedCustomFieldKey: string | null
  setSelectedCustomFieldKey: (value: string | null) => void
  selectedCustomFieldValue: CustomFieldPrimitive | null
  setSelectedCustomFieldValue: (value: CustomFieldPrimitive | null) => void
  customFieldFilters: CustomFieldFilterOption[]
  onImportOpen: () => void
  onCreateOpen: () => void
  products: InventoryProduct[]
  isLoading: boolean
  selectedRowIds: Set<string>
  toggleSelection: (id: string) => void
  toggleAll: () => void
  sortField: SortField
  setSortField: (value: SortField) => void
  sortDir: SortDirection
  setSortDir: (value: SortDirection) => void
  page: number
  pageSize: number
  totalCount: number
  setPage: (page: number) => void
  folders: Folder[]
  handleBulkDelete: () => void
  onRefresh: () => void
}
