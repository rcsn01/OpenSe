import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { QuickScanTab } from '../QuickScanTab'

const mockUseQuickScanUser = vi.fn()
const mockUseQuickScanLookup = vi.fn()
const mockUseQuickScanTransaction = vi.fn()
const mockUseProductFolders = vi.fn()

vi.mock('../../../hooks/queries/useQuickScan', () => ({
  useQuickScanUser: () => mockUseQuickScanUser(),
  useQuickScanLookup: () => mockUseQuickScanLookup(),
  useQuickScanTransaction: () => mockUseQuickScanTransaction(),
}))

vi.mock('../../../hooks/queries/useProducts', () => ({
  useProductFolders: () => mockUseProductFolders(),
}))

const defaultProduct = {
  id: 'prod-1',
  name: 'AeroPress Coffee Maker',
  sku: 'COF-AERO-001',
  quantity_on_hand: 42,
  reorder_point: 10,
  description: null,
  cost_price: null,
  selling_price: null,
  folder_id: 'folder-2',
  image_urls: [],
  custom_fields: {},
  expiry_date: null,
}

const defaultFolders = [
  { id: 'folder-1', name: 'Aisle 4', parent_id: null },
  { id: 'folder-2', name: 'Shelf B', parent_id: 'folder-1' },
]

const refetchFn = vi.fn()
const mutateAsyncFn = vi.fn()

