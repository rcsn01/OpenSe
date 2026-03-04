import { useMemo, useState } from 'react'
import { Dropdown, DropdownItem } from '@repo/ui'
import type { InventoryFiltersBarProps } from './types'

const formatCustomFieldValue = (value: string | number | boolean): string => {
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  return String(value)
}

const formatCustomFieldTypeLabel = (value: string | null) => value ?? 'Attribute'

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
  const [isCustomFilterOpen, setIsCustomFilterOpen] = useState(false)

  const selectedCustomField = useMemo(
    () => customFieldFilters.find((field) => field.key === selectedCustomFieldKey) ?? null,
    [customFieldFilters, selectedCustomFieldKey],
  )

  const showCustomFilterControls = isCustomFilterOpen || !!selectedCustomFieldKey

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

            <button
              className="button secondary"
              type="button"
              aria-label="Add custom field filter"
              onClick={() => setIsCustomFilterOpen((current) => !current)}
              style={{ width: 40, minWidth: 40, paddingInline: 0 }}
            >
              +
            </button>

            {showCustomFilterControls && (
              <>
                <Dropdown
                  className="min-w-[160px]"
                  trigger={
                    <button
                      type="button"
                      aria-label="Custom field type"
                      className="select text-left"
                      style={{ width: 160 }}
                    >
                      {formatCustomFieldTypeLabel(selectedCustomFieldKey)}
                    </button>
                  }
                >
                  <DropdownItem
                    onClick={() => {
                      setSelectedCustomFieldKey(null)
                      setSelectedCustomFieldValue(null)
                    }}
                  >
                    Attribute
                  </DropdownItem>
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

                <Dropdown
                  className="min-w-[160px]"
                  trigger={
                    <button
                      type="button"
                      aria-label="Custom field value"
                      className="select text-left"
                      disabled={!selectedCustomField || selectedCustomField.values.length === 0}
                      style={{ width: 160 }}
                    >
                      {selectedCustomFieldValue === null
                        ? 'Select value'
                        : formatCustomFieldValue(selectedCustomFieldValue)}
                    </button>
                  }
                >
                  <DropdownItem onClick={() => setSelectedCustomFieldValue(null)}>Select value</DropdownItem>
                  {(selectedCustomField?.values ?? []).map((value) => (
                    <DropdownItem
                      key={JSON.stringify(value)}
                      onClick={() => setSelectedCustomFieldValue(value)}
                    >
                      {formatCustomFieldValue(value)}
                    </DropdownItem>
                  ))}
                </Dropdown>

                {(selectedCustomFieldKey || selectedCustomFieldValue !== null) && (
                  <button
                    className="button ghost small"
                    type="button"
                    onClick={() => {
                      setSelectedCustomFieldKey(null)
                      setSelectedCustomFieldValue(null)
                    }}
                  >
                    Clear
                  </button>
                )}
              </>
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
