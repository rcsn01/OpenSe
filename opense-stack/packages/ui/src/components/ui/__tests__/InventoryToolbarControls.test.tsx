import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  AddFilterDropdown,
  InventoryToolbarControls,
  InventoryViewToggle,
  StockStatusFilterDropdown,
} from '../InventoryToolbarControls'

const stockStatusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'low', label: 'Low Stock' },
  { value: 'out', label: 'Out of Stock' },
]

const filterItems = [
  { value: 'location', label: 'Location' },
  { value: 'batch', label: 'Batch' },
]

describe('StockStatusFilterDropdown', () => {
  it('renders the selected value and notifies on selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <StockStatusFilterDropdown
        value="all"
        options={stockStatusOptions}
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('button', { name: 'Stock status filter' })).toHaveTextContent(
      'All Statuses',
    )

    await user.click(screen.getByRole('button', { name: 'Stock status filter' }))
    await user.click(screen.getByRole('button', { name: 'Low Stock' }))

    expect(onChange).toHaveBeenCalledWith('low')
  })
})

describe('AddFilterDropdown', () => {
  it('renders filter choices and notifies on selection', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(<AddFilterDropdown items={filterItems} onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: 'Add custom field filter' }))
    await user.click(screen.getByRole('button', { name: 'Batch' }))

    expect(onSelect).toHaveBeenCalledWith('batch')
  })

  it('disables the trigger when no filter items are available', () => {
    render(<AddFilterDropdown items={[]} onSelect={() => {}} />)

    expect(screen.getByRole('button', { name: 'Add custom field filter' })).toBeDisabled()
  })
})

describe('InventoryViewToggle', () => {
  it('marks the active view and notifies on change', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<InventoryViewToggle value="list" onChange={onChange} />)

    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Module view' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    await user.click(screen.getByRole('button', { name: 'Module view' }))

    expect(onChange).toHaveBeenCalledWith('grid')
  })
})

describe('InventoryToolbarControls', () => {
  it('wires the composed controls together', async () => {
    const user = userEvent.setup()
    const onStockStatusChange = vi.fn()
    const onFilterSelect = vi.fn()
    const onViewChange = vi.fn()

    render(
      <InventoryToolbarControls
        stockStatus="all"
        stockStatusOptions={stockStatusOptions}
        onStockStatusChange={onStockStatusChange}
        filterItems={filterItems}
        onFilterSelect={onFilterSelect}
        view="list"
        onViewChange={onViewChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Stock status filter' }))
    await user.click(screen.getByRole('button', { name: 'Out of Stock' }))
    expect(onStockStatusChange).toHaveBeenCalledWith('out')

    await user.click(screen.getByRole('button', { name: 'Add custom field filter' }))
    await user.click(screen.getByRole('button', { name: 'Location' }))
    expect(onFilterSelect).toHaveBeenCalledWith('location')

    await user.click(screen.getByRole('button', { name: 'Module view' }))
    expect(onViewChange).toHaveBeenCalledWith('grid')
  })
})
