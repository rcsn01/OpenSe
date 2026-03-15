import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { InventoryFiltersBar } from '../InventoryFiltersBar'

const createProps = () => ({
  isSelectionMode: false,
  selectedRowIds: new Set<string>(),
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

  it('clicking + opens attribute dropdown and selecting attribute sets key', () => {
    const props = createProps()
    render(<InventoryFiltersBar {...props} />)

    fireEvent.click(screen.getByRole('button', { name: /add custom field filter/i }))

    expect(screen.getByRole('button', { name: 'batch' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'active' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'batch' }))

    expect(props.setSelectedCustomFieldKey).toHaveBeenCalledWith('batch')
    expect(props.setSelectedCustomFieldValue).toHaveBeenCalledWith(null)
  })

  it('shows attribute inside button and auto-opens value dropdown', () => {
    const props = createProps()
    render(
      <InventoryFiltersBar {...props} selectedCustomFieldKey="batch" />,
    )

    const trigger = screen.getByRole('button', { name: 'Custom field value' })
    expect(trigger).toHaveTextContent('batch:')
    expect(screen.queryByRole('button', { name: /add custom field filter/i })).not.toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'acme' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'beta' })).toBeInTheDocument()
  })

  it('selecting a value calls setSelectedCustomFieldValue', () => {
    const props = createProps()
    render(
      <InventoryFiltersBar {...props} selectedCustomFieldKey="batch" />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'acme' }))

    expect(props.setSelectedCustomFieldValue).toHaveBeenCalledWith('acme')
  })

  it('renders active filter chip with remove button after value is selected', () => {
    const props = createProps()
    render(
      <InventoryFiltersBar
        {...props}
        selectedCustomFieldKey="batch"
        selectedCustomFieldValue="acme"
      />,
    )

    expect(screen.getByText('batch:acme')).toBeInTheDocument()
    expect(screen.getByLabelText('Active filter')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove filter/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add custom field filter/i })).not.toBeInTheDocument()
  })

  it('clicking remove resets both key and value', () => {
    const props = createProps()
    render(
      <InventoryFiltersBar
        {...props}
        selectedCustomFieldKey="batch"
        selectedCustomFieldValue="acme"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /remove filter/i }))

    expect(props.setSelectedCustomFieldKey).toHaveBeenCalledWith(null)
    expect(props.setSelectedCustomFieldValue).toHaveBeenCalledWith(null)
  })

  it('stock status filter still works independently', () => {
    const props = createProps()
    render(<InventoryFiltersBar {...props} />)

    fireEvent.click(screen.getByRole('button', { name: /stock status filter/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Low Stock' }))

    expect(props.setStockFilter).toHaveBeenCalledWith('low')
  })

  it('remove button during value selection cancels the filter', () => {
    const props = createProps()
    render(
      <InventoryFiltersBar {...props} selectedCustomFieldKey="batch" />,
    )

    fireEvent.click(screen.getByRole('button', { name: /remove filter/i }))

    expect(props.setSelectedCustomFieldKey).toHaveBeenCalledWith(null)
    expect(props.setSelectedCustomFieldValue).toHaveBeenCalledWith(null)
  })
})
