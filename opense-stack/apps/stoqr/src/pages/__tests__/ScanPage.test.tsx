import { render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ScanPage } from '../ScanPage'

const mockBasePage = vi.fn()
const mockQuickScanTab = vi.fn()

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../components/BasePage', () => ({
  BasePage: (props: { children: React.ReactNode }) => {
    mockBasePage(props)
    return <div>{props.children}</div>
  },
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
  QuickScanTab: (props: { scanValue: string }) => {
    mockQuickScanTab(props)
    return <div>Quick scan {props.scanValue}</div>
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

  it('passes the shared top-bar search term into scan actions', () => {
    render(
      <MemoryRouter initialEntries={['/scan/scan-actions']}>
        <Routes>
          <Route element={<Outlet context={{ topBarSearchValue: 'dock scanner', setTopBarSearchValue: vi.fn(), setTopBarSearchConfig: vi.fn() }} />}>
            <Route path="/scan/:tab" element={<ScanPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Quick scan dock scanner')).toBeInTheDocument()
  })

  it('passes the shared top-bar search term into scan history', () => {
    render(
      <MemoryRouter initialEntries={['/scan/scan-history']}>
        <Routes>
          <Route element={<Outlet context={{ topBarSearchValue: 'dock scanner', setTopBarSearchValue: vi.fn(), setTopBarSearchConfig: vi.fn() }} />}>
            <Route path="/scan/:tab" element={<ScanPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Scan history dock scanner')).toBeInTheDocument()
  })

  it('renders inside a full-height base page container', () => {
    render(
      <MemoryRouter initialEntries={['/scan/scan-actions']}>
        <Routes>
          <Route element={<Outlet context={{ topBarSearchValue: '', setTopBarSearchValue: vi.fn(), setTopBarSearchConfig: vi.fn() }} />}>
            <Route path="/scan/:tab" element={<ScanPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(mockBasePage).toHaveBeenCalledWith(
      expect.objectContaining({
        contentStyle: expect.objectContaining({ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden' }),
        containerStyle: expect.objectContaining({ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }),
      }),
    )
  })
})
