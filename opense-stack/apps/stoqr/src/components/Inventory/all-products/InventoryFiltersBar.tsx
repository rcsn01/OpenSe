import { useMemo } from 'react'
import { ChevronDown, Plus, Upload, X } from 'lucide-react'
import {
  AddFilterDropdown,
  Button,
  Dropdown,
  DropdownItem,
  InventoryViewToggle,
} from '@repo/ui'
import type { InventoryFiltersBarProps } from './types'

const formatCustomFieldValue = (value: string | number | boolean): string => {
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  return String(value)
}

const stockFilterOptions: { value: InventoryFiltersBarProps['stockFilter']; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'low', label: 'Low Stock' },
  { value: 'out', label: 'Out of Stock' },
]

export const InventoryFiltersBar = ({
  isSelectionMode,
  selectedRowIds,
  stockFilter,
  setStockFilter,
  view,
  setView,
  activeCustomFieldFilters,
  onAddFilter,
  onRemoveFilter,
  pendingFilterKey,
  setPendingFilterKey,
  customFieldFilters,
  showMobileExplorerToggle = false,
  onMobileExplorerToggle,
  mobileExplorerControlsId = 'inventory-folder-navigation',
  onImportOpen,
  onCreateOpen,
  handleBulkDelete,
  onMoveSelected,
  onBulkPriceAdjust,
  onBulkQuantityAdjust,
  onExportCsv,
}: InventoryFiltersBarProps) => {
  const activeKeys = useMemo(
    () => new Set(activeCustomFieldFilters.map((f) => f.key)),
    [activeCustomFieldFilters],
  )

  const availableFieldsForAdd = useMemo(
    () => customFieldFilters.filter((field) => !activeKeys.has(field.key) && field.key !== pendingFilterKey),
    [customFieldFilters, activeKeys, pendingFilterKey],
  )

  const pendingField = useMemo(
    () => (pendingFilterKey ? customFieldFilters.find((f) => f.key === pendingFilterKey) ?? null : null),
    [customFieldFilters, pendingFilterKey],
  )

  const addFilterItems = useMemo(
    () => availableFieldsForAdd.map((field) => ({ value: field.key, label: field.key })),
    [availableFieldsForAdd],
  )

  const handleCancelPending = () => {
    setPendingFilterKey(null)
  }

  const mobileExplorerToggle =
    showMobileExplorerToggle && onMobileExplorerToggle ? (
      <button
        type="button"
        className="explorer-mobile-toggle"
        aria-label="Open folder navigation"
        aria-controls={mobileExplorerControlsId}
        aria-expanded="false"
        onClick={onMobileExplorerToggle}
      >
        <span aria-hidden="true">&gt;</span>
      </button>
    ) : null

  return (
    <div className={`inventory-toolbar${isSelectionMode ? ' selection-mode' : ''}`}>
      {isSelectionMode ? (
        <>
          <div className="flex items-center gap-1.5">
            {mobileExplorerToggle}
            <span className="text-xs font-semibold text-[var(--color-primary)]">
              {selectedRowIds.size} selected
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <button className="inventory-toolbar-button inventory-toolbar-button--ghost" type="button" onClick={onBulkPriceAdjust}>Adjust Price</button>
            <button className="inventory-toolbar-button inventory-toolbar-button--ghost" type="button" onClick={onBulkQuantityAdjust}>Adjust Qty</button>
            <button className="inventory-toolbar-button inventory-toolbar-button--ghost" type="button" onClick={onExportCsv}>Export CSV</button>
            <button className="inventory-toolbar-button inventory-toolbar-button--ghost" type="button" onClick={onMoveSelected}>Move</button>
            <button
              type="button"
              className="inventory-toolbar-button inventory-toolbar-button--ghost inventory-toolbar-button--danger"
              onClick={handleBulkDelete}
            >
              Delete
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {mobileExplorerToggle}
            <div className="flex flex-wrap items-center gap-1">
              {stockFilterOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={stockFilter === option.value ? 'secondary' : 'ghost'}
                  size="xs"
                  onClick={() => setStockFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            {activeCustomFieldFilters.length > 0 && (
              <div className="h-4 w-px shrink-0 bg-[var(--color-border)]" />
            )}

            {activeCustomFieldFilters.map((filter) => (
              <div
                key={filter.key}
                className="inline-flex items-center gap-1 rounded bg-[color:rgba(102,193,63,0.06)] px-1.5 py-1 text-xs font-medium text-[var(--color-foreground)]"
                aria-label={`Active filter: ${filter.key}`}
              >
                <span className="opacity-50">{filter.key}:</span>
                <span>{formatCustomFieldValue(filter.value)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${filter.key} filter`}
                  onClick={() => onRemoveFilter(filter.key)}
                  className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm p-0 text-[var(--color-foreground)] opacity-35 transition-opacity hover:opacity-100"
                >
                  <X size={10} />
                </button>
              </div>
            ))}

            {pendingField && (
              <div className="flex items-center gap-1">
                <Dropdown
                  className="min-w-[120px]"
                  defaultOpen
                  trigger={
                    <button
                      type="button"
                      aria-label="Custom field value"
                      className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-muted)]"
                    >
                      {pendingFilterKey}:
                      <ChevronDown size={12} />
                    </button>
                  }
                >
                  {(pendingField.values ?? []).map((value) => (
                    <DropdownItem
                      key={JSON.stringify(value)}
                      onClick={() => onAddFilter(pendingFilterKey!, value)}
                    >
                      {formatCustomFieldValue(value)}
                    </DropdownItem>
                  ))}
                </Dropdown>
                <button
                  type="button"
                  aria-label="Cancel pending filter"
                  onClick={handleCancelPending}
                  className="inline-flex h-3.5 w-3.5 items-center justify-center p-0 text-[var(--color-foreground)] opacity-35 transition-opacity hover:opacity-100"
                >
                  <X size={10} />
                </button>
              </div>
            )}

            {!pendingFilterKey && addFilterItems.length > 0 && (
              <AddFilterDropdown items={addFilterItems} onSelect={setPendingFilterKey} />
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <InventoryViewToggle value={view} onChange={setView} />

            <div className="h-4 w-px shrink-0 bg-[var(--color-border)]" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCreateOpen}
            >
              <Plus className="h-4 w-4" />
              New Product
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onImportOpen}
            >
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
