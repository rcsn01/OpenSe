import type { CustomFieldActiveFilter, CustomFieldFilterOption, CustomFieldPrimitive, Folder } from '../../../types'
import type { DataTableTopRowConfig } from '@repo/ui'
import type { InventoryProduct, SortDirection, SortField } from '../types'

export type FolderView = 'all' | 'uncategorised' | 'folder'

export type ProductListViewProps = {
  companyId: string | null
  products: InventoryProduct[]
  isLoading: boolean
  selectedRowIds: Set<string>
  toggleSelection: (id: string) => void
  toggleAll: () => void
  sortField: SortField
  sortDir: SortDirection
  onSortChange: (field: SortField) => void
  page: number
  pageSize: number
  setPageSize: (pageSize: number) => void
  totalCount: number
  setPage: (page: number) => void
  folders: Folder[]
  onRefresh: () => void
  canUseInventory: boolean
  canEditInventory: boolean
  topRow?: DataTableTopRowConfig
}

export type InventoryFiltersBarProps = {
  isSelectionMode: boolean
  selectedRowIds: Set<string>
  stockFilter: 'all' | 'low' | 'out'
  setStockFilter: (value: 'all' | 'low' | 'out') => void
  activeCustomFieldFilters: CustomFieldActiveFilter[]
  onAddFilter: (key: string, value: CustomFieldPrimitive) => void
  onRemoveFilter: (key: string) => void
  pendingFilterKey: string | null
  setPendingFilterKey: (key: string | null) => void
  customFieldFilters: CustomFieldFilterOption[]
  showMobileExplorerToggle?: boolean
  onMobileExplorerToggle?: () => void
  mobileExplorerControlsId?: string
  onImportOpen: () => void
  onCreateOpen: () => void
  handleBulkDelete: () => void
  onMoveSelected: () => void
  onBulkPriceAdjust: () => void
  onBulkQuantityAdjust: () => void
  onExportCsv: () => void
  canCreateInventory: boolean
  canEditInventory: boolean
  canAdjustInventory: boolean
  canDeleteInventory: boolean
  canImportExportInventory: boolean
  canUseInventory: boolean
}

export type AllProductsTabProps = {
  companyId: string | null
  folderView: FolderView
  setFolderView: (value: FolderView) => void
  selectedFolderId: string | null
  setSelectedFolderId: (value: string | null) => void
  stockFilter: 'all' | 'low' | 'out'
  setStockFilter: (value: 'all' | 'low' | 'out') => void
  activeCustomFieldFilters: CustomFieldActiveFilter[]
  onAddFilter: (key: string, value: CustomFieldPrimitive) => void
  onRemoveFilter: (key: string) => void
  pendingFilterKey: string | null
  setPendingFilterKey: (key: string | null) => void
  customFieldFilters: CustomFieldFilterOption[]
  onImportOpen: () => void
  onCreateOpen: () => void
  products: InventoryProduct[]
  isLoading: boolean
  selectedRowIds: Set<string>
  toggleSelection: (id: string) => void
  toggleAll: () => void
  sortField: SortField
  sortDir: SortDirection
  onSortChange: (field: SortField) => void
  page: number
  pageSize: number
  setPageSize: (pageSize: number) => void
  totalCount: number
  setPage: (page: number) => void
  folders: Folder[]
  handleBulkDelete: () => void
  onClearSelection: () => void
  onRefresh: () => void
  canUseInventory: boolean
  canCreateInventory: boolean
  canEditInventory: boolean
  canAdjustInventory: boolean
  canDeleteInventory: boolean
  canImportExportInventory: boolean
}
