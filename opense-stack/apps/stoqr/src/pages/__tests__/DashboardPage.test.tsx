import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from '../DashboardPage'

const mockUseDashboard = vi.fn()
const mockUseAlertEvents = vi.fn()
const mockUseProcurementPurchaseOrders = vi.fn()
const mockUseProcurementPurchaseOrderItems = vi.fn()

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../hooks/queries/useDashboard', () => ({
  useDashboard: (...args: unknown[]) => mockUseDashboard(...args),
}))

vi.mock('../../hooks/queries/useAlerts', () => ({
  useAlertEvents: (...args: unknown[]) => mockUseAlertEvents(...args),
}))

vi.mock('../../hooks/queries/useProcurementTabs', () => ({
  useProcurementPurchaseOrders: (...args: unknown[]) => mockUseProcurementPurchaseOrders(...args),
  useProcurementPurchaseOrderItems: (...args: unknown[]) => mockUseProcurementPurchaseOrderItems(...args),
}))

const dashboardData = {
  products: [
    { id: 'p-1', name: 'Wireless Earbuds V2', sku: 'AUD-WE-02', quantity_on_hand: 180, reorder_point: 35, cost_price: 42, selling_price: 85 },
    { id: 'p-2', name: 'USB-C Charging Cable', sku: 'CBL-UC-1M', quantity_on_hand: 120, reorder_point: 25, cost_price: 4, selling_price: 16 },
    { id: 'p-3', name: 'Screen Protector (Pro)', sku: 'SCR-PR-01', quantity_on_hand: 84, reorder_point: 20, cost_price: 3, selling_price: 12 },
    { id: 'p-4', name: 'Smart Watch Band', sku: 'BND-SM-04', quantity_on_hand: 65, reorder_point: 12, cost_price: 6, selling_price: 22 },
    { id: 'p-5', name: 'Phone Case (Clear)', sku: 'CAS-CL-09', quantity_on_hand: 51, reorder_point: 10, cost_price: 5, selling_price: 18 },
    { id: 'p-6', name: 'Acrylic Sign Holder', sku: 'SIG-AC-10', quantity_on_hand: 43, reorder_point: 6, cost_price: 7, selling_price: 19 },
  ],
  transactions: [],
  revenue30Days: 124000,
  totalValue: 1240000,
  totalStockUnits: 4592,
  pendingOrders: 12,
  lowStockCount: 142,
  outOfStockCount: 24,
  topMovers: [
    { id: 'p-1', name: 'Wireless Earbuds V2', sku: 'AUD-WE-02', totalSold: 1240, revenue: 105400 },
    { id: 'p-2', name: 'USB-C Charging Cable', sku: 'CBL-UC-1M', totalSold: 985, revenue: 15760 },
    { id: 'p-3', name: 'Screen Protector (Pro)', sku: 'SCR-PR-01', totalSold: 820, revenue: 9840 },
    { id: 'p-4', name: 'Smart Watch Band', sku: 'BND-SM-04', totalSold: 650, revenue: 14300 },
    { id: 'p-5', name: 'Phone Case (Clear)', sku: 'CAS-CL-09', totalSold: 510, revenue: 9180 },
  ],
  chartData: [
    { date: '2026-04-07', value: 980000 },
    { date: '2026-04-08', value: 1010000 },
    { date: '2026-04-09', value: 1060000 },
    { date: '2026-04-10', value: 1090000 },
    { date: '2026-04-11', value: 1130000 },
    { date: '2026-04-12', value: 1180000 },
    { date: '2026-04-13', value: 1240000 },
  ],
  usageChartData: [
    { date: '2026-04-07', value: 12 },
    { date: '2026-04-08', value: 16 },
    { date: '2026-04-09', value: 18 },
    { date: '2026-04-10', value: 15 },
    { date: '2026-04-11', value: 17 },
    { date: '2026-04-12', value: 19 },
    { date: '2026-04-13', value: 24 },
  ],
  movementChartData: [
    { date: '2026-04-07', inbound: 8, outbound: 4 },
    { date: '2026-04-08', inbound: 11, outbound: 6 },
    { date: '2026-04-09', inbound: 13, outbound: 8 },
    { date: '2026-04-10', inbound: 10, outbound: 9 },
    { date: '2026-04-11', inbound: 12, outbound: 10 },
    { date: '2026-04-12', inbound: 17, outbound: 13 },
    { date: '2026-04-13', inbound: 15, outbound: 17 },
  ],
  alertsSummary: {
    openAlerts: 9,
    criticalAlerts: 5,
    lowStockAlerts: 7,
    reorderAlerts: 4,
    expirationAlerts: 2,
  },
}

