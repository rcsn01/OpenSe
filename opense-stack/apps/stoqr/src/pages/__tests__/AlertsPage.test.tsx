import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlertsPage } from "../AlertsPage";
import { AppLayout } from "../../layouts/AppLayout";

const mockCreateRule = vi.fn();
const mockUpdateRule = vi.fn();
const mockUpdateRuleEnabled = vi.fn();
const mockUpdateEventStatus = vi.fn();
const mockDispatchNotifications = vi.fn();
const mockCreateConnector = vi.fn();
const mockCreateConnectorTarget = vi.fn();
const mockStartWhatsAppPairing = vi.fn();

let mockOrganisationPageSettings = {
  reportsEnabled: true,
  procurementEnabled: true,
  alertsEnabled: true,
};

let mockEvents = [
  {
    id: "event-1",
    company_id: "company-1",
    rule_id: "rule-1",
    product_id: "product-1",
    alert_type: "low_stock" as const,
    severity: "high" as const,
    status: "open" as const,
    message: "PCR Tips is at 4 units, at or below its Low Stock Alert level of 12.",
    triggered_at: "2026-05-12T00:00:00Z",
    products: { name: "PCR Tips", sku: "TIP-001" },
  },
  {
    id: "event-2",
    company_id: "company-1",
    rule_id: "rule-1",
    product_id: "product-2",
    alert_type: "expiration" as const,
    severity: "medium" as const,
    status: "acknowledged" as const,
    message: "Buffer expires soon.",
    triggered_at: "2026-05-11T00:00:00Z",
    products: { name: "Buffer", sku: "BUF-001" },
  },
];

let mockRules = [
  {
    id: "rule-1",
    company_id: "company-1",
    name: "Low stock alert",
    alert_type: "low_stock" as const,
    enabled: true,
    condition: { thresholdSource: "product_reorder_point" },
    delivery_channels: ["in_app" as const],
    recipients: ["role:role-manager"],
    created_at: "2026-05-10T00:00:00Z",
  },
];

let mockDeliveries = [
  {
    id: "delivery-1",
    alert_event_id: "event-1",
    channel: "email" as const,
    recipient: "admin@acme.test",
    status: "pending" as const,
    sent_at: null,
    error_message: null,
    alert_events: {
      message: "PCR Tips is at 4 units, at or below its Low Stock Alert level of 12.",
      alert_type: "low_stock",
      severity: "high",
      triggered_at: "2026-05-12T00:00:00Z",
    },
  },
];

let mockConnectors = [
  {
    id: "connector-telegram",
    company_id: "company-1",
    provider: "telegram" as const,
    display_name: "Telegram alerts",
    status: "connected" as const,
    health_status: null,
    last_error: null,
    created_at: "2026-05-10T00:00:00Z",
    alert_connector_targets: [
      {
        id: "target-telegram",
        connector_id: "connector-telegram",
        target_type: "chat" as const,
        target_name: "Warehouse ops",
        provider_target_id: "-1001",
        enabled: true,
        created_at: "2026-05-10T00:00:00Z",
      },
    ],
  },
];

const mockRoles = [
  {
    id: "role-manager",
    name: "Manager",
    description: "Operations manager",
    role_rank: 800,
  },
  {
    id: "role-viewer",
    name: "Viewer",
    description: "Read-only",
    role_rank: 300,
  },
];

vi.mock("@repo/shared/auth/context", () => ({
  useAuth: () => ({
    user: {
      email: "operator@example.com",
      user_metadata: { full_name: "Operator" },
    },
    logout: vi.fn(),
  }),
}));

vi.mock("@repo/shared/utils", () => ({
  buildAccountsSettingsUrl: () => "/accounts/settings",
}));

vi.mock("../../contexts/CompanyContext", () => ({
  useCompany: () => ({ companyId: "company-1" }),
}));

vi.mock("../../hooks/queries/useOrganisationPageSettings", () => ({
  useOrganisationPageSettings: () => ({
    data: mockOrganisationPageSettings,
    isLoading: false,
  }),
}));

