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
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, cn } from '@repo/ui'
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

const CreateFolderTreeItem = ({
  level = 0,
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  level?: number
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [])

  return (
    <div
      className="tree-item tree-item-create"
      style={{ paddingLeft: `${level * 16 + 8}px` }}
    >
      <div className="tree-toggle tree-toggle-static" aria-hidden="true" />
      <FolderIcon size={16} className="mr-2 shrink-0 text-[var(--color-muted-foreground)]" />
      <div className="tree-create-row">
        <input
          ref={inputRef}
          className="tree-inline-input tree-create-input"
          placeholder="Folder Name"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSubmit()
            if (event.key === 'Escape') onCancel()
          }}
          onClick={(event) => event.stopPropagation()}
        />
      </div>
    </div>
  )
}

const SortableTreeItem = ({
  node,
  level = 0,
  activeId,
  onSelect,
  onCreateFolder,
  isCreatingFolder,
  creatingFolderParentId,
  newFolderName,
  onCreateFolderNameChange,
  onCreateFolderSubmit,
  onCreateFolderCancel,
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
  onCreateFolder: (parentId: string) => void
  isCreatingFolder: boolean
  creatingFolderParentId: string | null
  newFolderName: string
  onCreateFolderNameChange: (value: string) => void
  onCreateFolderSubmit: () => void
  onCreateFolderCancel: () => void
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
  const hasChildren = node.children.length > 0
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
        style={{ paddingLeft: `${level * 16}px` }}
        onClick={() => onSelect(node.id)}
        {...attributes}
        {...listeners}
      >
        {hasChildren ? (
          <div
            className="tree-toggle"
            onClick={(event) => {
              event.stopPropagation()
              toggleExpand(node.id)
            }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        ) : (
          <div className="tree-toggle tree-toggle-static" aria-hidden="true" />
        )}

        {isActive || isExpanded ? (
          <FolderOpen
            size={16}
            className={cn(
              'mr-2 shrink-0',
              isActive ? 'text-current' : 'text-[var(--color-primary)]',
            )}
          />
        ) : (
          <FolderIcon size={16} className="mr-2 shrink-0 text-[var(--color-primary)]" />
        )}

        {isRenaming ? (
          <input
            ref={inputRef}
            className="tree-inline-input tree-rename-input"
            value={renamingValue}
            onChange={(e) => setRenamingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameSubmit()
              if (e.key === 'Escape') onRenameCancel()
            }}
            onBlur={onRenameSubmit}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate whitespace-nowrap">
            {node.name}
          </span>
        )}

        {!isRenaming && (
          <div className="tree-item-actions">
            <button
              className="tree-action-btn"
              onClick={(e) => { e.stopPropagation(); onCreateFolder(node.id) }}
              title={`Add subfolder to ${node.name}`}
              aria-label={`Add subfolder to ${node.name}`}
            >
              <Plus size={12} />
            </button>
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

      {isExpanded && isCreatingFolder && creatingFolderParentId === node.id ? (
        <CreateFolderTreeItem
          level={level + 1}
          value={newFolderName}
          onChange={onCreateFolderNameChange}
          onSubmit={onCreateFolderSubmit}
          onCancel={onCreateFolderCancel}
        />
      ) : null}

      {isExpanded && node.children.map((child) => (
        <SortableTreeItem
          key={child.id}
          node={child}
          level={level + 1}
          activeId={activeId}
          onSelect={onSelect}
          onCreateFolder={onCreateFolder}
          isCreatingFolder={isCreatingFolder}
          creatingFolderParentId={creatingFolderParentId}
          newFolderName={newFolderName}
          onCreateFolderNameChange={onCreateFolderNameChange}
          onCreateFolderSubmit={onCreateFolderSubmit}
          onCreateFolderCancel={onCreateFolderCancel}
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
  onCreateFolder: (parentId: string | null) => void
  isCreatingFolder: boolean
  creatingFolderParentId: string | null
  newFolderName: string
  onCreateFolderNameChange: (value: string) => void
  onCreateFolderSubmit: () => void
  onCreateFolderCancel: () => void
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
  isCreatingFolder,
  creatingFolderParentId,
  newFolderName,
  onCreateFolderNameChange,
  onCreateFolderSubmit,
  onCreateFolderCancel,
  onRenameFolder,
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

  const handleCreateSubfolder = useCallback((parentId: string) => {
    setExpandedIds((previous) => {
      if (previous.has(parentId)) return previous
      const next = new Set(previous)
      next.add(parentId)
      return next
    })

    onCreateFolder(parentId)
  }, [onCreateFolder])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const draggedId = active.id as string
    const overId = over.id as string

    const draggedFolder = folders.find((f) => f.id === draggedId)
    const overFolder = folders.find((f) => f.id === overId)
    if (!draggedFolder || !overFolder) return

    // Move the dragged folder to the same parent as the over folder, at its sort_order
    onMoveFolder(draggedId, overFolder.parent_id, overFolder.sort_order ?? 0)
  }, [folders, onMoveFolder])

  const deletingFolderName = deletingFolderId
    ? folders.find((f) => f.id === deletingFolderId)?.name ?? 'this folder'
    : ''

  return (
    <div className="explorer-sidebar">
      {/* Top-level views */}
      <div>
        <div
          className={`tree-item ${folderView === 'all' ? 'active' : ''}`}
          onClick={() => onSelectView('all')}
        >
          <Layers
            size={16}
            className={cn(
              'mr-2',
              folderView === 'all' ? 'text-current' : 'text-[var(--color-muted-foreground)]',
            )}
          />
          All Products
        </div>
        <div
          className={`tree-item ${folderView === 'uncategorised' ? 'active' : ''}`}
          onClick={() => onSelectView('uncategorised')}
        >
          <FolderX
            size={16}
            className={cn(
              'mr-2',
              folderView === 'uncategorised' ? 'text-current' : 'text-[var(--color-muted-foreground)]',
            )}
          />
          Uncategorised
        </div>
      </div>

      {/* Folder tree with DnD */}
      <div className="tree-content">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={flatIds} strategy={verticalListSortingStrategy}>
            {tree.length > 0 ? (
              tree.map((node) => (
                <SortableTreeItem
                  key={node.id}
                  node={node}
                  activeId={activeFolderId}
                  onSelect={(id) => {
                    onSelectView('folder')
                    onSelectFolder(id)
                  }}
                  onCreateFolder={handleCreateSubfolder}
                  isCreatingFolder={isCreatingFolder}
                  creatingFolderParentId={creatingFolderParentId}
                  newFolderName={newFolderName}
                  onCreateFolderNameChange={onCreateFolderNameChange}
                  onCreateFolderSubmit={onCreateFolderSubmit}
                  onCreateFolderCancel={onCreateFolderCancel}
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
              ))
            ) : (
              isCreatingFolder && creatingFolderParentId === null ? (
                <CreateFolderTreeItem
                  value={newFolderName}
                  onChange={onCreateFolderNameChange}
                  onSubmit={onCreateFolderSubmit}
                  onCancel={onCreateFolderCancel}
                />
              ) : (
                <div className="px-4 py-3">
                  <Button type="button" variant="ghost" size="sm" onClick={() => onCreateFolder(null)}>
                    Create first folder
                  </Button>
                </div>
              )
            )}
          </SortableContext>
        </DndContext>
      </div>

      {/* Delete confirmation dialog */}
      {deletingFolderId && deleteStep && (
        <Dialog open onClose={onDeleteCancel}>
          <DialogContent className="max-w-[400px]">
            {deleteStep === 'choose' ? (
              <>
                <DialogHeader>
                  <DialogTitle>Delete "{deletingFolderName}"</DialogTitle>
                  <DialogDescription>
                    What would you like to do with the products inside this folder?
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => onDeleteActionSelect('move-uncategorised')}
                  >
                    Move products to Uncategorised
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
                    onClick={() => onDeleteActionSelect('delete-products')}
                  >
                    Delete all products inside
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center"
                    onClick={onDeleteCancel}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Are you sure?</DialogTitle>
                  <DialogDescription>
                    {deleteAction === 'move-uncategorised'
                      ? `All products in "${deletingFolderName}" (and its subfolders) will be moved to Uncategorised. The folder will be permanently deleted.`
                      : `All products in "${deletingFolderName}" (and its subfolders) will be permanently deleted along with the folder.`}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="ghost" size="sm" onClick={onDeleteCancel}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant={deleteAction === 'delete-products' ? 'destructive' : 'primary'}
                    onClick={onDeleteConfirm}
                  >
                    {deleteAction === 'move-uncategorised' ? 'Move & Delete Folder' : 'Delete Everything'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
