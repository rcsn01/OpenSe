import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { QuickScanTab } from '../QuickScanTab'

const mockUseQuickScanLookup = vi.fn()

vi.mock('../../../hooks/queries/useQuickScan', () => ({
  useQuickScanLookup: () => mockUseQuickScanLookup(),
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

describe('QuickScanTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseQuickScanLookup.mockReturnValue({
      data: null,
      isLoading: false,
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
        lastHandledBy: '-',
        lastUpdatedAt: null,
      },
      isLoading: false,
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

  it('hands the resolved product to the adjustment page flow', async () => {
    const onProductResolved = vi.fn()
    mockUseQuickScanLookup.mockReturnValue({
      data: {
        product: defaultProduct,
        notFoundSku: null,
        lastHandledBy: 'Jane Doe',
        lastUpdatedAt: '2026-05-05T10:00:00Z',
      },
      isLoading: false,
    })

    render(
      <QuickScanTab
        scanValue="COF-AERO-001"
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="manual"
        onProductResolved={onProductResolved}
      />,
    )

    expect(screen.getByRole('region', { name: 'Update inventory' })).toBeInTheDocument()
    expect(screen.getByText('Product found')).toBeInTheDocument()
    expect(screen.getByText('Opening stock adjustment for AeroPress Coffee Maker.')).toBeInTheDocument()
    await waitFor(() => {
      expect(onProductResolved).toHaveBeenCalledWith(defaultProduct, {
        scanValue: 'COF-AERO-001',
        entryMethod: 'manual',
      })
    })
  })

  it('does not repeat the handoff while the same product remains resolved', async () => {
    const onProductResolved = vi.fn()
    mockUseQuickScanLookup.mockReturnValue({
      data: {
        product: defaultProduct,
        notFoundSku: null,
        lastHandledBy: 'Jane Doe',
        lastUpdatedAt: '2026-05-05T10:00:00Z',
      },
      isLoading: false,
    })

    const { rerender } = render(
      <QuickScanTab
        scanValue="COF-AERO-001"
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="manual"
        onProductResolved={onProductResolved}
      />,
    )

    rerender(
      <QuickScanTab
        scanValue="COF-AERO-001"
        setScanValue={vi.fn()}
        companyId="company-1"
        entryMethod="manual"
        onProductResolved={onProductResolved}
      />,
    )

    await waitFor(() => {
      expect(onProductResolved).toHaveBeenCalledTimes(1)
    })
  })

  it('returns to scanner mode from the lookup view', async () => {
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
