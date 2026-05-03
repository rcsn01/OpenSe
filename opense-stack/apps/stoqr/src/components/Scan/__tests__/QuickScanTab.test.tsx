import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { QuickScanTab } from '../QuickScanTab'

const mockUseQuickScanUser = vi.fn()
const mockUseQuickScanLookup = vi.fn()
const mockUseQuickScanTransaction = vi.fn()

vi.mock('../../../hooks/queries/useQuickScan', () => ({
  useQuickScanUser: () => mockUseQuickScanUser(),
  useQuickScanLookup: () => mockUseQuickScanLookup(),
  useQuickScanTransaction: () => mockUseQuickScanTransaction(),
}))

const defaultProduct = {
  id: 'prod-1',
  name: 'Eppendorf Tubes 500',
  sku: '30123301',
  quantity_on_hand: 42,
  reorder_point: 10,
  description: null,
  cost_price: null,
  selling_price: null,
  folder_id: null,
  image_urls: [],
  custom_fields: {},
  expiry_date: null,
}

const refetchFn = vi.fn()
const mutateAsyncFn = vi.fn()

describe('QuickScanTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseQuickScanUser.mockReturnValue({ data: 'user-1' })
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

  it('shows camera content without inline manual entry when no scan value', () => {
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
    expect(screen.queryByText('Manual Entry')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Barcode / SKU / Product Name')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^search$/i })).not.toBeInTheDocument()
  })

  it('shows product not found message after lookup with no match', () => {
    mockUseQuickScanLookup.mockReturnValue({
      data: {
        product: null,
        notFoundSku: 'ABC-123',
        lastHandledBy: '—',
      },
      isLoading: false,
      refetch: refetchFn,
    })

    render(
      <QuickScanTab
        scanValue="ABC-123"
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="camera"
        cameraContent={<div>Camera Panel</div>}
      />,
    )

    expect(screen.getByText(/No product found for:/i)).toBeInTheDocument()
    expect(screen.getByText('ABC-123')).toBeInTheDocument()
    expect(screen.queryByText('Camera Panel')).not.toBeInTheDocument()
  })

  it('shows product details with stock badge when product is found', () => {
    mockUseQuickScanLookup.mockReturnValue({
      data: { product: defaultProduct, notFoundSku: null, lastHandledBy: 'Jane Doe' },
      isLoading: false,
      refetch: refetchFn,
    })

    render(
      <QuickScanTab
        scanValue="30123301"
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="manual"
      />,
    )

    expect(screen.getByText('Eppendorf Tubes 500')).toBeInTheDocument()
    expect(screen.getByText('SKU: 30123301')).toBeInTheDocument()
    expect(screen.getByText('42 in stock')).toBeInTheDocument()
    expect(screen.getByText(/Last handled by Jane Doe/)).toBeInTheDocument()
  })

  it('shows three stock mode buttons: Manual, Receive, Dispatch', () => {
    mockUseQuickScanLookup.mockReturnValue({
      data: { product: defaultProduct, notFoundSku: null, lastHandledBy: '—' },
      isLoading: false,
      refetch: refetchFn,
    })

    render(
      <QuickScanTab
        scanValue="30123301"
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="manual"
      />,
    )

    const radioGroup = screen.getByRole('radiogroup', { name: /stock update mode/i })
    const radios = within(radioGroup).getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(screen.getByText('Manual')).toBeInTheDocument()
    expect(screen.getByText('Receive')).toBeInTheDocument()
    expect(screen.getByText('Dispatch')).toBeInTheDocument()
  })

  it('shows Cancel and Confirm Update buttons when product is visible', () => {
    mockUseQuickScanLookup.mockReturnValue({
      data: { product: defaultProduct, notFoundSku: null, lastHandledBy: '—' },
      isLoading: false,
      refetch: refetchFn,
    })

    render(
      <QuickScanTab
        scanValue="30123301"
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="manual"
      />,
    )

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm update/i })).toBeInTheDocument()
  })

  it('shows Mark Out of Stock and Full Restock quick-action buttons', () => {
    mockUseQuickScanLookup.mockReturnValue({
      data: { product: defaultProduct, notFoundSku: null, lastHandledBy: '—' },
      isLoading: false,
      refetch: refetchFn,
    })

    render(
      <QuickScanTab
        scanValue="30123301"
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="manual"
      />,
    )

    expect(screen.getByRole('button', { name: /mark out of stock/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /full restock/i })).toBeInTheDocument()
  })

  it('submits receive transaction via Confirm Update', async () => {
    const user = userEvent.setup()
    mutateAsyncFn.mockResolvedValue(undefined)
    refetchFn.mockResolvedValue(undefined)

    mockUseQuickScanLookup.mockReturnValue({
      data: { product: defaultProduct, notFoundSku: null, lastHandledBy: '—' },
      isLoading: false,
      refetch: refetchFn,
    })

    render(
      <QuickScanTab
        scanValue="30123301"
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="manual"
      />,
    )

    // Receive mode is default; set quantity to trigger pending
    const qtyInput = screen.getByLabelText('Quantity') as HTMLInputElement
    await user.tripleClick(qtyInput)
    await user.keyboard('5')

    await user.click(screen.getByRole('button', { name: /confirm update/i }))

    expect(mutateAsyncFn).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        productId: 'prod-1',
        transactionType: 'scan_in',
        quantity: 5,
      }),
    )
  })

  it('submits dispatch transaction when Dispatch mode is selected', async () => {
    const user = userEvent.setup()
    mutateAsyncFn.mockResolvedValue(undefined)
    refetchFn.mockResolvedValue(undefined)

    mockUseQuickScanLookup.mockReturnValue({
      data: { product: defaultProduct, notFoundSku: null, lastHandledBy: '—' },
      isLoading: false,
      refetch: refetchFn,
    })

    render(
      <QuickScanTab
        scanValue="30123301"
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="manual"
      />,
    )

    // Switch to Dispatch mode
    await user.click(screen.getByText('Dispatch'))

    const qtyInput = screen.getByLabelText('Quantity') as HTMLInputElement
    await user.tripleClick(qtyInput)
    await user.keyboard('3')

    await user.click(screen.getByRole('button', { name: /confirm update/i }))

    expect(mutateAsyncFn).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: 'scan_out',
        quantity: 3,
      }),
    )
  })

  it('Mark Out of Stock sets stock to 0 and triggers confirm', async () => {
    const user = userEvent.setup()
    mutateAsyncFn.mockResolvedValue(undefined)
    refetchFn.mockResolvedValue(undefined)

    mockUseQuickScanLookup.mockReturnValue({
      data: { product: defaultProduct, notFoundSku: null, lastHandledBy: '—' },
      isLoading: false,
      refetch: refetchFn,
    })

    render(
      <QuickScanTab
        scanValue="30123301"
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="manual"
      />,
    )

    await user.click(screen.getByRole('button', { name: /mark out of stock/i }))

    // Should show new stock level of 0
    expect(screen.getByText('0')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /confirm update/i }))

    expect(mutateAsyncFn).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: 'scan_out',
        quantity: 42,
      }),
    )
  })

  it('search again resets scan value', async () => {
    const user = userEvent.setup()
    const setScanValue = vi.fn()
    const onResetSearch = vi.fn()

    mockUseQuickScanLookup.mockReturnValue({
      data: { product: defaultProduct, notFoundSku: null, lastHandledBy: '—' },
      isLoading: false,
      refetch: refetchFn,
    })

    render(
      <QuickScanTab
        scanValue="30123301"
        setScanValue={setScanValue}
        companyId="company-1"
        entryMethod="manual"
        onResetSearch={onResetSearch}
      />,
    )

    await user.click(screen.getByRole('button', { name: /search again/i }))

    expect(setScanValue).toHaveBeenCalledWith('')
    expect(onResetSearch).toHaveBeenCalledTimes(1)
  })

  it('shows loading state while looking up product', () => {
    mockUseQuickScanLookup.mockReturnValue({
      data: null,
      isLoading: true,
      refetch: refetchFn,
    })

    render(
      <QuickScanTab
        scanValue="30123301"
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="manual"
      />,
    )

    expect(screen.getByText('Looking up…')).toBeInTheDocument()
  })
})
