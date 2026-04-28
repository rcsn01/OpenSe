import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AllProductsTab } from '../AllProductsTab'

const mocks = vi.hoisted(() => ({
  mockCreateFolderMutateAsync: vi.fn(),
  mockRenameFolderMutateAsync: vi.fn(),
  mockDeleteFolderMutateAsync: vi.fn(),
  mockMoveFolderMutateAsync: vi.fn(),
  mockMoveProductsMutateAsync: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}))

vi.mock('../../../hooks/queries/useInventory', () => ({
  useCreateInventoryFolder: () => ({ mutateAsync: mocks.mockCreateFolderMutateAsync }),
  useRenameFolderInInventory: () => ({ mutateAsync: mocks.mockRenameFolderMutateAsync }),
  useDeleteFolderInInventory: () => ({ mutateAsync: mocks.mockDeleteFolderMutateAsync }),
  useMoveFolderInInventory: () => ({ mutateAsync: mocks.mockMoveFolderMutateAsync }),
  useMoveInventoryProducts: () => ({ mutateAsync: mocks.mockMoveProductsMutateAsync, isPending: false }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: mocks.mockToastSuccess,
    error: mocks.mockToastError,
  },
}))

vi.mock('../FolderNavigationPanel', () => ({
  FolderNavigationPanel: () => <div data-testid="folder-navigation-panel" />,
}))

vi.mock('../all-products/ProductListView', () => ({
  ProductListView: () => <div data-testid="product-list-view" />,
}))

const mockMatchMedia = (matches: boolean) =>
  vi.fn().mockImplementation(() => ({
    matches,
    media: '(max-width: 767px)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))

const createProps = () => ({
  companyId: 'company-1',
  folderView: 'all' as const,
  setFolderView: vi.fn(),
  selectedFolderId: null as string | null,
  setSelectedFolderId: vi.fn(),
  stockFilter: 'all' as const,
  setStockFilter: vi.fn(),
  activeCustomFieldFilters: [] as { key: string; value: string | number | boolean }[],
  onAddFilter: vi.fn(),
  onRemoveFilter: vi.fn(),
  pendingFilterKey: null as string | null,
  setPendingFilterKey: vi.fn(),
  customFieldFilters: [],
  onImportOpen: vi.fn(),
  onCreateOpen: vi.fn(),
  products: [
    {
      id: 'p-1',
      name: 'Test Product',
      sku: 'TEST-1',
      quantity_on_hand: 5,
      reorder_point: 1,
      folder_id: null,
      cost_price: 5,
      selling_price: 10,
    },
  ],
  isLoading: false,
  selectedRowIds: new Set(['p-1', 'p-2']),
  toggleSelection: vi.fn(),
  toggleAll: vi.fn(),
  sortField: 'name' as const,
  sortDir: 'asc' as const,
  onSortChange: vi.fn(),
  page: 1,
  pageSize: 10,
  setPageSize: vi.fn(),
  totalCount: 1,
  setPage: vi.fn(),
  folders: [
    { id: 'folder-a', name: 'Cold Storage', parent_id: null },
    { id: 'folder-b', name: 'Shelf A', parent_id: 'folder-a' },
  ],
  handleBulkDelete: vi.fn(),
  onClearSelection: vi.fn(),
  onRefresh: vi.fn(),
})

describe('AllProductsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockMoveProductsMutateAsync.mockResolvedValue(2)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia(false),
    })
  })

  it('moves selected products to the chosen folder and clears the current selection', async () => {
    const props = createProps()
    render(<AllProductsTab {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Move' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Destination folder'), { target: { value: 'folder-b' } })
    fireEvent.click(screen.getByRole('button', { name: /move 2 products/i }))

    await waitFor(() => {
      expect(mocks.mockMoveProductsMutateAsync).toHaveBeenCalledWith({
        productIds: ['p-1', 'p-2'],
        folderId: 'folder-b',
      })
    })

    expect(props.onClearSelection).toHaveBeenCalledTimes(1)
    expect(props.onRefresh).toHaveBeenCalledTimes(1)
    expect(mocks.mockToastSuccess).toHaveBeenCalledWith('Moved 2 products')
  })

  it('defaults the move target to Uncategorised', async () => {
    const props = createProps()
    render(<AllProductsTab {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Move' }))
    fireEvent.click(screen.getByRole('button', { name: /move 2 products/i }))

    await waitFor(() => {
      expect(mocks.mockMoveProductsMutateAsync).toHaveBeenCalledWith({
        productIds: ['p-1', 'p-2'],
        folderId: null,
      })
    })
  })

  it('opens and closes the folder navigation from the mobile toggle', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia(true),
    })

    const props = createProps()
    render(<AllProductsTab {...props} />)

    const sidebar = screen.getByRole('complementary', { hidden: true })
    expect(sidebar).toHaveAttribute('aria-hidden', 'true')

    const toggleButton = screen.getByRole('button', { name: 'Open folder navigation' })
    expect(toggleButton).toHaveTextContent('>')
    expect(toggleButton.closest('.inventory-toolbar')).not.toBeNull()

    fireEvent.click(toggleButton)

    expect(sidebar).toHaveAttribute('aria-hidden', 'false')
    expect(screen.getByRole('button', { name: 'Close folder navigation' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open folder navigation' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close folder navigation' }))

    expect(sidebar).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('button', { name: 'Open folder navigation' })).toBeInTheDocument()
  })
})