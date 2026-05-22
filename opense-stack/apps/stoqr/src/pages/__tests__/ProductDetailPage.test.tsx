import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TopBarSearchContent, TopBarSearchProvider } from '../../components/Search/TopBarSearch'
import { ProductDetailPage } from '../product/ProductDetailPage'

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../components/BasePage', () => ({
  BasePage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../components/ProductDetail/ProductOverviewTab', () => ({
  ProductOverviewTab: ({ product }: { product: { name: string } }) => <div>Overview for {product.name}</div>,
}))

vi.mock('../../components/ProductDetail/ProductSuppliersTab', () => ({
  ProductSuppliersTab: () => <div>Suppliers tab</div>,
}))

vi.mock('../../components/ProductDetail/ProductBatchHistoryTab', () => ({
  ProductBatchHistoryTab: () => <div>History tab</div>,
}))

vi.mock('../../components/ProductDetail/ProductAttachmentsTab', () => ({
  ProductAttachmentsTab: () => <div>Attachments tab</div>,
}))

vi.mock('../../hooks/queries/useInventory', () => ({
  useInventoryProducts: () => ({
    data: {
      products: [
        {
          id: 'prod-1',
          name: 'Warehouse Ladder',
          sku: 'WH-200',
          quantity_on_hand: 9,
        },
        {
          id: 'prod-2',
          name: 'Packing Tape',
          sku: 'PK-300',
          quantity_on_hand: 21,
        },
      ],
    },
    isLoading: false,
    isFetching: false,
    isError: false,
  }),
}))

vi.mock('../../hooks/queries/useProducts', () => ({
  useProductFolders: () => ({
    data: [
      { id: 'folder-1', name: 'Warehouse', parent_id: null },
      { id: 'folder-2', name: 'Aisle 1', parent_id: 'folder-1' },
    ],
  }),
  useProductDetail: (_companyId: string | null, id: string | null) => ({
    data: id === 'prod-2'
      ? {
          product: {
            id: 'prod-2',
            name: 'Packing Tape',
            sku: 'PK-300',
            folder_id: 'folder-2',
            image_urls: [],
          },
          transactions: [],
        }
      : {
          product: {
            id: 'prod-1',
            name: 'Warehouse Ladder',
            sku: 'WH-200',
            folder_id: 'folder-2',
            image_urls: [],
          },
          transactions: [],
        },
    isLoading: false,
  }),
}))

const SearchShell = () => (
  <TopBarSearchProvider>
    <TopBarSearchContent />
    <Outlet />
  </TopBarSearchProvider>
)

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{`${location.pathname}${location.search}`}</div>
}

describe('ProductDetailPage', () => {
  it('navigates to transfer mode from the product detail action', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/inventory/prod-1/overview']}>
        <Routes>
          <Route
            path="/inventory/:id/:tab"
            element={
              <>
                <ProductDetailPage />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Transfer' }))

    expect(screen.getByTestId('location-path')).toHaveTextContent('/inventory/prod-1/adjust?mode=transfer')
  })

  it('navigates to another product overview from the shared top-bar search', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/inventory/prod-1/overview']}>
        <Routes>
          <Route element={<SearchShell />}>
            <Route
              path="/inventory/:id/:tab"
              element={
                <>
                  <ProductDetailPage />
                  <LocationProbe />
                </>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Warehouse Ladder' })).toBeInTheDocument()

    await user.type(screen.getByRole('combobox', { name: 'Search items...' }), 'Packing')
    await user.keyboard('{Enter}')

    expect(screen.getByTestId('location-path')).toHaveTextContent('/inventory/prod-2/overview')
    expect(screen.getByRole('heading', { name: 'Packing Tape' })).toBeInTheDocument()
    expect(screen.getByText('Overview for Packing Tape')).toBeInTheDocument()
  })
})
