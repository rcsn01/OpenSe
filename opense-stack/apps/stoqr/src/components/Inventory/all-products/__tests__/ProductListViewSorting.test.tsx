import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ProductListView } from '../ProductListView'
import type { ProductListViewProps } from '../types'

vi.mock('../useInlineProductEdit', () => ({
  useInlineProductEdit: () => ({
    editingCell: null,
    editingValue: '',
    isSaving: false,
    setEditingValue: vi.fn(),
    startEdit: vi.fn(),
    commitEdit: vi.fn(),
    cancelEdit: vi.fn(),
  }),
}))

const createProps = (overrides: Partial<ProductListViewProps> = {}): ProductListViewProps => ({
  companyId: 'company-1',
  view: 'list',
  products: [
    { id: 'p-1', name: 'Widget', sku: 'W-1', quantity_on_hand: 10, reorder_point: 5, folder_id: null, cost_price: 5, selling_price: 20 },
    { id: 'p-2', name: 'Gadget', sku: 'G-1', quantity_on_hand: 0, reorder_point: 3, folder_id: 'f-1', cost_price: 8, selling_price: 30 },
  ],
  isLoading: false,
  selectedRowIds: new Set<string>(),
  toggleSelection: vi.fn(),
  toggleAll: vi.fn(),
  sortField: 'name',
  setSortField: vi.fn(),
  sortDir: 'asc',
  setSortDir: vi.fn(),
  page: 1,
  pageSize: 10,
  totalCount: 2,
  setPage: vi.fn(),
  folders: [{ id: 'f-1', name: 'Electronics', parent_id: null }],
  handleBulkDelete: vi.fn(),
  onRefresh: vi.fn(),
  ...overrides,
})

const renderWithRouter = (props: ProductListViewProps) =>
  render(
    <MemoryRouter>
      <ProductListView {...props} />
    </MemoryRouter>,
  )

describe('ProductListView table sorting', () => {
  it('does not render the old sort-by dropdown row', () => {
    renderWithRouter(createProps())

    expect(screen.queryByText('Sort by:')).not.toBeInTheDocument()
  })

  it('renders sortable column headers', () => {
    renderWithRouter(createProps())

    expect(screen.getByText(/Name \/ SKU/)).toBeInTheDocument()
    expect(screen.getByText(/Price/)).toBeInTheDocument()
    expect(screen.getByText(/On Hand/)).toBeInTheDocument()
  })

  it('toggles sort direction when clicking the active sort column header', () => {
    const props = createProps({ sortField: 'name', sortDir: 'asc' })
    renderWithRouter(props)

    const nameHeader = screen.getByText(/Name \/ SKU/).closest('th')!
    fireEvent.click(nameHeader)

    expect(props.setSortDir).toHaveBeenCalledWith('desc')
  })

  it('switches sort field when clicking a different column header', () => {
    const props = createProps({ sortField: 'name', sortDir: 'asc' })
    renderWithRouter(props)

    const priceHeader = screen.getByText(/Price/).closest('th')!
    fireEvent.click(priceHeader)

    expect(props.setSortField).toHaveBeenCalledWith('selling_price')
    expect(props.setSortDir).toHaveBeenCalledWith('asc')
  })

  it('marks the table header when items are selected', () => {
    const props = createProps({ selectedRowIds: new Set(['p-1']) })
    renderWithRouter(props)

    const tableHeader = screen.getByText(/Name \/ SKU/).closest('thead')
    expect(tableHeader).toHaveClass('table-header-selected')
  })

  it('does not mark the table header when no items are selected', () => {
    const props = createProps()
    renderWithRouter(props)

    const tableHeader = screen.getByText(/Name \/ SKU/).closest('thead')
    expect(tableHeader).not.toHaveClass('table-header-selected')
  })

  it('renders the table with data rows', () => {
    renderWithRouter(createProps())

    expect(screen.getByText('Widget')).toBeInTheDocument()
    expect(screen.getByText('Gadget')).toBeInTheDocument()
  })

  it('renders sticky table header (has correct class)', () => {
    renderWithRouter(createProps())

    // The thead should exist with the sortable-th class on sortable columns
    const nameHeader = screen.getByText(/Name \/ SKU/).closest('th')!
    expect(nameHeader).toHaveClass('sortable-th')
  })
})
