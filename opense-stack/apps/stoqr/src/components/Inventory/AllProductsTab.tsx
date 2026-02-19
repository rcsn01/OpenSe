import { formatCurrency } from '../../utils'
import { InventoryFiltersBar } from './all-products/InventoryFiltersBar'
import { ProductListView } from './all-products/ProductListView'
import type { AllProductsTabProps } from './all-products/types'

export const AllProductsTab = ({
  companyId,
  stats,
  search,
  setSearch,
  stockFilter,
  setStockFilter,
  selectedTag,
  setSelectedTag,
  tags,
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

  return (
    <div className="stack">
      <div className="gap-[var(--gap-4)] [display:grid]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="card stat" style={{ borderLeft: stats.lowStockItems > 0 ? '4px solid var(--warning)' : undefined }}>
          <div className="flex-between">
            <h3 style={{ margin: 0 }}>Low Stock Alerts</h3>
            {stats.lowStockItems > 0 && <span className="badge warning">Action needed</span>}
          </div>
          <div className="value">{stats.lowStockItems}</div>
        </div>

        <div className="card stat">
          <div className="flex-between">
            <h3 style={{ margin: 0 }}>Total Asset Value</h3>
            <span className="pill">Cost Basis</span>
          </div>
          <div className="value">{formatCurrency(stats.totalValue)}</div>
        </div>
      </div>

      <div className="card stack" style={{ padding: 0 }}>
        <InventoryFiltersBar
          isSelectionMode={isSelectionMode}
          selectedRowIds={selectedRowIds}
          search={search}
          setSearch={setSearch}
          stockFilter={stockFilter}
          setStockFilter={setStockFilter}
          selectedTag={selectedTag}
          setSelectedTag={setSelectedTag}
          tags={tags}
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
