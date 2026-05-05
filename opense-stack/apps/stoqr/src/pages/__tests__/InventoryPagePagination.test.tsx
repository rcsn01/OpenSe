import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InventoryListPage } from '../InventoryPage'

const mocks = vi.hoisted(() => ({
  useInventoryProducts: vi.fn(),
  deleteMutateAsync: vi.fn(),
  importMutateAsync: vi.fn(),
  refreshInventory: vi.fn(),
  parseCsv: vi.fn(),
}))

vi.mock('../../utils', async () => {
  const actual = await vi.importActual<typeof import('../../utils')>('../../utils')

  return {
    ...actual,
    parseCsv: (...args: unknown[]) => mocks.parseCsv(...args),
  }
})

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../components/Inventory/AllProductsTab', () => ({
  AllProductsTab: ({
    page,
    pageSize,
    setPage,
    setPageSize,
    stockFilter,
    setStockFilter,
    activeCustomFieldFilters,
    onAddFilter,
    onRemoveFilter,
    sortField,
    sortDir,
    onSortChange,
    onImportOpen,
  }: {
    page: number
    pageSize: number
    setPage: (page: number) => void
    setPageSize: (pageSize: number) => void
    stockFilter: 'all' | 'low' | 'out'
    setStockFilter: (value: 'all' | 'low' | 'out') => void
    activeCustomFieldFilters: Array<{ key: string; value: string | number | boolean }>
    onAddFilter: (key: string, value: string | number | boolean) => void
    onRemoveFilter: (key: string) => void
    sortField: string
    sortDir: 'asc' | 'desc'
    onSortChange: (field: 'name' | 'selling_price') => void
    onImportOpen: () => void
  }) => (
    <div>
      <div>Current page: {page}</div>
      <div>Current page size: {pageSize}</div>
      <div>Current stock filter: {stockFilter}</div>
      <div>Current filter count: {activeCustomFieldFilters.length}</div>
      <div>Current sort: {sortField} {sortDir}</div>
      <button type="button" onClick={() => setPage(3)}>Go to page 3</button>
      <button type="button" onClick={() => setPageSize(20)}>Show 20</button>
      <button type="button" onClick={() => setStockFilter('low')}>Low stock</button>
      <button type="button" onClick={() => onAddFilter('batch', 'acme')}>Add batch filter</button>
      <button type="button" onClick={() => onRemoveFilter('batch')}>Remove batch filter</button>
      <button type="button" onClick={() => onSortChange('selling_price')}>Sort by price</button>
      <button type="button" onClick={onImportOpen}>Import CSV</button>
    </div>
  ),
}))

vi.mock('../../hooks/queries/useInventory', () => ({
  useDeleteInventoryProducts: () => ({ mutateAsync: mocks.deleteMutateAsync }),
  useImportInventoryProducts: () => ({ mutateAsync: mocks.importMutateAsync }),
  useInventoryFilters: () => ({
    data: {
      folders: [],
      customFieldFilters: [{ key: 'batch', valueType: 'text', values: ['acme', 'beta'] }],
    },
    isLoading: false,
    isError: false,
  }),
  useInventoryProducts: (args: unknown) => {
    mocks.useInventoryProducts(args)
    return {
      data: { products: [], totalCount: 0 },
      isLoading: false,
    }
  },
  useInventoryRefresh: () => mocks.refreshInventory,
}))

const LocationDisplay = () => {
  const location = useLocation()

  return <div data-testid="location-display">{location.pathname}{location.search}</div>
}

const renderInventoryPage = (initialEntry = '/inventory/all') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/inventory/:tab" element={<InventoryListPage />} />
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  )

