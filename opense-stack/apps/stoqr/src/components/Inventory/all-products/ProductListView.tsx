import { Link } from 'react-router-dom'
import { Heading, Label } from '@repo/ui'
import { EmptyState } from '../../EmptyState'
import { Pagination } from '../../Pagination'
import { Badge } from '../../Badge'
import { formatCurrency } from '../../../utils'
import { useInlineProductEdit } from './useInlineProductEdit'
import type { ProductListViewProps } from './types'

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
  handleBulkDelete,
  onRefresh,
}: ProductListViewProps) => {
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name ?? '—'
  const { editingCell, editingValue, isSaving, setEditingValue, startEdit, commitEdit, cancelEdit } = useInlineProductEdit(companyId, onRefresh)

  return (
    <div style={{ overflow: 'hidden' }}>
      <div
        className={`flex-between ${selectedRowIds.size > 0 ? 'action-bar' : ''}`}
        style={{ padding: '12px 20px', background: selectedRowIds.size > 0 ? 'rgba(59, 130, 246, 0.08)' : '#f8fafc', borderBottom: '1px solid var(--border)' }}
      >
        <div className="row">
          {selectedRowIds.size > 0 ? (
            <div className="row">
              <span className="pill" style={{ background: 'var(--primary)', color: 'white' }}>{selectedRowIds.size} items selected</span>
            </div>
          ) : (
            <span className="small muted font-semibold">
              {totalCount} products
            </span>
          )}
        </div>

        {selectedRowIds.size > 0 ? (
          <div className="row">
            <button className="button ghost small" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleBulkDelete}>
              Bulk Delete
            </button>
            <button className="button ghost small" type="button">Move to Folder</button>
            <button className="button ghost small" type="button">Print Labels</button>
            <button className="button ghost small" type="button">Export Selected</button>
          </div>
        ) : (
          <div className="row">
            <span className="small muted">Sort by:</span>
            <select
              className="select small"
              style={{ width: 140, padding: '4px 8px', height: 32 }}
              value={sortField}
              onChange={(e) => setSortField(e.target.value as typeof sortField)}
            >
              <option value="name">Name</option>
              <option value="quantity_on_hand">Stock Level</option>
              <option value="sku">SKU</option>
              <option value="selling_price">Price</option>
            </select>
            <button
              className="button ghost small"
              onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
              title="Toggle Direction"
              style={{ height: 32, width: 32, padding: 0, display: 'grid', placeItems: 'center' }}
            >
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="empty-state" style={{ padding: 48 }}>Loading inventory data...</div>
      ) : products.length === 0 ? (
        <EmptyState title="No products found" description="Try adjusting filters or adding new items." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table" style={{ tableLayout: 'fixed', width: '100%', minWidth: 900 }}>
              <colgroup>
                <col style={{ width: 40 }} />
                <col />
                <col style={{ width: 140 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 120 }} />
              </colgroup>
              <thead className={selectedRowIds.size > 0 ? 'table-header-selected' : undefined}>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={products.length > 0 && selectedRowIds.size === products.length}
                      disabled={isSaving}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>Name / SKU</th>
                  <th>Folder</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                  <th style={{ textAlign: 'right' }}>On Hand</th>
                  <th style={{ textAlign: 'right' }}>Allocated</th>
                  <th style={{ textAlign: 'right' }}>Available</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const isLow = product.quantity_on_hand <= product.reorder_point
                  const isOut = product.quantity_on_hand === 0
                  const allocated = 0
                  const available = product.quantity_on_hand - allocated
                  const isEditingQty = editingCell?.id === product.id && editingCell.field === 'quantity_on_hand'
                  const isEditingPrice = editingCell?.id === product.id && editingCell.field === 'selling_price'

                  return (
                    <tr key={product.id} style={{ background: selectedRowIds.has(product.id) ? 'var(--primary-soft)' : undefined }}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedRowIds.has(product.id)}
                          disabled={isSaving}
                          onChange={() => toggleSelection(product.id)}
                        />
                      </td>
                      <td>
                        <Link to={`/inventory/${product.id}/overview`} style={{ display: 'block', minWidth: 0 }}>
                          <Heading level="h6" style={{ margin: 0, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.name}
                          </Heading>
                        </Link>
                        <Label className="block">{product.sku}</Label>
                      </td>
                      <td className="muted small">{folderName(product.folder_id)}</td>
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
                            onBlur={() => {
                              void commitEdit()
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                void commitEdit()
                              }
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            style={{ width: 120, textAlign: 'right' }}
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
                      <td style={{ textAlign: 'right', fontWeight: 'var(--type-weight-medium)' }}>
                        {isEditingQty ? (
                          <input
                            className="input small"
                            autoFocus
                            type="number"
                            step="1"
                            value={editingValue}
                            disabled={isSaving}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              void commitEdit()
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                void commitEdit()
                              }
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            style={{ width: 100, textAlign: 'right' }}
                          />
                        ) : (
                          <span
                            className="editable-cell"
                            onClick={() => startEdit(product, 'quantity_on_hand')}
                            aria-disabled={isSaving}
                            style={{ cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}
                          >
                            {product.quantity_on_hand}
                            <span className="edit-icon">✎</span>
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{allocated}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'var(--type-weight-semibold)', color: available > 0 ? 'var(--success)' : 'var(--danger)' }}>
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

          <div style={{ padding: '0 20px 16px' }}>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={totalCount}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  )
}
