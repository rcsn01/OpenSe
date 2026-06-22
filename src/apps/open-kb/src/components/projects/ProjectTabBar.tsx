import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  Tooltip,
  cn,
  tabBarActiveItemClassName,
  tabBarClassName,
  tabBarInactiveItemClassName,
  tabBarItemClassName,
} from '@repo/ui'
import { ChevronLeft, ChevronRight, Copy, Edit3, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { ProjectTab } from '../../types'
import {
  projectTabDefinitions,
  type ProjectTabGroup,
  type ProjectTabKey,
} from '../../lib/projectTabs'

const groupLabels: Record<ProjectTabGroup, string> = {
  popular: 'Popular',
  other: 'Other',
  existing: 'Existing Open-KB',
}

export type ProjectTabBarProps = {
  tabs: ProjectTab[]
  activeTabId: string | null
  canEdit: boolean
  onNavigate: (tab: ProjectTab) => void
  onAddTab: (tabKey: ProjectTabKey) => void
  onRenameTab: (tab: ProjectTab) => void
  onCopyTab: (tab: ProjectTab) => void
  onRemoveTab: (tab: ProjectTab) => void
  onMoveTab: (tab: ProjectTab, direction: 'left' | 'right') => void
  busy?: boolean
}

export const ProjectTabBar = ({
  tabs,
  activeTabId,
  canEdit,
  onNavigate,
  onAddTab,
  onRenameTab,
  onCopyTab,
  onRemoveTab,
  onMoveTab,
  busy = false,
}: ProjectTabBarProps) => {
  const activeKeys = new Set(tabs.map((tab) => tab.tab_key))
  const availableTabs = projectTabDefinitions.filter((definition) => !activeKeys.has(definition.key))
  const [contextMenu, setContextMenu] = useState<{
    tab: ProjectTab
    index: number
    x: number
    y: number
  } | null>(null)

  useEffect(() => {
    if (!contextMenu) return

    const close = () => setContextMenu(null)
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('click', close)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu])

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: ProjectTab) => {
    if (!canEdit) return
    if (event.key !== 'ArrowDown' && event.key !== 'ContextMenu') return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const index = tabs.findIndex((item) => item.id === tab.id)
    setContextMenu({ tab, index, x: rect.left, y: rect.bottom + 4 })
  }

  const handleContextAction = (action: () => void) => {
    setContextMenu(null)
    action()
  }

  return (
    <div data-testid="open-kb-project-tab-nav" className="flex h-10 items-center gap-2">
      <nav className={cn(tabBarClassName, 'flex-1')} role="tablist" aria-label="Project tabs">
        {tabs.map((tab, index) => {
          const isActive = activeTabId === tab.id
          const isRequired = tab.metadata?.required === true

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={cn(
                tabBarItemClassName,
                isActive ? tabBarActiveItemClassName : tabBarInactiveItemClassName,
              )}
              onClick={() => onNavigate(tab)}
              onKeyDown={(event) => handleKeyDown(event, tab)}
              onContextMenu={(event) => {
                if (!canEdit) return
                event.preventDefault()
                setContextMenu({ tab, index, x: event.clientX, y: event.clientY })
              }}
            >
              {tab.label}
              {isRequired ? <span className="sr-only"> required</span> : null}
            </button>
          )
        })}
      </nav>

      {canEdit ? (
        <Dropdown
          align="right"
          trigger={
            <Tooltip content="Add project tab">
              <Button type="button" variant="ghost" size="icon" aria-label="Add project tab" className="h-9 w-9">
                <Plus className="h-4 w-4" />
              </Button>
            </Tooltip>
          }
          className="w-64"
        >
          {(['popular', 'other', 'existing'] as ProjectTabGroup[]).map((group, groupIndex) => {
            const items = availableTabs.filter((definition) => definition.group === group)
            if (items.length === 0) return null

            return (
              <div key={group}>
                {groupIndex > 0 ? <DropdownSeparator /> : null}
                <div className="px-2 py-1 text-xs font-medium uppercase text-[var(--color-muted-foreground)]">{groupLabels[group]}</div>
                {items.map((definition) => {
                  const Icon = definition.icon
                  return (
                    <DropdownItem
                      key={definition.key}
                      icon={<Icon className="h-4 w-4" />}
                      disabled={busy}
                      onClick={() => onAddTab(definition.key)}
                    >
                      {definition.label}
                    </DropdownItem>
                  )
                })}
              </div>
            )
          })}
        </Dropdown>
      ) : null}

      {contextMenu ? (
        <div
          className="fixed z-50 min-w-44 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-lg)]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownItem
            icon={<ChevronLeft className="h-4 w-4" />}
            disabled={busy || contextMenu.index === 0}
            onClick={() => handleContextAction(() => onMoveTab(contextMenu.tab, 'left'))}
          >
            Move left
          </DropdownItem>
          <DropdownItem
            icon={<ChevronRight className="h-4 w-4" />}
            disabled={busy || contextMenu.index === tabs.length - 1}
            onClick={() => handleContextAction(() => onMoveTab(contextMenu.tab, 'right'))}
          >
            Move right
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            icon={<Edit3 className="h-4 w-4" />}
            disabled={busy}
            onClick={() => handleContextAction(() => onRenameTab(contextMenu.tab))}
          >
            Rename
          </DropdownItem>
          <DropdownItem
            icon={<Copy className="h-4 w-4" />}
            disabled={busy}
            onClick={() => handleContextAction(() => onCopyTab(contextMenu.tab))}
          >
            Make a copy
          </DropdownItem>
          {contextMenu.tab.metadata?.required !== true ? (
            <DropdownItem
              destructive
              icon={<Trash2 className="h-4 w-4" />}
              disabled={busy}
              onClick={() => handleContextAction(() => onRemoveTab(contextMenu.tab))}
            >
              Remove tab
            </DropdownItem>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
