import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import type { Folder, Tag } from '../types'
import { EmptyState } from '../components/EmptyState'
import { Pagination } from '../components/Pagination'
import { InventoryStats } from '../components/InventoryStats'
import { Tabs } from '../components/Tabs'
import { parseCsv, toNumber, formatCurrency } from '../utils'

// --- Types ---

type InventoryProduct = {
  id: string
  name: string
  sku: string
  quantity_on_hand: number
  reorder_point: number
  folder_id: string | null
  cost_price: number | null
  selling_price: number | null
  category: string | null
}

type SortField = 'name' | 'sku' | 'quantity_on_hand' | 'selling_price'
type SortDirection = 'asc' | 'desc'

// --- Sub-Components ---

const CreateProductModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  companyId 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void; 
  companyId: string 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    quantity_on_hand: 0,
    cost_price: 0,
    selling_price: 0
  })
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('products').insert({
      company_id: companyId,
      ...formData
    })
    setLoading(false)
    if (!error) {
      onSuccess()
      onClose()
      setFormData({ name: '', sku: '', quantity_on_hand: 0, cost_price: 0, selling_price: 0 })
    } else {
      alert(error.message)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3 className="section-title">Create Product</h3>
        <form className="stack" onSubmit={handleSubmit}>
          <div className="grid grid-2">
            <label className="stack">
              Name
              <input className="input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </label>
            <label className="stack">
              SKU
              <input className="input" required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
            </label>
          </div>
          <div className="grid grid-3">
             <label className="stack">
              Initial Stock
              <input type="number" className="input" value={formData.quantity_on_hand} onChange={e => setFormData({...formData, quantity_on_hand: toNumber(e.target.value)})} />
            </label>
            <label className="stack">
              Cost
              <input type="number" className="input" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: toNumber(e.target.value)})} />
            </label>
            <label className="stack">
              Price
              <input type="number" className="input" value={formData.selling_price} onChange={e => setFormData({...formData, selling_price: toNumber(e.target.value)})} />
            </label>
          </div>
          <div className="row" style={{justifyContent: 'flex-end'}}>
            <button type="button" className="button ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="button" disabled={loading}>{loading ? 'Saving...' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

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
}: any) => {
  const folderName = (id: string | null) => folders.find((f: any) => f.id === id)?.name ?? '—'

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="flex-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="row">
            <h3 className="section-title" style={{ margin: 0 }}>All Products</h3>
            {selectedRowIds.size > 0 && (
              <div className="row" style={{ marginLeft: 16 }}>
                <span className="pill">{selectedRowIds.size} selected</span>
                <button className="button ghost small" style={{ color: 'var(--danger)' }} onClick={handleBulkDelete}>Delete</button>
              </div>
            )}
          </div>
          <div className="row">
            <span className="small muted">Sort by:</span>
            <select 
            className="select small" 
            style={{ width: 140 }}
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
            onClick={() => setSortDir((prev: any) => prev === 'asc' ? 'desc' : 'asc')}
            title="Toggle Direction"
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
          <table className="table">
            <thead style={{ background: '#f8fafc' }}>
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
              {products.map((product: any) => {
                const isLow = product.quantity_on_hand <= product.reorder_point
                const isOut = product.quantity_on_hand === 0
                // Mock allocated for now until Order module exists
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

const VariantsView = ({ products }: { products: InventoryProduct[] }) => {
  // Simulate grouping by splitting name
  const matrices = useMemo(() => {
    const groups: Record<string, InventoryProduct[]> = {}
    products.forEach(p => {
      // Very naive grouping logic for demo: Group by first word
      const key = p.name.split(' ')[0]
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    })
    return groups
  }, [products])

  return (
    <div className="stack">
      <div className="card">
        <div className="flex-between">
            <div>
              <h3 className="section-title">Product Matrices</h3>
              <p className="muted small">Manage variants like Size and Color (Simulated View)</p>
            </div>
            <button className="button secondary">Create Matrix</button>
        </div>
      </div>
      
      <div className="grid grid-2">
        {Object.entries(matrices).slice(0, 6).map(([key, items]) => (
          <div key={key} className="card stack">
             <div className="flex-between">
                <h4 style={{ margin: 0 }}>{key} Family</h4>
                <span className="pill">{items.length} variants</span>
             </div>
             <div className="list">
                {items.map(p => (
                  <div key={p.id} className="flex-between small">
                    <span>{p.name}</span>
                    <span className="muted">{p.quantity_on_hand} units</span>
                  </div>
                ))}
             </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const StockTransferView = ({ products }: { products: InventoryProduct[] }) => {
  return (
    <div className="grid grid-2">
      <div className="card stack">
         <h3 className="section-title">New Transfer</h3>
         <div className="grid grid-2">
            <label className="stack">
               Source Location
               <select className="select">
                 <option>Main Warehouse</option>
                 <option>Retail Store A</option>
                 <option>Returns Bin</option>
               </select>
            </label>
            <label className="stack">
               Destination
               <select className="select">
                 <option>Retail Store A</option>
                 <option>Main Warehouse</option>
               </select>
            </label>
         </div>
         <label className="stack">
            Product
            <select className="select">
               <option value="">Select product...</option>
               {products.map(p => (
                 <option key={p.id} value={p.id}>{p.name} ({p.quantity_on_hand})</option>
               ))}
            </select>
         </label>
         <label className="stack">
            Quantity
            <input type="number" className="input" defaultValue={1} />
         </label>
         <button className="button" disabled>Initiate Transfer (Coming Soon)</button>
         <p className="small muted">
           Note: Multi-location support is currently in development. This action will log a movement transaction.
         </p>
      </div>
      <div className="card">
        <h3 className="section-title">Recent Transfers</h3>
        <EmptyState title="No recent transfers" description="Internal stock movements will appear here." />
      </div>
    </div>
  )
}

const KittingView = ({ products }: { products: InventoryProduct[] }) => {
  return (
    <div className="grid grid-2">
      <div className="card stack">
        <h3 className="section-title">Create Bundle</h3>
        <label className="stack">
           Bundle Name
           <input className="input" placeholder="e.g. Summer Gift Pack" />
        </label>
        <label className="stack">
           Bundle SKU
           <input className="input" placeholder="e.g. BDL-SUMMER-01" />
        </label>
        
        <div className="stack" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
           <h4 className="section-title">Components</h4>
           <div className="row">
              <select className="select">
                 <option>Add component...</option>
                 {products.map(p => <option key={p.id}>{p.name}</option>)}
              </select>
              <input type="number" className="input" placeholder="Qty" style={{ width: 80 }} />
              <button className="button secondary">Add</button>
           </div>
        </div>

        <button className="button" style={{ marginTop: 16 }} disabled>Save Bundle (Coming Soon)</button>
      </div>
      <div className="card">
         <h3 className="section-title">Active Bundles</h3>
         <EmptyState title="No active bundles" description="Define virtual SKUs composed of other products." />
      </div>
    </div>
  )
}

// --- Main Page Component ---

export const InventoryList = () => {
  const { companyId } = useCompany()
  
  // Data State
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [stats, setStats] = useState({ totalItems: 0, lowStockItems: 0, totalValue: 0 })
  
  // UI State
  const [isLoading, setIsLoading] = useState(true)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importRows, setImportRows] = useState<Record<string, string>[]>([])
  const [importMessage, setImportMessage] = useState<string | null>(null)
  
  // Filters & Controls
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all')
  
  // Pagination & Sorting
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  
  // Selection
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())

  // --- Data Loading ---

  const loadFilters = async () => {
    if (!companyId) return
    const [{ data: folderData }, { data: tagData }] = await Promise.all([
      supabase.from('folders').select('id, name, parent_id').eq('company_id', companyId),
      supabase.from('tags').select('id, name, color').eq('company_id', companyId),
    ])
    setFolders((folderData as Folder[]) ?? [])
    setTags((tagData as Tag[]) ?? [])
  }

  const loadStats = async () => {
    if (!companyId) return
    setIsStatsLoading(true)
    const { data } = await supabase
      .from('products')
      .select('quantity_on_hand, cost_price, reorder_point')
      .eq('company_id', companyId)

    if (data) {
      const all = data as any[]
      const value = all.reduce((sum, p) => sum + (toNumber(p.quantity_on_hand) * toNumber(p.cost_price)), 0)
      const low = all.filter(p => p.quantity_on_hand <= p.reorder_point).length
      setStats({ totalItems: all.length, lowStockItems: low, totalValue: value })
    }
    setIsStatsLoading(false)
  }

  const loadProducts = async () => {
    if (!companyId) return
    setIsLoading(true)
    
    let query = supabase
      .from('products')
      .select('id, name, sku, quantity_on_hand, reorder_point, folder_id, cost_price, selling_price, category', { count: 'exact' })
      .eq('company_id', companyId)

    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
    }
    if (stockFilter === 'out') query = query.eq('quantity_on_hand', 0)
    
    query = query.order(sortField, { ascending: sortDir === 'asc' })
    
    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, count, error } = await query
    
    if (error) {
      console.error(error)
      setProducts([])
      setTotalCount(0)
    } else {
      let filteredData = (data as InventoryProduct[]) ?? []
      if (stockFilter === 'low') {
        filteredData = filteredData.filter(p => p.quantity_on_hand <= p.reorder_point)
      }
      setProducts(filteredData)
      setTotalCount(count ?? 0)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadFilters()
    loadStats()
  }, [companyId])

  useEffect(() => {
    loadProducts()
  }, [companyId, selectedFolder, search, stockFilter, page, sortField, sortDir])

  const toggleSelection = (id: string) => {
    const next = new Set(selectedRowIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedRowIds(next)
  }

  const toggleAll = () => {
    if (selectedRowIds.size === products.length) {
      setSelectedRowIds(new Set())
    } else {
      setSelectedRowIds(new Set(products.map(p => p.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedRowIds.size} items?`)) return
    const { error } = await supabase.from('products').delete().in('id', Array.from(selectedRowIds))
    if (!error) {
      setSelectedRowIds(new Set())
      loadProducts()
      loadStats()
    }
  }
  
  const handleImportFile = async (file: File) => {
    const content = await file.text()
    const { rows } = parseCsv(content)
    setImportRows(rows)
    setImportMessage(rows.length ? null : 'No rows found in CSV.')
  }

  const handleImport = async () => {
    if (!companyId || importRows.length === 0) return
    const prepared = importRows.map((row) => ({
      company_id: companyId,
      name: row.name || row.Name,
      sku: row.sku || row.SKU,
      quantity_on_hand: toNumber(row.quantity_on_hand || row.qty || row.quantity),
      reorder_point: toNumber(row.reorder_point, 10),
      cost_price: toNumber(row.cost_price, 0),
      selling_price: toNumber(row.selling_price, 0),
    })).filter(p => p.name && p.sku)

    const { error } = await supabase.from('products').insert(prepared)
    if (error) {
      setImportMessage(error.message)
    } else {
      setImportMessage(`Imported ${prepared.length} products.`)
      setImportRows([])
      setIsImportOpen(false)
      loadProducts()
      loadStats()
    }
  }

  if (!companyId) return <EmptyState title="No company selected" description="Select a company to manage inventory." />

  return (
    <div className="grid" style={{ gridTemplateColumns: '260px 1fr', gap: 24 }}>
      
      {/* --- Sidebar Filters --- */}
      <div className="stack">
        <div className="card stack">
          <h3 className="section-title">Filters</h3>
          <div className="stack" style={{ gap: 8 }}>
            <label className="small muted">Search</label>
            <input className="input" placeholder="Name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <label className="small muted">Stock Status</label>
            <select className="select" value={stockFilter} onChange={(e) => setStockFilter(e.target.value as any)}>
              <option value="all">All Statuses</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
          <div className="stack" style={{ gap: 8 }}>
             <label className="small muted">Tags</label>
             <div className="row wrap">
               {tags.map(tag => (
                  <button
                    key={tag.id}
                    className={`tag ${selectedTag === tag.id ? 'active' : ''}`}
                    style={{ borderColor: tag.color, color: selectedTag === tag.id ? 'var(--primary)' : tag.color, cursor: 'pointer' }}
                    onClick={() => setSelectedTag(selectedTag === tag.id ? null : tag.id)}
                  >
                    {tag.name}
                  </button>
               ))}
               {tags.length === 0 && <span className="small muted">No tags created</span>}
             </div>
          </div>
        </div>

        <div className="card stack">
           <h3 className="section-title">Actions</h3>
           <button className="button" onClick={() => setIsCreateOpen(true)}>Create Product</button>
           <button className="button secondary" onClick={() => setIsImportOpen(true)}>Import CSV</button>
        </div>
      </div>

      {/* --- Main Content --- */}
      <div className="stack">
        <InventoryStats totalItems={stats.totalItems} lowStockItems={stats.lowStockItems} totalValue={stats.totalValue} isLoading={isStatsLoading} />

        <Tabs 
          tabs={[
            { 
              id: 'all', 
              label: 'All Products', 
              content: (
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
              )
            },
            {
              id: 'matrix',
              label: 'Variants & Matrices',
              content: <VariantsView products={products} />
            },
            {
              id: 'transfer',
              label: 'Stock Transfers',
              content: <StockTransferView products={products} />
            },
            {
              id: 'bundles',
              label: 'Kitting & Bundles',
              content: <KittingView products={products} />
            }
          ]}
        />
      </div>

      <CreateProductModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={() => { loadProducts(); loadStats(); }} 
        companyId={companyId} 
      />

      {/* Import Modal */}
      {isImportOpen && (
        <div className="modal-backdrop" role="dialog">
          <div className="modal">
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <h3 className="section-title">Import Inventory (CSV)</h3>
              <button className="button ghost" onClick={() => setIsImportOpen(false)}>Close</button>
            </div>
            <div className="stack">
              <input className="input" type="file" accept=".csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleImportFile(file) }} />
              {importRows.length > 0 && <div className="card" style={{ boxShadow: 'none', background: '#f8fafc' }}><div className="flex-between"><h4 style={{ margin: 0 }}>Preview</h4><span className="small muted">{importRows.length} rows</span></div></div>}
              {importMessage && <div className="pill">{importMessage}</div>}
              <div className="flex-between">
                <span className="small muted">Required: Name, SKU, Qty</span>
                <button className="button" type="button" onClick={handleImport} disabled={importRows.length === 0}>Confirm Import</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}