import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  FolderOpen,
  FolderX,
  Layers,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Folder } from '../../types'
import type { FolderView } from './all-products/types'

type TreeNode = Folder & { children: TreeNode[] }

const buildTree = (folders: Folder[], parentId: string | null = null): TreeNode[] => (
  folders
    .filter((folder) => folder.parent_id === parentId)
    .map((folder) => ({
      ...folder,
      children: buildTree(folders, folder.id),
    }))
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0) || left.name.localeCompare(right.name))
)

const flattenTree = (nodes: TreeNode[]): string[] => {
  const result: string[] = []
  for (const node of nodes) {
    result.push(node.id)
    if (node.children.length > 0) {
      result.push(...flattenTree(node.children))
    }
  }
  return result
}

const SortableTreeItem = ({
  node,
  level = 0,
  activeId,
  onSelect,
  expandedIds,
  toggleExpand,
  onRename,
  onDelete,
  renamingId,
  renamingValue,
  setRenamingValue,
  onRenameSubmit,
  onRenameCancel,
}: {
  node: TreeNode
  level?: number
  activeId: string | null
  onSelect: (id: string) => void
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
  onRename: (id: string, currentName: string) => void
  onDelete: (id: string) => void
  renamingId: string | null
  renamingValue: string
  setRenamingValue: (value: string) => void
  onRenameSubmit: () => void
  onRenameCancel: () => void
}) => {
  const isExpanded = expandedIds.has(node.id)
  const isActive = activeId === node.id
  const isRenaming = renamingId === node.id
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`tree-item tree-item-folder ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
        {...attributes}
        {...listeners}
      >
        <div
          className="tree-toggle"
          onClick={(event) => {
            event.stopPropagation()
            toggleExpand(node.id)
          }}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>

        {isActive || isExpanded ? (
          <FolderOpen size={16} style={{ marginRight: 8, flexShrink: 0, color: isActive ? '#2563eb' : '#3b82f6' }} />
        ) : (
          <FolderIcon size={16} style={{ marginRight: 8, flexShrink: 0, color: '#3b82f6' }} />
        )}

        {isRenaming ? (
          <input
            ref={inputRef}
            className="input small"
            value={renamingValue}
            onChange={(e) => setRenamingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameSubmit()
              if (e.key === 'Escape') onRenameCancel()
            }}
            onBlur={onRenameSubmit}
            onClick={(e) => e.stopPropagation()}
            style={{ flex: 1, height: 24, fontSize: 'var(--type-size-sm)', padding: '2px 6px' }}
          />
        ) : (
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
            {node.name}
          </span>
        )}

        {!isRenaming && (
          <div className="tree-item-actions">
            <button
              className="tree-action-btn"
              onClick={(e) => { e.stopPropagation(); onRename(node.id, node.name) }}
              title="Rename"
            >
              <Pencil size={12} />
            </button>
            <button
              className="tree-action-btn"
              onClick={(e) => { e.stopPropagation(); onDelete(node.id) }}
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {isExpanded && node.children.map((child) => (
        <SortableTreeItem
          key={child.id}
          node={child}
          level={level + 1}
          activeId={activeId}
          onSelect={onSelect}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
          onRename={onRename}
          onDelete={onDelete}
          renamingId={renamingId}
          renamingValue={renamingValue}
          setRenamingValue={setRenamingValue}
          onRenameSubmit={onRenameSubmit}
          onRenameCancel={onRenameCancel}
        />
      ))}
    </div>
  )
}

type FolderNavigationPanelProps = {
  folders: Folder[]
  activeFolderId: string | null
  folderView: FolderView
  onSelectFolder: (id: string) => void
  onSelectView: (view: FolderView) => void
  onCreateFolder: () => void
  onRenameFolder: (folderId: string, newName: string) => void
  onDeleteFolder: (folderId: string) => void
  onMoveFolder: (folderId: string, newParentId: string | null, sortOrder: number) => void
  deletingFolderId: string | null
  deleteStep: 'choose' | 'confirm' | null
  deleteAction: 'move-uncategorised' | 'delete-products' | null
  onDeleteStepChoose: (folderId: string) => void
  onDeleteActionSelect: (action: 'move-uncategorised' | 'delete-products') => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
}

export const FolderNavigationPanel = ({
  folders,
  activeFolderId,
  folderView,
  onSelectFolder,
  onSelectView,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  deletingFolderId,
  deleteStep,
  deleteAction,
  onDeleteStepChoose,
  onDeleteActionSelect,
  onDeleteConfirm,
  onDeleteCancel,
}: FolderNavigationPanelProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renamingValue, setRenamingValue] = useState('')

  const tree = useMemo(() => buildTree(folders, null), [folders])
  const flatIds = useMemo(() => flattenTree(tree), [tree])

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 1000, tolerance: 5 },
  })
  const sensors = useSensors(pointerSensor, touchSensor)

  useEffect(() => {
    if (!activeFolderId) return

    setExpandedIds((previous) => {
      const next = new Set(previous)
      let currentFolder = folders.find((folder) => folder.id === activeFolderId) ?? null
      let changed = false

      while (currentFolder) {
        if (!next.has(currentFolder.id)) {
          next.add(currentFolder.id)
          changed = true
        }

        currentFolder = currentFolder.parent_id
          ? folders.find((folder) => folder.id === currentFolder?.parent_id) ?? null
          : null
      }

      return changed ? next : previous
    })
  }, [activeFolderId, folders])

  const toggleExpand = (id: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleStartRename = useCallback((id: string, currentName: string) => {
    setRenamingId(id)
    setRenamingValue(currentName)
  }, [])

  const handleRenameSubmit = useCallback(() => {
    if (renamingId && renamingValue.trim()) {
      onRenameFolder(renamingId, renamingValue.trim())
    }
    setRenamingId(null)
    setRenamingValue('')
  }, [renamingId, renamingValue, onRenameFolder])

  const handleRenameCancel = useCallback(() => {
    setRenamingId(null)
    setRenamingValue('')
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const draggedId = active.id as string
    const overId = over.id as string

    const draggedFolder = folders.find((f) => f.id === draggedId)
    const overFolder = folders.find((f) => f.id === overId)
    if (!draggedFolder || !overFolder) return

    // Move the dragged folder to the same parent as the over folder, at its sort_order
    onMoveFolder(draggedId, overFolder.parent_id, overFolder.sort_order)
  }, [folders, onMoveFolder])

  const deletingFolderName = deletingFolderId
    ? folders.find((f) => f.id === deletingFolderId)?.name ?? 'this folder'
    : ''

  return (
    <div className="explorer-sidebar">
      {/* Top-level views */}
      <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
        <div
          className={`tree-item ${folderView === 'all' ? 'active' : ''}`}
          onClick={() => onSelectView('all')}
        >
          <Layers size={16} style={{ marginRight: 8, color: folderView === 'all' ? '#2563eb' : '#64748b' }} />
          All Products
        </div>
        <div
          className={`tree-item ${folderView === 'uncategorised' ? 'active' : ''}`}
          onClick={() => onSelectView('uncategorised')}
        >
          <FolderX size={16} style={{ marginRight: 8, color: folderView === 'uncategorised' ? '#2563eb' : '#64748b' }} />
          Uncategorised
        </div>
      </div>

      {/* Folders section header */}
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Folders</span>
        <button
          className="tree-action-btn"
          onClick={onCreateFolder}
          title="New folder"
          style={{ opacity: 1 }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Folder tree with DnD */}
      <div className="tree-content">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={flatIds} strategy={verticalListSortingStrategy}>
            {tree.map((node) => (
              <SortableTreeItem
                key={node.id}
                node={node}
                activeId={activeFolderId}
                onSelect={(id) => {
                  onSelectView('folder')
                  onSelectFolder(id)
                }}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
                onRename={handleStartRename}
                onDelete={onDeleteStepChoose}
                renamingId={renamingId}
                renamingValue={renamingValue}
                setRenamingValue={setRenamingValue}
                onRenameSubmit={handleRenameSubmit}
                onRenameCancel={handleRenameCancel}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Delete confirmation dialog */}
      {deletingFolderId && deleteStep && (
        <div className="modal-backdrop" onClick={onDeleteCancel}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            {deleteStep === 'choose' ? (
              <>
                <h3 className="section-title" style={{ marginBottom: 12 }}>Delete "{deletingFolderName}"</h3>
                <p className="small muted" style={{ marginBottom: 16 }}>
                  What would you like to do with the products inside this folder?
                </p>
                <div className="stack" style={{ gap: 8 }}>
                  <button
                    className="button small"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => onDeleteActionSelect('move-uncategorised')}
                  >
                    Move products to Uncategorised
                  </button>
                  <button
                    className="button ghost small"
                    style={{ width: '100%', justifyContent: 'center', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    onClick={() => onDeleteActionSelect('delete-products')}
                  >
                    Delete all products inside
                  </button>
                  <button
                    className="button ghost small"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={onDeleteCancel}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="section-title" style={{ marginBottom: 12 }}>Are you sure?</h3>
                <p className="small muted" style={{ marginBottom: 16 }}>
                  {deleteAction === 'move-uncategorised'
                    ? `All products in "${deletingFolderName}" (and its subfolders) will be moved to Uncategorised. The folder will be permanently deleted.`
                    : `All products in "${deletingFolderName}" (and its subfolders) will be permanently deleted along with the folder.`}
                </p>
                <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                  <button className="button ghost small" onClick={onDeleteCancel}>
                    Cancel
                  </button>
                  <button
                    className="button small"
                    style={deleteAction === 'delete-products' ? { background: 'var(--danger)', borderColor: 'var(--danger)' } : undefined}
                    onClick={onDeleteConfirm}
                  >
                    {deleteAction === 'move-uncategorised' ? 'Move & Delete Folder' : 'Delete Everything'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}