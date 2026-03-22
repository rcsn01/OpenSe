import { useMemo } from 'react'
import { InventoryFiltersBar } from './all-products/InventoryFiltersBar'
import { ProductListView } from './all-products/ProductListView'
import type { AllProductsTabProps } from './all-products/types'

export const AllProductsTab = ({
  companyId,
  stockFilter,
  setStockFilter,
  activeCustomFieldFilters,
  onAddFilter,
  onRemoveFilter,
  pendingFilterKey,
  setPendingFilterKey,
  customFieldFilters,
  onImportOpen,
  onCreateOpen,
  products,
  isLoading,
  selectedRowIds,
  toggleSelection,
  toggleAll,
  sortField,
  setSortField,
  sortDir,
  setSortDir,
  page,
  pageSize,
  totalCount,
  setPage,
  folders,
  handleBulkDelete,
  onRefresh,
}: AllProductsTabProps) => {
  const isSelectionMode = selectedRowIds.size > 0

  const stockCounts = useMemo(() => {
    let inStock = 0
    let lowStock = 0
    let outOfStock = 0
    for (const p of products) {
      if (p.quantity_on_hand === 0) outOfStock++
      else if (p.quantity_on_hand <= p.reorder_point) lowStock++
      else inStock++
    }
    return { inStock, lowStock, outOfStock }
  }, [products])

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="inventory-summary">
        <div className="inventory-stat">
          <div className="inventory-stat-label">Total Products</div>
          <div className="inventory-stat-value">{totalCount}</div>
        </div>
        <div className="inventory-stat">
          <div className="inventory-stat-label">In Stock</div>
          <div className="inventory-stat-value success">{stockCounts.inStock}</div>
        </div>
        <div className="inventory-stat">
          <div className="inventory-stat-label">Low Stock</div>
          <div className="inventory-stat-value warning">{stockCounts.lowStock}</div>
        </div>
        <div className="inventory-stat">
          <div className="inventory-stat-label">Out of Stock</div>
          <div className="inventory-stat-value danger">{stockCounts.outOfStock}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <InventoryFiltersBar
          isSelectionMode={isSelectionMode}
          selectedRowIds={selectedRowIds}
          stockFilter={stockFilter}
          setStockFilter={setStockFilter}
          activeCustomFieldFilters={activeCustomFieldFilters}
          onAddFilter={onAddFilter}
          onRemoveFilter={onRemoveFilter}
          pendingFilterKey={pendingFilterKey}
          setPendingFilterKey={setPendingFilterKey}
          customFieldFilters={customFieldFilters}
          onImportOpen={onImportOpen}
          onCreateOpen={onCreateOpen}
          handleBulkDelete={handleBulkDelete}
        />

        <ProductListView
          companyId={companyId}
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
          onRefresh={onRefresh}
        />
      </div>
    </div>
  )
}
