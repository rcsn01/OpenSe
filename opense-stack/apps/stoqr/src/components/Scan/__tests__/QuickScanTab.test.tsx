import { render, screen } from '@testing-library/react'
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

describe('QuickScanTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseQuickScanUser.mockReturnValue({ data: 'user-1' })
    mockUseQuickScanLookup.mockReturnValue({
      data: null,
      isLoading: false,
      refetch: vi.fn(),
    })
    mockUseQuickScanTransaction.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    })
  })

  it('shows camera panel while there is no scanned value', () => {
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
    expect(screen.queryByText('Scan Lookup')).not.toBeInTheDocument()
  })

  it('shows scan lookup panel after a value is scanned', () => {
    mockUseQuickScanLookup.mockReturnValue({
      data: {
        product: null,
        notFoundSku: 'ABC-123',
        lastHandledBy: '—',
      },
      isLoading: false,
      refetch: vi.fn(),
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

    expect(screen.getByText('Scan Lookup')).toBeInTheDocument()
    expect(screen.queryByText('Camera Panel')).not.toBeInTheDocument()
    expect(screen.getByText(/No product found for:/i)).toBeInTheDocument()
  })
})
