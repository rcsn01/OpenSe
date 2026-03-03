import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Folder } from '../../types'
import { formatCurrency } from '../../utils'
import { useCreateInventoryFolder, useFolderProducts } from '../../hooks/queries/useInventory'
import { 
  Folder as FolderIcon, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  Package, 
  Plus, 
  ArrowUp,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react'
import { toast } from 'sonner'

// --- Helper: Build Tree Structure ---
type TreeNode = Folder & { children: TreeNode[] }

const buildTree = (folders: Folder[], parentId: string | null = null): TreeNode[] => {
  return folders
    .filter((f) => f.parent_id === parentId)
    .map((f) => ({
      ...f,
      children: buildTree(folders, f.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// --- Component: Recursive Tree Item ---
const TreeItem = ({ 
  node, 
  level = 0, 
  activeId, 
  onSelect, 
  expandedIds, 
  toggleExpand 
}: { 
  node: TreeNode
  level?: number
  activeId: string | null
  onSelect: (id: string) => void
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
}) => {
  const isExpanded = expandedIds.has(node.id)
  const hasChildren = node.children.length > 0
  const isActive = activeId === node.id

  return (
    <div>
      <div 
        className={`tree-item ${isActive ? 'active' : ''}`} 
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        <div 
          className="tree-toggle"
          onClick={(e) => {
            e.stopPropagation()
            toggleExpand(node.id)
          }}
        >
          {hasChildren && (
            isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          )}
        </div>
        
        {isActive || isExpanded ? (
          <FolderOpen size={16} style={{ marginRight: 8, color: isActive ? '#2563eb' : '#3b82f6' }} />
        ) : (
          <FolderIcon size={16} style={{ marginRight: 8, color: '#3b82f6' }} />
        )}
        
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.name}
        </span>
      </div>
      
      {isExpanded && node.children.map((child) => (
        <TreeItem 
          key={child.id} 
          node={child} 
          level={level + 1} 
          activeId={activeId} 
          onSelect={onSelect}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
        />
      ))}
    </div>
  )
}

export const FoldersTab = ({ companyId, allFolders, onRefresh }: { companyId: string; allFolders: Folder[]; onRefresh: () => void }) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [view, setView] = useState<'list' | 'grid'>('list')

  // Actions
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const { data: products = [], isLoading } = useFolderProducts(companyId, currentFolderId)
  const createFolderMutation = useCreateInventoryFolder(companyId)

  // Build the tree
  const tree = useMemo(() => buildTree(allFolders, null), [allFolders])
  
  // Current folder data
  const currentFolder = allFolders.find(f => f.id === currentFolderId)
  const subfolders = allFolders.filter(f => f.parent_id === currentFolderId)

  // Breadcrumb path (e.g. Root > Folder1 > Folder2)
  const breadcrumbPath = useMemo(() => {
    const path: { id: string | null; name: string }[] = [{ id: null, name: 'Root' }]
    let f = currentFolder
    while (f) {
      path.unshift({ id: f.id, name: f.name })
      f = allFolders.find(x => x.id === f!.parent_id)
    }
    return path.reverse()
  }, [currentFolder, allFolders])

  // Expand parent folders when selecting a deep child (optional, but good UX)
  // Simple version: just toggle expand manually
  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedIds(next)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await createFolderMutation.mutateAsync({
        name: newFolderName,
        parentId: currentFolderId,
      })
      toast.success("Folder created")
      setNewFolderName('')
      setIsCreating(false)
      onRefresh()
      // If we are in a folder, ensure it is expanded so we see the new child
      if (currentFolderId) setExpandedIds(prev => new Set(prev).add(currentFolderId))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create folder'
      toast.error(message)
    }
  }

  // --- Render ---
  return (
    <div className="stack">
      {/* --- Toolbar --- */}
      <div className="explorer-toolbar" style={{ borderRadius: '12px 12px 0 0', border: '1px solid var(--border)', borderBottom: 'none' }}>
        <div className="row">
          <button 
            className="button ghost small icon-button" 
            disabled={!currentFolderId}
            onClick={() => setCurrentFolderId(currentFolder?.parent_id ?? null)}
            title="Go Up"
          >
            <ArrowUp size={16} />
          </button>
          
          <div className="explorer-breadcrumb" style={{ padding: '6px 12px', minWidth: 200, maxWidth: 400, background: 'var(--color-muted)', borderRadius: 8, fontSize: 13 }}>
            {breadcrumbPath.map((item, i) => (
              <span key={item.id ?? 'root'}>
                {i > 0 && <span className="muted" style={{ margin: '0 6px' }}>/</span>}
                <button
                  type="button"
                  className={item.id === currentFolderId ? 'font-medium' : ''}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: item.id === currentFolderId ? 'var(--primary)' : 'inherit' }}
                  onClick={() => setCurrentFolderId(item.id)}
                >
                  {item.name}
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="row">
          {isCreating ? (
            <div className="row bg-slate-50 p-1 rounded border border-slate-200">
              <input 
                className="input small" 
                style={{ width: 140 }}
                autoFocus
                placeholder="Folder Name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              <button className="button small" onClick={handleCreateFolder}>Save</button>
              <button className="button ghost small" onClick={() => setIsCreating(false)}>✕</button>
            </div>
          ) : (
            <button className="button small" onClick={() => setIsCreating(true)}>
              <Plus size={16} style={{ marginRight: 4 }} /> New Folder
            </button>
          )}
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 8px' }} />
          <button 
            className={`button ghost small ${view === 'list' ? 'active' : ''}`} 
            onClick={() => setView('list')}
            style={{ padding: 6 }}
          >
            <ListIcon size={16} />
          </button>
          <button 
            className={`button ghost small ${view === 'grid' ? 'active' : ''}`} 
            onClick={() => setView('grid')}
            style={{ padding: 6 }}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* --- Main Explorer --- */}
      <div className="explorer-container" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, height: '600px' }}>
        {/* Left Pane: Tree */}
        <div className="explorer-sidebar">
          <div className="sidebar-header">Folders</div>
          <div className="tree-content">
            <div 
              className={`tree-item ${!currentFolderId ? 'active' : ''}`}
              onClick={() => setCurrentFolderId(null)}
            >
              <div className="tree-toggle" />
              <FolderIcon size={16} style={{ marginRight: 8, color: '#64748b' }} />
              Root
            </div>
            {tree.map(node => (
              <TreeItem 
                key={node.id} 
                node={node} 
                activeId={currentFolderId} 
                onSelect={setCurrentFolderId}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
              />
            ))}
          </div>
        </div>

        {/* Right Pane: Content */}
        <div className="explorer-main">
          {isLoading ? (
            <div className="explorer-empty">
              <p className="muted">Loading...</p>
            </div>
          ) : view === 'list' ? (
            // LIST VIEW
            <div className="file-list">
              <div className="file-row header">
                <div></div>
                <div>Name</div>
                <div>Type</div>
                <div>Stock / Items</div>
                <div style={{ textAlign: 'right' }}>Price</div>
              </div>

              {/* Render Subfolders */}
              {subfolders.map((folder) => (
                <div 
                  key={folder.id} 
                  className="file-row folder"
                  onClick={() => {
                    setCurrentFolderId(folder.id)
                    setExpandedIds(prev => new Set(prev).add(folder.id))
                  }}
                >
                  <div className="file-icon"><FolderIcon size={18} fill="currentColor" fillOpacity={0.2} /></div>
                  <div className="file-name">{folder.name}</div>
                  <div className="muted small">Folder</div>
                  <div className="muted small">—</div>
                  <div style={{ textAlign: 'right' }} className="muted small">—</div>
                </div>
              ))}

              {/* Render Products */}
              {products.map((product) => (
                <div key={product.id} className="file-row">
                  <div className="file-icon"><Package size={18} /></div>
                  <div className="file-name">
                    <Link to={`/inventory/${product.id}/overview`} style={{ display: 'block' }}>
                      {product.name}
                    </Link>
                    <span className="muted small" style={{ fontSize: 11, fontWeight: 400 }}>{product.sku}</span>
                  </div>
                  <div className="muted small">{product.category || 'Product'}</div>
                  <div>
                    <span className={`badge-pill ${product.quantity_on_hand === 0 ? 'danger' : 'neutral'} small`}>
                      {product.quantity_on_hand} units
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                    {formatCurrency(product.selling_price)}
                  </div>
                </div>
              ))}

              {subfolders.length === 0 && products.length === 0 && (
                <div className="explorer-empty">
                  <FolderOpen size={48} strokeWidth={1} style={{ marginBottom: 16, opacity: 0.5 }} />
                  <p>This folder is empty</p>
                </div>
              )}
            </div>
          ) : (
            // GRID VIEW
            <div style={{ padding: 20, overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {subfolders.length === 0 && products.length === 0 ? (
                <div className="explorer-empty">
                  <FolderOpen size={48} strokeWidth={1} style={{ marginBottom: 16, opacity: 0.5 }} />
                  <p>This folder is empty</p>
                </div>
              ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
                {subfolders.map((folder) => (
                  <div 
                    key={folder.id} 
                    className="card hover:shadow-md transition-shadow cursor-pointer"
                    style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}
                    onClick={() => {
                      setCurrentFolderId(folder.id)
                      setExpandedIds(prev => new Set(prev).add(folder.id))
                    }}
                  >
                    <FolderIcon size={48} className="text-blue-500" fill="#eff6ff" />
                    <div style={{ fontSize: 14, fontWeight: 500, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {folder.name}
                    </div>
                  </div>
                ))}
                {products.map((product) => (
                  <Link to={`/inventory/${product.id}/overview`} key={product.id}>
                    <div 
                      className="card hover:shadow-md transition-shadow cursor-pointer"
                      style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8, height: '100%' }}
                    >
                      <Package size={48} className="text-slate-400" />
                      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>
                        {product.name}
                      </div>
                      <div className="small muted">{product.quantity_on_hand} in stock</div>
                    </div>
                  </Link>
                ))}
              </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}