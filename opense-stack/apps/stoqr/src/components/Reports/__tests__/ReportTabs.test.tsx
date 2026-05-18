import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StockHealthValuationTab } from "../StockHealthValuationTab";
import { MovementVelocityTab } from "../MovementVelocityTab";
import { ProcurementSuppliersTab } from "../ProcurementSuppliersTab";
import { AuditsShrinkageTab } from "../AuditsShrinkageTab";
import { CustomSavedReportsTab } from "../CustomSavedReportsTab";

const mocks = vi.hoisted(() => ({
  useReportsData: vi.fn(),
  useAuditShrinkageData: vi.fn(),
  useProductFolders: vi.fn(),
  useProcurementSuppliers: vi.fn(),
  useProcurementPurchaseOrders: vi.fn(),
  useProcurementPurchaseOrderItems: vi.fn(),
  useProcurementOrderHistory: vi.fn(),
  useProcurementReceivingLogs: vi.fn(),
}));

vi.mock("../../../hooks/queries/useReports", () => ({
  useReportsData: (...args: unknown[]) => mocks.useReportsData(...args),
  useAuditShrinkageData: (...args: unknown[]) =>
    mocks.useAuditShrinkageData(...args),
}));

vi.mock("../../../hooks/queries/useProducts", () => ({
  useProductFolders: (...args: unknown[]) => mocks.useProductFolders(...args),
}));

vi.mock("../../../hooks/queries/useProcurementTabs", () => ({
  useProcurementSuppliers: (...args: unknown[]) =>
    mocks.useProcurementSuppliers(...args),
  useProcurementPurchaseOrders: (...args: unknown[]) =>
    mocks.useProcurementPurchaseOrders(...args),
  useProcurementPurchaseOrderItems: (...args: unknown[]) =>
    mocks.useProcurementPurchaseOrderItems(...args),
  useProcurementOrderHistory: (...args: unknown[]) =>
    mocks.useProcurementOrderHistory(...args),
  useProcurementReceivingLogs: (...args: unknown[]) =>
    mocks.useProcurementReceivingLogs(...args),
}));

vi.mock("recharts", () => {
  const Wrapper = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  );
  const Null = () => null;

  return {
    ResponsiveContainer: Wrapper,
    AreaChart: Wrapper,
    Area: Wrapper,
    BarChart: Wrapper,
    Bar: Wrapper,
    CartesianGrid: Null,
    Cell: Null,
    Pie: Wrapper,
    PieChart: Wrapper,
    Tooltip: Null,
    XAxis: Null,
    YAxis: Null,
    LineChart: Wrapper,
    Line: Wrapper,
  };
});

const reportData = {
  products: [
    {
      id: "prod-1",
      name: "PCR Tips",
      sku: "TIP-001",
      quantity_on_hand: 120,
      cost_price: 15,
      selling_price: 40,
      folder_id: "folder-main",
    },
    {
      id: "prod-2",
      name: "Safe-Lock Tubes",
      sku: "TUBE-002",
      quantity_on_hand: 54,
      cost_price: 9,
      selling_price: 18,
      folder_id: "folder-east",
    },
    {
      id: "prod-3",
      name: "Caviwipes",
      sku: "WIP-003",
      quantity_on_hand: 12,
      cost_price: 28,
      selling_price: 62,
      folder_id: "folder-west",
    },
  ],
  transactions: [
    {
      id: "tx-1",
      transaction_type: "purchase",
      quantity_change: 30,
      created_at: "2026-04-12T10:00:00Z",
      notes: "Inbound delivery",
      performed_by: "user-1",
      products: {
        id: "prod-1",
        name: "PCR Tips",
        sku: "TIP-001",
        cost_price: 15,
        selling_price: 40,
      },
      profiles: { id: "user-1", full_name: "Olivia Owner", username: "olivia" },
    },
    {
      id: "tx-2",
      transaction_type: "sale",
      quantity_change: -12,
      created_at: "2026-04-11T09:00:00Z",
      notes: "Outbound shipment",
      performed_by: "user-1",
      products: {
        id: "prod-1",
        name: "PCR Tips",
        sku: "TIP-001",
        cost_price: 15,
        selling_price: 40,
      },
      profiles: { id: "user-1", full_name: "Olivia Owner", username: "olivia" },
    },
    {
      id: "tx-3",
      transaction_type: "scan_out",
      quantity_change: -6,
      created_at: "2026-04-10T08:00:00Z",
      notes: "Picked for order",
      performed_by: "user-2",
      products: {
        id: "prod-2",
        name: "Safe-Lock Tubes",
        sku: "TUBE-002",
        cost_price: 9,
        selling_price: 18,
      },
      profiles: { id: "user-2", full_name: "Avery Analyst", username: "avery" },
    },
    {
      id: "tx-4",
      transaction_type: "return",
      quantity_change: 2,
      created_at: "2026-04-09T11:30:00Z",
      notes: "Customer return",
      performed_by: "user-2",
      products: {
        id: "prod-2",
        name: "Safe-Lock Tubes",
        sku: "TUBE-002",
        cost_price: 9,
        selling_price: 18,
      },
      profiles: { id: "user-2", full_name: "Avery Analyst", username: "avery" },
    },
    {
      id: "tx-5",
      transaction_type: "sale",
      quantity_change: -4,
      created_at: "2026-04-08T14:00:00Z",
      notes: "Outbound shipment",
      performed_by: "user-3",
      products: {
        id: "prod-3",
        name: "Caviwipes",
        sku: "WIP-003",
        cost_price: 28,
        selling_price: 62,
      },
      profiles: { id: "user-3", full_name: "Quinn QA", username: "quinn" },
    },
  ],
  schedules: [
    {
      id: "schedule-1",
      report_type: "weekly_stockout_warning",
      cadence: "weekly",
      day_of_week: 1,
      day_of_month: null,
      time_of_day: "08:00:00",
      recipients: ["ops@acme.test"],
      created_at: "2026-04-01T00:00:00Z",
    },
  ],
  series: [
    { date: "2026-04-10", value: 2400 },
    { date: "2026-04-11", value: 2620 },
  ],
};

