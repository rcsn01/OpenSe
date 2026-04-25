import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate, useParams } from 'react-router-dom'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import type { CustomFieldActiveFilter, CustomFieldPrimitive, Folder } from '../types'
import { parseCsv } from '../utils'
import { AllProductsTab } from '../components/Inventory/AllProductsTab'
import type { InventoryProduct, SortDirection, SortField } from '../components/Inventory/types'
import type { FolderView } from '../components/Inventory/all-products/types'
import {
  useDeleteInventoryProducts,
  useImportInventoryProducts,
  useInventoryFilters,
  useInventoryProducts,
  useInventoryRefresh,
} from '../hooks/queries/useInventory'

export const InventoryListPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const { tab } = useParams<{ tab?: string }>()
  const [searchParams] = useSearchParams()

  // Removed isCreateOpen state
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importRows, setImportRows] = useState<Record<string, string>[]>([])
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const [activeCustomFieldFilters, setActiveCustomFieldFilters] = useState<CustomFieldActiveFilter[]>([])
  const [pendingFilterKey, setPendingFilterKey] = useState<string | null>(null)
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all')
  const [folderView, setFolderView] = useState<FolderView>('all')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')

  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())

  const computedFolderId = folderView === 'uncategorised'
    ? '__uncategorised__'
    : folderView === 'folder'
      ? selectedFolderId
      : undefined

  const productsQuery = useInventoryProducts({
    companyId,
    search: '',
    folderId: computedFolderId,
    stockFilter,
    customFieldFilters: activeCustomFieldFilters.length > 0 ? activeCustomFieldFilters : undefined,
    page,
    pageSize,
    sortField,
    sortDir,
  })

  const filtersQuery = useInventoryFilters(companyId)
  const deleteProductsMutation = useDeleteInventoryProducts(companyId)
  const importProductsMutation = useImportInventoryProducts(companyId)
  const refreshInventory = useInventoryRefresh()

  const products = productsQuery.data?.products ?? ([] as InventoryProduct[])
  const totalCount = productsQuery.data?.totalCount ?? 0
  const folders = filtersQuery.data?.folders ?? ([] as Folder[])
  const customFieldFilters = filtersQuery.data?.customFieldFilters ?? []
  const isLoading = useMemo(
    () => productsQuery.isLoading || filtersQuery.isLoading,
    [productsQuery.isLoading, filtersQuery.isLoading],
  )

  useEffect(() => {
    if (tab === 'barcode-sku') {
      navigate('/inventory/all', { replace: true })
    }
  }, [navigate, tab])

  useEffect(() => {
    const stockParam = searchParams.get('stock')
    if (stockParam === 'low' || stockParam === 'out' || stockParam === 'all') {
      setStockFilter(stockParam)
    }
  }, [searchParams])

  useEffect(() => {
    if (activeCustomFieldFilters.length === 0 && pendingFilterKey === null) return

    const availableKeys = new Set(customFieldFilters.map((f) => f.key))

    const validFilters = activeCustomFieldFilters.filter((f) => {
      const option = customFieldFilters.find((o) => o.key === f.key)
      return option && option.values.some((v) => v === f.value)
    })

    if (validFilters.length !== activeCustomFieldFilters.length) {
      setActiveCustomFieldFilters(validFilters)
    }

    if (pendingFilterKey !== null && !availableKeys.has(pendingFilterKey)) {
      setPendingFilterKey(null)
    }
  }, [customFieldFilters, activeCustomFieldFilters, pendingFilterKey])

  const handleAddFilter = useCallback((key: string, value: CustomFieldPrimitive) => {
    setActiveCustomFieldFilters((prev) => {
      const filtered = prev.filter((f) => f.key !== key)
      return [...filtered, { key, value }]
    })
    setPendingFilterKey(null)
  }, [])

  const handleRemoveFilter = useCallback((key: string) => {
    setActiveCustomFieldFilters((prev) => prev.filter((f) => f.key !== key))
  }, [])

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
    const visibleProductIdSet = new Set(visibleProductIds)
    setSelectedRowIds((current) => {
      const allVisibleSelected = visibleProductIds.length > 0 && visibleProductIds.every((id) => current.has(id))
      if (allVisibleSelected) {
        return new Set(Array.from(current).filter((id) => !visibleProductIdSet.has(id)))
      }
      return new Set([...Array.from(current), ...visibleProductIds])
    })
  }

  const handleBulkDelete = async () => {
    if (!companyId) return
    if (!confirm(`Are you sure you want to delete ${selectedRowIds.size} items?`)) return
    try {
      await deleteProductsMutation.mutateAsync(Array.from(selectedRowIds))
      setSelectedRowIds(new Set())
      refreshInventory()
    } catch (error) {
      console.error(error)
    }
  }

  const handleImportFile = async (file: File) => {
    const content = await file.text()
    const { rows } = parseCsv(content)
    setImportRows(rows)
    setImportMessage(rows.length ? null : 'No rows found in CSV.')
  }

  const handleImport = async () => {
    if (!companyId || importRows.length === 0) return
    try {
      const importedCount = await importProductsMutation.mutateAsync(importRows)
      if (importedCount === 0) {
        setImportMessage('No valid rows found in CSV.')
        return
      }
      setImportMessage(`Imported ${importedCount} products.`)
      setImportRows([])
      setIsImportOpen(false)
      refreshInventory()
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'Import failed.')
    }
  }

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading}
      emptyStateTitle="No company selected"
      emptyStateDescription="Select a company to manage inventory."
      containerClassName="stack"
      containerStyle={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: 'calc(100vh - 120px)' }}
    >
      <AllProductsTab
        companyId={companyId}
        folderView={folderView}
        setFolderView={setFolderView}
        selectedFolderId={selectedFolderId}
        setSelectedFolderId={setSelectedFolderId}
        stockFilter={stockFilter}
        setStockFilter={setStockFilter}
        activeCustomFieldFilters={activeCustomFieldFilters}
        onAddFilter={handleAddFilter}
        onRemoveFilter={handleRemoveFilter}
        pendingFilterKey={pendingFilterKey}
        setPendingFilterKey={setPendingFilterKey}
        customFieldFilters={customFieldFilters}
        onImportOpen={() => setIsImportOpen(true)}
        onCreateOpen={() => navigate('/inventory/new')}
        products={products}
        isLoading={isLoading}
        selectedRowIds={selectedRowIds}
        toggleSelection={toggleSelection}
        toggleAll={toggleAll}
        sortField={sortField}
        setSortField={setSortField}
        sortDir={sortDir}
        setSortDir={setSortDir}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        setPage={setPage}
        folders={folders}
        handleBulkDelete={handleBulkDelete}
        onClearSelection={() => setSelectedRowIds(new Set())}
        onRefresh={() => {
          refreshInventory()
        }}
      />

      {/* Removed CreateProductModal */}

      {isImportOpen && (
        <div className="modal-backdrop" role="dialog">
          <div className="modal">
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <h3 className="section-title">Import Inventory (CSV)</h3>
              <button className="button ghost" onClick={() => setIsImportOpen(false)}>Close</button>
            </div>
            <div className="stack">
              <input
                className="input"
                type="file"
                accept=".csv"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) handleImportFile(file)
                }}
              />
              {importRows.length > 0 && (
                <div className="card" style={{ boxShadow: 'none', background: '#f8fafc' }}>
                  <div className="flex-between">
                    <h4 style={{ margin: 0 }}>Preview</h4>
                    <span className="small muted">{importRows.length} rows</span>
                  </div>
                </div>
              )}
              {importMessage && <div className="pill">{importMessage}</div>}
              <div className="flex-between">
                <span className="small muted">Required: Name, SKU, Qty</span>
                <button className="button" type="button" onClick={handleImport} disabled={importRows.length === 0}>Confirm Import</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </BasePage>
  )
}