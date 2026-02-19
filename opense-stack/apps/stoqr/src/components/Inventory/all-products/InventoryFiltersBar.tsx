import type { InventoryFiltersBarProps } from './types'

export const InventoryFiltersBar = ({
  isSelectionMode,
  selectedRowIds,
  search,
  setSearch,
  stockFilter,
  setStockFilter,
  selectedTag,
  setSelectedTag,
  tags,
  onImportOpen,
  onCreateOpen,
  handleBulkDelete,
}: InventoryFiltersBarProps) => {
  return (
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
  )
}
