import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProductAdjustPage } from '../product/ProductAdjustPage'

const mockMutateAsync = vi.fn()
const mockRefetch = vi.fn()
const productDetailData = {
  product: {
    id: 'prod-1',
    name: 'Packing Tape',
    sku: 'PK-300',
    quantity_on_hand: 42,
    folder_id: 'folder-2',
    folder_stocks: [
      { id: 'stock-1', folder_id: 'folder-2', quantity_on_hand: 42 },
    ],
    image_urls: [],
  },
  transactions: [],
}
const productFolders = [
  { id: 'folder-1', name: 'Warehouse', parent_id: null },
  { id: 'folder-2', name: 'Aisle 1', parent_id: 'folder-1' },
]

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../components/BasePage', () => ({
  BasePage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../utils', () => ({
  getPublicImageUrl: (path: string) => path,
}))

vi.mock('../../hooks/queries/useQuickScan', () => ({
  useQuickScanTransaction: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useQuickScanUser: () => ({
    data: 'user-1',
  }),
}))

vi.mock('../../hooks/queries/useProducts', () => ({
  useProductFolders: () => ({
    data: productFolders,
  }),
  useProductDetail: () => ({
    data: productDetailData,
    isLoading: false,
    refetch: mockRefetch,
  }),
}))

const renderAdjustPage = () => render(
  <MemoryRouter initialEntries={['/inventory/prod-1/adjust?barcode=BC-100&entryMethod=camera']}>
    <Routes>
      <Route path="/inventory/:id/adjust" element={<ProductAdjustPage />} />
    </Routes>
  </MemoryRouter>,
)

describe('ProductAdjustPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutateAsync.mockResolvedValue(undefined)
    mockRefetch.mockResolvedValue(undefined)
  })

  it('removes reason controls and disables confirm when the quantity is unchanged', async () => {
    renderAdjustPage()

    expect(screen.queryByLabelText('Reason for update')).not.toBeInTheDocument()
    expect(screen.queryByText('Reason for update')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Optional Notes')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm update/i })).toBeDisabled()
      expect(screen.getByText('Adjust the quantity before confirming.')).toBeInTheDocument()
    })
  })

  it('submits inventory adjustments without a reason payload', async () => {
    const user = userEvent.setup()
    renderAdjustPage()

    const quantityInput = await screen.findByRole('spinbutton', { name: 'New quantity' })
    await waitFor(() => {
      expect(quantityInput).toHaveValue(42)
    })
    await user.clear(quantityInput)
    await user.type(quantityInput, '45')
    await user.type(screen.getByLabelText('Optional Notes'), ' Restocked from dock ')
    await user.click(screen.getByRole('button', { name: /confirm update/i }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        companyId: 'company-1',
        productId: 'prod-1',
        userId: 'user-1',
        transactionType: 'scan_in',
        quantity: 3,
        barcode: 'BC-100',
        entryMethod: 'camera',
        note: ' Restocked from dock ',
        stockAfter: 45,
        folderId: 'folder-2',
      }))
    })
    expect(mockMutateAsync.mock.calls[0]?.[0]).not.toHaveProperty('reason')
  })
})
