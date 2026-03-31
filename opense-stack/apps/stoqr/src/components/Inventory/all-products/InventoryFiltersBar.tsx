import { useMemo } from 'react'
import { ChevronDown, X } from 'lucide-react'
import {
  AddFilterDropdown,
  Dropdown,
  DropdownItem,
  InventoryViewToggle,
  StockStatusFilterDropdown,
} from '@repo/ui'
import type { InventoryFiltersBarProps } from './types'

const formatCustomFieldValue = (value: string | number | boolean): string => {
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  return String(value)
}

const stockFilterOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'low', label: 'Low Stock' },
  { value: 'out', label: 'Out of Stock' },
] as const

const isStockFilterValue = (value: string): value is InventoryFiltersBarProps['stockFilter'] =>
  value === 'all' || value === 'low' || value === 'out'

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
  onImportOpen,
  onCreateOpen,
  handleBulkDelete,
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

  return (
    <div className={`inventory-toolbar${isSelectionMode ? ' selection-mode' : ''}`}>
      {isSelectionMode ? (
        <>
          <div className="row" style={{ gap: 6 }}>
            <span style={{ fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-semibold)', color: 'var(--primary)' }}>
              {selectedRowIds.size} selected
            </span>
          </div>
          <div className="row" style={{ gap: 4 }}>
            <button className="button ghost small" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleBulkDelete}>
              Delete
            </button>
            <button className="button ghost small" type="button">Move</button>
            <button className="button ghost small" type="button">Print Labels</button>
            <button className="button ghost small" type="button">Export</button>
          </div>
        </>
      ) : (
        <>
          <div className="row wrap" style={{ flex: 1, gap: 6, alignItems: 'center' }}>
            <StockStatusFilterDropdown
              value={stockFilter}
              options={stockFilterOptions}
              onChange={(value) => {
                if (isStockFilterValue(value)) {
                  setStockFilter(value)
                }
              }}
            />

            {activeCustomFieldFilters.length > 0 && (
              <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} />
            )}

            {activeCustomFieldFilters.map((filter) => (
              <div
                key={filter.key}
                className="row"
                aria-label={`Active filter: ${filter.key}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 6px',
                  background: 'rgba(102, 193, 63, 0.06)',
                  borderRadius: 4,
                  fontSize: 'var(--type-size-xs)',
                  fontWeight: 'var(--type-weight-medium)',
                  color: 'var(--text)',
                }}
              >
                <span style={{ opacity: 0.5 }}>{filter.key}:</span>
                <span>{formatCustomFieldValue(filter.value)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${filter.key} filter`}
                  onClick={() => onRemoveFilter(filter.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    width: 14,
                    height: 14,
                    lineHeight: 1,
                    color: 'var(--color-foreground)',
                    opacity: 0.35,
                    borderRadius: 2,
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            ))}

            {pendingField && (
              <div className="row" style={{ gap: 4, alignItems: 'center' }}>
                <Dropdown
                  className="min-w-[120px]"
                  defaultOpen
                  trigger={
                    <button
                      type="button"
                      aria-label="Custom field value"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 6px',
                        fontSize: 'var(--type-size-xs)',
                        fontWeight: 'var(--type-weight-medium)',
                        color: 'var(--primary)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: 4,
                      }}
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
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    width: 14,
                    height: 14,
                    lineHeight: 1,
                    color: 'var(--color-foreground)',
                    opacity: 0.35,
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            )}

            {!pendingFilterKey && addFilterItems.length > 0 && (
              <AddFilterDropdown items={addFilterItems} onSelect={setPendingFilterKey} />
            )}
          </div>

          <div className="row" style={{ gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <InventoryViewToggle value={view} onChange={setView} />

            <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} />

            <button
              type="button"
              onClick={onImportOpen}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                fontSize: 'var(--type-size-xs)',
                fontWeight: 'var(--type-weight-medium)',
                color: 'var(--muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
            >
              Import CSV
            </button>
            <button className="button small" onClick={onCreateOpen} style={{ padding: '5px 10px', fontSize: 'var(--type-size-xs)', borderRadius: 6 }}>
              + New Product
            </button>
          </div>
        </>
      )}
    </div>
  )
}
