import { render, screen, waitFor, within } from '@testing-library/react'
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

const renderAdjustPage = (initialEntry = '/inventory/prod-1/adjust') => render(
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
      expect(screen.queryByText('Adjust the quantity before confirming.')).not.toBeInTheDocument()
    })
  })

  it('submits inventory adjustments without a reason payload', async () => {
    const user = userEvent.setup()
    renderAdjustPage('/inventory/prod-1/adjust?barcode=BC-100&entryMethod=camera&returnTo=/scan/scan-actions&folderId=folder-2')

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

  it('renders transfer mode with source and destination folder tree panels', async () => {
    renderAdjustPage('/inventory/prod-1/adjust?mode=transfer')

    expect(screen.getByRole('tab', { name: 'Transfer' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Source' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Destination' })).toBeInTheDocument()
    expect(screen.getByRole('tree', { name: 'Source folders' })).toBeInTheDocument()
    expect(screen.getByRole('tree', { name: 'Destination folders' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /source location/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /destination location/i })).not.toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Transfer quantity' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Decrease transfer quantity' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Increase transfer quantity' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+5' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '-50' })).toBeInTheDocument()
    expect(screen.getByLabelText('Transfer notes')).toBeInTheDocument()

    const sourceTree = screen.getByRole('tree', { name: 'Source folders' })
    const destinationTree = screen.getByRole('tree', { name: 'Destination folders' })

    expect(within(sourceTree).getByRole('treeitem', { name: /Aisle 1 42/ })).toHaveClass('active')
    expect(within(sourceTree).getByRole('treeitem', { name: /Warehouse 0/ })).toHaveAttribute('aria-disabled', 'true')
    expect(within(sourceTree).getByRole('treeitem', { name: /Showroom 0/ })).toHaveAttribute('aria-disabled', 'true')
    expect(within(sourceTree).getByRole('treeitem', { name: /Overflow 6/ })).toBeInTheDocument()
    expect(within(destinationTree).queryByText('Aisle 1')).not.toBeInTheDocument()
    expect(within(destinationTree).getByText('Warehouse')).toBeInTheDocument()
    expect(within(destinationTree).getByText('Showroom')).toBeInTheDocument()
    expect(within(destinationTree).getByText('Overflow')).toBeInTheDocument()
  })

  it('leaves adjust location unselected for scanned product-only URLs', async () => {
    renderAdjustPage('/inventory/prod-1/adjust?barcode=PK-300&entryMethod=camera&returnTo=/scan/scan-actions')

    const folderTree = await screen.findByRole('tree', { name: 'Stock folders' })
    const quantityInput = screen.getByRole('spinbutton', { name: 'New quantity' })

    expect(within(folderTree).getAllByRole('treeitem').every((item) => !item.classList.contains('active'))).toBe(true)
    expect(quantityInput).toHaveValue(0)
    expect(screen.getByRole('button', { name: /confirm update/i })).toBeDisabled()
  })

  it('preselects adjust location from a valid folderId URL', async () => {
    renderAdjustPage('/inventory/prod-1/adjust?barcode=stoqr%3Av1%3Aproduct%3Aprod-1%3Afolder%3Afolder-4&entryMethod=camera&returnTo=/scan/scan-actions&folderId=folder-4')

    const folderTree = await screen.findByRole('tree', { name: 'Stock folders' })
    const quantityInput = screen.getByRole('spinbutton', { name: 'New quantity' })

    expect(within(folderTree).getByRole('treeitem', { name: /Overflow 6/ })).toHaveClass('active')
    expect(quantityInput).toHaveValue(6)
    expect(screen.getByRole('button', { name: /confirm update/i })).toBeDisabled()
  })

  it('preselects transfer source from a valid folderId URL', async () => {
    renderAdjustPage('/inventory/prod-1/adjust?mode=transfer&barcode=stoqr%3Av1%3Aproduct%3Aprod-1%3Afolder%3Afolder-4&entryMethod=camera&returnTo=/scan/scan-actions&folderId=folder-4')

    const sourceTree = await screen.findByRole('tree', { name: 'Source folders' })
    const destinationTree = screen.getByRole('tree', { name: 'Destination folders' })

    expect(within(sourceTree).getByRole('treeitem', { name: /Overflow 6/ })).toHaveClass('active')
    expect(within(destinationTree).queryByText('Overflow')).not.toBeInTheDocument()
    expect(screen.getByText('6', { selector: '.scan-current-stock-value' })).toBeInTheDocument()
  })

  it('leaves transfer source unselected for scanned product-only URLs', async () => {
    renderAdjustPage('/inventory/prod-1/adjust?mode=transfer&barcode=PK-300&entryMethod=camera&returnTo=/scan/scan-actions')

    const sourceTree = await screen.findByRole('tree', { name: 'Source folders' })

    expect(within(sourceTree).getAllByRole('treeitem').every((item) => !item.classList.contains('active'))).toBe(true)
    expect(screen.getByText('0', { selector: '.scan-current-stock-value' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm transfer/i })).toBeDisabled()
  })

  it('selecting a positive-stock source updates availability and resets quantity', async () => {
    const user = userEvent.setup()
    renderAdjustPage('/inventory/prod-1/adjust?mode=transfer')

    const quantityInput = screen.getByRole('spinbutton', { name: 'Transfer quantity' })
    await user.type(quantityInput, '5')
    expect(quantityInput).toHaveValue(5)

    await user.click(screen.getByRole('treeitem', { name: /Overflow 6/ }))

    expect(screen.getByText('6', { selector: '.scan-current-stock-value' })).toBeInTheDocument()
    expect(quantityInput).toHaveValue(0)
  })

  it('adjusts transfer quantity with the same buttons and chips as stock adjustment', async () => {
    const user = userEvent.setup()
    renderAdjustPage('/inventory/prod-1/adjust?mode=transfer')

    const quantityInput = screen.getByRole('spinbutton', { name: 'Transfer quantity' })
    expect(quantityInput).toHaveValue(0)

    await user.click(screen.getByRole('button', { name: 'Increase transfer quantity' }))
    expect(quantityInput).toHaveValue(1)

    await user.click(screen.getByRole('button', { name: '+50' }))
    expect(quantityInput).toHaveValue(42)

    await user.click(screen.getByRole('button', { name: 'Decrease transfer quantity' }))
    expect(quantityInput).toHaveValue(41)

    await user.click(screen.getByRole('button', { name: '-50' }))
    expect(quantityInput).toHaveValue(0)
  })

  it('disables transfer confirm for missing, invalid, over-available, and same-location selections', async () => {
    const user = userEvent.setup()
    renderAdjustPage('/inventory/prod-1/adjust?mode=transfer')

    const confirmButton = screen.getByRole('button', { name: /confirm transfer/i })
    const destinationTree = screen.getByRole('tree', { name: 'Destination folders' })
    const quantityInput = screen.getByRole('spinbutton', { name: 'Transfer quantity' })

    expect(confirmButton).toBeDisabled()

    await user.click(within(destinationTree).getByText('Showroom'))
    await user.type(quantityInput, '0')
    expect(confirmButton).toBeDisabled()

    await user.clear(quantityInput)
    await user.type(quantityInput, '43')
    expect(confirmButton).toBeDisabled()

    await user.clear(quantityInput)
    await user.type(quantityInput, '4')
    expect(confirmButton).not.toBeDisabled()

    await user.click(screen.getByRole('treeitem', { name: /Overflow 6/ }))
    expect(confirmButton).toBeDisabled()

    expect(within(destinationTree).queryByText('Overflow')).not.toBeInTheDocument()
  })

  it('submits stock transfers through the transfer mutation payload', async () => {
    const user = userEvent.setup()
    renderAdjustPage('/inventory/prod-1/adjust?mode=transfer')

    await user.click(within(screen.getByRole('tree', { name: 'Destination folders' })).getByText('Showroom'))
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
