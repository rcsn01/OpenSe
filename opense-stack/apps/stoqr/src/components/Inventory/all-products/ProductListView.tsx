import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Heading, Label } from '@repo/ui'
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

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDir === 'asc'
      ? <ArrowUp size={12} style={{ marginLeft: 4, display: 'inline' }} />
      : <ArrowDown size={12} style={{ marginLeft: 4, display: 'inline' }} />
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
        <>
          <div className="table-wrap" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <table className="table" style={{ tableLayout: 'fixed', width: '100%', minWidth: 900 }}>
              <colgroup>
                <col style={{ width: 40 }} />
                <col />
                <col style={{ width: 140 }} />
                <col style={{ width: 110 }} />
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
                  <th className="sortable-th" onClick={() => handleColumnSort('name')}>
                    Name / SKU <SortIndicator field="name" />
                  </th>
                  <th className="sortable-th" onClick={() => handleColumnSort('folder_id')}>
                    Folder <SortIndicator field="folder_id" />
                  </th>
                  <th className="sortable-th" style={{ textAlign: 'right' }} onClick={() => handleColumnSort('selling_price')}>
                    Price <SortIndicator field="selling_price" />
                  </th>
                  <th className="sortable-th" style={{ textAlign: 'right' }} onClick={() => handleColumnSort('quantity_on_hand')}>
                    On Hand <SortIndicator field="quantity_on_hand" />
                  </th>
                  <th className="sortable-th" style={{ textAlign: 'right' }} onClick={() => handleColumnSort('quantity_on_hand')}>
                    Allocated <SortIndicator field="quantity_on_hand" />
                  </th>
                  <th className="sortable-th" style={{ textAlign: 'right' }} onClick={() => handleColumnSort('reorder_point')}>
                    Available <SortIndicator field="reorder_point" />
                  </th>
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
                          <span
                            className="block overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold leading-normal text-[var(--color-foreground)]"
                          >
                            {product.name}
                          </span>
                        </Link>
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
                      <td style={{ textAlign: 'right', fontWeight: 'var(--type-weight-semibold)', color: available >= product.reorder_point ? 'var(--success)' : 'var(--danger)' }}>
                        {available} / {product.reorder_point}
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
