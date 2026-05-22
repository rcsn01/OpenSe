import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProductAdjustPage } from '../product/ProductAdjustPage'

const mockMutateAsync = vi.fn()
const mockTransferMutateAsync = vi.fn()
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
      { id: 'stock-2', folder_id: 'folder-3', quantity_on_hand: 0 },
      { id: 'stock-3', folder_id: 'folder-4', quantity_on_hand: 6 },
    ],
    image_urls: [],
  },
  transactions: [],
}
const productFolders = [
  { id: 'folder-1', name: 'Warehouse', parent_id: null },
  { id: 'folder-2', name: 'Aisle 1', parent_id: 'folder-1' },
  { id: 'folder-3', name: 'Showroom', parent_id: null },
  { id: 'folder-4', name: 'Overflow', parent_id: null },
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
  useTransferProductStock: () => ({
    mutateAsync: mockTransferMutateAsync,
    isPending: false,
  }),
}))

const renderAdjustPage = (initialEntry = '/inventory/prod-1/adjust?barcode=BC-100&entryMethod=camera') => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <Routes>
      <Route path="/inventory/:id/adjust" element={<ProductAdjustPage />} />
    </Routes>
  </MemoryRouter>,
)

describe('ProductAdjustPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutateAsync.mockResolvedValue(undefined)
    mockTransferMutateAsync.mockResolvedValue('transfer-group-1')
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

  it('renders transfer mode with stocked sources and destination locations except the source', async () => {
    renderAdjustPage('/inventory/prod-1/adjust?mode=transfer')

    expect(screen.getByRole('tab', { name: 'Transfer' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Source location')).toBeInTheDocument()
    expect(screen.getByLabelText('Destination location')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Transfer quantity' })).toBeInTheDocument()
    expect(screen.getByLabelText('Transfer notes')).toBeInTheDocument()

    const source = screen.getByLabelText('Source location') as HTMLSelectElement
    const destination = screen.getByLabelText('Destination location') as HTMLSelectElement

    expect(source).toHaveDisplayValue('Warehouse, Aisle 1 (42 available)')
    expect(Array.from(source.options).map((option) => option.textContent)).toEqual([
      'Select source',
      'Warehouse, Aisle 1 (42 available)',
      'Overflow (6 available)',
    ])
    expect(Array.from(destination.options).map((option) => option.textContent)).toEqual([
      'Select destination',
      'Warehouse',
      'Showroom',
      'Overflow',
    ])
  })

  it('disables transfer confirm for missing, invalid, over-available, and same-location selections', async () => {
    const user = userEvent.setup()
    renderAdjustPage('/inventory/prod-1/adjust?mode=transfer')

    const confirmButton = screen.getByRole('button', { name: /confirm transfer/i })
    const destination = screen.getByLabelText('Destination location')
    const quantityInput = screen.getByRole('spinbutton', { name: 'Transfer quantity' })

    expect(confirmButton).toBeDisabled()

    await user.selectOptions(destination, 'folder-3')
    await user.type(quantityInput, '0')
    expect(confirmButton).toBeDisabled()

    await user.clear(quantityInput)
    await user.type(quantityInput, '43')
    expect(confirmButton).toBeDisabled()

    await user.clear(quantityInput)
    await user.type(quantityInput, '4')
    expect(confirmButton).not.toBeDisabled()

    await user.selectOptions(destination, 'folder-4')
    await user.selectOptions(screen.getByLabelText('Source location'), 'folder-4')
    expect(confirmButton).toBeDisabled()

    fireEvent.change(destination, { target: { value: 'folder-4' } })
    expect(confirmButton).toBeDisabled()
  })

  it('submits stock transfers through the transfer mutation payload', async () => {
    const user = userEvent.setup()
    renderAdjustPage('/inventory/prod-1/adjust?mode=transfer')

    await user.selectOptions(screen.getByLabelText('Destination location'), 'folder-3')
    await user.type(screen.getByRole('spinbutton', { name: 'Transfer quantity' }), '5')
    await user.type(screen.getByLabelText('Transfer notes'), '  Move to showroom  ')
    await user.click(screen.getByRole('button', { name: /confirm transfer/i }))

    await waitFor(() => {
      expect(mockTransferMutateAsync).toHaveBeenCalledWith({
        fromFolderId: 'folder-2',
        toFolderId: 'folder-3',
        quantity: 5,
        notes: '  Move to showroom  ',
      })
    })
    expect(mockMutateAsync).not.toHaveBeenCalled()
    expect(mockRefetch).toHaveBeenCalled()
  })
})
