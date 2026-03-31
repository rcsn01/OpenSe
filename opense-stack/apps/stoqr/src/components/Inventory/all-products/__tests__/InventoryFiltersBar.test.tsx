import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { InventoryFiltersBar } from '../InventoryFiltersBar'

const createProps = () => ({
  isSelectionMode: false,
  selectedRowIds: new Set<string>(),
  stockFilter: 'all' as const,
  setStockFilter: vi.fn(),
  view: 'list' as const,
  setView: vi.fn(),
  activeCustomFieldFilters: [] as { key: string; value: string | number | boolean }[],
  onAddFilter: vi.fn(),
  onRemoveFilter: vi.fn(),
  pendingFilterKey: null as string | null,
  setPendingFilterKey: vi.fn(),
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

  it('clicking + Filter opens attribute dropdown and selecting attribute sets pending key', () => {
    const props = createProps()
    render(<InventoryFiltersBar {...props} />)

    fireEvent.click(screen.getByRole('button', { name: /add custom field filter/i }))

    expect(screen.getByRole('button', { name: 'batch' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'active' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'batch' }))

    expect(props.setPendingFilterKey).toHaveBeenCalledWith('batch')
  })

  it('shows value dropdown when pending key is set', () => {
    const props = createProps()
    render(
      <InventoryFiltersBar {...props} pendingFilterKey="batch" />,
    )

    const trigger = screen.getByRole('button', { name: 'Custom field value' })
    expect(trigger).toHaveTextContent('batch:')

    expect(screen.getByRole('button', { name: 'acme' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'beta' })).toBeInTheDocument()
  })

  it('selecting a value calls onAddFilter', () => {
    const props = createProps()
    render(
      <InventoryFiltersBar {...props} pendingFilterKey="batch" />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'acme' }))

    expect(props.onAddFilter).toHaveBeenCalledWith('batch', 'acme')
  })

  it('renders active filter chip with remove button after value is selected', () => {
    const props = createProps()
    render(
      <InventoryFiltersBar
        {...props}
        activeCustomFieldFilters={[{ key: 'batch', value: 'acme' }]}
      />,
    )

    const chip = screen.getByLabelText('Active filter: batch')
    expect(chip).toBeInTheDocument()
    expect(within(chip).getByText('acme')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove batch filter/i })).toBeInTheDocument()
  })

  it('clicking remove calls onRemoveFilter with the key', () => {
    const props = createProps()
    render(
      <InventoryFiltersBar
        {...props}
        activeCustomFieldFilters={[{ key: 'batch', value: 'acme' }]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /remove batch filter/i }))

    expect(props.onRemoveFilter).toHaveBeenCalledWith('batch')
  })

  it('stock status filter still works independently', () => {
    const props = createProps()
    render(<InventoryFiltersBar {...props} />)

    fireEvent.click(screen.getByRole('button', { name: /stock status filter/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Low Stock' }))

    expect(props.setStockFilter).toHaveBeenCalledWith('low')
  })

  it('renders view toggle buttons beside the action buttons and switches views', () => {
    const props = createProps()
    render(<InventoryFiltersBar {...props} />)

    const listBtn = screen.getByRole('button', { name: 'List view' })
    const gridBtn = screen.getByRole('button', { name: 'Module view' })
    expect(listBtn).toBeInTheDocument()
    expect(gridBtn).toBeInTheDocument()

    fireEvent.click(gridBtn)

    expect(props.setView).toHaveBeenCalledWith('grid')
  })

  it('cancel button during value selection clears pending key', () => {
    const props = createProps()
    render(
      <InventoryFiltersBar {...props} pendingFilterKey="batch" />,
    )

    fireEvent.click(screen.getByRole('button', { name: /cancel pending filter/i }))

    expect(props.setPendingFilterKey).toHaveBeenCalledWith(null)
  })

  it('keeps + Filter button visible after a filter is added', () => {
    const props = createProps()
    render(
      <InventoryFiltersBar
        {...props}
        activeCustomFieldFilters={[{ key: 'batch', value: 'acme' }]}
      />,
    )

    expect(screen.getByLabelText('Active filter: batch')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add custom field filter/i })).toBeInTheDocument()
  })

  it('does not offer already-active keys in the + dropdown', () => {
    const props = createProps()
    render(
      <InventoryFiltersBar
        {...props}
        activeCustomFieldFilters={[{ key: 'batch', value: 'acme' }]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /add custom field filter/i }))

    expect(screen.queryByRole('button', { name: 'batch' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'active' })).toBeInTheDocument()
  })

  it('supports multiple active filters simultaneously', () => {
    const props = createProps()
    render(
      <InventoryFiltersBar
        {...props}
        activeCustomFieldFilters={[
          { key: 'batch', value: 'acme' },
          { key: 'active', value: true },
        ]}
      />,
    )

    const batchChip = screen.getByLabelText('Active filter: batch')
    const activeChip = screen.getByLabelText('Active filter: active')
    expect(within(batchChip).getByText('acme')).toBeInTheDocument()
    expect(within(activeChip).getByText('True')).toBeInTheDocument()
    expect(within(batchChip).getByRole('button', { name: /remove batch filter/i })).toBeInTheDocument()
    expect(within(activeChip).getByRole('button', { name: /remove active filter/i })).toBeInTheDocument()
  })

  it('hides + button when all fields are used as active filters', () => {
    const props = createProps()
    render(
      <InventoryFiltersBar
        {...props}
        activeCustomFieldFilters={[
          { key: 'batch', value: 'acme' },
          { key: 'active', value: true },
        ]}
      />,
    )

    expect(screen.queryByRole('button', { name: /add custom field filter/i })).not.toBeInTheDocument()
  })

  it('hides + button while a pending filter key is being selected', () => {
    const props = createProps()
    render(
      <InventoryFiltersBar
        {...props}
        pendingFilterKey="batch"
      />,
    )

    expect(screen.queryByRole('button', { name: /add custom field filter/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Custom field value' })).toBeInTheDocument()
  })

  it('can remove one filter while keeping others', () => {
    const props = createProps()
    render(
      <InventoryFiltersBar
        {...props}
        activeCustomFieldFilters={[
          { key: 'batch', value: 'acme' },
          { key: 'active', value: true },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /remove batch filter/i }))

    expect(props.onRemoveFilter).toHaveBeenCalledWith('batch')
    expect(props.onRemoveFilter).not.toHaveBeenCalledWith('active')
  })
})
