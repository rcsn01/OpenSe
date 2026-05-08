import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TopBarSearchContent, TopBarSearchProvider } from '../../components/Search/TopBarSearch'
import { CreateProductPage } from '../product/CreateProductPage'
import { EditProductPage } from '../product/EditProductPage'

const {
  mockNavigate,
  mockCreateMutateAsync,
  mockUpdateMutateAsync,
  mockProductDetailData,
  mockInventoryProductsData,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockCreateMutateAsync: vi.fn(),
  mockUpdateMutateAsync: vi.fn(),
  mockProductDetailData: {
    product: {
      id: 'prod-1',
      name: 'Existing Widget',
      sku: 'EX-001',
      description: 'Existing description',
      quantity_on_hand: 4,
      reorder_point: 2,
      cost_price: 10,
      selling_price: 15,
      folder_id: null,
      image_urls: [],
      custom_fields: {},
      expiry_date: null,
    },
    transactions: [],
  },
  mockInventoryProductsData: [] as Array<{
    id: string
    name: string
    sku: string
    quantity_on_hand: number
  }>,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'prod-1' }),
  }
})

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../hooks/queries/useProducts', () => ({
  useProductFolders: () => ({ data: [] }),
  useProductAttributeCatalog: () => ({ data: [{ key: 'batch', type: 'text', values: ['acme', 'north'] }] }),
  useCreateProduct: () => ({ mutateAsync: mockCreateMutateAsync, isPending: false }),
  useUpdateProduct: () => ({ mutateAsync: mockUpdateMutateAsync, isPending: false }),
  useProductDetail: () => ({ data: mockProductDetailData, isLoading: false }),
}))

vi.mock('../../hooks/queries/useInventory', () => ({
  useInventoryProducts: () => ({
    data: { products: mockInventoryProductsData },
    isLoading: false,
    isFetching: false,
    isError: false,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Product create/edit pages', () => {
  const renderWithTopBarSearch = (page: React.ReactNode) => render(
    <MemoryRouter>
      <TopBarSearchProvider>
        <TopBarSearchContent />
        {page}
      </TopBarSearchProvider>
    </MemoryRouter>,
  )

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockInventoryProductsData.splice(0, mockInventoryProductsData.length)
    mockCreateMutateAsync.mockResolvedValue({ id: 'prod-created' })
    mockUpdateMutateAsync.mockResolvedValue({ id: 'prod-1' })
  })

  it('submits create page using shared form and navigates to product overview', async () => {
    renderWithTopBarSearch(<CreateProductPage />)

    fireEvent.change(screen.getByLabelText(/Product Name/i), { target: { value: 'New Widget' } })
    fireEvent.change(screen.getByLabelText(/^SKU$/i, { selector: 'input' }), { target: { value: 'NW-001' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save Product' }))

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            name: 'New Widget',
            sku: 'NW-001',
          }),
        }),
      )
    })

    expect(mockNavigate).toHaveBeenCalledWith('/inventory/prod-created/overview')
  })

  it('loads edit page values and submits updates without navigating away', async () => {
    renderWithTopBarSearch(<EditProductPage />)

    expect(screen.getByRole('heading', { name: 'Edit Product' })).toBeInTheDocument()
    expect((screen.getByLabelText(/Product Name/i) as HTMLInputElement).value).toBe('Existing Widget')

    fireEvent.change(screen.getByLabelText(/Product Name/i), { target: { value: 'Updated Widget' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Product' }))

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            name: 'Updated Widget',
            sku: 'EX-001',
          }),
          retainedImageUrls: [],
        }),
      )
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('lets users jump from the create page to an existing product from the shared top-bar search', async () => {
    const user = userEvent.setup()
    mockInventoryProductsData.push(
      {
        id: 'prod-2',
        name: 'Warehouse Ladder',
        sku: 'WH-200',
        quantity_on_hand: 9,
      },
      {
        id: 'prod-3',
        name: 'Packing Tape',
        sku: 'PK-300',
        quantity_on_hand: 21,
      },
    )

    renderWithTopBarSearch(<CreateProductPage />)

    await user.type(screen.getByRole('combobox', { name: 'Search items...' }), 'Warehouse')
    await user.keyboard('{Enter}')

    expect(mockNavigate).toHaveBeenCalledWith('/inventory/prod-2/overview')
  })

  it('lets users jump from the edit page to a different product from the shared top-bar search', async () => {
    const user = userEvent.setup()
    mockInventoryProductsData.push(
      {
        id: 'prod-2',
        name: 'Warehouse Ladder',
        sku: 'WH-200',
        quantity_on_hand: 9,
      },
      {
        id: 'prod-3',
        name: 'Packing Tape',
        sku: 'PK-300',
        quantity_on_hand: 21,
      },
    )

    renderWithTopBarSearch(<EditProductPage />)

    await user.type(screen.getByRole('combobox', { name: 'Search items...' }), 'Packing')
    await user.keyboard('{Enter}')

    expect(mockNavigate).toHaveBeenCalledWith('/inventory/prod-3/overview')
  })

  it('supports selecting existing attribute and creating a new one from dropdown', async () => {
    localStorage.setItem(
      'stoqr:company-settings:company-1',
      JSON.stringify({
        custom_fields: [{ key: 'ordinal', type: 'number' }],
      }),
    )

    renderWithTopBarSearch(<CreateProductPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Add Attribute' }))
    fireEvent.change(screen.getByLabelText('Add attribute from existing list'), {
      target: { value: 'ordinal' },
    })

    expect(screen.getByText('ordinal')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add Attribute' }))
    fireEvent.change(screen.getByLabelText('Add attribute from existing list'), {
      target: { value: '__new__' },
    })

    expect(screen.getByLabelText('Attribute Name')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Attribute Name'), {
      target: { value: 'seed_type' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: /^Add Attribute$/i })[1])

    expect(screen.getByText('seed_type')).toBeInTheDocument()
  })

  it('supports selecting an existing attribute value from shared dropdown', async () => {
    renderWithTopBarSearch(<CreateProductPage />)

    fireEvent.change(screen.getByLabelText(/Product Name/i), { target: { value: 'Batch Widget' } })
    fireEvent.change(screen.getByLabelText(/^SKU$/i, { selector: 'input' }), { target: { value: 'BW-001' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add Attribute' }))
    fireEvent.change(screen.getByLabelText('Add attribute from existing list'), {
      target: { value: 'batch' },
    })

    fireEvent.change(screen.getByDisplayValue('Select existing value'), {
      target: { value: JSON.stringify('acme') },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save Product' }))

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            customFields: expect.objectContaining({ batch: 'acme' }),
          }),
        }),
      )
    })
  })
})
