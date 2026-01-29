import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import type { Folder, Tag } from '../types'
import { EmptyState } from '../components/EmptyState'
import { parseCsv, toNumber } from '../utils'

const getFolderDepth = (folders: Folder[], folderId: string | null, depth = 0): number => {
  if (!folderId) return depth
  const parent = folders.find((folder) => folder.id === folderId)
  if (!parent || !parent.parent_id) return depth
  return getFolderDepth(folders, parent.parent_id, depth + 1)
}

const getDescendantFolderIds = (folders: Folder[], rootId: string) => {
  const ids = new Set<string>([rootId])
  let added = true
  while (added) {
    added = false
    folders.forEach((folder) => {
      if (folder.parent_id && ids.has(folder.parent_id) && !ids.has(folder.id)) {
        ids.add(folder.id)
        added = true
      }
    })
  }
  return Array.from(ids)
}

type InventoryProduct = {
  id: string
  name: string
  sku: string
  quantity_on_hand: number
  reorder_point: number
  folder_id: string | null
  cost_price: number | null
  selling_price: number | null
}

export const InventoryList = () => {
  const { companyId } = useCompany()
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importRows, setImportRows] = useState<Record<string, string>[]>([])
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const folderOptions = useMemo(() => {
    return folders
      .map((folder) => ({
        ...folder,
        depth: getFolderDepth(folders, folder.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [folders])

  const loadFilters = async () => {
    if (!companyId) return
    const [{ data: folderData }, { data: tagData }] = await Promise.all([
      supabase.from('folders').select('id, name, parent_id').eq('company_id', companyId),
      supabase.from('tags').select('id, name, color').eq('company_id', companyId),
    ])

    setFolders((folderData as Folder[]) ?? [])
    setTags((tagData as Tag[]) ?? [])
  }

  const loadProducts = async () => {
    if (!companyId) return
    setIsLoading(true)

    const folderIds = selectedFolder ? getDescendantFolderIds(folders, selectedFolder) : []

    let query: any = supabase
      .from('products')
      .select('id, name, sku, quantity_on_hand, reorder_point, folder_id, cost_price, selling_price')
      .eq('company_id', companyId)

    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
    }

    if (folderIds.length > 0) {
      query = query.in('folder_id', folderIds)
    }

    if (selectedTag) {
      query = supabase
        .from('products')
        .select(
          'id, name, sku, quantity_on_hand, reorder_point, folder_id, cost_price, selling_price, product_tags!inner(tag_id)',
        )
        .eq('company_id', companyId)
        .eq('product_tags.tag_id', selectedTag)

      if (search.trim()) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
      }

      if (folderIds.length > 0) {
        query = query.in('folder_id', folderIds)
      }
    }

    const { data, error } = await query.order('name')
    if (error) {
      console.error(error)
      setProducts([])
    } else {
      setProducts((data as InventoryProduct[]) ?? [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadFilters()
  }, [companyId])

  useEffect(() => {
    loadProducts()
  }, [companyId, selectedFolder, selectedTag, search, folders])

  const handleImportFile = async (file: File) => {
    const content = await file.text()
    const { rows } = parseCsv(content)
    setImportRows(rows)
    setImportMessage(rows.length ? null : 'No rows found in CSV.')
  }

  const handleImport = async () => {
    if (!companyId || importRows.length === 0) return
    const prepared = importRows
      .map((row) => {
        const name = row.name || row.Name
        const sku = row.sku || row.SKU
        if (!name || !sku) return null
        return {
          company_id: companyId,
          name,
          sku,
          quantity_on_hand: toNumber(row.quantity_on_hand || row.qty || row.quantity),
          reorder_point: toNumber(row.reorder_point, 10),
          cost_price: toNumber(row.cost_price, 0),
          selling_price: toNumber(row.selling_price, 0),
          category: row.category ?? null,
          description: row.description ?? null,
        }
      })
      .filter(Boolean)

    const { error } = await supabase.from('products').insert(prepared)
    if (error) {
      setImportMessage(error.message)
    } else {
      setImportMessage(`Imported ${prepared.length} products.`)
      setImportRows([])
      setIsImportOpen(false)
      loadProducts()
    }
  }

  const folderName = (folderId: string | null) => {
    return folders.find((folder) => folder.id === folderId)?.name ?? 'Unassigned'
  }

  if (!companyId) {
    return <EmptyState title="No company selected" description="Choose a company to load inventory." />
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '280px 1fr', gap: 24 }}>
      <div className="card stack">
        <div>
          <h3 className="section-title">Search</h3>
          <input
            className="input"
            placeholder="Search by name or SKU"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div>
          <h3 className="section-title">Folders</h3>
          <div className="stack" style={{ maxHeight: 220, overflowY: 'auto' }}>
            <button
              className={`button ghost ${selectedFolder === null ? 'active' : ''}`}
              type="button"
              onClick={() => setSelectedFolder(null)}
            >
              All folders
            </button>
            {folderOptions.map((folder) => (
              <button
                key={folder.id}
                className={`button ghost ${selectedFolder === folder.id ? 'active' : ''}`}
                type="button"
                onClick={() => setSelectedFolder(folder.id)}
                style={{ justifyContent: 'flex-start' }}
              >
                <span style={{ paddingLeft: folder.depth * 12 }}>{folder.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="section-title">Tags</h3>
          <div className="row wrap">
            <button
              className={`button ghost ${selectedTag === null ? 'active' : ''}`}
              type="button"
              onClick={() => setSelectedTag(null)}
            >
              All tags
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`tag ${selectedTag === tag.id ? 'active' : ''}`}
                style={{ borderColor: tag.color, color: tag.color }}
                onClick={() => setSelectedTag(tag.id)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
        <button className="button" type="button" onClick={() => setIsImportOpen(true)}>
          Import inventory
        </button>
      </div>
      <div className="card">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h3 className="section-title">Inventory list</h3>
          <span className="pill">{products.length} items</span>
        </div>
        {isLoading ? (
          <div className="empty-state">Loading inventory...</div>
        ) : products.length === 0 ? (
          <EmptyState title="No inventory" description="Add products or adjust your filters." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Location</th>
                <th>Qty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const isLow = product.quantity_on_hand <= product.reorder_point
                return (
                  <tr key={product.id}>
                    <td>
                      <Link to={`/inventory/${product.id}`} style={{ fontWeight: 600 }}>
                        {product.name}
                      </Link>
                    </td>
                    <td className="muted">{product.sku}</td>
                    <td className="muted">{folderName(product.folder_id)}</td>
                    <td>{product.quantity_on_hand}</td>
                    <td>
                      {isLow ? (
                        <span className="badge warning">Low</span>
                      ) : (
                        <span className="badge success">Healthy</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {isImportOpen && (
        <div className="modal-backdrop" role="dialog">
          <div className="modal">
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="section-title">Import inventory</h3>
                <p className="muted" style={{ margin: 0 }}>
                  Upload a CSV with columns: name, sku, quantity_on_hand, cost_price, reorder_point.
                </p>
              </div>
              <button className="button ghost" onClick={() => setIsImportOpen(false)}>
                Close
              </button>
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
                <div className="card" style={{ boxShadow: 'none' }}>
                  <h4 style={{ marginTop: 0 }}>Preview</h4>
                  <div className="small muted">{importRows.length} rows detected</div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>SKU</th>
                        <th>Qty</th>
                        <th>Cost</th>
                        <th>Reorder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 5).map((row, index) => (
                        <tr key={`${row.sku}-${index}`}>
                          <td>{row.name || row.Name}</td>
                          <td>{row.sku || row.SKU}</td>
                          <td>{row.quantity_on_hand || row.qty}</td>
                          <td>{row.cost_price}</td>
                          <td>{row.reorder_point}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {importMessage && <p className="muted">{importMessage}</p>}
              <button className="button" type="button" onClick={handleImport}>
                Import products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
