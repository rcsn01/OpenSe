import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { db } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import type { Folder, Tag } from '../types'
import { Tabs } from '../components/Tabs'
import { parseCsv, toNumber } from '../utils'
import { AllProductsTab } from '../components/Inventory/AllProductsTab'
import { BundlesTab } from '../components/Inventory/BundlesTab'
import { FoldersTab } from '../components/Inventory/FoldersTab'
import { TransferTab } from '../components/Inventory/TransferTab'
import { VariantsTab } from '../components/Inventory/VariantsTab'
import type { InventoryProduct, SortDirection, SortField } from '../components/Inventory/types'

export const InventoryListPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate() // Hook
  const [searchParams] = useSearchParams()

  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [stats, setStats] = useState({ totalItems: 0, lowStockItems: 0, totalValue: 0 })

  const [isLoading, setIsLoading] = useState(true)
  // Removed isCreateOpen state
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importRows, setImportRows] = useState<Record<string, string>[]>([])
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all')

  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')

  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())

  const loadFilters = async () => {
    if (!companyId) return
    const [{ data: folderData }, { data: tagData }] = await Promise.all([
      db.from('folders').select('id, name, parent_id').eq('company_id', companyId),
      db.from('tags').select('id, name, color').eq('company_id', companyId),
    ])
    setFolders((folderData as Folder[]) ?? [])
    setTags((tagData as Tag[]) ?? [])
  }

  const loadStats = async () => {
    if (!companyId) return
    const { data } = await supabase
      .from('products')
      .select('quantity_on_hand, cost_price, reorder_point')
      .eq('company_id', companyId)

    if (data) {
      const all = data as any[]
      const value = all.reduce((sum, p) => sum + (toNumber(p.quantity_on_hand) * toNumber(p.cost_price)), 0)
      const low = all.filter((p) => p.quantity_on_hand <= p.reorder_point).length
      setStats({ totalItems: all.length, lowStockItems: low, totalValue: value })
    }
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
        filteredData = filteredData.filter((p) => p.quantity_on_hand <= p.reorder_point)
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
    const stockParam = searchParams.get('stock')
    if (stockParam === 'low' || stockParam === 'out' || stockParam === 'all') {
      setStockFilter(stockParam)
    }
  }, [searchParams])

  useEffect(() => {
    loadProducts()
  }, [companyId, search, stockFilter, page, sortField, sortDir])

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
      setSelectedRowIds(new Set(products.map((p) => p.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedRowIds.size} items?`)) return
    const { error } = await db.from('products').delete().in('id', Array.from(selectedRowIds))
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
    const prepared = importRows
      .map((row) => ({
        company_id: companyId,
        name: row.name || row.Name,
        sku: row.sku || row.SKU,
        quantity_on_hand: toNumber(row.quantity_on_hand || row.qty || row.quantity),
        reorder_point: toNumber(row.reorder_point, 10),
        cost_price: toNumber(row.cost_price, 0),
        selling_price: toNumber(row.selling_price, 0),
      }))
      .filter((p) => p.name && p.sku)

    const { error } = await db.from('products').insert(prepared)
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

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading}
      emptyStateTitle="No company selected"
      emptyStateDescription="Select a company to manage inventory."
    >
      <Tabs
        tabs={[
          {
            id: 'all',
            label: 'All Products',
            content: (
              <AllProductsTab
                stats={stats}
                search={search}
                setSearch={setSearch}
                stockFilter={stockFilter}
                setStockFilter={setStockFilter}
                selectedTag={selectedTag}
                setSelectedTag={setSelectedTag}
                tags={tags}
                onImportOpen={() => setIsImportOpen(true)}
                onCreateOpen={() => navigate('/inventory/new')} // Changed handler
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
                onRefresh={() => {
                  loadProducts()
                  loadStats()
                }}
              />
            ),
          },
          {
            id: 'folders',
            label: 'Folders',
            content: <FoldersTab companyId={companyId!} allFolders={folders} onRefresh={loadFilters} />,
          },
          {
            id: 'matrix',
            label: 'Variants & Matrices',
            content: <VariantsTab products={products} />,
          },
          {
            id: 'transfer',
            label: 'Stock Transfers',
            content: <TransferTab products={products} />,
          },
          {
            id: 'bundles',
            label: 'Kitting & Bundles',
            content: <BundlesTab products={products} />,
          },
        ]}
      />

      {/* Removed CreateProductModal */}

      {isImportOpen && (
        <div className="modal-backdrop" role="dialog">
          <div className="modal">
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <h3 className="section-title">Import Inventory (CSV)</h3>
              <button className="button ghost" onClick={() => setIsImportOpen(false)}>Close</button>
            </div>
            <div className="stack">
              <input
                className="input"
                type="file"
                accept=".csv"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) handleImportFile(file)
                }}
              />
              {importRows.length > 0 && (
                <div className="card" style={{ boxShadow: 'none', background: '#f8fafc' }}>
                  <div className="flex-between">
                    <h4 style={{ margin: 0 }}>Preview</h4>
                    <span className="small muted">{importRows.length} rows</span>
                  </div>
                </div>
              )}
              {importMessage && <div className="pill">{importMessage}</div>}
              <div className="flex-between">
                <span className="small muted">Required: Name, SKU, Qty</span>
                <button className="button" type="button" onClick={handleImport} disabled={importRows.length === 0}>Confirm Import</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </BasePage>
  )
}