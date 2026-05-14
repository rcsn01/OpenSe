import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDbFrom = vi.fn();
const mockSupabaseRpc = vi.fn();
const mockSupabaseInvoke = vi.fn();

vi.mock("../../supabaseClient", () => ({
  db: {
    from: (...args: unknown[]) => mockDbFrom(...args),
  },
  supabase: {
    rpc: (...args: unknown[]) => mockSupabaseRpc(...args),
    functions: {
      invoke: (...args: unknown[]) => mockSupabaseInvoke(...args),
    },
  },
}));

import {
  createAlertConnectorTarget,
  createAlertRule,
  dispatchAlertNotifications,
  fetchAlertConnectors,
  fetchAlertDeliveryLogs,
  fetchAlertEvents,
  fetchAlertProducts,
  fetchAlertRules,
  testAlertConnectorTarget,
  testAlertEmailRecipients,
  updateAlertRule,
  updateAlertEventStatus,
  updateAlertRuleEnabled,
} from "../alerts";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("alerts api", () => {
  it("fetches alert products from RPC", async () => {
    mockSupabaseRpc.mockResolvedValue({
      data: [
        {
          id: "p-1",
          name: "Milk",
          sku: "MLK",
          quantity_on_hand: 1,
          reorder_point: 2,
          expiry_date: null,
        },
      ],
      error: null,
    });

    const rows = await fetchAlertProducts("company-1");

    expect(rows).toHaveLength(1);
    expect(mockSupabaseRpc).toHaveBeenCalledWith("get_stoqr_alert_products", {
      target_company_id: "company-1",
    });
  });

  it("creates and toggles alert rules", async () => {
    const single = vi
      .fn()
      .mockResolvedValue({ data: { id: "rule-1" }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const deleteFromRuleTargets = vi.fn(() => ({ eq: deleteEq }));
    const ruleTargetsInsert = vi.fn().mockResolvedValue({ error: null });
    const eqCompany = vi.fn().mockResolvedValue({ error: null });
    const eqRule = vi.fn(() => ({ eq: eqCompany }));

    mockDbFrom.mockImplementation((table: string) => {
      if (table === "alert_rules") {
        return {
          insert,
          update: vi.fn(() => ({ eq: eqRule })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        };
      }
      if (table === "alert_rule_connector_targets") {
        return {
          delete: deleteFromRuleTargets,
          insert: ruleTargetsInsert,
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    await createAlertRule("company-1", {
      name: "Rule 1",
      alertType: "custom",
      condition: { threshold: 5 },
      deliveryChannels: ["in_app", "email"],
      recipients: ["ops@example.com"],
      connectorTargetIds: ["target-1", "target-2", "target-1"],
    });

    await updateAlertRuleEnabled("company-1", "rule-1", false);

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: "company-1",
        name: "Rule 1",
        alert_type: "custom",
        enabled: true,
      }),
    );
    expect(eqRule).toHaveBeenCalledWith("id", "rule-1");
    expect(eqCompany).toHaveBeenCalledWith("company_id", "company-1");
    expect(ruleTargetsInsert).toHaveBeenCalledWith([
      { rule_id: "rule-1", target_id: "target-1" },
      { rule_id: "rule-1", target_id: "target-2" },
    ]);
  });

  it("updates alert rules with exact connector target selections", async () => {
    const updateEqCompany = vi.fn().mockResolvedValue({ error: null });
    const updateEqRule = vi.fn(() => ({ eq: updateEqCompany }));
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn().mockResolvedValue({ error: null });

    mockDbFrom.mockImplementation((table: string) => {
      if (table === "alert_rules") {
        return {
          update: vi.fn(() => ({ eq: updateEqRule })),
        };
      }
      if (table === "alert_rule_connector_targets") {
        return {
          delete: vi.fn(() => ({ eq: deleteEq })),
          insert,
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    await updateAlertRule("company-1", "rule-1", {
      name: "Rule 1",
      alertType: "low_stock",
      condition: { thresholdSource: "product_reorder_point" },
      deliveryChannels: ["email", "mattermost"],
      recipients: ["role:manager"],
      connectorTargetIds: ["target-mm-1"],
      enabled: true,
    });

    expect(insert).toHaveBeenCalledWith([
      { rule_id: "rule-1", target_id: "target-mm-1" },
    ]);
  });

  it("creates connector targets and returns the inserted target id", async () => {
    const single = vi
      .fn()
      .mockResolvedValue({ data: { id: "target-new" }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));

    mockDbFrom.mockImplementation((table: string) => {
      if (table === "alert_connector_targets") {
        return { insert };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(
      createAlertConnectorTarget("connector-1", {
        targetType: "webhook",
        targetName: "Warehouse webhook",
        providerTargetId: "https://mattermost.example/hooks/warehouse",
      }),
    ).resolves.toBe("target-new");

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        connector_id: "connector-1",
        target_name: "Warehouse webhook",
        enabled: true,
      }),
    );
  });

  it("fetches alert rules, events and delivery logs", async () => {
    const rulesOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "r-1",
          company_id: "company-1",
          name: "Expiry Rule",
          alert_type: "expiration",
          enabled: true,
          condition: {},
          delivery_channels: ["in_app"],
          recipients: [],
          created_at: "2026-02-24T00:00:00Z",
        },
      ],
      error: null,
    });

    const eventsLimit = vi.fn().mockResolvedValue({
      data: [
        {
          id: "e-1",
          company_id: "company-1",
          rule_id: "r-1",
          product_id: "p-1",
          alert_type: "expiration",
          severity: "high",
          status: "open",
          message: "Expiry soon",
          triggered_at: "2026-02-24T00:00:00Z",
          products: { name: "Milk", sku: "MLK" },
        },
      ],
      error: null,
    });

    const deliveryLimit = vi.fn().mockResolvedValue({
      data: [
        {
          id: "d-1",
          alert_event_id: "e-1",
          channel: "email",
          recipient: "ops@example.com",
          status: "sent",
          sent_at: "2026-02-24T01:00:00Z",
          error_message: null,
          alert_events: {
            message: "Expiry soon",
            alert_type: "expiration",
            severity: "high",
            triggered_at: "2026-02-24T00:00:00Z",
          },
        },
      ],
      error: null,
    });
    const connectorsOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "connector-1",
          company_id: "company-1",
          provider: "telegram",
          display_name: "Telegram alerts",
          status: "connected",
          health_status: null,
          last_error: null,
          created_at: "2026-02-24T00:00:00Z",
          alert_connector_targets: [
            {
              id: "target-1",
              connector_id: "connector-1",
              target_type: "chat",
              target_name: "Ops",
              provider_target_id: "-1001",
              enabled: true,
              created_at: "2026-02-24T00:00:00Z",
            },
          ],
        },
      ],
      error: null,
    });

    mockSupabaseRpc.mockImplementation((fn: string) => {
      if (fn === "get_stoqr_delivered_alert_events") {
        return Promise.resolve({
          data: [
            {
              id: "e-1",
              company_id: "company-1",
              rule_id: "r-1",
              product_id: "p-1",
              alert_type: "expiration",
              severity: "high",
              status: "open",
              message: "Expiry soon",
              triggered_at: "2026-02-24T00:00:00Z",
              delivery_id: "d-1",
              product_name: "Milk",
              product_sku: "MLK",
            },
          ],
          error: null,
        });
      }

      throw new Error(`Unexpected rpc: ${fn}`);
    });

    mockDbFrom.mockImplementation((table: string) => {
      if (table === "alert_rules") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ order: rulesOrder })),
          })),
        };
      }

      if (table === "alert_events") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({ limit: eventsLimit })),
            })),
          })),
        };
      }

      if (table === "alert_delivery_logs") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({ limit: deliveryLimit })),
            })),
          })),
        };
      }

      if (table === "alert_connectors") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ order: connectorsOrder })),
          })),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const [rules, events, deliveries, connectors] = await Promise.all([
      fetchAlertRules("company-1"),
      fetchAlertEvents("company-1"),
      fetchAlertDeliveryLogs("company-1"),
      fetchAlertConnectors("company-1"),
    ]);

    expect(rules).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(deliveries).toHaveLength(1);
    expect(connectors[0].alert_connector_targets[0].target_name).toBe("Ops");
    expect(events[0].products?.sku).toBe("MLK");
    expect(deliveries[0].alert_events?.alert_type).toBe("expiration");
  });

  it("dispatches queued alert notifications", async () => {
    mockSupabaseInvoke.mockResolvedValue({
      data: { claimed: 1, sent: 1, failed: 0, results: [] },
      error: null,
    });

    await expect(
      dispatchAlertNotifications("company-1"),
    ).resolves.toMatchObject({ sent: 1 });
    expect(mockSupabaseInvoke).toHaveBeenCalledWith(
      "send-stoqr-alert-notifications",
      {
        body: { companyId: "company-1", batchSize: 25 },
      },
    );
  });

  it("tests alert integrations through connector management function", async () => {
    mockSupabaseInvoke.mockResolvedValue({
      data: { messageId: "message-1" },
      error: null,
    });

    await expect(
      testAlertConnectorTarget("company-1", "target-1"),
    ).resolves.toMatchObject({ messageId: "message-1" });
    expect(mockSupabaseInvoke).toHaveBeenCalledWith(
      "manage-stoqr-alert-connectors",
      {
        body: {
          action: "test_connector_target",
          companyId: "company-1",
          targetId: "target-1",
        },
      },
    );

    mockSupabaseInvoke.mockResolvedValue({
      data: { recipients: ["ops@example.com"] },
      error: null,
    });

    await expect(
      testAlertEmailRecipients("company-1", ["role-1"]),
    ).resolves.toMatchObject({ recipients: ["ops@example.com"] });
    expect(mockSupabaseInvoke).toHaveBeenCalledWith(
      "manage-stoqr-alert-connectors",
      {
        body: {
          action: "test_email_recipients",
          companyId: "company-1",
          roleIds: ["role-1"],
        },
      },
    );
  });

  it("updates alert event status scoped by company", async () => {
    mockSupabaseRpc.mockResolvedValue({ data: null, error: null });

    await updateAlertEventStatus("company-1", "event-1", "acknowledged");
    await updateAlertEventStatus("company-1", "event-1", "resolved");

    expect(mockSupabaseRpc).toHaveBeenCalledWith(
      "update_stoqr_delivered_alert_status",
      {
        target_company_id: "company-1",
        target_event_id: "event-1",
        next_status: "acknowledged",
      },
    );
    expect(mockSupabaseRpc).toHaveBeenCalledWith(
      "update_stoqr_delivered_alert_status",
      {
        target_company_id: "company-1",
        target_event_id: "event-1",
        next_status: "resolved",
      },
    );
  });
});
