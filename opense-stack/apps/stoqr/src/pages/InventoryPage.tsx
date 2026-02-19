import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import type { Folder, Tag } from '../types'
import { Tabs } from '../components/Tabs'
import { parseCsv } from '../utils'
import { AllProductsTab } from '../components/Inventory/AllProductsTab'
import { BundlesTab } from '../components/Inventory/BundlesTab'
import { FoldersTab } from '../components/Inventory/FoldersTab'
import { TransferTab } from '../components/Inventory/TransferTab'
import { VariantsTab } from '../components/Inventory/VariantsTab'
import type { InventoryProduct, SortDirection, SortField } from '../components/Inventory/types'
import {
  useDeleteInventoryProducts,
  useImportInventoryProducts,
  useInventoryFilters,
  useInventoryProducts,
  useInventoryRefresh,
  useInventoryStats,
} from '../hooks/queries/useInventory'

export const InventoryListPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate() // Hook
  const [searchParams] = useSearchParams()

  // Removed isCreateOpen state
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importRows, setImportRows] = useState<Record<string, string>[]>([])
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all')

  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')

  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())

  const productsQuery = useInventoryProducts({
    companyId,
    search,
    stockFilter,
    page,
    pageSize,
    sortField,
    sortDir,
  })

  const filtersQuery = useInventoryFilters(companyId)
  const statsQuery = useInventoryStats(companyId)
  const deleteProductsMutation = useDeleteInventoryProducts(companyId)
  const importProductsMutation = useImportInventoryProducts(companyId)
  const refreshInventory = useInventoryRefresh()

  const products = productsQuery.data?.products ?? ([] as InventoryProduct[])
  const totalCount = productsQuery.data?.totalCount ?? 0
  const folders = filtersQuery.data?.folders ?? ([] as Folder[])
  const tags = filtersQuery.data?.tags ?? ([] as Tag[])
  const stats = statsQuery.data ?? { totalItems: 0, lowStockItems: 0, totalValue: 0 }
  const isLoading = useMemo(
    () => productsQuery.isLoading || filtersQuery.isLoading || statsQuery.isLoading,
    [productsQuery.isLoading, filtersQuery.isLoading, statsQuery.isLoading],
  )

  useEffect(() => {
    const stockParam = searchParams.get('stock')
    if (stockParam === 'low' || stockParam === 'out' || stockParam === 'all') {
      setStockFilter(stockParam)
    }
  }, [searchParams])

  const toggleSelection = (id: string) => {
    const next = new Set(selectedRowIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedRowIds(next)
  }

  const toggleAll = () => {
    if (selectedRowIds.size === products.length) {
      setSelectedRowIds(new Set())
    } else {
      setSelectedRowIds(new Set(products.map((p) => p.id)))
    }
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
    >
      <Tabs
        tabs={[
          {
            id: 'all',
            label: 'All Products',
            content: (
              <AllProductsTab
                companyId={companyId}
                stats={stats}
                search={search}
                setSearch={setSearch}
                stockFilter={stockFilter}
                setStockFilter={setStockFilter}
                selectedTag={selectedTag}
                setSelectedTag={setSelectedTag}
                tags={tags}
                onImportOpen={() => setIsImportOpen(true)}
                onCreateOpen={() => navigate('/inventory/new')} // Changed handler
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
                onRefresh={() => {
                  refreshInventory()
                }}
              />
            ),
          },
          {
            id: 'folders',
            label: 'Folders',
            content: <FoldersTab companyId={companyId!} allFolders={folders} onRefresh={refreshInventory} />,
          },
          {
            id: 'matrix',
            label: 'Variants & Matrices',
            content: <VariantsTab products={products} />,
          },
          {
            id: 'transfer',
            label: 'Stock Transfers',
            content: <TransferTab products={products} />,
          },
          {
            id: 'bundles',
            label: 'Kitting & Bundles',
            content: <BundlesTab products={products} />,
          },
        ]}
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