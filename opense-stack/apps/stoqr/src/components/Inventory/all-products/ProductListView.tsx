import { Link } from 'react-router-dom'
import { Badge, DataTable, EmptyState, Heading, Label, Pagination, cn } from '@repo/ui'
import { formatCurrency } from '../../../utils'
import { useInlineProductEdit } from './useInlineProductEdit'
import type { ProductListViewProps } from './types'
import type { SortField } from '../types'

const inventoryPageSizeOptions = [10, 20, 50]
const inventoryTableHeaderClassName = 'border-b border-[#d9e2ef] bg-white px-4 py-4 uppercase'
const inventoryTableCellClassName = 'border-b border-[#d9e2ef] px-4 py-3'

export const ProductListView = ({
  companyId,
  view,
  products,
  isLoading,
  selectedRowIds,
  toggleSelection,
  toggleAll,
  sortField,
  sortDir,
  onSortChange,
  page,
  pageSize,
  setPageSize,
  totalCount,
  setPage,
  folders,
  onRefresh,
}: ProductListViewProps) => {
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name ?? '—'
  const folderSummary = (product: { folder_id: string | null; folder_stock_summary?: Array<{ folder_id: string; quantity_on_hand: number }> }) => {
    const rows = product.folder_stock_summary ?? []
    if (rows.length === 0) return folderName(product.folder_id)
    if (rows.length === 1) return `${folderName(rows[0].folder_id)} · ${rows[0].quantity_on_hand}`
    return rows
      .slice(0, 2)
      .map((row) => `${folderName(row.folder_id)} ${row.quantity_on_hand}`)
      .join(', ') + (rows.length > 2 ? ` +${rows.length - 2}` : '')
  }
  const { editingCell, editingValue, isSaving, setEditingValue, startEdit, commitEdit, cancelEdit } = useInlineProductEdit(companyId, onRefresh)

  const handleColumnSort = (field: SortField) => {
    onSortChange(field)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {isLoading ? (
        <div className="empty-state px-12 py-12">Loading inventory data...</div>
      ) : products.length === 0 ? (
        <EmptyState title="No products found" description="Try adjusting filters or adding new items." />
      ) : view === 'grid' ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {products.map((product) => {
                const isLow = product.quantity_on_hand <= product.reorder_point
                const isOut = product.quantity_on_hand === 0

                return (
                  <div
                    key={product.id}
                    className={cn(
                      'inventory-product-card',
                      selectedRowIds.has(product.id) && 'is-selected',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <input
                        type="checkbox"
                        checked={selectedRowIds.has(product.id)}
                        disabled={isSaving}
                        onChange={() => toggleSelection(product.id)}
                      />
                      {isOut ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : isLow ? (
                        <Badge variant="warning">Low Stock</Badge>
                      ) : (
                        <Badge variant="success">In Stock</Badge>
                      )}
                    </div>

                    <div className="min-w-0">
                      <Link to={`/inventory/${product.id}/overview`} className="block min-w-0">
                        <Heading level="h6" className="m-0 leading-tight">
                          {product.name}
                        </Heading>
                      </Link>
                      <Label className="block">{product.sku}</Label>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-muted-foreground)]">Folder</span>
                        <span>{folderSummary(product)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-muted-foreground)]">Price</span>
                        <span>{formatCurrency(product.selling_price)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-muted-foreground)]">On Hand</span>
                        <span>{product.quantity_on_hand}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-muted-foreground)]">Available</span>
                        <span
                          style={{ color: product.quantity_on_hand >= product.reorder_point ? 'var(--success)' : 'var(--danger)' }}
                          className={cn(
                            'font-semibold',
                            product.quantity_on_hand >= product.reorder_point
                              ? 'text-[var(--color-success)]'
                              : 'text-[var(--color-destructive)]',
                          )}
                        >
                          {product.quantity_on_hand} / {product.reorder_point}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="px-5 pb-4">
            <Pagination
              currentPage={page}
              totalPages={Math.max(1, Math.ceil(totalCount / pageSize))}
              totalItems={totalCount}
              itemsPerPage={pageSize}
              onPageChange={setPage}
              onItemsPerPageChange={setPageSize}
              pageSizeOptions={inventoryPageSizeOptions}
            />
          </div>
        </>
      ) : (
        <DataTable
          className="flex-1"
          tableWrapClassName="flex-1 min-h-0"
          columns={[
            {
              id: 'name',
              header: 'Name / SKU',
              sortKey: 'name',
              headerClassName: inventoryTableHeaderClassName,
              cellClassName: inventoryTableCellClassName,
              renderCell: (product) => (
                <Link
                  to={`/inventory/${product.id}/overview`}
                  className="block min-w-0"
                  onClick={(event) => event.stopPropagation()}
                >
                  <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold leading-normal text-[var(--color-foreground)]">
                    {product.name}
                  </span>
                </Link>
              ),
            },
            {
              id: 'folder_id',
              header: 'Folder',
              sortKey: 'folder_id',
              width: 220,
              headerClassName: inventoryTableHeaderClassName,
              cellClassName: inventoryTableCellClassName,
              renderCell: (product) => <span className="text-sm text-[var(--color-muted-foreground)]">{folderSummary(product)}</span>,
            },
            {
              id: 'selling_price',
              header: 'Price',
              sortKey: 'selling_price',
              width: 100,
              align: 'right',
              headerClassName: inventoryTableHeaderClassName,
              cellClassName: inventoryTableCellClassName,
              renderCell: (product) => {
                const isEditingPrice = editingCell?.id === product.id && editingCell.field === 'selling_price'

                return isEditingPrice ? (
                  <input
                    autoFocus
                    type="number"
                    step="0.01"
                    value={editingValue}
                    disabled={isSaving}
                    onChange={(event) => setEditingValue(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onBlur={() => {
                      void commitEdit()
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void commitEdit()
                      }
                      if (event.key === 'Escape') cancelEdit()
                    }}
                    className="inventory-inline-input inventory-inline-input--price"
                  />
                ) : (
                  <span
                    onClick={(event) => {
                      event.stopPropagation()
                      startEdit(product, 'selling_price')
                    }}
                    aria-disabled={isSaving}
                    className={cn(
                      'editable-cell',
                      isSaving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
                    )}
                  >
                    {formatCurrency(product.selling_price)}
                    <span className="edit-icon">✎</span>
                  </span>
                )
              },
            },
            {
              id: 'quantity_on_hand',
              header: 'Available',
              sortKey: 'quantity_on_hand',
              width: 110,
              align: 'right',
              headerClassName: inventoryTableHeaderClassName,
              cellClassName: inventoryTableCellClassName,
              renderCell: (product) => (
                <span
                  style={{ color: product.quantity_on_hand >= product.reorder_point ? 'var(--success)' : 'var(--danger)' }}
                  className={cn(
                    'font-semibold',
                    product.quantity_on_hand >= product.reorder_point
                      ? 'text-[var(--color-success)]'
                      : 'text-[var(--color-destructive)]',
                  )}
                >
                  {product.quantity_on_hand} / {product.reorder_point}
                </span>
              ),
            },
          ]}
          rows={products}
          getRowId={(product) => product.id}
          minTableWidth={900}
          tableLayout="fixed"
          theadClassName={selectedRowIds.size > 0 ? 'table-header-selected' : undefined}
          sortField={sortField}
          sortDirection={sortDir}
          onSortChange={handleColumnSort}
          selection={{
            selectedRowIds,
            onToggleAll: toggleAll,
            onToggleRow: (product) => toggleSelection(product.id),
            isRowDisabled: isSaving,
            selectAllLabel: 'Select all visible products',
            getRowLabel: (product) => product.name,
            columnWidth: 44,
            headerClassName: inventoryTableHeaderClassName,
            cellClassName: inventoryTableCellClassName,
          }}
          onRowClick={(product) => toggleSelection(product.id)}
          rowClassName={(product) => (
            selectedRowIds.has(product.id) ? 'bg-[var(--color-primary-light)]' : undefined
          )}
          footerClassName="border-t-0 px-5 pb-4 pt-0"
          pagination={{
            currentPage: page,
            totalItems: totalCount,
            itemsPerPage: pageSize,
            onPageChange: setPage,
            onItemsPerPageChange: setPageSize,
            pageSizeOptions: inventoryPageSizeOptions,
          }}
        />
      )}
    </div>
  )
}
