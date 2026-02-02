import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import type { Folder } from '../../types'
import { formatCurrency, toNumber } from '../../utils'
import type { InventoryProduct } from './types'

export const FoldersTab = ({ companyId, allFolders, onRefresh }: { companyId: string; allFolders: Folder[]; onRefresh: () => void }) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [movingId, setMovingId] = useState<string | null>(null)
  const [moveTarget, setMoveTarget] = useState<string>('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [folderStats, setFolderStats] = useState<Record<string, { count: number; value: number }>>({})

  const currentFolder = allFolders.find((f) => f.id === currentFolderId)
  const subfolders = allFolders.filter((f) => f.parent_id === currentFolderId)

  const breadcrumbs = useMemo(() => {
    const path = [] as Folder[]
    let curr = currentFolder
    while (curr) {
      path.unshift(curr)
      curr = allFolders.find((f) => f.id === curr?.parent_id)
    }
    return path
  }, [currentFolder, allFolders])

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      let query = supabase
        .from('products')
        .select('id, name, sku, quantity_on_hand, selling_price')
        .eq('company_id', companyId)

      if (currentFolderId) {
        query = query.eq('folder_id', currentFolderId)
      } else {
        query = query.is('folder_id', null)
      }

      const { data } = await query
      setProducts((data as any) || [])
      setIsLoading(false)
    }
    fetchProducts()
  }, [currentFolderId, companyId])

  useEffect(() => {
    const fetchFolderStats = async () => {
      const { data } = await supabase
        .from('products')
        .select('folder_id, quantity_on_hand, selling_price')
        .eq('company_id', companyId)

      const stats: Record<string, { count: number; value: number }> = {}
      ;(data as any[] | null)?.forEach((p) => {
        const key = p.folder_id ?? 'root'
        if (!stats[key]) stats[key] = { count: 0, value: 0 }
        stats[key].count += 1
        stats[key].value += toNumber(p.quantity_on_hand) * toNumber(p.selling_price)
      })
      setFolderStats(stats)
    }

    if (companyId) fetchFolderStats()
  }, [companyId, allFolders])

  const handleCreate = async () => {
    if (!newFolderName.trim()) return
    await supabase.from('folders').insert({
      company_id: companyId,
      name: newFolderName,
      parent_id: currentFolderId,
    })
    setNewFolderName('')
    setIsCreating(false)
    onRefresh()
  }

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return
    await supabase.from('folders').update({ name: renameValue }).eq('id', id)
    setRenamingId(null)
    onRefresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this folder? Products inside will be unassigned (moved to root).')) return
    await supabase.from('folders').delete().eq('id', id)
    onRefresh()
  }

  const handleMove = async () => {
    if (!movingId) return
    const target = moveTarget === 'root' ? null : moveTarget
    if (target === movingId) return

    await supabase.from('folders').update({ parent_id: target }).eq('id', movingId)
    setMovingId(null)
    onRefresh()
  }

  const getMoveOptions = (id: string) => allFolders.filter((f) => f.id !== id)

  return (
    <div className="stack">
      <div className="card" style={{ padding: '12px 16px' }}>
        <div className="flex-between">
          <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              className={`button ghost small ${!currentFolderId ? 'active' : ''}`}
              onClick={() => setCurrentFolderId(null)}
            >
              Root
            </button>
            {breadcrumbs.map((f) => (
              <span key={f.id} className="row" style={{ gap: 8 }}>
                <span className="muted">/</span>
                <button 
                  className={`button ghost small ${currentFolderId === f.id ? 'active' : ''}`}
                  onClick={() => setCurrentFolderId(f.id)}
                >
                  {f.name}
                </button>
              </span>
            ))}
          </div>
          <button className="button small" onClick={() => setIsCreating(true)}>+ New Folder</button>
        </div>

        {isCreating && (
          <div className="row" style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
            <input 
              className="input small" 
              autoFocus
              placeholder="Folder Name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
            <button className="button small" onClick={handleCreate}>Save</button>
            <button className="button ghost small" onClick={() => setIsCreating(false)}>Cancel</button>
          </div>
        )}
      </div>

      {subfolders.length > 0 && (
        <div className="grid grid-3">
          {subfolders.map((folder) => (
            <div key={folder.id} className="card folder-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>📁</span>
                  <div>
                    <div style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => setCurrentFolderId(folder.id)}>
                      {folder.name}
                    </div>
                    <div className="small muted">{folderStats[folder.id]?.count ?? 0} items</div>
                  </div>
                </div>
                <div className="kebab-menu">
                  <button
                    className="kebab-button"
                    type="button"
                    onClick={() => setOpenMenuId(openMenuId === folder.id ? null : folder.id)}
                    aria-label="Open folder actions"
                  >
                    ⋮
                  </button>
                  {openMenuId === folder.id && (
                    <div className="kebab-dropdown">
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingId(folder.id)
                          setRenameValue(folder.name)
                          setOpenMenuId(null)
                        }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMovingId(folder.id)
                          setMoveTarget(folder.parent_id || 'root')
                          setOpenMenuId(null)
                        }}
                      >
                        Move
                      </button>
                      <button
                        type="button"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => {
                          setOpenMenuId(null)
                          handleDelete(folder.id)
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="row" style={{ gap: 10, marginTop: 8 }}>
                <span className="pill">Item Count: {folderStats[folder.id]?.count ?? 0}</span>
                <span className="pill">Total Value: {formatCurrency(folderStats[folder.id]?.value ?? 0)}</span>
              </div>
              {renamingId === folder.id ? (
                <div className="row">
                  <input 
                    className="input small" 
                    value={renameValue} 
                    onChange={(e) => setRenameValue(e.target.value)}
                  />
                  <button className="button small" onClick={() => handleRename(folder.id)}>OK</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {movingId && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 400 }}>
            <h3>Move Folder</h3>
            <div className="stack">
              <select className="select" value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)}>
                <option value="root">Root (No Parent)</option>
                {getMoveOptions(movingId).map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <div className="row">
                <button className="button" onClick={handleMove}>Move</button>
                <button className="button ghost" onClick={() => setMovingId(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
          <h4 style={{ margin: 0 }}>Products in {currentFolder ? currentFolder.name : 'Root'}</h4>
        </div>
        {isLoading ? (
          <div className="empty-state">Loading items...</div>
        ) : products.length === 0 ? (
          <div className="empty-state">No products in this folder.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td><Link to={`/inventory/${p.id}`} style={{ fontWeight: 500 }}>{p.name}</Link></td>
                    <td className="muted small">{p.sku}</td>
                    <td style={{ textAlign: 'right' }}>{p.quantity_on_hand}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(p.selling_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
