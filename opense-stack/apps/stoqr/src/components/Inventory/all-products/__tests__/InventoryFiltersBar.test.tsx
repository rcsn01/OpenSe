import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { InventoryFiltersBar } from '../InventoryFiltersBar'

const createProps = () => ({
  isSelectionMode: false,
  selectedRowIds: new Set<string>(),
  search: '',
  setSearch: vi.fn(),
  stockFilter: 'all' as const,
  setStockFilter: vi.fn(),
  selectedCustomFieldKey: null,
  setSelectedCustomFieldKey: vi.fn(),
  selectedCustomFieldValue: null,
  setSelectedCustomFieldValue: vi.fn(),
  customFieldFilters: [
    { key: 'batch', valueType: 'text' as const, values: ['acme', 'beta'] },
    { key: 'active', valueType: 'boolean' as const, values: [false, true] },
  ],
  onImportOpen: vi.fn(),
  onCreateOpen: vi.fn(),
  handleBulkDelete: vi.fn(),
})

describe('InventoryFiltersBar', () => {
  it('does not render the legacy All Tags dropdown', () => {
    render(<InventoryFiltersBar {...createProps()} />)

    expect(screen.queryByText('All Tags')).not.toBeInTheDocument()
  })

  it('opens custom filter controls and updates selected key/value', () => {
    const props = createProps()
    const view = render(<InventoryFiltersBar {...props} />)

    fireEvent.click(screen.getByRole('button', { name: /stock status filter/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Low Stock' }))
    expect(props.setStockFilter).toHaveBeenCalledWith('low')

    fireEvent.click(screen.getByRole('button', { name: /add custom field filter/i }))

    fireEvent.click(screen.getByRole('button', { name: 'Custom field type' }))
    fireEvent.click(screen.getByRole('button', { name: 'batch' }))

    expect(props.setSelectedCustomFieldKey).toHaveBeenCalledWith('batch')
    expect(props.setSelectedCustomFieldValue).toHaveBeenCalledWith(null)

    const rerenderProps = {
      ...props,
      selectedCustomFieldKey: 'batch' as const,
    }

    view.rerender(<InventoryFiltersBar {...rerenderProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Custom field value' }))
    fireEvent.click(screen.getByRole('button', { name: 'acme' }))

    expect(props.setSelectedCustomFieldValue).toHaveBeenCalledWith('acme')

    view.rerender(<InventoryFiltersBar {...rerenderProps} selectedCustomFieldValue="acme" />)

    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(props.setSelectedCustomFieldKey).toHaveBeenCalledWith(null)
    expect(props.setSelectedCustomFieldValue).toHaveBeenCalledWith(null)
  })
})