describe('InventoryListPage pagination state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.deleteMutateAsync.mockResolvedValue(undefined)
    mocks.importMutateAsync.mockResolvedValue(0)
    mocks.parseCsv.mockReturnValue({
      headers: ['Product Name', 'SKU'],
      rows: [{ 'Product Name': 'Widget', SKU: 'SKU-1' }],
    })
  })

  it('hydrates stock, custom filters, pagination, and sorting from the URL before querying products', async () => {
    renderInventoryPage('/inventory/all?stock=out&page=2&pageSize=20&sortField=selling_price&sortDir=desc&cf.batch=acme')

    await waitFor(() => {
      expect(screen.getByText('Current page: 2')).toBeInTheDocument()
      expect(screen.getByText('Current page size: 20')).toBeInTheDocument()
      expect(screen.getByText('Current stock filter: out')).toBeInTheDocument()
      expect(screen.getByText('Current filter count: 1')).toBeInTheDocument()
      expect(screen.getByText('Current sort: selling_price desc')).toBeInTheDocument()
    })

    const latestInventoryQueryArgs = mocks.useInventoryProducts.mock.calls.at(-1)?.[0] as {
      stockFilter: string
      customFieldFilters?: Array<{ key: string; value: string }>
      page: number
      pageSize: number
      sortField: string
      sortDir: string
    }

    expect(latestInventoryQueryArgs).toMatchObject({
      stockFilter: 'out',
      customFieldFilters: [{ key: 'batch', value: 'acme' }],
      page: 2,
      pageSize: 20,
      sortField: 'selling_price',
      sortDir: 'desc',
    })
    expect(screen.getByTestId('location-display')).toHaveTextContent('/inventory/all?stock=out&page=2&pageSize=20&sortField=selling_price&sortDir=desc&cf.batch=acme')
  })

  it('hydrates the top-bar search term from the URL before querying products', async () => {
    renderInventoryPage('/inventory/all?q=tubes')

    await waitFor(() => {
      const latestInventoryQueryArgs = mocks.useInventoryProducts.mock.calls.at(-1)?.[0] as {
        search: string
      }

      expect(latestInventoryQueryArgs).toMatchObject({ search: 'tubes' })
      expect(screen.getByTestId('location-display')).toHaveTextContent('/inventory/all?q=tubes')
    })
  })

  it('resets to the first page when page size changes', async () => {
    renderInventoryPage()

    expect(screen.getByText('Current page: 1')).toBeInTheDocument()
    expect(screen.getByText('Current page size: 10')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Go to page 3' }))

    await waitFor(() => {
      expect(screen.getByText('Current page: 3')).toBeInTheDocument()
      expect(screen.getByTestId('location-display')).toHaveTextContent('/inventory/all?page=3')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Show 20' }))

    await waitFor(() => {
      expect(screen.getByText('Current page: 1')).toBeInTheDocument()
      expect(screen.getByText('Current page size: 20')).toBeInTheDocument()
      expect(screen.getByTestId('location-display')).toHaveTextContent('/inventory/all?pageSize=20')
    })

    const latestInventoryQueryArgs = mocks.useInventoryProducts.mock.calls.at(-1)?.[0] as { page: number; pageSize: number }

    expect(latestInventoryQueryArgs).toMatchObject({ page: 1, pageSize: 20 })
  })

  it('writes stock and custom field filters to the URL and resets the current page', async () => {
    renderInventoryPage('/inventory/all?page=3')

    fireEvent.click(screen.getByRole('button', { name: 'Low stock' }))

    await waitFor(() => {
      expect(screen.getByText('Current page: 1')).toBeInTheDocument()
      expect(screen.getByText('Current stock filter: low')).toBeInTheDocument()
      expect(screen.getByTestId('location-display')).toHaveTextContent('/inventory/all?stock=low')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add batch filter' }))

    await waitFor(() => {
      expect(screen.getByText('Current filter count: 1')).toBeInTheDocument()
      expect(screen.getByTestId('location-display')).toHaveTextContent('/inventory/all?stock=low&cf.batch=acme')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Remove batch filter' }))

    await waitFor(() => {
      expect(screen.getByText('Current filter count: 0')).toBeInTheDocument()
      expect(screen.getByTestId('location-display')).toHaveTextContent('/inventory/all?stock=low')
    })

    const latestInventoryQueryArgs = mocks.useInventoryProducts.mock.calls.at(-1)?.[0] as {
      stockFilter: string
      customFieldFilters?: Array<{ key: string; value: string }>
      page: number
    }

    expect(latestInventoryQueryArgs).toMatchObject({
      stockFilter: 'low',
      customFieldFilters: undefined,
      page: 1,
    })
  })

  it('writes sort changes to the URL and toggles sort direction on repeated clicks', async () => {
    renderInventoryPage('/inventory/all?page=3')

    fireEvent.click(screen.getByRole('button', { name: 'Sort by price' }))

    await waitFor(() => {
      expect(screen.getByText('Current page: 1')).toBeInTheDocument()
      expect(screen.getByText('Current sort: selling_price asc')).toBeInTheDocument()
      expect(screen.getByTestId('location-display')).toHaveTextContent('/inventory/all?sortField=selling_price')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Sort by price' }))

    await waitFor(() => {
      expect(screen.getByText('Current sort: selling_price desc')).toBeInTheDocument()
      expect(screen.getByTestId('location-display')).toHaveTextContent('/inventory/all?sortField=selling_price&sortDir=desc')
    })

    const latestInventoryQueryArgs = mocks.useInventoryProducts.mock.calls.at(-1)?.[0] as {
      page: number
      sortField: string
      sortDir: string
    }

    expect(latestInventoryQueryArgs).toMatchObject({
      page: 1,
      sortField: 'selling_price',
      sortDir: 'desc',
    })
  })

  it('prompts for a csv file before navigating to the import mapping page', async () => {
    render(
      <MemoryRouter initialEntries={['/inventory/all']}>
        <Routes>
          <Route path="/inventory/:tab" element={<InventoryListPage />} />
          <Route path="/inventory/import" element={<div>Import Mapping Page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }))

    const file = new File(['ignored'], 'products.csv', { type: 'text/csv' })
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue('Product Name,SKU\nWidget,SKU-1'),
    })

    fireEvent.change(screen.getByLabelText('Upload inventory CSV'), {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect(screen.getByText('Import Mapping Page')).toBeInTheDocument()
      expect(mocks.parseCsv).toHaveBeenCalledWith('Product Name,SKU\nWidget,SKU-1')
    })
  })
})