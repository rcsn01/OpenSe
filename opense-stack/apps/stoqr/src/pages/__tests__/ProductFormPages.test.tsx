import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateProductPage } from '../product/CreateProductPage'
import { EditProductPage } from '../product/EditProductPage'

const {
  mockNavigate,
  mockCreateMutateAsync,
  mockUpdateMutateAsync,
  mockProductDetailData,
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
    data: { products: [] },
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
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockCreateMutateAsync.mockResolvedValue({ id: 'prod-created' })
    mockUpdateMutateAsync.mockResolvedValue({ id: 'prod-1' })
  })

  it('submits create page using shared form and navigates to product overview', async () => {
    render(<CreateProductPage />)

    fireEvent.change(screen.getByLabelText(/Product Name/i), { target: { value: 'New Widget' } })
    fireEvent.change(screen.getByLabelText(/SKU \(Stock Keeping Unit\)/i), { target: { value: 'NW-001' } })

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
    render(<EditProductPage />)

    expect(screen.getByRole('heading', { name: 'Edit Product' })).toBeInTheDocument()
    expect((screen.getByLabelText(/Product Name/i) as HTMLInputElement).value).toBe('Existing Widget')

    fireEvent.change(screen.getByLabelText(/Product Name/i), { target: { value: 'Updated Widget' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update Product' }))

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

  it('supports selecting existing attribute and creating a new one from dropdown', async () => {
    localStorage.setItem(
      'stoqr:company-settings:company-1',
      JSON.stringify({
        custom_fields: [{ key: 'ordinal', type: 'number' }],
      }),
    )

    render(<CreateProductPage />)

    fireEvent.change(screen.getByLabelText('Add attribute from existing list'), {
      target: { value: 'ordinal' },
    })

    expect(screen.getByText('ordinal')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Add attribute from existing list'), {
      target: { value: '__new__' },
    })

    expect(screen.getByPlaceholderText('New Attribute Name')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('New Attribute Name'), {
      target: { value: 'seed_type' },
    })
    fireEvent.click(screen.getByRole('button', { name: /add/i }))

    expect(screen.getByText('seed_type')).toBeInTheDocument()
  })

  it('supports selecting an existing attribute value from shared dropdown', async () => {
    render(<CreateProductPage />)

    fireEvent.change(screen.getByLabelText(/Product Name/i), { target: { value: 'Batch Widget' } })
    fireEvent.change(screen.getByLabelText(/SKU \(Stock Keeping Unit\)/i), { target: { value: 'BW-001' } })

    fireEvent.change(screen.getByLabelText('Add attribute from existing list'), {
      target: { value: 'batch' },
    })

    fireEvent.click(screen.getByRole('button', { name: /select existing value for batch/i }))
    fireEvent.click(screen.getByRole('button', { name: 'acme' }))

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
