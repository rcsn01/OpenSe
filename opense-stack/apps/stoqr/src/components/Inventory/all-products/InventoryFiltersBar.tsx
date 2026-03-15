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
    <div className="flex-between wrap" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', gap: 16, background: isSelectionMode ? 'rgba(59, 130, 246, 0.08)' : '#fff' }}>
      {isSelectionMode ? (
        <div className="flex-between" style={{ width: '100%' }}>
          <span className="pill" style={{ background: 'var(--primary)', color: 'white' }}>
            {selectedRowIds.size} items selected
          </span>
          <div className="row">
            <button className="button ghost small" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleBulkDelete}>
              Bulk Delete
            </button>
            <button className="button ghost small" type="button">Move to Folder</button>
            <button className="button ghost small" type="button">Print Labels</button>
            <button className="button ghost small" type="button">Export Selected</button>
          </div>
        </div>
      ) : (
        <>
          <div className="row wrap" style={{ flex: 1 }}>
            <Dropdown
              className="min-w-[160px]"
              trigger={
                <button
                  type="button"
                  aria-label="Stock status filter"
                  className="select text-left"
                  style={{ width: 160 }}
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
                  padding: '6px 8px 6px 12px',
                  background: 'var(--color-muted, #f1f5f9)',
                  border: '1px solid var(--color-border, #e2e8f0)',
                  borderRadius: 'var(--radius-md, 6px)',
                  fontSize: '0.875rem',
                  lineHeight: 1.25,
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
                    fontSize: '1rem',
                    lineHeight: 1,
                    color: 'var(--color-foreground)',
                    opacity: 0.6,
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {isSelectingValue && (
              <div className="row" style={{ gap: 4, alignItems: 'center' }}>
                <Dropdown
                  className="min-w-[160px]"
                  defaultOpen
                  trigger={
                    <button
                      type="button"
                      aria-label="Custom field value"
                      className="select text-left"
                      style={{ width: 160 }}
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
                    fontSize: '1rem',
                    lineHeight: 1,
                    color: 'var(--color-foreground)',
                    opacity: 0.6,
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {!selectedCustomFieldKey && (
              <Dropdown
                className="min-w-[160px]"
                trigger={
                  <button
                    className="button secondary"
                    type="button"
                    aria-label="Add custom field filter"
                    style={{ width: 40, minWidth: 40, paddingInline: 0 }}
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

          <div className="row">
            <button className="button secondary" onClick={onImportOpen}>Import CSV</button>
            <button className="button" onClick={onCreateOpen}>Create Product</button>
          </div>
        </>
      )}
    </div>
  )
}