vi.mock("../../hooks/queries/useAlerts", () => ({
  useAlertEvents: () => ({ data: mockEvents, isLoading: false }),
  useAlertDeliveryLogs: () => ({ data: mockDeliveries, isLoading: false }),
  useAlertRules: () => ({ data: mockRules, isLoading: false }),
  useAlertConnectors: () => ({ data: mockConnectors, isLoading: false }),
  useCreateAlertRule: () => ({
    mutateAsync: mockCreateRule,
    isPending: false,
  }),
  useUpdateAlertRule: () => ({
    mutateAsync: mockUpdateRule,
    isPending: false,
  }),
  useUpdateAlertRuleEnabled: () => ({
    mutate: mockUpdateRuleEnabled,
  }),
  useUpdateAlertEventStatus: () => ({
    mutateAsync: mockUpdateEventStatus,
  }),
  useDispatchAlertNotifications: () => ({
    mutateAsync: mockDispatchNotifications,
    isPending: false,
  }),
  useCreateAlertConnector: () => ({
    mutateAsync: mockCreateConnector,
    isPending: false,
  }),
  useCreateAlertConnectorTarget: () => ({
    mutateAsync: mockCreateConnectorTarget,
    isPending: false,
  }),
  useStartWhatsAppPairing: () => ({
    mutateAsync: mockStartWhatsAppPairing,
    isPending: false,
  }),
}));

vi.mock("../../hooks/queries/useTeamSettings", () => ({
  useTeamSettingsData: () => ({
    data: {
      roles: mockRoles,
      members: [],
      invitations: [],
      permissions: [],
      rolePermissions: {},
    },
    isLoading: false,
  }),
}));

