import { Link } from 'react-router-dom'
import { EmptyState } from '../../EmptyState'
import { Pagination } from '../../Pagination'
import { Badge } from '../../Badge'
import { formatCurrency } from '../../../utils'
import { useInlineProductEdit } from './useInlineProductEdit'
import type { ProductListViewProps } from './types'

type Column = { field: string; label: string; sortable: boolean; align?: 'left' | 'right' | 'center' }

const columns: Column[] = [
  { field: 'name', label: 'Product', sortable: true },
  { field: 'folder', label: 'Folder', sortable: false },
  { field: 'selling_price', label: 'Price', sortable: true, align: 'right' },
  { field: 'quantity_on_hand', label: 'On Hand', sortable: true, align: 'right' },
  { field: 'allocated', label: 'Allocated', sortable: false, align: 'right' },
  { field: 'available', label: 'Available', sortable: false, align: 'right' },
  { field: 'status', label: 'Status', sortable: false },
]

export const ProductListView = ({
  companyId,
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

  const handleSort = (field: string) => {
    const validSortFields = ['name', 'sku', 'quantity_on_hand', 'selling_price']
    if (!validSortFields.includes(field)) return
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field as typeof sortField)
      setSortDir('asc')
    }
  }

  const startRow = (page - 1) * pageSize + 1
  const endRow = Math.min(page * pageSize, totalCount)

  if (isLoading) {
    return <div className="empty-state" style={{ padding: 64 }}>Loading inventory...</div>
  }

  if (products.length === 0) {
    return <EmptyState title="No products found" description="Try adjusting filters or adding new items." />
  }

  return (
    <>
      <div className="table-info-bar">
        <span>Showing {startRow}–{endRow} of {totalCount} products</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ minWidth: 800 }}>
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={products.length > 0 && selectedRowIds.size === products.length}
                  disabled={isSaving}
                  onChange={toggleAll}
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.field}
                  className={col.sortable ? `sortable${sortField === col.field ? ' active' : ''}` : undefined}
                  style={{ textAlign: col.align ?? 'left' }}
                  onClick={col.sortable ? () => handleSort(col.field) : undefined}
                >
                  {col.label}
                  {col.sortable && sortField === col.field && (
                    <span style={{ marginLeft: 4, fontSize: 10 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const isLow = product.quantity_on_hand > 0 && product.quantity_on_hand <= product.reorder_point
              const isOut = product.quantity_on_hand === 0
              const allocated = 0
              const available = product.quantity_on_hand - allocated
              const isEditingQty = editingCell?.id === product.id && editingCell.field === 'quantity_on_hand'
              const isEditingPrice = editingCell?.id === product.id && editingCell.field === 'selling_price'

              return (
                <tr key={product.id} className={selectedRowIds.has(product.id) ? 'row-selected' : undefined}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedRowIds.has(product.id)}
                      disabled={isSaving}
                      onChange={() => toggleSelection(product.id)}
                    />
                  </td>
                  <td>
                    <Link to={`/inventory/${product.id}/overview`} style={{ fontWeight: 600, display: 'block', color: 'var(--text)' }}>
                      {product.name}
                    </Link>
                    <span className="muted" style={{ fontSize: 12 }}>{product.sku}</span>
                  </td>
                  <td className="muted" style={{ fontSize: 13 }}>{folderName(product.folder_id)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {isEditingPrice ? (
                      <input
                        className="input small"
                        autoFocus
                        type="number"
                        step="0.01"
                        value={editingValue}
                        disabled={isSaving}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => { void commitEdit() }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); void commitEdit() }
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        style={{ width: 100, textAlign: 'right' }}
                      />
                    ) : (
                      <span
                        className="editable-cell"
                        onClick={() => startEdit(product, 'selling_price')}
                        aria-disabled={isSaving}
                        style={{ cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}
                      >
                        {formatCurrency(product.selling_price)}
                        <span className="edit-icon">✎</span>
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {isEditingQty ? (
                      <input
                        className="input small"
                        autoFocus
                        type="number"
                        step="1"
                        value={editingValue}
                        disabled={isSaving}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => { void commitEdit() }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); void commitEdit() }
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        style={{ width: 80, textAlign: 'right' }}
                      />
                    ) : (
                      <span
                        className="editable-cell"
                        onClick={() => startEdit(product, 'quantity_on_hand')}
                        aria-disabled={isSaving}
                        style={{ cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, fontWeight: 500 }}
                      >
                        {product.quantity_on_hand}
                        <span className="edit-icon">✎</span>
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{allocated}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: available > 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {available}
                  </td>
                  <td>
                    {isOut ? (
                      <Badge label="Out of Stock" variant="danger" />
                    ) : isLow ? (
                      <Badge label="Low Stock" variant="warning" />
                    ) : (
                      <Badge label="In Stock" variant="success" />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={totalCount}
          onPageChange={setPage}
        />
      </div>
    </>
  )
}
