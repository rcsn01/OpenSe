import { LayoutGrid, List as ListIcon, Plus } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Dropdown, DropdownItem } from './Dropdown'
import { FilterDropdown, type FilterDropdownOption } from './FilterDropdown'

export interface AddFilterItem {
  value: string
  label: string
}

export type InventoryView = 'list' | 'grid'

export interface AddFilterDropdownProps {
  items: AddFilterItem[]
  onSelect: (value: string) => void
  ariaLabel?: string
  label?: string
  className?: string
  menuClassName?: string
}

export interface InventoryViewToggleProps {
  value: InventoryView
  onChange: (value: InventoryView) => void
  listLabel?: string
  gridLabel?: string
  className?: string
}

export interface InventoryToolbarControlsProps {
  stockStatus: string
  stockStatusOptions: FilterDropdownOption[]
  onStockStatusChange: (value: string) => void
  filterItems: AddFilterItem[]
  onFilterSelect: (value: string) => void
  view: InventoryView
  onViewChange: (value: InventoryView) => void
  className?: string
}

const toolbarTextButtonClasses =
  'inline-flex h-[26px] items-center gap-1 rounded-[var(--radius-sm)] border-none bg-transparent px-1.5 py-1 text-[var(--type-size-xs)] font-medium leading-none transition-colors duration-[var(--transition-fast)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2'

const toolbarIconButtonClasses =
  'inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border-none p-0 transition-colors duration-[var(--transition-fast)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2'

export function AddFilterDropdown({
  items,
  onSelect,
  ariaLabel = 'Add custom field filter',
  label = 'Filter',
  className,
  menuClassName,
}: AddFilterDropdownProps) {
  const trigger = (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={items.length === 0}
      className={cn(
        toolbarTextButtonClasses,
        'px-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-[var(--color-muted-foreground)]',
        className,
      )}
    >
      <Plus size={12} strokeWidth={2.5} />
      <span>{label}</span>
    </button>
  )

  if (items.length === 0) {
    return trigger
  }

  return (
    <Dropdown
      className={cn('min-w-[120px]', menuClassName)}
      trigger={(open) => (
        <button
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            toolbarTextButtonClasses,
            'px-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]',
            className,
          )}
        >
          <Plus size={12} strokeWidth={2.5} />
          <span>{label}</span>
        </button>
      )}
    >
      {items.map((item) => (
        <DropdownItem key={item.value} onClick={() => onSelect(item.value)}>
          {item.label}
        </DropdownItem>
      ))}
    </Dropdown>
  )
}

export function InventoryViewToggle({
  value,
  onChange,
  listLabel = 'List view',
  gridLabel = 'Module view',
  className,
}: InventoryViewToggleProps) {
  return (
    <div className={cn('inline-flex items-center gap-0.5', className)} role="group" aria-label="Inventory view toggle">
      <button
        type="button"
        aria-label={listLabel}
        aria-pressed={value === 'list'}
        title={listLabel}
        onClick={() => onChange('list')}
        className={cn(
          toolbarIconButtonClasses,
          value === 'list'
            ? 'bg-[var(--color-muted)] text-[var(--color-foreground)]'
            : 'bg-transparent text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
        )}
      >
        <ListIcon size={15} />
      </button>
      <button
        type="button"
        aria-label={gridLabel}
        aria-pressed={value === 'grid'}
        title={gridLabel}
        onClick={() => onChange('grid')}
        className={cn(
          toolbarIconButtonClasses,
          value === 'grid'
            ? 'bg-[var(--color-muted)] text-[var(--color-foreground)]'
            : 'bg-transparent text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
        )}
      >
        <LayoutGrid size={15} />
      </button>
    </div>
  )
}

export function InventoryToolbarControls({
  stockStatus,
  stockStatusOptions,
  onStockStatusChange,
  filterItems,
  onFilterSelect,
  view,
  onViewChange,
  className,
}: InventoryToolbarControlsProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
      <div className="flex flex-1 flex-wrap items-center gap-1.5">
        <FilterDropdown
          value={stockStatus}
          options={stockStatusOptions}
          onChange={onStockStatusChange}
        />
        <AddFilterDropdown items={filterItems} onSelect={onFilterSelect} />
      </div>
      <InventoryViewToggle value={view} onChange={onViewChange} />
    </div>
  )
}
