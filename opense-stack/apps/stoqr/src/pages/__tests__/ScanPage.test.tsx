import { render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ScanPage } from '../ScanPage'

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../components/BasePage', () => ({
  BasePage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  QuickScanTab: () => <div>Quick scan</div>,
}))

vi.mock('../../components/Scan/ScanHistoryTab', () => ({
  ScanHistoryTab: ({ searchTerm }: { searchTerm?: string }) => <div>Scan history {searchTerm}</div>,
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
  it('passes the shared top-bar search term into scan history', () => {
    render(
      <MemoryRouter initialEntries={['/scan/scan-history']}>
        <Routes>
          <Route element={<Outlet context={{ topBarSearchValue: 'dock scanner', setTopBarSearchValue: vi.fn() }} />}>
            <Route path="/scan/:tab" element={<ScanPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Scan history dock scanner')).toBeInTheDocument()
  })
})