import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Folder as FolderIcon, FolderOpen } from 'lucide-react'
import type { Folder } from '../../types'

type TreeNode = Folder & { children: TreeNode[] }

const buildTree = (folders: Folder[], parentId: string | null = null): TreeNode[] => (
  folders
    .filter((folder) => folder.parent_id === parentId)
    .map((folder) => ({
      ...folder,
      children: buildTree(folders, folder.id),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
)

const TreeItem = ({
  node,
  level = 0,
  activeId,
  onSelect,
  expandedIds,
  toggleExpand,
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
          onClick={(event) => {
            event.stopPropagation()
            if (hasChildren) toggleExpand(node.id)
          }}
        >
          {hasChildren && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
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

type FolderNavigationPanelProps = {
  folders: Folder[]
  activeFolderId: string | null
  onSelectFolder: (id: string) => void
  rootLabel: string
  onSelectRoot: () => void
}

export const FolderNavigationPanel = ({
  folders,
  activeFolderId,
  onSelectFolder,
  rootLabel,
  onSelectRoot,
}: FolderNavigationPanelProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const tree = useMemo(() => buildTree(folders, null), [folders])

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

  return (
    <div className="explorer-sidebar">
      <div className="sidebar-header">Folders</div>
      <div className="tree-content">
        <div
          className={`tree-item ${activeFolderId === null ? 'active' : ''}`}
          onClick={onSelectRoot}
        >
          <div className="tree-toggle" />
          <FolderIcon size={16} style={{ marginRight: 8, color: activeFolderId === null ? '#2563eb' : '#64748b' }} />
          {rootLabel}
        </div>

        {tree.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            activeId={activeFolderId}
            onSelect={onSelectFolder}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
          />
        ))}
      </div>
    </div>
  )
}