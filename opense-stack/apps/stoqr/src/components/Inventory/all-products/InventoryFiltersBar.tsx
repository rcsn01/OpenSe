import { useMemo } from 'react'
import { Plus, X } from 'lucide-react'
import { Dropdown, DropdownItem } from '@repo/ui'
import type { InventoryFiltersBarProps } from './types'

const formatCustomFieldValue = (value: string | number | boolean): string => {
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  return String(value)
}

const stockFilterLabels: Record<'all' | 'low' | 'out', string> = {
  all: 'All Statuses',
  low: 'Low Stock',
  out: 'Out of Stock',
}

export const InventoryFiltersBar = ({
  isSelectionMode,
  selectedRowIds,
  stockFilter,
  setStockFilter,
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

  const handleCancelPending = () => {
    setPendingFilterKey(null)
  }

  return (
    <div className={`inventory-toolbar${isSelectionMode ? ' selection-mode' : ''}`}>
      {isSelectionMode ? (
        <>
          <div className="row">
            <span className="pill" style={{ background: 'var(--primary)', color: 'white' }}>
              {selectedRowIds.size} selected
            </span>
          </div>
          <div className="row">
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
          <div className="row wrap" style={{ flex: 1 }}>
            <Dropdown
              className="min-w-[140px]"
              trigger={
                <button
                  type="button"
                  aria-label="Stock status filter"
                  className="select text-left"
                  style={{ width: 140, padding: '7px 10px', fontSize: 13, borderRadius: 8 }}
                >
                  {stockFilterLabels[stockFilter]}
                </button>
              }
            >
              <DropdownItem onClick={() => setStockFilter('all')}>All Statuses</DropdownItem>
              <DropdownItem onClick={() => setStockFilter('low')}>Low Stock</DropdownItem>
              <DropdownItem onClick={() => setStockFilter('out')}>Out of Stock</DropdownItem>
            </Dropdown>

            {activeCustomFieldFilters.map((filter) => (
              <div
                key={filter.key}
                className="row"
                aria-label={`Active filter: ${filter.key}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 8px 5px 10px',
                  background: 'rgba(102, 193, 63, 0.08)',
                  border: '1px solid rgba(102, 193, 63, 0.25)',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <span>{filter.key}:{formatCustomFieldValue(filter.value)}</span>
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
                    width: 16,
                    height: 16,
                    lineHeight: 1,
                    color: 'var(--color-foreground)',
                    opacity: 0.5,
                    borderRadius: 4,
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {pendingField && (
              <div className="row" style={{ gap: 4, alignItems: 'center' }}>
                <Dropdown
                  className="min-w-[140px]"
                  defaultOpen
                  trigger={
                    <button
                      type="button"
                      aria-label="Custom field value"
                      className="select text-left"
                      style={{ width: 140, padding: '7px 10px', fontSize: 13, borderRadius: 8 }}
                    >
                      {pendingFilterKey}:
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
                    width: 16,
                    height: 16,
                    lineHeight: 1,
                    color: 'var(--color-foreground)',
                    opacity: 0.5,
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {!pendingFilterKey && availableFieldsForAdd.length > 0 && (
              <Dropdown
                className="min-w-[140px]"
                trigger={
                  <button
                    className="add-filter-button"
                    type="button"
                    aria-label="Add custom field filter"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Filter</span>
                  </button>
                }
              >
                {availableFieldsForAdd.map((field) => (
                  <DropdownItem
                    key={field.key}
                    onClick={() => {
                      setPendingFilterKey(field.key)
                    }}
                  >
                    {field.key}
                  </DropdownItem>
                ))}
              </Dropdown>
            )}
          </div>

          <div className="row" style={{ gap: 8 }}>
            <button className="button ghost small" onClick={onImportOpen} style={{ borderRadius: 8 }}>Import CSV</button>
            <button className="button small" onClick={onCreateOpen} style={{ borderRadius: 8 }}>+ New Product</button>
          </div>
        </>
      )}
    </div>
  )
}
