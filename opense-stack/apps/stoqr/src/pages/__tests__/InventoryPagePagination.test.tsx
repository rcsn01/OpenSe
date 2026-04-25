import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InventoryListPage } from '../InventoryPage'

const mocks = vi.hoisted(() => ({
  useInventoryProducts: vi.fn(),
  deleteMutateAsync: vi.fn(),
  importMutateAsync: vi.fn(),
  refreshInventory: vi.fn(),
}))

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../components/Inventory/AllProductsTab', () => ({
  AllProductsTab: ({ page, pageSize, setPage, setPageSize }: { page: number; pageSize: number; setPage: (page: number) => void; setPageSize: (pageSize: number) => void }) => (
    <div>
      <div>Current page: {page}</div>
      <div>Current page size: {pageSize}</div>
      <button type="button" onClick={() => setPage(3)}>Go to page 3</button>
      <button type="button" onClick={() => setPageSize(20)}>Show 20</button>
    </div>
  ),
}))

vi.mock('../../hooks/queries/useInventory', () => ({
  useDeleteInventoryProducts: () => ({ mutateAsync: mocks.deleteMutateAsync }),
  useImportInventoryProducts: () => ({ mutateAsync: mocks.importMutateAsync }),
  useInventoryFilters: () => ({
    data: { folders: [], customFieldFilters: [] },
    isLoading: false,
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

const renderInventoryPage = () =>
  render(
    <MemoryRouter initialEntries={['/inventory/all']}>
      <Routes>
        <Route path="/inventory/:tab" element={<InventoryListPage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('InventoryListPage pagination state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.deleteMutateAsync.mockResolvedValue(undefined)
    mocks.importMutateAsync.mockResolvedValue(0)
  })

  it('resets to the first page when page size changes', async () => {
    renderInventoryPage()

    expect(screen.getByText('Current page: 1')).toBeInTheDocument()
    expect(screen.getByText('Current page size: 10')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Go to page 3' }))
    expect(screen.getByText('Current page: 3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show 20' }))

    await waitFor(() => {
      expect(screen.getByText('Current page: 1')).toBeInTheDocument()
      expect(screen.getByText('Current page size: 20')).toBeInTheDocument()
    })

    const latestInventoryQueryArgs = mocks.useInventoryProducts.mock.calls.at(-1)?.[0] as { page: number; pageSize: number }

    expect(latestInventoryQueryArgs).toMatchObject({ page: 1, pageSize: 20 })
  })
})