describe('QuickScanTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseQuickScanUser.mockReturnValue({ data: 'user-1' })
    mockUseProductFolders.mockReturnValue({ data: defaultFolders })
    mockUseQuickScanLookup.mockReturnValue({
      data: null,
      isLoading: false,
      refetch: refetchFn,
    })
    mockUseQuickScanTransaction.mockReturnValue({
      mutateAsync: mutateAsyncFn,
      isPending: false,
    })
  })

  it('shows the camera state when there is no scan value', () => {
    render(
      <QuickScanTab
        scanValue=""
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="manual"
        cameraContent={<div>Camera Panel</div>}
      />,
    )

    expect(screen.getByText('Camera Panel')).toBeInTheDocument()
    expect(screen.queryByText('Scan Item')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /enter code manually/i })).not.toBeInTheDocument()
  })

  it('shows product not found feedback after a lookup miss', () => {
    mockUseQuickScanLookup.mockReturnValue({
      data: {
        product: null,
        notFoundSku: 'UNKNOWN-100',
        lastHandledBy: '—',
        lastUpdatedAt: null,
      },
      isLoading: false,
      refetch: refetchFn,
    })

    render(
      <QuickScanTab
        scanValue="UNKNOWN-100"
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="camera"
      />,
    )

    expect(screen.getByText('Product not found')).toBeInTheDocument()
    expect(screen.getByText(/UNKNOWN-100/)).toBeInTheDocument()
  })

  it('shows the update inventory layout when a product is found', () => {
    mockUseQuickScanLookup.mockReturnValue({
      data: {
        product: defaultProduct,
        notFoundSku: null,
        lastHandledBy: 'Jane Doe',
        lastUpdatedAt: '2026-05-05T10:00:00Z',
      },
      isLoading: false,
      refetch: refetchFn,
    })

    render(
      <QuickScanTab
        scanValue="COF-AERO-001"
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="manual"
      />,
    )

    expect(screen.getByText('Update Inventory')).toBeInTheDocument()
    expect(screen.getByText('AeroPress Coffee Maker')).toBeInTheDocument()
    expect(screen.getByText('Aisle 4, Shelf B')).toBeInTheDocument()
    expect(screen.getByText('Current Stock')).toBeInTheDocument()
    expect(screen.getByDisplayValue('42')).toBeInTheDocument()
    expect(screen.getByText('New Delivery')).toBeInTheDocument()
    expect(screen.getByText('Inventory Audit')).toBeInTheDocument()
  })

  it('submits a new delivery update with the new quantity and note', async () => {
    const user = userEvent.setup()
    mutateAsyncFn.mockResolvedValue(undefined)
    refetchFn.mockResolvedValue(undefined)

    mockUseQuickScanLookup.mockReturnValue({
      data: {
        product: defaultProduct,
        notFoundSku: null,
        lastHandledBy: 'Jane Doe',
        lastUpdatedAt: '2026-05-05T10:00:00Z',
      },
      isLoading: false,
      refetch: refetchFn,
    })

    render(
      <QuickScanTab
        scanValue="COF-AERO-001"
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="manual"
      />,
    )

    const newQuantityInput = screen.getByLabelText('New quantity') as HTMLInputElement
    await user.clear(newQuantityInput)
    await user.type(newQuantityInput, '52')
    await user.type(screen.getByPlaceholderText('Add details about this update...'), 'Received on dock 2')

    await user.click(screen.getByRole('button', { name: /confirm update/i }))

    expect(mutateAsyncFn).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        productId: 'prod-1',
        transactionType: 'scan_in',
        quantity: 10,
        reason: 'new_delivery',
        note: 'Received on dock 2',
        stockAfter: 52,
      }),
    )
  })

  it('submits a sold update when the new quantity is lower than current stock', async () => {
    const user = userEvent.setup()
    mutateAsyncFn.mockResolvedValue(undefined)
    refetchFn.mockResolvedValue(undefined)

    mockUseQuickScanLookup.mockReturnValue({
      data: {
        product: defaultProduct,
        notFoundSku: null,
        lastHandledBy: 'Jane Doe',
        lastUpdatedAt: '2026-05-05T10:00:00Z',
      },
      isLoading: false,
      refetch: refetchFn,
    })

    render(
      <QuickScanTab
        scanValue="COF-AERO-001"
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="manual"
      />,
    )

    await user.click(screen.getByRole('radio', { name: 'Sold' }))

    const newQuantityInput = screen.getByLabelText('New quantity') as HTMLInputElement
    await user.clear(newQuantityInput)
    await user.type(newQuantityInput, '38')

    await user.click(screen.getByRole('button', { name: /confirm update/i }))

    expect(mutateAsyncFn).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: 'scan_out',
        quantity: 4,
        reason: 'sold',
        stockAfter: 38,
      }),
    )
  })

  it('logs an inventory audit when quantity stays the same', async () => {
    const user = userEvent.setup()
    mutateAsyncFn.mockResolvedValue(undefined)
    refetchFn.mockResolvedValue(undefined)

    mockUseQuickScanLookup.mockReturnValue({
      data: {
        product: defaultProduct,
        notFoundSku: null,
        lastHandledBy: 'Jane Doe',
        lastUpdatedAt: '2026-05-05T10:00:00Z',
      },
      isLoading: false,
      refetch: refetchFn,
    })

    render(
      <QuickScanTab
        scanValue="COF-AERO-001"
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="manual"
      />,
    )

    await user.click(screen.getByRole('radio', { name: 'Inventory Audit' }))

    await user.click(screen.getByRole('button', { name: /confirm update/i }))

    expect(mutateAsyncFn).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: 'lookup',
        quantity: 0,
        reason: 'inventory_audit',
        stockAfter: 42,
      }),
    )
  })

  it('returns to scanner mode from the update view', async () => {
    const user = userEvent.setup()
    const setScanValue = vi.fn()
    const onResetSearch = vi.fn()

    mockUseQuickScanLookup.mockReturnValue({
      data: {
        product: defaultProduct,
        notFoundSku: null,
        lastHandledBy: 'Jane Doe',
        lastUpdatedAt: '2026-05-05T10:00:00Z',
      },
      isLoading: false,
      refetch: refetchFn,
    })

    render(
      <QuickScanTab
        scanValue="COF-AERO-001"
        setScanValue={setScanValue}
        companyId="company-1"
        entryMethod="manual"
        onResetSearch={onResetSearch}
      />,
    )

    await user.click(screen.getByRole('button', { name: /back to scanner/i }))

    expect(setScanValue).toHaveBeenCalledWith('')
    expect(onResetSearch).toHaveBeenCalledTimes(1)
  })
})
