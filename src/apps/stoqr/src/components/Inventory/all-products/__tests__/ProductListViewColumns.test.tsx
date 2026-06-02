import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ProductListView } from '../ProductListView'
import type { ProductListViewProps } from '../types'

vi.mock('../../../../utils', () => ({
  formatCurrency: (value: number | null | undefined) => `$${Number(value ?? 0).toFixed(2)}`,
}))

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
  products: [
    { id: 'p-1', name: 'Widget', sku: 'W-1', quantity_on_hand: 50, reorder_point: 10, folder_id: null, cost_price: 5, selling_price: 20 },
    { id: 'p-2', name: 'Gadget', sku: 'G-1', quantity_on_hand: 3, reorder_point: 5, folder_id: 'f-1', cost_price: 8, selling_price: 30 },
    { id: 'p-3', name: 'Gizmo', sku: 'GZ-1', quantity_on_hand: 0, reorder_point: 2, folder_id: 'f-1', cost_price: 4, selling_price: 15 },
  ],
  isLoading: false,
  selectedRowIds: new Set<string>(),
  toggleSelection: vi.fn(),
  toggleAll: vi.fn(),
  sortField: 'name',
  sortDir: 'asc',
  onSortChange: vi.fn(),
  page: 1,
  pageSize: 10,
  setPageSize: vi.fn(),
  totalCount: 3,
  setPage: vi.fn(),
  folders: [{ id: 'f-1', name: 'Electronics', parent_id: null }],
  onRefresh: vi.fn(),
  canUseInventory: true,
  canEditInventory: true,
  ...overrides,
})

const renderWithRouter = (props: ProductListViewProps) =>
  render(
    <MemoryRouter>
      <ProductListView {...props} />
    </MemoryRouter>,
  )

describe('ProductListView – STATUS column removed', () => {
  it('does not render Status, On Hand, or Allocated column headers in list view', () => {
    renderWithRouter(createProps())
    expect(screen.queryByText('Status')).not.toBeInTheDocument()
    expect(screen.queryByText('On Hand')).not.toBeInTheDocument()
    expect(screen.queryByText('Allocated')).not.toBeInTheDocument()
  })

  it('does not render stock status badges in list view rows', () => {
    renderWithRouter(createProps())
    expect(screen.queryByText('In Stock')).not.toBeInTheDocument()
    expect(screen.queryByText('Low Stock')).not.toBeInTheDocument()
    expect(screen.queryByText('Out of Stock')).not.toBeInTheDocument()
  })
})

describe('ProductListView – AVAILABLE column shows stock/min format', () => {
  it('renders available as "available / reorder_point"', () => {
    renderWithRouter(createProps())
    const rows = screen.getAllByRole('row').slice(1)

    expect(within(rows[0]!).getByText('50 / 10')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('3 / 5')).toBeInTheDocument()
    expect(within(rows[2]!).getByText('0 / 2')).toBeInTheDocument()
  })

  it('applies green color when available >= reorder_point', () => {
    renderWithRouter(createProps())
    const cell = screen.getByText('50 / 10')
    expect(cell).toHaveClass('text-[var(--color-success)]')
  })

  it('applies red color when available < reorder_point', () => {
    renderWithRouter(createProps())
    const cell = screen.getByText('3 / 5')
    expect(cell).toHaveClass('text-[var(--color-destructive)]')
  })

  it('applies red color when stock is zero', () => {
    renderWithRouter(createProps())
    const cell = screen.getByText('0 / 2')
    expect(cell).toHaveClass('text-[var(--color-destructive)]')
  })

  it('shows no-permission feedback instead of product detail links when inventory use is missing', () => {
    renderWithRouter(createProps({ canUseInventory: false }))

    expect(screen.getAllByText('No permission to open detail')).toHaveLength(3)
    expect(screen.queryByRole('link', { name: 'Widget' })).not.toBeInTheDocument()
  })
})

describe('ProductListView – all columns are sortable', () => {
  it('renders all column headers with sortable-th class', () => {
    renderWithRouter(createProps())
    const headers = ['Name / SKU', 'Folder', 'Price', 'Available']
    for (const text of headers) {
      const th = screen.getByText(new RegExp(text)).closest('th')!
      expect(th).toHaveClass('sortable-th')
    }
  })

  it('clicking Folder header sorts by folder_id', () => {
    const props = createProps({ sortField: 'name', sortDir: 'asc' })
    renderWithRouter(props)
    fireEvent.click(screen.getByText('Folder').closest('th')!)
    expect(props.onSortChange).toHaveBeenCalledWith('folder_id')
  })

  it('clicking Available header sorts by quantity_on_hand', () => {
    const props = createProps({ sortField: 'name', sortDir: 'asc' })
    renderWithRouter(props)
    fireEvent.click(screen.getByText('Available').closest('th')!)
    expect(props.onSortChange).toHaveBeenCalledWith('quantity_on_hand')
  })

  it('toggling the active sort column flips direction', () => {
    const props = createProps({ sortField: 'folder_id', sortDir: 'asc' })
    renderWithRouter(props)
    fireEvent.click(screen.getByText('Folder').closest('th')!)
    expect(props.onSortChange).toHaveBeenCalledWith('folder_id')
  })
})
