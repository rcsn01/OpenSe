import { useMemo } from 'react'
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
  selectedCustomFieldKey,
  setSelectedCustomFieldKey,
  selectedCustomFieldValue,
  setSelectedCustomFieldValue,
  customFieldFilters,
  onImportOpen,
  onCreateOpen,
  handleBulkDelete,
}: InventoryFiltersBarProps) => {
  const selectedCustomField = useMemo(
    () => customFieldFilters.find((field) => field.key === selectedCustomFieldKey) ?? null,
    [customFieldFilters, selectedCustomFieldKey],
  )

  const hasActiveFilter = selectedCustomFieldKey !== null && selectedCustomFieldValue !== null
  const isSelectingValue = selectedCustomFieldKey !== null && selectedCustomFieldValue === null

  const handleRemoveFilter = () => {
    setSelectedCustomFieldKey(null)
    setSelectedCustomFieldValue(null)
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

            {hasActiveFilter && (
              <div
                className="row"
                aria-label="Active filter"
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
                <span>{selectedCustomFieldKey}:{formatCustomFieldValue(selectedCustomFieldValue)}</span>
                <button
                  type="button"
                  aria-label="Remove filter"
                  onClick={handleRemoveFilter}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0 2px',
                    fontSize: 14,
                    lineHeight: 1,
                    color: 'var(--color-foreground)',
                    opacity: 0.5,
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {isSelectingValue && (
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
                      {selectedCustomFieldKey}:
                    </button>
                  }
                >
                  {(selectedCustomField?.values ?? []).map((value) => (
                    <DropdownItem
                      key={JSON.stringify(value)}
                      onClick={() => setSelectedCustomFieldValue(value)}
                    >
                      {formatCustomFieldValue(value)}
                    </DropdownItem>
                  ))}
                </Dropdown>
                <button
                  type="button"
                  aria-label="Remove filter"
                  onClick={handleRemoveFilter}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0 2px',
                    fontSize: 14,
                    lineHeight: 1,
                    color: 'var(--color-foreground)',
                    opacity: 0.5,
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {!selectedCustomFieldKey && (
              <Dropdown
                className="min-w-[140px]"
                trigger={
                  <button
                    className="button ghost small"
                    type="button"
                    aria-label="Add custom field filter"
                    style={{ width: 32, minWidth: 32, padding: 0, borderRadius: 8 }}
                  >
                    +
                  </button>
                }
              >
                {customFieldFilters.map((field) => (
                  <DropdownItem
                    key={field.key}
                    onClick={() => {
                      setSelectedCustomFieldKey(field.key)
                      setSelectedCustomFieldValue(null)
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
