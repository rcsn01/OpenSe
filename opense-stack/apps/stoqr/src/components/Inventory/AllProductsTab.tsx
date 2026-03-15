import { InventoryFiltersBar } from './all-products/InventoryFiltersBar'
import { ProductListView } from './all-products/ProductListView'
import type { AllProductsTabProps } from './all-products/types'

export const AllProductsTab = ({
  companyId,
  stockFilter,
  setStockFilter,
  selectedCustomFieldKey,
  setSelectedCustomFieldKey,
  selectedCustomFieldValue,
  setSelectedCustomFieldValue,
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

  return (
    <div className="stack">
      <div className="card stack" style={{ padding: 0 }}>
        <InventoryFiltersBar
          isSelectionMode={isSelectionMode}
          selectedRowIds={selectedRowIds}
          stockFilter={stockFilter}
          setStockFilter={setStockFilter}
          selectedCustomFieldKey={selectedCustomFieldKey}
          setSelectedCustomFieldKey={setSelectedCustomFieldKey}
          selectedCustomFieldValue={selectedCustomFieldValue}
          setSelectedCustomFieldValue={setSelectedCustomFieldValue}
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
