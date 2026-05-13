import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlertRuleEditorPage } from "../AlertRuleEditorPage";

const mockCreateRule = vi.fn();
const mockUpdateRule = vi.fn();
const mockCreateConnector = vi.fn();
const mockCreateConnectorTarget = vi.fn();
const mockStartWhatsAppPairing = vi.fn();
const mockTestConnectorTarget = vi.fn();
const mockTestEmailRecipients = vi.fn();

let mockRule: unknown = {
  id: "rule-1",
  company_id: "company-1",
  name: "Low stock alert",
  alert_type: "low_stock",
  enabled: true,
  condition: { thresholdSource: "product_reorder_point" },
  delivery_channels: ["in_app", "telegram"],
  recipients: ["role:role-manager"],
  created_at: "2026-05-10T00:00:00Z",
  alert_rule_connector_targets: [{ target_id: "target-telegram" }],
};

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

vi.mock("../../contexts/CompanyContext", () => ({
  useCompany: () => ({ companyId: "company-1" }),
}));

vi.mock("../../hooks/queries/useOrganisationPageSettings", () => ({
  useOrganisationPageSettings: () => ({
    data: { reportsEnabled: true, procurementEnabled: true, alertsEnabled: true },
    isLoading: false,
  }),
}));

vi.mock("../../components/BasePage", () => ({
  BasePage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

vi.mock("../../hooks/queries/useAlerts", () => ({
  useAlertRule: () => ({ data: mockRule, isLoading: false }),
  useAlertConnectors: () => ({ data: mockConnectors, isLoading: false }),
  useCreateAlertRule: () => ({ mutateAsync: mockCreateRule, isPending: false }),
  useUpdateAlertRule: () => ({ mutateAsync: mockUpdateRule, isPending: false }),
  useCreateAlertConnector: () => ({ mutateAsync: mockCreateConnector, isPending: false }),
  useCreateAlertConnectorTarget: () => ({ mutateAsync: mockCreateConnectorTarget, isPending: false }),
  useStartWhatsAppPairing: () => ({ mutateAsync: mockStartWhatsAppPairing, isPending: false }),
  useTestAlertConnectorTarget: () => ({ mutateAsync: mockTestConnectorTarget, isPending: false }),
  useTestAlertEmailRecipients: () => ({ mutateAsync: mockTestEmailRecipients, isPending: false }),
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
};

const renderEditorRoute = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/alerts/rules/new"
          element={
            <>
              <AlertRuleEditorPage />
              <LocationProbe />
            </>
          }
        />
        <Route
          path="/alerts/rules/:ruleId"
          element={
            <>
              <AlertRuleEditorPage />
              <LocationProbe />
            </>
          }
        />
        <Route path="/alerts/rules" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

describe("AlertRuleEditorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRule = {
      id: "rule-1",
      company_id: "company-1",
      name: "Low stock alert",
      alert_type: "low_stock",
      enabled: true,
      condition: { thresholdSource: "product_reorder_point" },
      delivery_channels: ["in_app", "telegram"],
      recipients: ["role:role-manager"],
      created_at: "2026-05-10T00:00:00Z",
      alert_rule_connector_targets: [{ target_id: "target-telegram" }],
    };
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
    mockCreateConnector.mockResolvedValue("connector-whatsapp");
    mockStartWhatsAppPairing.mockResolvedValue({
      connectorId: "connector-whatsapp",
      status: "pairing",
      qr: "qr-code",
    });
    mockTestConnectorTarget.mockResolvedValue({ targetName: "Warehouse ops", messageId: "message-1" });
    mockTestEmailRecipients.mockResolvedValue({ recipients: ["admin@acme.test"], messageId: "message-2" });
  });

  it("loads an existing rule with organisation connector targets", () => {
    renderEditorRoute("/alerts/rules/rule-1");

    expect(screen.getByRole("heading", { name: "Edit Alert Rule" })).toBeInTheDocument();
    expect(screen.getByLabelText("Rule name")).toHaveValue("Low stock alert");
    expect(screen.getByLabelText("Notify Manager")).toBeChecked();
    expect(screen.getByRole("switch", { name: "In-app notifications enabled" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "Telegram enabled" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Warehouse ops")).toBeInTheDocument();
    expect(screen.getByText("Always sends")).toBeInTheDocument();
    expect(screen.queryByLabelText("Notify telegram Warehouse ops")).not.toBeInTheDocument();
    expect(screen.queryByText("Delivery queue")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send queued" })).not.toBeInTheDocument();
  });

  it("creates a low-stock rule with email roles and organisation chat destinations", async () => {
    const user = userEvent.setup();
    mockRule = null;

    renderEditorRoute("/alerts/rules/new");

    await user.click(screen.getByRole("switch", { name: "Email notifications enabled" }));
    await user.click(screen.getByLabelText("Notify Manager"));
    await user.click(screen.getByRole("switch", { name: "Telegram enabled" }));
    await user.click(screen.getByRole("button", { name: "Create Rule" }));

    await waitFor(() => {
      expect(mockCreateRule).toHaveBeenCalledWith(
        expect.objectContaining({
          alertType: "low_stock",
          deliveryChannels: ["in_app", "email", "telegram"],
          recipients: ["role:role-manager"],
          connectorTargetIds: ["target-telegram"],
        }),
      );
    });
    expect(screen.getByTestId("location-path")).toHaveTextContent("/alerts/rules");
  });

  it("updates selected channels and targets for an existing rule", async () => {
    const user = userEvent.setup();

    renderEditorRoute("/alerts/rules/rule-1");

    await user.click(screen.getByRole("switch", { name: "Email notifications enabled" }));
    await user.click(screen.getByRole("button", { name: "Save Rule" }));

    await waitFor(() => {
      expect(mockUpdateRule).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: "rule-1",
          deliveryChannels: ["in_app", "email", "telegram"],
          recipients: ["role:role-manager"],
          connectorTargetIds: ["target-telegram"],
        }),
      );
    });
  });

  it("validates role and connector destinations before saving", async () => {
    const user = userEvent.setup();
    mockRule = null;
    mockConnectors = [];

    renderEditorRoute("/alerts/rules/new");

    await user.click(screen.getByRole("switch", { name: "Email notifications enabled" }));
    await user.click(screen.getByRole("button", { name: "Create Rule" }));
    expect(screen.getByText("Select at least one organisation role for email notifications.")).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Email notifications enabled" }));
    await user.click(screen.getByRole("switch", { name: "Telegram enabled" }));
    await user.click(screen.getByRole("button", { name: "Create Rule" }));

    expect(screen.getByText("Set up at least one organisation Telegram target.")).toBeInTheDocument();
    expect(mockCreateRule).not.toHaveBeenCalled();
  });

  it("starts WhatsApp QR pairing from the editor", async () => {
    const user = userEvent.setup();

    renderEditorRoute("/alerts/rules/rule-1");

    await user.click(screen.getByRole("button", { name: "Pair" }));

    await waitFor(() => {
      expect(mockCreateConnector).toHaveBeenCalledWith({
        provider: "whatsapp",
        displayName: "WhatsApp alerts",
        status: "disconnected",
      });
      expect(mockStartWhatsAppPairing).toHaveBeenCalledWith("connector-whatsapp");
    });
    expect(screen.getByText("qr-code")).toBeInTheDocument();
  });

  it("sends real integration tests for email and connector targets", async () => {
    const user = userEvent.setup();

    renderEditorRoute("/alerts/rules/rule-1");

    await user.click(screen.getByRole("switch", { name: "Email notifications enabled" }));
    await user.click(screen.getByRole("button", { name: "Test email integration" }));

    await waitFor(() => {
      expect(mockTestEmailRecipients).toHaveBeenCalledWith(["role-manager"]);
      expect(screen.getByText("Email test sent to 1 recipient.")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Test integration" }));

    await waitFor(() => {
      expect(mockTestConnectorTarget).toHaveBeenCalledWith("target-telegram");
      expect(screen.getByText("Test message sent to Warehouse ops.")).toBeInTheDocument();
    });
  });

  it("shows a clear Mattermost setup path when no Mattermost target exists", async () => {
    const user = userEvent.setup();

    renderEditorRoute("/alerts/rules/rule-1");

    expect(screen.getByRole("button", { name: "Set up Mattermost" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Set up Mattermost" }));

    expect(screen.getByRole("heading", { name: "Set up Mattermost target" })).toBeInTheDocument();
    expect(screen.getByText(/simple incoming webhook or a bot token channel target/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Mattermost setup type")).toHaveValue("webhook");
    expect(screen.getByPlaceholderText("Mattermost webhook URL or MATTERMOST_WEBHOOKS_JSON key")).toBeInTheDocument();
    expect(screen.queryByLabelText("Connector target name")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Mattermost target" })).toBeInTheDocument();
  });

  it("adds a Mattermost bot channel target with the required channel prefix", async () => {
    const user = userEvent.setup();
    mockCreateConnector.mockResolvedValue("connector-mattermost");
    mockConnectors = [];

    renderEditorRoute("/alerts/rules/rule-1");

    await user.selectOptions(screen.getByLabelText("Connector provider"), "mattermost");
    await user.selectOptions(screen.getByLabelText("Mattermost setup type"), "bot_channel");
    expect(screen.getByLabelText("Mattermost base URL")).toBeInTheDocument();
    expect(screen.getByLabelText("Mattermost bot token")).toBeInTheDocument();
    expect(screen.queryByLabelText("Connector target name")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Mattermost base URL"), "https://mattermost.example.com");
    await user.type(screen.getByLabelText("Mattermost bot token"), "mm-token");
    await user.type(screen.getByLabelText("Mattermost channel ID"), "abc123def456ghi789jkl012mn");
    await user.click(screen.getByRole("button", { name: "Add Mattermost target" }));

    await waitFor(() => {
      expect(mockCreateConnector).toHaveBeenCalledWith({
        provider: "mattermost",
        displayName: "Mattermost alerts",
        status: "connected",
      });
      expect(mockCreateConnectorTarget).toHaveBeenCalledWith({
        connectorId: "connector-mattermost",
        payload: {
          targetType: "channel",
          targetName: "Mattermost channel abc123de",
          providerTargetId: "channel:abc123def456ghi789jkl012mn",
        },
      });
    });
  });
});