beforeEach(() => {
  vi.clearAllMocks()

  mockUseDashboard.mockReturnValue({
    data: dashboardData,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
  })

  mockUseAlertEvents.mockReturnValue({
    data: [
      {
        id: 'a-1',
        company_id: 'company-1',
        rule_id: null,
        product_id: 'p-1',
        alert_type: 'low_stock',
        severity: 'critical',
        status: 'open',
        message: 'Stockout: Lithium Batteries',
        triggered_at: '2026-04-13T10:00:00.000Z',
        products: { name: 'Lithium Batteries', sku: 'BAT-209' },
      },
      {
        id: 'a-2',
        company_id: 'company-1',
        rule_id: null,
        product_id: 'p-2',
        alert_type: 'expiration',
        severity: 'medium',
        status: 'open',
        message: 'Expiring Soon: Adhesives',
        triggered_at: '2026-04-12T10:00:00.000Z',
        products: { name: 'Adhesives', sku: 'BATCH-992A' },
      },
    ],
  })

  mockUseProcurementPurchaseOrders.mockReturnValue({
    data: [
      {
        id: 'po-1',
        po_number: 3842,
        supplier_id: 'sup-1',
        status: 'sent',
        expected_date: '2026-04-14',
        created_at: '2026-04-10T00:00:00.000Z',
        suppliers: { name: 'TechSupply Inc.' },
      },
      {
        id: 'po-2',
        po_number: 3839,
        supplier_id: 'sup-2',
        status: 'partial',
        expected_date: '2026-04-15',
        created_at: '2026-04-11T00:00:00.000Z',
        suppliers: { name: 'Global Components' },
      },
    ],
  })

  mockUseProcurementPurchaseOrderItems.mockReturnValue({
    data: [
      {
        id: 'poi-1',
        po_id: 'po-1',
        product_id: 'p-1',
        quantity_ordered: 40,
        quantity_received: 0,
        unit_cost: 32,
        products: { id: 'p-1', name: 'Keyboards', sku: 'KEY-01' },
        purchase_orders: { id: 'po-1', po_number: 3842, status: 'sent', expected_date: '2026-04-14' },
      },
      {
        id: 'poi-2',
        po_id: 'po-1',
        product_id: 'p-2',
        quantity_ordered: 20,
        quantity_received: 0,
        unit_cost: 15,
        products: { id: 'p-2', name: 'Mice', sku: 'MSE-01' },
        purchase_orders: { id: 'po-1', po_number: 3842, status: 'sent', expected_date: '2026-04-14' },
      },
      {
        id: 'poi-3',
        po_id: 'po-2',
        product_id: 'p-3',
        quantity_ordered: 200,
        quantity_received: 20,
        unit_cost: 18,
        products: { id: 'p-3', name: 'Processors', sku: 'CPU-02' },
        purchase_orders: { id: 'po-2', po_number: 3839, status: 'partial', expected_date: '2026-04-15' },
      },
    ],
  })
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )

describe('DashboardPage', () => {
  it('renders the redesigned dashboard sections with live data', () => {
    renderPage()

    expect(screen.getByText('Total Value')).toBeInTheDocument()
    expect(screen.getByText('Total Items')).toBeInTheDocument()
    expect(screen.getByText('Pending POs')).toBeInTheDocument()
    expect(screen.getByText('Out of Stock')).toBeInTheDocument()
    expect(screen.getByText('Low Stock')).toBeInTheDocument()
    expect(screen.getByText('Inbound vs Outbound Volume')).toBeInTheDocument()
    expect(screen.getByText('Actionable Alerts')).toBeInTheDocument()
    expect(screen.getByText('Expected Deliveries')).toBeInTheDocument()
    expect(screen.getAllByText('TechSupply Inc.').length).toBeGreaterThan(0)
    expect(screen.getByText('Stockout: Lithium Batteries')).toBeInTheDocument()
  })

  it('switches item velocity tabs', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.queryByText('Acrylic Sign Holder')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /dead stock/i }))

    expect(screen.getByText('Acrylic Sign Holder')).toBeInTheDocument()
    expect(screen.getByText('43 idle units')).toBeInTheDocument()
  })

  it('shows true empty-state messaging instead of synthetic movement trends for a new org', () => {
    mockUseDashboard.mockReturnValue({
      data: {
        products: [],
        transactions: [],
        revenue30Days: 0,
        totalValue: 0,
        totalStockUnits: 0,
        pendingOrders: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        topMovers: [],
        chartData: [],
        usageChartData: [],
        movementChartData: [],
        alertsSummary: {
          openAlerts: 0,
          criticalAlerts: 0,
          lowStockAlerts: 0,
          reorderAlerts: 0,
          expirationAlerts: 0,
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    })
    mockUseAlertEvents.mockReturnValue({ data: [] })
    mockUseProcurementPurchaseOrders.mockReturnValue({ data: [] })
    mockUseProcurementPurchaseOrderItems.mockReturnValue({ data: [] })

    renderPage()

    expect(screen.getByText('No movement history yet.')).toBeInTheDocument()
    expect(
      screen.getByText('No inventory movement yet. Add products and transactions to populate velocity insights.'),
    ).toBeInTheDocument()
  })
})
