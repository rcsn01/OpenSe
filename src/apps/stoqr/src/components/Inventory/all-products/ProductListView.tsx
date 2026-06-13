import { Link } from 'react-router-dom'
import { DataTable, EmptyState, cn } from '@repo/ui'
import { formatCurrency } from '../../../utils'
import { missingPermissionMessage } from '../../PermissionGate'
import { useInlineProductEdit } from './useInlineProductEdit'
import type { ProductListViewProps } from './types'
import type { SortField } from '../types'

const inventoryPageSizeOptions = [10, 20, 50]

export const ProductListView = ({
  companyId,
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
  selectedFolderId,
  onRefresh,
  canUseInventory,
  canEditInventory,
  topRow,
}: ProductListViewProps) => {
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name ?? '—'
  const folderSummary = (product: { folder_id: string | null; folder_stock_summary?: Array<{ folder_id: string; quantity_on_hand: number }> }) => {
    const rows = product.folder_stock_summary ?? []
    if (rows.length === 0) return folderName(product.folder_id)
    if (!selectedFolderId && rows.length > 1) return `${rows.length} Locations`
    if (selectedFolderId) {
      const selectedFolderRow = rows.find((row) => row.folder_id === selectedFolderId)
      if (selectedFolderRow) return `${folderName(selectedFolderRow.folder_id)} · ${selectedFolderRow.quantity_on_hand}`
    }
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
        <DataTable
          variant="operational"
          className="flex-1"
          columns={[
            {
              id: 'name',
              header: 'Name / SKU',
              sortKey: 'name',
              width: 430,
              renderCell: (product) => (
                canUseInventory ? (
                  <Link
                    to={`/inventory/${product.id}/overview`}
                    className="block min-w-0"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold leading-normal text-[var(--color-foreground)]">
                      {product.name}
                    </span>
                  </Link>
                ) : (
                  <div className="block min-w-0" title={missingPermissionMessage('inventory.use')}>
                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold leading-normal text-[var(--color-muted-foreground)]">
                      {product.name}
                    </span>
                    <span className="block text-xs text-[var(--color-muted-foreground)]">No permission to open detail</span>
                  </div>
                )
              ),
            },
            {
              id: 'folder_id',
              header: 'Folder',
              sortKey: 'folder_id',
              width: 300,
              renderCell: (product) => <span className="text-sm text-[var(--color-muted-foreground)]">{folderSummary(product)}</span>,
            },
            {
              id: 'selling_price',
              header: 'Price',
              sortKey: 'selling_price',
              width: 100,
              align: 'right',
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
                      if (!canEditInventory) return
                      startEdit(product, 'selling_price')
                    }}
                    aria-disabled={isSaving || !canEditInventory}
                    title={!canEditInventory ? missingPermissionMessage('inventory.edit') : undefined}
                    className={cn(
                      'editable-cell',
                      isSaving || !canEditInventory ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
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
              renderCell: (product) => (
                <span
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
          rows={isLoading ? [] : products}
          getRowId={(product) => product.id}
          topRow={topRow}
          emptyState={
            isLoading
              ? 'Loading inventory data...'
              : <EmptyState title="No products found" description="Try adjusting filters or adding new items." />
          }
          minTableWidth={984}
          tableLayout="fixed"
          theadClassName={selectedRowIds.size > 0 ? 'table-header-selected' : undefined}
          sortField={sortField}
          sortDirection={sortDir}
          onSortChange={handleColumnSort}
          selection={{
            selectedRowIds,
            onToggleAll: toggleAll,
            onToggleRow: (product) => toggleSelection(product.id),
            isRowDisabled: isSaving || !canUseInventory,
            selectAllLabel: 'Select all visible products',
            getRowLabel: (product) => product.name,
            columnWidth: 44,
          }}
          onRowClick={(product) => {
            if (!canUseInventory) return
            toggleSelection(product.id)
          }}
          rowClassName={(product) => (
            selectedRowIds.has(product.id) ? 'bg-[var(--color-primary-light)]' : undefined
          )}
          pagination={{
            currentPage: page,
            totalItems: totalCount,
            itemsPerPage: pageSize,
            onPageChange: setPage,
            onItemsPerPageChange: setPageSize,
            pageSizeOptions: inventoryPageSizeOptions,
          }}
        />
    </div>
  )
}
