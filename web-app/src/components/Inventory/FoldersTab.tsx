import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import type { Folder } from '../../types'
import { formatCurrency, toNumber } from '../../utils'
import type { InventoryProduct } from './types'
import { Folder as FolderIcon, ChevronRight, MoreVertical, Plus, FolderOpen, ArrowLeft, Trash2, Edit2, MoveRight } from 'lucide-react'
import { toast } from 'sonner'

export const FoldersTab = ({ companyId, allFolders, onRefresh }: { companyId: string; allFolders: Folder[]; onRefresh: () => void }) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Actions state
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [folderStats, setFolderStats] = useState<Record<string, { count: number; value: number }>>({})

  // Derived state
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

  // --- Data Loading ---
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

  // --- Handlers ---
  const handleCreate = async () => {
    if (!newFolderName.trim()) return
    const { error } = await supabase.from('folders').insert({
      company_id: companyId,
      name: newFolderName,
      parent_id: currentFolderId,
    })
    if(error) toast.error(error.message)
    else {
      toast.success("Folder created")
      setNewFolderName('')
      setIsCreating(false)
      onRefresh()
    }
  }

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return
    await supabase.from('folders').update({ name: renameValue }).eq('id', id)
    setRenamingId(null)
    onRefresh()
    toast.success("Folder renamed")
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this folder? Items inside will be moved to Root.')) return
    await supabase.from('folders').delete().eq('id', id)
    onRefresh()
    toast.success("Folder deleted")
  }

  return (
    <div className="stack">
      {/* --- Breadcrumb & Actions Header --- */}
      <div className="folder-explorer-header">
        <div className="breadcrumb-nav">
          <button 
            className={`breadcrumb-item ${!currentFolderId ? 'active' : ''}`}
            onClick={() => setCurrentFolderId(null)}
          >
            <FolderIcon size={16} style={{display: 'inline', marginRight: 6, verticalAlign: 'text-bottom'}}/>
            Root
          </button>
          
          {breadcrumbs.map((f) => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center' }}>
              <ChevronRight size={14} className="muted" />
              <button 
                className={`breadcrumb-item ${currentFolderId === f.id ? 'active' : ''}`}
                onClick={() => setCurrentFolderId(f.id)}
              >
                {f.name}
              </button>
            </div>
          ))}
        </div>

        <div className="row">
          {isCreating ? (
            <div className="row bg-slate-50 p-1 rounded-lg border border-slate-200">
              <input 
                className="input small" 
                style={{ width: 160 }}
                autoFocus
                placeholder="Folder Name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <button className="button small" onClick={handleCreate}>Save</button>
              <button className="button ghost small" onClick={() => setIsCreating(false)}>✕</button>
            </div>
          ) : (
            <button className="button small" onClick={() => setIsCreating(true)}>
              <Plus size={16} style={{ marginRight: 6 }} />
              New Folder
            </button>
          )}
        </div>
      </div>

      {/* --- Folders Grid --- */}
      {subfolders.length > 0 ? (
        <div className="folder-grid">
          {subfolders.map((folder) => (
            <div 
              key={folder.id} 
              className="modern-folder-card"
              onClick={(e) => {
                // Prevent navigation if clicking actions
                if ((e.target as HTMLElement).closest('.folder-actions, .input')) return;
                setCurrentFolderId(folder.id)
              }}
            >
              <div className="folder-top">
                <div className="folder-icon-wrapper">
                  <FolderIcon size={20} fill="currentColor" fillOpacity={0.2} />
                </div>
                <div className="folder-info">
                  {renamingId === folder.id ? (
                    <input 
                      className="input small"
                      value={renameValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRename(folder.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(folder.id)}
                      autoFocus
                    />
                  ) : (
                    <h4>{folder.name}</h4>
                  )}
                  <div className="folder-meta">
                    <span>{folderStats[folder.id]?.count ?? 0} items</span>
                    <span>•</span>
                    <span>{formatCurrency(folderStats[folder.id]?.value ?? 0)}</span>
                  </div>
                </div>
              </div>

              <div className={`folder-actions ${openMenuId === folder.id ? 'open' : ''}`}>
                <div className="kebab-menu">
                  <button
                    className="kebab-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuId(openMenuId === folder.id ? null : folder.id)
                    }}
                  >
                    <MoreVertical size={14} />
                  </button>
                  {openMenuId === folder.id && (
                    <div className="kebab-dropdown">
                      <button onClick={(e) => { e.stopPropagation(); setRenamingId(folder.id); setRenameValue(folder.name); setOpenMenuId(null); }}>
                        <Edit2 size={14} style={{marginRight: 8}}/> Rename
                      </button>
                      <button style={{ color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); handleDelete(folder.id); setOpenMenuId(null); }}>
                        <Trash2 size={14} style={{marginRight: 8}}/> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Only show empty state if we are deep in a folder, otherwise root might just have products
        currentFolderId && products.length === 0 && (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <FolderOpen size={48} color="#cbd5e1" />
            <h3 style={{ marginTop: 16 }}>Empty Folder</h3>
            <p className="muted">This folder contains no subfolders or items.</p>
          </div>
        )
      )}

      {/* --- Files (Products) List --- */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#475569' }}>
            Products in {currentFolder ? currentFolder.name : 'Root'}
          </h4>
          <span className="pill" style={{ fontSize: 11, padding: '2px 8px' }}>{products.length}</span>
        </div>
        
        {isLoading ? (
          <div className="empty-state">Loading items...</div>
        ) : products.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic' }}>
            No products found in this location.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24 }}>Name</th>
                  <th>SKU</th>
                  <th style={{ textAlign: 'right' }}>Stock Level</th>
                  <th style={{ textAlign: 'right', paddingRight: 24 }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td style={{ paddingLeft: 24 }}>
                      <Link to={`/inventory/${p.id}`} style={{ fontWeight: 500, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {p.name}
                      </Link>
                    </td>
                    <td className="muted small">{p.sku}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`badge ${p.quantity_on_hand <= p.reorder_point ? 'warning' : 'neutral'}`}>
                        {p.quantity_on_hand}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: 24, fontFamily: 'monospace' }}>
                      {formatCurrency(p.selling_price)}
                    </td>
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