vi.mock("../../components/BasePage", () => ({
  BasePage: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
};

const mockMatchMedia = (matches: boolean) =>
  vi.fn().mockImplementation(() => ({
    matches,
    media: "(max-width: 767px)",
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

const renderAlertsRoute = (initialEntry: string, withAppLayout = false) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        {withAppLayout ? (
          <Route element={<AppLayout />}>
            <Route
              path="/alerts/:tab"
              element={
                <>
                  <AlertsPage />
                  <LocationProbe />
                </>
              }
            />
          </Route>
        ) : (
          <>
            <Route
              path="/alerts/:tab"
              element={
                <>
                  <AlertsPage />
                  <LocationProbe />
                </>
              }
            />
            <Route path="*" element={<LocationProbe />} />
          </>
        )}
      </Routes>
    </MemoryRouter>,
  );

describe("AlertsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrganisationPageSettings = {
      reportsEnabled: true,
      procurementEnabled: true,
      alertsEnabled: true,
    };
    mockEvents = [
      {
        id: "event-1",
        company_id: "company-1",
        rule_id: "rule-1",
        product_id: "product-1",
        alert_type: "low_stock",
        severity: "high",
        status: "open",
        message:
          "PCR Tips is at 4 units, at or below its Low Stock Alert level of 12.",
        triggered_at: "2026-05-12T00:00:00Z",
        products: { name: "PCR Tips", sku: "TIP-001" },
      },
      {
        id: "event-2",
        company_id: "company-1",
        rule_id: "rule-1",
        product_id: "product-2",
        alert_type: "expiration",
        severity: "medium",
        status: "acknowledged",
        message: "Buffer expires soon.",
        triggered_at: "2026-05-11T00:00:00Z",
        products: { name: "Buffer", sku: "BUF-001" },
      },
    ];
    mockRules = [
      {
        id: "rule-1",
        company_id: "company-1",
        name: "Low stock alert",
        alert_type: "low_stock",
        enabled: true,
        condition: { thresholdSource: "product_reorder_point" },
        delivery_channels: ["in_app"],
        recipients: ["role:role-manager"],
        created_at: "2026-05-10T00:00:00Z",
      },
    ];
    mockDeliveries = [
      {
        id: "delivery-1",
        alert_event_id: "event-1",
        channel: "email",
        recipient: "admin@acme.test",
        status: "pending",
        sent_at: null,
        error_message: null,
        alert_events: {
          message:
            "PCR Tips is at 4 units, at or below its Low Stock Alert level of 12.",
          alert_type: "low_stock",
          severity: "high",
          triggered_at: "2026-05-12T00:00:00Z",
        },
      },
    ];
    mockConnectors = [
      {
        id: "connector-telegram",
        company_id: "company-1",
        provider: "telegram",
        display_name: "Telegram alerts",
        status: "connected",
        health_status: null,
        last_error: null,
        created_at: "2026-05-10T00:00:00Z",
        alert_connector_targets: [
          {
            id: "target-telegram",
            connector_id: "connector-telegram",
            target_type: "chat",
            target_name: "Warehouse ops",
            provider_target_id: "-1001",
            enabled: true,
            created_at: "2026-05-10T00:00:00Z",
          },
        ],
      },
    ];
    mockDispatchNotifications.mockResolvedValue({ claimed: 1, sent: 1, failed: 0, results: [] });
    mockCreateConnector.mockResolvedValue("connector-new");
    mockStartWhatsAppPairing.mockResolvedValue({ connectorId: "connector-whatsapp", status: "pairing", qr: "qr-code" });

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: mockMatchMedia(false),
    });
  });

  it("renders delivered alerts and supports bulk acknowledgement", async () => {
    const user = userEvent.setup();

    renderAlertsRoute("/alerts/feed");

    const alertsFeedTab = screen.getByRole("button", { name: /alerts feed/i });
    expect(within(alertsFeedTab).getByText("1")).toBeInTheDocument();
    expect(screen.getByText(/PCR Tips is at 4 units/i)).toBeInTheDocument();
    expect(screen.getByText("TIP-001")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Select all visible alerts"));
    await user.click(screen.getAllByRole("button", { name: "Acknowledge" })[0]);

    expect(mockUpdateEventStatus).toHaveBeenCalledWith({
      eventId: "event-1",
      status: "acknowledged",
    });
    expect(mockUpdateEventStatus).toHaveBeenCalledWith({
      eventId: "event-2",
      status: "acknowledged",
    });
  });

  it("filters the feed from the top bar search on alerts routes", async () => {
    const user = userEvent.setup();

    renderAlertsRoute("/alerts/feed", true);

    await user.type(screen.getByPlaceholderText("Search alerts..."), "buffer");

    expect(screen.getByText("Showing 1 of 2 alerts")).toBeInTheDocument();
    expect(screen.getAllByText("Buffer expires soon.").length).toBeGreaterThan(0);
    expect(screen.queryByText(/PCR Tips is at 4 units/i)).not.toBeInTheDocument();
  });

  it("filters the feed using the shared filter buttons", async () => {
    const user = userEvent.setup();

    renderAlertsRoute("/alerts/feed");

    await user.click(screen.getByRole("button", { name: "Stock & Inventory" }));

    expect(screen.getByText("Showing 2 of 2 alerts")).toBeInTheDocument();
    expect(screen.getByText(/PCR Tips is at 4 units/i)).toBeInTheDocument();
    expect(screen.getByText("Buffer expires soon.")).toBeInTheDocument();
  });

  it("renders alert rules as a full-width list", async () => {
    renderAlertsRoute("/alerts/rules");

    expect(screen.getByRole("heading", { name: "Alert Triggers" })).toBeInTheDocument();
    expect(screen.getAllByText("Low stock alert").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Manager").length).toBeGreaterThan(0);
    expect(screen.getAllByText("In-app").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Notify Manager")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /edit low-stock trigger/i })).not.toBeInTheDocument();
  });

  it("navigates to the rule editor from rows and the new trigger action", async () => {
    const user = userEvent.setup();

    renderAlertsRoute("/alerts/rules");

    await user.click(screen.getByText("Low stock alert"));

    expect(screen.getByTestId("location-path")).toHaveTextContent("/alerts/rules/rule-1");

    cleanup();
    renderAlertsRoute("/alerts/rules");
    await user.click(screen.getByRole("button", { name: "New Trigger" }));

    expect(screen.getByTestId("location-path")).toHaveTextContent("/alerts/rules/new");
  });

  it("toggles a rule without navigating to the editor", async () => {
    const user = userEvent.setup();

    renderAlertsRoute("/alerts/rules");

    await user.click(screen.getByRole("switch", { name: "Toggle Low stock alert" }));

    expect(mockUpdateRuleEnabled).toHaveBeenCalledWith({
      ruleId: "rule-1",
      enabled: false,
    });
    expect(screen.getByTestId("location-path")).toHaveTextContent("/alerts/rules");
  });

  it("redirects legacy notifications routes to feed and switches into alert rules", async () => {
    const user = userEvent.setup();

    renderAlertsRoute("/alerts/notifications");

    expect(screen.getByTestId("location-path")).toHaveTextContent(
      "/alerts/feed",
    );

    await user.click(screen.getByRole("button", { name: "Alert Rules" }));

    expect(screen.getByTestId("location-path")).toHaveTextContent(
      "/alerts/rules",
    );
    expect(screen.getByRole("heading", { name: "Alert Triggers" })).toBeInTheDocument();
  });

  it("renders the unavailable message when alerts are disabled", () => {
    mockOrganisationPageSettings = {
      reportsEnabled: true,
      procurementEnabled: true,
      alertsEnabled: false,
    };

    renderAlertsRoute("/alerts/feed");

    expect(
      screen.getByText(
        "Feature unavailable, please contact your admin for assistance.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/PCR Tips is at 4 units/i)).not.toBeInTheDocument();
  });
});
