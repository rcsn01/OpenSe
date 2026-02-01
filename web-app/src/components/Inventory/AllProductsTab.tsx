import { Link } from 'react-router-dom'
import type { Folder, Tag } from '../../types'
import { EmptyState } from '../EmptyState'
import { Pagination } from '../Pagination'
import { formatCurrency } from '../../utils'
import type { InventoryProduct, SortDirection, SortField } from './types'

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
  handleBulkDelete
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
}) => {
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name ?? '—'

  return (
    <div style={{ overflow: 'hidden' }}>
      <div className="flex-between" style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
        <div className="row">
          {selectedRowIds.size > 0 ? (
            <div className="row">
              <span className="pill" style={{ background: 'var(--primary)', color: 'white' }}>{selectedRowIds.size} selected</span>
              <button className="button ghost small" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleBulkDelete}>
                Delete Selection
              </button>
            </div>
          ) : (
            <span className="small muted font-semibold">
              {totalCount} products
            </span>
          )}
        </div>

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
      </div>

      {isLoading ? (
        <div className="empty-state" style={{ padding: 48 }}>Loading inventory data...</div>
      ) : products.length === 0 ? (
        <EmptyState title="No products found" description="Try adjusting filters or adding new items." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
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
                      <td style={{ textAlign: 'right' }}>{formatCurrency(product.selling_price)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>{product.quantity_on_hand}</td>
                      <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{allocated}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: available > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {available}
                      </td>
                      <td>
                        {isOut ? (
                          <span className="badge danger">Out</span>
                        ) : isLow ? (
                          <span className="badge warning">Low</span>
                        ) : (
                          <span className="badge success">OK</span>
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
  handleBulkDelete
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
}) => {
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
        <div className="flex-between wrap" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', gap: 16 }}>
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
        />
      </div>
    </div>
  )
}
