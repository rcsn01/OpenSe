import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppLayout } from '../AppLayout'

vi.mock('@repo/shared/auth/context', () => ({
  useAuth: () => ({
    user: {
      email: 'operator@example.com',
      user_metadata: { full_name: 'Operator' },
    },
    logout: vi.fn(),
  }),
}))

vi.mock('@repo/shared/utils', () => ({
  buildAccountsSettingsUrl: () => '/accounts/settings',
}))

const mockMatchMedia = (matches: boolean) =>
  vi.fn().mockImplementation(() => ({
    matches,
    media: '(max-width: 767px)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))

const renderRoute = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/inventory/:tab" element={<div>Inventory</div>} />
          <Route path="/scan/:tab" element={<div>Scanner</div>} />
          <Route path="/tools/labels/:tab" element={<div>Label Studio</div>} />
          <Route path="/reports/:tab" element={<div>Reports</div>} />
          <Route path="/alerts/:tab" element={<div>Alerts</div>} />
          <Route path="/procurement/:tab" element={<div>Procurement</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('AppLayout', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia(false),
    })
  })

  it('uses the alerts placeholder on alerts routes', () => {
    renderRoute('/alerts/feed')

    expect(screen.getByPlaceholderText('Search alerts...')).toBeInTheDocument()
  })

  it('uses the purchase order placeholder on procurement purchase order routes', () => {
    renderRoute('/procurement/purchase-orders')

    expect(screen.getByPlaceholderText('Search POs...')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search items...')).not.toBeInTheDocument()
  })

  it('uses the generic placeholder on inventory list routes', () => {
    renderRoute('/inventory/all')

    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument()
  })

  it('uses the product placeholder on the scanner scan tab', () => {
    renderRoute('/scan/scan-actions')

    expect(screen.getByPlaceholderText('Search products...')).toBeInTheDocument()
  })

  it('uses the history placeholder on the scanner history tab', () => {
    renderRoute('/scan/scan-history')

    expect(screen.getByPlaceholderText('Search history...')).toBeInTheDocument()
  })

  it('uses the reports placeholder on reports routes', () => {
    renderRoute('/reports/stock-health')

    expect(screen.getByPlaceholderText('Search reports...')).toBeInTheDocument()
  })

  it('uses the label studio placeholder on label studio routes', () => {
    renderRoute('/tools/labels/templates')

    expect(screen.getByPlaceholderText('Search templates...')).toBeInTheDocument()
  })

  it('uses the preview placeholder on the label preview route', () => {
    renderRoute('/tools/labels/preview-batch')

    expect(screen.getByPlaceholderText('Search label products...')).toBeInTheDocument()
  })

  it('does not render page search on non-searchable routes', () => {
    renderRoute('/dashboard')

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })
})
