import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useSearchParams, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { usePageTopBarSearch } from '../components/Search/TopBarSearch'
import type { CustomFieldPrimitive, Folder } from '../types'
import { parseCsv } from '../utils'
import { AllProductsTab } from '../components/Inventory/AllProductsTab'
import type { InventoryProduct, SortField } from '../components/Inventory/types'
import type { FolderView } from '../components/Inventory/all-products/types'
import {
  createInventorySearchParams,
  defaultInventoryUrlState,
  hasInventoryCustomFieldSearchParams,
  parseInventoryCustomFieldFilters,
  parseInventoryUrlState,
  type InventoryUrlState,
} from './inventoryUrlState'
import {
  useDeleteInventoryProducts,
  useInventoryFilters,
  useInventoryProducts,
  useInventoryRefresh,
} from '../hooks/queries/useInventory'
import { useMyPermissions } from '../hooks/queries/usePermissions'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { missingPermissionMessage } from '../components/PermissionGate'

export const getNextSelectedRowIdsForVisibleToggle = (current: Set<string>, visibleProductIds: string[]) => {
  const visibleProductIdSet = new Set(visibleProductIds)
  const allVisibleSelected = visibleProductIds.length > 0 && visibleProductIds.every((id) => current.has(id))

  if (allVisibleSelected) {
    return new Set(Array.from(current).filter((id) => !visibleProductIdSet.has(id)))
  }

  return new Set([...Array.from(current), ...visibleProductIds])
}

