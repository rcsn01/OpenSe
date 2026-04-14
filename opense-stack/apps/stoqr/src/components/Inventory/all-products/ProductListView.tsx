import { Link } from 'react-router-dom'
import { DataTable, Heading, Label } from '@repo/ui'
import { EmptyState } from '../../EmptyState'
import { Pagination } from '../../Pagination'
import { Badge } from '../../Badge'
import { formatCurrency } from '../../../utils'
import { useInlineProductEdit } from './useInlineProductEdit'
import type { ProductListViewProps } from './types'
import type { SortField } from '../types'

export const ProductListView = ({
  companyId,
  view,
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
  onRefresh,
}: ProductListViewProps) => {
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name ?? '—'
  const { editingCell, editingValue, isSaving, setEditingValue, startEdit, commitEdit, cancelEdit } = useInlineProductEdit(companyId, onRefresh)

  const handleColumnSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  return (
    <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {isLoading ? (
        <div className="empty-state" style={{ padding: 48 }}>Loading inventory data...</div>
      ) : products.length === 0 ? (
        <EmptyState title="No products found" description="Try adjusting filters or adding new items." />
      ) : view === 'grid' ? (
        <>
          <div style={{ padding: 20, overflowY: 'auto', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {products.map((product) => {
                const isLow = product.quantity_on_hand <= product.reorder_point
                const isOut = product.quantity_on_hand === 0

                return (
                  <div
                    key={product.id}
                    className="card"
                    style={{
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      border: selectedRowIds.has(product.id) ? '1px solid var(--primary)' : undefined,
                      background: selectedRowIds.has(product.id) ? 'var(--primary-soft)' : undefined,
                    }}
                  >
                    <div className="flex-between" style={{ alignItems: 'flex-start', gap: 12 }}>
                      <input
                        type="checkbox"
                        checked={selectedRowIds.has(product.id)}
                        disabled={isSaving}
                        onChange={() => toggleSelection(product.id)}
                      />
                      {isOut ? (
                        <Badge label="Out of Stock" variant="danger" />
                      ) : isLow ? (
                        <Badge label="Low Stock" variant="warning" />
                      ) : (
                        <Badge label="In Stock" variant="success" />
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <Link to={`/inventory/${product.id}/overview`} style={{ display: 'block', minWidth: 0 }}>
                        <Heading level="h6" style={{ margin: 0, lineHeight: 1.2 }}>
                          {product.name}
                        </Heading>
                      </Link>
                      <Label className="block">{product.sku}</Label>
                    </div>

                    <div className="stack" style={{ gap: 8 }}>
                      <div className="flex-between small">
                        <span className="muted">Folder</span>
                        <span>{folderName(product.folder_id)}</span>
                      </div>
                      <div className="flex-between small">
                        <span className="muted">Price</span>
                        <span>{formatCurrency(product.selling_price)}</span>
                      </div>
                      <div className="flex-between small">
                        <span className="muted">On Hand</span>
                        <span>{product.quantity_on_hand}</span>
                      </div>
                      <div className="flex-between small">
                        <span className="muted">Available</span>
                        <span style={{ fontWeight: 600, color: product.quantity_on_hand >= product.reorder_point ? 'var(--success)' : 'var(--danger)' }}>
                          {product.quantity_on_hand} / {product.reorder_point}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ padding: '0 20px 16px' }}>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={totalCount}
              onPageChange={setPage}
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
              renderCell: (product) => (
                <Link
                  to={`/inventory/${product.id}/overview`}
                  style={{ display: 'block', minWidth: 0 }}
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
              width: 140,
              renderCell: (product) => <span className="muted small">{folderName(product.folder_id)}</span>,
            },
            {
              id: 'selling_price',
              header: 'Price',
              sortKey: 'selling_price',
              width: 110,
              align: 'right',
              renderCell: (product) => {
                const isEditingPrice = editingCell?.id === product.id && editingCell.field === 'selling_price'

                return isEditingPrice ? (
                  <input
                    className="input small"
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
                    style={{ width: 120, textAlign: 'right' }}
                  />
                ) : (
                  <span
                    className="editable-cell"
                    onClick={(event) => {
                      event.stopPropagation()
                      startEdit(product, 'selling_price')
                    }}
                    aria-disabled={isSaving}
                    style={{ cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}
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
              width: 120,
              align: 'right',
              renderCell: (product) => (
                <span
                  style={{
                    fontWeight: 'var(--type-weight-semibold)',
                    color: product.quantity_on_hand >= product.reorder_point ? 'var(--success)' : 'var(--danger)',
                  }}
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
          onRowClick={(product) => toggleSelection(product.id)}
          rowClassName={(product) => selectedRowIds.has(product.id) ? 'row-selected' : undefined}
          getRowStyle={(product) => ({ background: selectedRowIds.has(product.id) ? 'var(--primary-soft)' : undefined })}
          footerClassName="border-t-0 px-5 pb-4 pt-0"
          pagination={{
            currentPage: page,
            totalItems: totalCount,
            itemsPerPage: pageSize,
            onPageChange: setPage,
          }}
        />
      )}
    </div>
  )
}
