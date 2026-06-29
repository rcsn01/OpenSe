import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TopBarSearchContent, TopBarSearchProvider } from '../../components/Search/TopBarSearch'
import { ScanPage } from '../ScanPage'

const mockQuickScanTab = vi.fn()

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../components/Tabs', () => ({
  Tabs: ({ tabs, activeTab }: { tabs: Array<{ id: string; label: string; content: React.ReactNode }>; activeTab: string }) => (
    <div>
      {tabs.map((tab) => (
        <div key={tab.id}>{tab.label}</div>
      ))}
      <div>{tabs.find((tab) => tab.id === activeTab)?.content ?? null}</div>
    </div>
  ),
}))

vi.mock('../../components/Scan/QuickScanTab', () => ({
  QuickScanTab: (props: {
    scanValue: string
    onProductResolved?: (
      product: { id: string; name: string; sku: string },
      context: { scanValue: string; entryMethod: 'camera' | 'manual'; folderId: string | null },
    ) => void
  }) => {
    mockQuickScanTab(props)
    return (
      <div>
        Quick scan {props.scanValue}
        <button
          type="button"
          onClick={() => props.onProductResolved?.(
            { id: 'prod-1', name: 'Packing Tape', sku: 'PK-300' },
            { scanValue: 'PK-300', entryMethod: 'manual', folderId: null },
          )}
        >
          Resolve product only
        </button>
        <button
          type="button"
          onClick={() => props.onProductResolved?.(
            { id: 'prod-1', name: 'Packing Tape', sku: 'PK-300' },
            { scanValue: 'stoqr:v1:product:prod-1:folder:folder-2', entryMethod: 'camera', folderId: 'folder-2' },
          )}
        >
          Resolve product location
        </button>
      </div>
    )
  },
}))

vi.mock('../../components/Scan/ScanHistoryTab', () => ({
  ScanHistoryTab: ({ searchTerm }: { searchTerm?: string }) => <div>Scan history {searchTerm}</div>,
}))

vi.mock('../../hooks/queries/useInventory', () => ({
  useInventoryProducts: () => ({ data: { products: [] } }),
}))

vi.mock('../../hooks/queries/useQuickScan', () => ({
  useScanHistory: () => ({ data: [] }),
}))

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    isScanning: false,
    start: vi.fn(),
    stop: vi.fn(),
    clear: vi.fn(),
  })),
  Html5QrcodeSupportedFormats: {
    QR_CODE: 'QR_CODE',
    CODE_128: 'CODE_128',
    EAN_13: 'EAN_13',
    EAN_8: 'EAN_8',
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ScanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  it('passes the shared top-bar search term into scan actions', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/scan/scan-actions']}>
        <Routes>
          <Route element={<SearchShell />}>
            <Route path="/scan/:tab" element={<ScanPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByRole('combobox', { name: 'Search products...' }), 'dock scanner')

    expect(screen.getByText('Quick scan dock scanner')).toBeInTheDocument()
  })

  it('passes the shared top-bar search term into scan history', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/scan/scan-history']}>
        <Routes>
          <Route element={<SearchShell />}>
            <Route path="/scan/:tab" element={<ScanPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByRole('combobox', { name: 'Search history...' }), 'dock scanner')

    expect(screen.getByText('Scan history dock scanner')).toBeInTheDocument()
  })

  it('renders inside a full-height shared page shell container', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/scan/scan-actions']}>
        <Routes>
          <Route element={<SearchShell />}>
            <Route path="/scan/:tab" element={<ScanPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    const pageShell = container.querySelector('.app-page-shell')
    expect(pageShell).toHaveStyle({
      display: 'flex',
      height: '100%',
      minHeight: '0',
      overflow: 'hidden',
    })

    const pageContainer = screen.getByText('Quick scan').closest('.stack')
    expect(pageContainer).toHaveStyle({
      display: 'flex',
      flex: '1',
      minHeight: '0',
      overflow: 'hidden',
    })
  })

  it('navigates to adjust with folderId for product-location scans', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/scan/scan-actions']}>
        <Routes>
          <Route element={<SearchShell />}>
            <Route
              path="/scan/:tab"
              element={
                <>
                  <ScanPage />
                  <LocationProbe />
                </>
              }
            />
            <Route path="/inventory/:id/adjust" element={<LocationProbe />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Resolve product location' }))

    expect(screen.getByTestId('location-path')).toHaveTextContent(
      '/inventory/prod-1/adjust?barcode=stoqr%3Av1%3Aproduct%3Aprod-1%3Afolder%3Afolder-2&folderId=folder-2&entryMethod=camera&returnTo=%2Fscan%2Fscan-actions',
    )
  })

  it('navigates to adjust without folderId for product-only scans', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/scan/scan-actions']}>
        <Routes>
          <Route element={<SearchShell />}>
            <Route
              path="/scan/:tab"
              element={
                <>
                  <ScanPage />
                  <LocationProbe />
                </>
              }
            />
            <Route path="/inventory/:id/adjust" element={<LocationProbe />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Resolve product only' }))

    expect(screen.getByTestId('location-path')).toHaveTextContent(
      '/inventory/prod-1/adjust?barcode=PK-300&entryMethod=manual&returnTo=%2Fscan%2Fscan-actions',
    )
  })
})