export const InventoryListPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const { tab } = useParams<{ tab?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const importFileInputRef = useRef<HTMLInputElement | null>(null)

  const [pendingFilterKey, setPendingFilterKey] = useState<string | null>(null)
  const [folderView, setFolderView] = useState<FolderView>('all')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)

  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())

  const inventoryUrlState = useMemo(() => parseInventoryUrlState(searchParams), [searchParams])
  const hasCustomFieldSearchParams = useMemo(
    () => hasInventoryCustomFieldSearchParams(searchParams),
    [searchParams],
  )

  const computedFolderId = folderView === 'uncategorised'
    ? '__uncategorised__'
    : folderView === 'folder'
      ? selectedFolderId
      : undefined

  const filtersQuery = useInventoryFilters(companyId)
  const permissionsQuery = useMyPermissions(companyId)
  const permissions = permissionsQuery.data ?? []
  const hasPermission = useCallback((permissionCode: string) => permissions.includes(permissionCode), [permissions])
  const canUseInventory = hasPermission('inventory.use')
  const canCreateInventory = hasPermission('inventory.create')
  const canEditInventory = hasPermission('inventory.edit')
  const canAdjustInventory = hasPermission('inventory.adjust')
  const canDeleteInventory = hasPermission('inventory.delete')
  const canImportExportInventory = hasPermission('inventory.import_export')
  const customFieldFilters = filtersQuery.data?.customFieldFilters ?? []
  const canResolveCustomFieldSearchParams = !hasCustomFieldSearchParams || !!filtersQuery.data || filtersQuery.isError
  const canCanonicalizeInventoryUrl = !hasCustomFieldSearchParams || !!filtersQuery.data
  const activeCustomFieldFilters = useMemo(
    () => parseInventoryCustomFieldFilters(searchParams, customFieldFilters),
    [customFieldFilters, searchParams],
  )
  const currentInventoryUrlState = useMemo<InventoryUrlState>(() => ({
    ...inventoryUrlState,
    activeCustomFieldFilters: canResolveCustomFieldSearchParams ? activeCustomFieldFilters : [],
  }), [activeCustomFieldFilters, canResolveCustomFieldSearchParams, inventoryUrlState])
  const debouncedSearchTerm = useDebouncedValue(currentInventoryUrlState.searchTerm, 250)
  const previousSearchTermRef = useRef(currentInventoryUrlState.searchTerm)

  const syncInventoryUrlState = useCallback((update: (current: InventoryUrlState) => InventoryUrlState) => {
    const nextSearchParams = createInventorySearchParams(searchParams, update(currentInventoryUrlState))

    if (nextSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(nextSearchParams)
    }
  }, [currentInventoryUrlState, searchParams, setSearchParams])

  const handleStockFilterChange = useCallback((nextStockFilter: 'all' | 'low' | 'out') => {
    syncInventoryUrlState((current) => ({
      ...current,
      stockFilter: nextStockFilter,
      page: defaultInventoryUrlState.page,
    }))
  }, [syncInventoryUrlState])

  const handleAddFilter = useCallback((key: string, value: CustomFieldPrimitive) => {
    syncInventoryUrlState((current) => ({
      ...current,
      activeCustomFieldFilters: [...current.activeCustomFieldFilters.filter((filter) => filter.key !== key), { key, value }],
      page: defaultInventoryUrlState.page,
    }))
    setPendingFilterKey(null)
  }, [syncInventoryUrlState])

  const handleRemoveFilter = useCallback((key: string) => {
    syncInventoryUrlState((current) => ({
      ...current,
      activeCustomFieldFilters: current.activeCustomFieldFilters.filter((filter) => filter.key !== key),
      page: defaultInventoryUrlState.page,
    }))
  }, [syncInventoryUrlState])

  const handlePageChange = useCallback((nextPage: number) => {
    syncInventoryUrlState((current) => ({
      ...current,
      page: nextPage,
    }))
  }, [syncInventoryUrlState])

  const handlePageSizeChange = useCallback((nextPageSize: number) => {
    syncInventoryUrlState((current) => ({
      ...current,
      page: defaultInventoryUrlState.page,
      pageSize: nextPageSize,
    }))
  }, [syncInventoryUrlState])

  const handleSortChange = useCallback((nextSortField: SortField) => {
    syncInventoryUrlState((current) => ({
      ...current,
      page: defaultInventoryUrlState.page,
      sortField: nextSortField,
      sortDir: current.sortField === nextSortField
        ? (current.sortDir === 'asc' ? 'desc' : 'asc')
        : 'asc',
    }))
  }, [syncInventoryUrlState])

  const productsQuery = useInventoryProducts({
    companyId: canResolveCustomFieldSearchParams ? companyId : null,
    search: debouncedSearchTerm,
    folderId: computedFolderId,
    stockFilter: inventoryUrlState.stockFilter,
    customFieldFilters: currentInventoryUrlState.activeCustomFieldFilters.length > 0 ? currentInventoryUrlState.activeCustomFieldFilters : undefined,
    page: inventoryUrlState.page,
    pageSize: inventoryUrlState.pageSize,
    sortField: inventoryUrlState.sortField,
    sortDir: inventoryUrlState.sortDir,
  })

  const deleteProductsMutation = useDeleteInventoryProducts(companyId)
  const refreshInventory = useInventoryRefresh()

  const products = productsQuery.data?.products ?? ([] as InventoryProduct[])
  const totalCount = productsQuery.data?.totalCount ?? 0
  const folders = filtersQuery.data?.folders ?? ([] as Folder[])
  const inventorySearchSuggestions = useMemo(
    () => products.slice(0, 8).map((product) => ({
      id: `inventory-product-${product.id}`,
      title: product.name,
      subtitle: `${product.sku} · ${product.quantity_on_hand} on hand`,
      value: product.sku || product.name,
      badge: 'Product',
    })),
    [products],
  )
  const isLoading = useMemo(
    () => productsQuery.isLoading || filtersQuery.isLoading,
    [productsQuery.isLoading, filtersQuery.isLoading],
  )

  usePageTopBarSearch(useMemo(() => ({
    searchKey: 'inventory-list',
    placeholder: 'Search items...',
    defaultSuggestions: [
      { id: 'inventory-all-products', title: 'All Products', subtitle: 'Browse catalog items and stock', value: 'products', badge: 'Inventory' },
      { id: 'inventory-low-stock', title: 'Low Stock', subtitle: 'Find products near reorder point', value: 'low stock', badge: 'Filter' },
      { id: 'inventory-out-of-stock', title: 'Out of Stock', subtitle: 'Find products at zero quantity', value: 'out of stock', badge: 'Filter' },
    ],
    suggestions: inventorySearchSuggestions,
  }), [inventorySearchSuggestions]))

  useEffect(() => {
    if (tab === 'barcode-sku') {
      const nextSearch = searchParams.toString()
      navigate({ pathname: '/inventory/all', search: nextSearch ? `?${nextSearch}` : '' }, { replace: true })
    }
  }, [navigate, searchParams, tab])

  useEffect(() => {
    if (!canCanonicalizeInventoryUrl) return

    const nextSearchParams = createInventorySearchParams(searchParams, currentInventoryUrlState)

    if (nextSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(nextSearchParams, { replace: true })
    }
  }, [canCanonicalizeInventoryUrl, currentInventoryUrlState, searchParams, setSearchParams])

  useEffect(() => {
    if (previousSearchTermRef.current === currentInventoryUrlState.searchTerm) {
      return
    }

    previousSearchTermRef.current = currentInventoryUrlState.searchTerm

    if (currentInventoryUrlState.page === defaultInventoryUrlState.page) {
      return
    }

    syncInventoryUrlState((current) => ({
      ...current,
      page: defaultInventoryUrlState.page,
    }))
  }, [currentInventoryUrlState.page, currentInventoryUrlState.searchTerm, syncInventoryUrlState])

  useEffect(() => {
    if (pendingFilterKey === null) return

    const availableKeys = new Set(customFieldFilters.map((f) => f.key))

    if (pendingFilterKey !== null && !availableKeys.has(pendingFilterKey)) {
      setPendingFilterKey(null)
    }
  }, [customFieldFilters, pendingFilterKey])

  const toggleSelection = (id: string) => {
    setSelectedRowIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    const visibleProductIds = products.map((p) => p.id)
    setSelectedRowIds((current) => {
      return getNextSelectedRowIdsForVisibleToggle(current, visibleProductIds)
    })
  }

  const handleBulkDelete = async () => {
    if (!companyId) return
    if (!canDeleteInventory) {
      toast.error(missingPermissionMessage('inventory.delete'))
      return
    }
    if (!confirm(`Are you sure you want to delete ${selectedRowIds.size} items?`)) return
    try {
      await deleteProductsMutation.mutateAsync(Array.from(selectedRowIds))
      setSelectedRowIds(new Set())
      refreshInventory()
    } catch (error) {
      console.error(error)
    }
  }

  const handleImportOpen = useCallback(() => {
    if (!canImportExportInventory || !canUseInventory) {
      toast.error(missingPermissionMessage(canImportExportInventory ? 'inventory.use' : 'inventory.import_export'))
      return
    }

    importFileInputRef.current?.click()
  }, [canImportExportInventory, canUseInventory])

  const handleImportFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const content = await file.text()
      const parsed = parseCsv(content)

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        toast.error('This CSV does not contain any importable rows.')
        return
      }

      navigate('/inventory/import', {
        state: {
          csvUpload: {
            fileName: file.name,
            headers: parsed.headers,
            rows: parsed.rows,
            initialFolderId: folderView === 'folder' && selectedFolderId ? selectedFolderId : '__root__',
          },
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to read this CSV file.')
    } finally {
      event.target.value = ''
    }
  }, [folderView, navigate, selectedFolderId])

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading}
      emptyStateTitle="No company selected"
      emptyStateDescription="Select a company to manage inventory."
      contentClassName="flex h-full min-h-0 flex-col overflow-hidden"
      containerClassName="stack flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <AllProductsTab
        companyId={companyId}
        folderView={folderView}
        setFolderView={setFolderView}
        selectedFolderId={selectedFolderId}
        setSelectedFolderId={setSelectedFolderId}
        stockFilter={inventoryUrlState.stockFilter}
        setStockFilter={handleStockFilterChange}
        activeCustomFieldFilters={currentInventoryUrlState.activeCustomFieldFilters}
        onAddFilter={handleAddFilter}
        onRemoveFilter={handleRemoveFilter}
        pendingFilterKey={pendingFilterKey}
        setPendingFilterKey={setPendingFilterKey}
        customFieldFilters={customFieldFilters}
        onImportOpen={handleImportOpen}
        onCreateOpen={() => navigate('/inventory/new')}
        products={products}
        isLoading={isLoading}
        selectedRowIds={selectedRowIds}
        toggleSelection={toggleSelection}
        toggleAll={toggleAll}
        sortField={inventoryUrlState.sortField}
        sortDir={inventoryUrlState.sortDir}
        onSortChange={handleSortChange}
        page={inventoryUrlState.page}
        pageSize={inventoryUrlState.pageSize}
        setPageSize={handlePageSizeChange}
        totalCount={totalCount}
        setPage={handlePageChange}
        folders={folders}
        handleBulkDelete={handleBulkDelete}
        onClearSelection={() => setSelectedRowIds(new Set())}
        onRefresh={() => {
          refreshInventory()
        }}
        canUseInventory={canUseInventory}
        canCreateInventory={canCreateInventory}
        canEditInventory={canEditInventory}
        canAdjustInventory={canAdjustInventory}
        canDeleteInventory={canDeleteInventory}
        canImportExportInventory={canImportExportInventory}
      />

      <input
        ref={importFileInputRef}
        aria-label="Upload inventory CSV"
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleImportFileChange}
      />
    </BasePage>
  )
}
