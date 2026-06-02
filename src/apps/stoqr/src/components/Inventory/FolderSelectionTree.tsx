import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Folder as FolderIcon, FolderOpen } from 'lucide-react'
import { cn } from '@repo/ui'

import type { Folder } from '../../types'
import './InventorySurface.css'

type TreeNode = Folder & { children: TreeNode[] }

type FolderSelectionTreeProps = {
  folders: Folder[]
  selectedFolderId: string | null
  onSelectFolder: (folderId: string) => void
  disabledFolderIds?: Iterable<string>
  hiddenFolderIds?: Iterable<string>
  getFolderMetaLabel?: (folderId: string) => string | null
  ariaLabel: string
  emptyMessage: string
}

const sortFolders = (folders: Folder[]) => (
  [...folders].sort((left, right) => (
    (left.sort_order ?? 0) - (right.sort_order ?? 0) || left.name.localeCompare(right.name)
  ))
)

const buildTree = (
  folders: Folder[],
  hiddenIds: Set<string>,
  parentId: string | null = null,
): TreeNode[] => {
  const nodes: TreeNode[] = []

  for (const folder of sortFolders(folders.filter((candidate) => candidate.parent_id === parentId))) {
    const children = buildTree(folders, hiddenIds, folder.id)

    if (hiddenIds.has(folder.id)) {
      nodes.push(...children)
      continue
    }

    nodes.push({ ...folder, children })
  }

  return nodes
}

const findAncestorIds = (folderId: string | null, folders: Folder[]) => {
  if (!folderId) return []

  const folderMap = new Map(folders.map((folder) => [folder.id, folder]))
  const ancestors: string[] = []
  let currentFolder = folderMap.get(folderId)

  while (currentFolder?.parent_id) {
    ancestors.push(currentFolder.parent_id)
    currentFolder = folderMap.get(currentFolder.parent_id)
  }

  return ancestors
}

const FolderSelectionTreeItem = ({
  node,
  level,
  selectedFolderId,
  disabledIds,
  expandedIds,
  onToggleExpand,
  onSelectFolder,
  getFolderMetaLabel,
}: {
  node: TreeNode
  level: number
  selectedFolderId: string | null
  disabledIds: Set<string>
  expandedIds: Set<string>
  onToggleExpand: (folderId: string) => void
  onSelectFolder: (folderId: string) => void
  getFolderMetaLabel?: (folderId: string) => string | null
}) => {
  const hasChildren = node.children.length > 0
  const isExpanded = expandedIds.has(node.id)
  const isActive = selectedFolderId === node.id
  const isDisabled = disabledIds.has(node.id)
  const metaLabel = getFolderMetaLabel?.(node.id) ?? null

  return (
    <div>
      <div
        className={cn(
          'tree-item tree-item-folder folder-selection-tree-item',
          isActive && 'active',
          isDisabled && 'folder-selection-tree-item--disabled',
        )}
        style={{ paddingLeft: `${level * 16}px` }}
        role="treeitem"
        aria-label={metaLabel ? `${node.name} ${metaLabel}` : node.name}
        aria-selected={isActive}
        aria-disabled={isDisabled || undefined}
        aria-expanded={hasChildren ? isExpanded : undefined}
        tabIndex={isDisabled ? -1 : 0}
        onClick={() => {
          if (!isDisabled) onSelectFolder(node.id)
        }}
        onKeyDown={(event) => {
          if (isDisabled) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelectFolder(node.id)
          }
          if (event.key === 'ArrowRight' && hasChildren && !isExpanded) {
            onToggleExpand(node.id)
          }
          if (event.key === 'ArrowLeft' && hasChildren && isExpanded) {
            onToggleExpand(node.id)
          }
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="tree-toggle folder-selection-tree-toggle"
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.name}`}
            onClick={(event) => {
              event.stopPropagation()
              onToggleExpand(node.id)
            }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
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

        <span className="folder-selection-tree-name">{node.name}</span>
        {metaLabel ? <span className="folder-selection-tree-meta">{metaLabel}</span> : null}
      </div>

      {isExpanded ? (
        node.children.map((child) => (
          <FolderSelectionTreeItem
            key={child.id}
            node={child}
            level={level + 1}
            selectedFolderId={selectedFolderId}
            disabledIds={disabledIds}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            onSelectFolder={onSelectFolder}
            getFolderMetaLabel={getFolderMetaLabel}
          />
        ))
      ) : null}
    </div>
  )
}

export const FolderSelectionTree = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  disabledFolderIds = [],
  hiddenFolderIds = [],
  getFolderMetaLabel,
  ariaLabel,
  emptyMessage,
}: FolderSelectionTreeProps) => {
  const disabledIds = useMemo(() => new Set(disabledFolderIds), [disabledFolderIds])
  const hiddenIds = useMemo(() => new Set(hiddenFolderIds), [hiddenFolderIds])
  const tree = useMemo(() => buildTree(folders, hiddenIds), [folders, hiddenIds])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const ancestorIds = findAncestorIds(selectedFolderId, folders)
    if (ancestorIds.length === 0) return

    setExpandedIds((previous) => {
      const next = new Set(previous)
      let changed = false

      for (const ancestorId of ancestorIds) {
        if (!next.has(ancestorId)) {
          next.add(ancestorId)
          changed = true
        }
      }

      return changed ? next : previous
    })
  }, [folders, selectedFolderId])

  const handleToggleExpand = (folderId: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  return (
    <div className="tree-content folder-selection-tree-content" role="tree" aria-label={ariaLabel}>
      {tree.length > 0 ? (
        tree.map((node) => (
          <FolderSelectionTreeItem
            key={node.id}
            node={node}
            level={0}
            selectedFolderId={selectedFolderId}
            disabledIds={disabledIds}
            expandedIds={expandedIds}
            onToggleExpand={handleToggleExpand}
            onSelectFolder={onSelectFolder}
            getFolderMetaLabel={getFolderMetaLabel}
          />
        ))
      ) : (
        <p className="folder-selection-tree-empty">{emptyMessage}</p>
      )}
    </div>
  )
}
