import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Folder, Tag } from '../../types'
import { EmptyState } from '../EmptyState'
import { Pagination } from '../Pagination'
import { Badge } from '../Badge'
import { formatCurrency, toNumber } from '../../utils'
import type { InventoryProduct, SortDirection, SortField } from './types'
import { supabase } from '../../supabaseClient'
import { toast } from 'sonner'

const ProductListView = ({ 
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
  onRefresh
}: {
  products: InventoryProduct[]
  isLoading: boolean
  selectedRowIds: Set<string>
  toggleSelection: (id: string) => void
  toggleAll: () => void
  sortField: SortField
  setSortField: (value: SortField) => void
  sortDir: SortDirection
  setSortDir: (value: SortDirection) => void
  page: number
  pageSize: number
  totalCount: number
  setPage: (page: number) => void
  folders: Folder[]
  handleBulkDelete: () => void
  onRefresh: () => void
}) => {
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name ?? '—'
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'quantity_on_hand' | 'selling_price' } | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const startEdit = (product: InventoryProduct, field: 'quantity_on_hand' | 'selling_price') => {
    setEditingCell({ id: product.id, field })
    setEditingValue(String(product[field] ?? ''))
  }

  const commitEdit = async () => {
    if (!editingCell) return
    const value = toNumber(editingValue)
    setIsSaving(true)

    const updates = { [editingCell.field]: value }
    const { error } = await supabase.from('products').update(updates).eq('id', editingCell.id)

    if (error) {
      toast.error(`Update failed: ${error.message}`)
    } else {
      toast.success('Inventory updated')
      onRefresh()
    }
    setIsSaving(false)
    setEditingCell(null)
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditingValue('')
  }

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
              onChange={(e) => setSortField(e.target.value as SortField)}
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
            <table className="table">
              <thead className={selectedRowIds.size > 0 ? 'table-header-selected' : undefined}>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={products.length > 0 && selectedRowIds.size === products.length}
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
                          onChange={() => toggleSelection(product.id)}
                        />
                      </td>
                      <td>
                        <Link to={`/inventory/${product.id}`} style={{ fontWeight: 600, display: 'block' }}>
                          {product.name}
                        </Link>
                        <span className="muted small">{product.sku}</span>
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
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit()
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            style={{ width: 120, textAlign: 'right' }}
                          />
                        ) : (
                          <span className="editable-cell" onClick={() => startEdit(product, 'selling_price')}>
                            {formatCurrency(product.selling_price)}
                            <span className="edit-icon">✎</span>
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>
                        {isEditingQty ? (
                          <input
                            className="input small"
                            autoFocus
                            type="number"
                            step="1"
                            value={editingValue}
                            disabled={isSaving}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit()
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            style={{ width: 100, textAlign: 'right' }}
                          />
                        ) : (
                          <span className="editable-cell" onClick={() => startEdit(product, 'quantity_on_hand')}>
                            {product.quantity_on_hand}
                            <span className="edit-icon">✎</span>
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{allocated}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: available > 0 ? 'var(--success)' : 'var(--danger)' }}>
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

export const AllProductsTab = ({
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
  onRefresh
}: {
  stats: { totalItems: number; lowStockItems: number; totalValue: number }
  search: string
  setSearch: (value: string) => void
  stockFilter: 'all' | 'low' | 'out'
  setStockFilter: (value: 'all' | 'low' | 'out') => void
  selectedTag: string | null
  setSelectedTag: (value: string | null) => void
  tags: Tag[]
  onImportOpen: () => void
  onCreateOpen: () => void
  products: InventoryProduct[]
  isLoading: boolean
  selectedRowIds: Set<string>
  toggleSelection: (id: string) => void
  toggleAll: () => void
  sortField: SortField
  setSortField: (value: SortField) => void
  sortDir: SortDirection
  setSortDir: (value: SortDirection) => void
  page: number
  pageSize: number
  totalCount: number
  setPage: (page: number) => void
  folders: Folder[]
  handleBulkDelete: () => void
  onRefresh: () => void
}) => {
  const isSelectionMode = selectedRowIds.size > 0

  return (
    <div className="stack">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
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
        <div className="flex-between wrap" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', gap: 16, background: isSelectionMode ? 'rgba(59, 130, 246, 0.08)' : '#fff' }}>
          {isSelectionMode ? (
            <div className="flex-between" style={{ width: '100%' }}>
              <span className="pill" style={{ background: 'var(--primary)', color: 'white' }}>
                {selectedRowIds.size} items selected
              </span>
              <div className="row">
                <button className="button ghost small" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleBulkDelete}>
                  Bulk Delete
                </button>
                <button className="button ghost small" type="button">Move to Folder</button>
                <button className="button ghost small" type="button">Print Labels</button>
                <button className="button ghost small" type="button">Export Selected</button>
              </div>
            </div>
          ) : (
            <>
              <div className="row wrap" style={{ flex: 1 }}>
                <input 
                  className="input" 
                  placeholder="Search products..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  style={{ width: 220 }}
                />
                <select 
                  className="select" 
                  value={stockFilter} 
                  onChange={(e) => setStockFilter(e.target.value as 'all' | 'low' | 'out')}
                  style={{ width: 160 }}
                >
                  <option value="all">All Statuses</option>
                  <option value="low">Low Stock</option>
                  <option value="out">Out of Stock</option>
                </select>
                <select 
                  className="select" 
                  value={selectedTag ?? ''} 
                  onChange={(e) => setSelectedTag(e.target.value || null)}
                  style={{ width: 160 }}
                >
                  <option value="">All Tags</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </div>

              <div className="row">
                <button className="button secondary" onClick={onImportOpen}>Import CSV</button>
                <button className="button" onClick={onCreateOpen}>Create Product</button>
              </div>
            </>
          )}
        </div>

        <ProductListView 
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