const auditData = {
  discrepancies: [
    {
      id: "disc-1",
      transaction_type: "loss",
      source: "receiving",
      quantity_change: -3,
      stock_after: 42,
      created_at: "2026-04-12T10:00:00Z",
      notes: "Damaged in transit during unloading",
      products: {
        id: "prod-a",
        name: "Electrodes",
        sku: "ELC-112",
        cost_price: 15,
        selling_price: 30,
      },
    },
    {
      id: "disc-2",
      transaction_type: "adjustment",
      source: "manual",
      quantity_change: -2,
      stock_after: 118,
      created_at: "2026-04-11T10:00:00Z",
      notes: "Lost/Theft after count",
      products: {
        id: "prod-b",
        name: "Apparel Kit",
        sku: "APP-099",
        cost_price: 12,
        selling_price: 26,
      },
    },
    {
      id: "disc-3",
      transaction_type: "adjustment",
      source: "manual",
      quantity_change: 1,
      stock_after: 16,
      created_at: "2026-04-10T10:00:00Z",
      notes: "Counting error correction",
      products: {
        id: "prod-c",
        name: "Fit Count",
        sku: "FIT-004",
        cost_price: 8,
        selling_price: 16,
      },
    },
    {
      id: "disc-4",
      transaction_type: "adjustment",
      source: "manual",
      quantity_change: -15,
      stock_after: 185,
      created_at: "2026-04-09T10:00:00Z",
      notes: "Expired batch found during audit",
      products: {
        id: "prod-d",
        name: "Food Sample",
        sku: "FOD-882",
        cost_price: 4,
        selling_price: 12,
      },
    },
  ],
  sales: [
    {
      id: "sale-1",
      quantity_change: -100,
      created_at: "2026-03-20T00:00:00Z",
      products: { selling_price: 25 },
    },
  ],
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-13T12:00:00Z"));
  mocks.useReportsData.mockReturnValue({ data: reportData });
  mocks.useAuditShrinkageData.mockReturnValue({ data: auditData });
  mocks.useProductFolders.mockReturnValue({
    data: [
      { id: "folder-main", name: "Main Warehouse" },
      { id: "folder-east", name: "East Coast Hub" },
      { id: "folder-west", name: "West Coast Hub" },
    ],
  });
  mocks.useProcurementSuppliers.mockReturnValue({
    data: [
      {
        id: "sup-1",
        name: "TechGlobal Inc.",
        contact_name: null,
        email: null,
        phone: null,
      },
      {
        id: "sup-2",
        name: "Apex Materials",
        contact_name: null,
        email: null,
        phone: null,
      },
    ],
  });
  mocks.useProcurementPurchaseOrders.mockReturnValue({
    data: [
      {
        id: "po-open",
        po_number: 1002,
        supplier_id: "sup-2",
        status: "in_transit",
        expected_date: "2026-04-20",
        created_at: "2026-04-10T00:00:00Z",
      },
      {
        id: "po-closed-2",
        po_number: 1001,
        supplier_id: "sup-1",
        status: "received",
        expected_date: "2026-04-05",
        created_at: "2026-04-02T00:00:00Z",
      },
    ],
  });
  mocks.useProcurementOrderHistory.mockReturnValue({
    data: [
      {
        id: "po-closed-1",
        po_number: 1000,
        supplier_id: "sup-1",
        status: "received",
        expected_date: "2026-03-12",
        created_at: "2026-03-01T00:00:00Z",
      },
      {
        id: "po-closed-2",
        po_number: 1001,
        supplier_id: "sup-1",
        status: "received",
        expected_date: "2026-04-05",
        created_at: "2026-04-02T00:00:00Z",
      },
    ],
  });
  mocks.useProcurementPurchaseOrderItems.mockReturnValue({
    data: [
      {
        id: "item-1",
        po_id: "po-closed-1",
        product_id: "prod-1",
        quantity_ordered: 40,
        quantity_received: 40,
        unit_cost: 119,
        products: { id: "prod-1", name: "PCR Tips", sku: "TIP-001" },
        purchase_orders: {
          id: "po-closed-1",
          po_number: 1000,
          status: "received",
          expected_date: "2026-03-12",
        },
      },
      {
        id: "item-2",
        po_id: "po-closed-2",
        product_id: "prod-1",
        quantity_ordered: 50,
        quantity_received: 50,
        unit_cost: 125,
        products: { id: "prod-1", name: "PCR Tips", sku: "TIP-001" },
        purchase_orders: {
          id: "po-closed-2",
          po_number: 1001,
          status: "received",
          expected_date: "2026-04-05",
        },
      },
      {
        id: "item-3",
        po_id: "po-open",
        product_id: "prod-1",
        quantity_ordered: 35,
        quantity_received: 0,
        unit_cost: 129,
        products: { id: "prod-1", name: "PCR Tips", sku: "TIP-001" },
        purchase_orders: {
          id: "po-open",
          po_number: 1002,
          status: "in_transit",
          expected_date: "2026-04-20",
        },
      },
    ],
  });
  mocks.useProcurementReceivingLogs.mockReturnValue({
    data: [
      {
        id: "log-1",
        po_id: "po-closed-1",
        product_id: "prod-1",
        quantity_received: 40,
        received_at: "2026-03-10T00:00:00Z",
        notes: null,
        products: { name: "PCR Tips", sku: "TIP-001" },
        purchase_orders: { po_number: 1000 },
        profiles: { full_name: "Olivia Owner", username: "olivia" },
      },
      {
        id: "log-2",
        po_id: "po-closed-2",
        product_id: "prod-1",
        quantity_received: 50,
        received_at: "2026-04-04T00:00:00Z",
        notes: null,
        products: { name: "PCR Tips", sku: "TIP-001" },
        purchase_orders: { po_number: 1001 },
        profiles: { full_name: "Olivia Owner", username: "olivia" },
      },
    ],
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("report tabs", () => {
  it("renders stock health and valuation metrics", () => {
    render(<StockHealthValuationTab companyId="company-1" />);

    expect(screen.getByText("Total Inventory Value")).toBeInTheDocument();
    expect(screen.getByText("$2,622.00")).toBeInTheDocument();
    expect(screen.getByText("Stock Health Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Valuation by Folder")).toBeInTheDocument();
    expect(screen.getByText("Category Breakdown")).toBeInTheDocument();
  });

  it("renders movement and velocity content and supports custom range inputs", () => {
    render(<MovementVelocityTab companyId="company-1" />);

    expect(screen.getByText("Inbound vs. Outbound Volume")).toBeInTheDocument();
    expect(screen.getByText("Top Moving SKUs")).toBeInTheDocument();
    expect(screen.getByText("Recent Transfers")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Custom Range" }));

    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("End")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "30 Days" }));
    expect(screen.getByText("Units shipped this month")).toBeInTheDocument();
  });

  it("renders procurement supplier scorecard and price variance data", () => {
    render(<ProcurementSuppliersTab companyId="company-1" />);

    expect(screen.getByText("Pending PO Value")).toBeInTheDocument();
    expect(screen.getByText("Supplier Scorecard")).toBeInTheDocument();
    expect(screen.getByText("TechGlobal Inc.")).toBeInTheDocument();
    expect(screen.getByText("Excellent")).toBeInTheDocument();
    expect(screen.getByText(/Price Variance/i)).toBeInTheDocument();
    expect(screen.getByText(/TIP-001/i)).toBeInTheDocument();
  });

  it("renders audit shrinkage metrics and filters discrepancy rows by reason", () => {
    render(<AuditsShrinkageTab companyId="company-1" />);

    expect(screen.getByText("Total Shrinkage Value (YTD)")).toBeInTheDocument();
    expect(screen.getByText("Shrinkage Reason Codes")).toBeInTheDocument();
    expect(screen.getByText("Recent Discrepancy Log")).toBeInTheDocument();
    expect(screen.getByText("ELC-112")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Expired" },
    });

    expect(screen.getByText("FOD-882")).toBeInTheDocument();
    expect(screen.queryByText("ELC-112")).not.toBeInTheDocument();
  });

  it("renders custom reports builder and saves a new template locally", () => {
    render(<CustomSavedReportsTab companyId="company-1" />);

    expect(screen.getByText("Saved Templates")).toBeInTheDocument();
    expect(screen.getAllByText("Report Builder").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Weekly Stockout Warning").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Every Monday at 8:00 AM").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Selected Output")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Blank Report" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save Template" }));

    expect(screen.getByText("Custom Report 1")).toBeInTheDocument();
  });
});
