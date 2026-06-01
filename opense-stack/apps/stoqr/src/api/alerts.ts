import { db, supabase } from "../supabaseClient";
import type { Product } from "../types";

export type AlertChannel =
  | "in_app"
  | "email"
  | "push"
  | "telegram"
  | "mattermost";
export type AlertConnectorProvider = "telegram" | "mattermost";

export type AlertRule = {
  id: string;
  company_id: string;
  name: string;
  alert_type: "low_stock" | "reorder_point" | "expiration" | "custom";
  enabled: boolean;
  condition: Record<string, unknown>;
  delivery_channels: AlertChannel[];
  recipients: string[];
  created_at: string;
  alert_rule_connector_targets?: Array<{ target_id: string }>;
};

export type AlertEvent = {
  id: string;
  company_id: string;
  rule_id: string | null;
  product_id: string | null;
  folder_id?: string | null;
  alert_type: "low_stock" | "reorder_point" | "expiration" | "custom";
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "resolved";
  message: string;
  triggered_at: string;
  products: { name: string; sku: string } | null;
  folder_name?: string | null;
};

export type AlertDeliveryLog = {
  id: string;
  alert_event_id: string;
  channel: AlertChannel;
  recipient: string | null;
  status: "pending" | "sending" | "sent" | "failed";
  sent_at: string | null;
  error_message: string | null;
  alert_events: {
    message: string;
    alert_type: string;
    severity: string;
    triggered_at: string;
  } | null;
};

export type AlertConnectorTarget = {
  id: string;
  connector_id: string;
  target_type: "chat" | "group" | "channel" | "webhook";
  target_name: string;
  provider_target_id: string;
  enabled: boolean;
  created_at: string;
};

export type AlertConnector = {
  id: string;
  company_id: string;
  provider: AlertConnectorProvider;
  display_name: string;
  status: "disconnected" | "pairing" | "connected" | "error";
  health_status: string | null;
  last_error: string | null;
  created_at: string;
  alert_connector_targets: AlertConnectorTarget[];
};

export type AlertEmailDispatchResult = {
  claimed: number;
  sent: number;
  failed: number;
  results: Array<{
    deliveryId: string;
    recipient: string;
    status: "sent" | "failed";
    error?: string;
  }>;
};

export type AlertNotificationDispatchResult = AlertEmailDispatchResult;

export type AlertIntegrationTestResult = {
  provider?: AlertConnectorProvider;
  targetName?: string;
  recipients?: string[];
  messageId?: string | null;
};

export const fetchAlertProducts = async (
  companyId: string,
): Promise<Product[]> => {
  const { data, error } = await db
    .from("alert_products")
    .select("id, name, sku, quantity_on_hand, reorder_point, expiry_date, folder_id, folder_name")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) throw error;

  return ((data as unknown as Product[] | null) ?? []).map((product) => ({
    ...product,
    description: null,
    cost_price: null,
    selling_price: null,
    folder_id: product.folder_id ?? null,
    image_urls: [],
    custom_fields: {},
  }));
};

const normalizeSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
};

type AlertEventRow = Omit<AlertEvent, "products"> & {
  products:
    | { name: string; sku: string }
    | { name: string; sku: string }[]
    | null;
};

type AlertDeliveryLogRow = Omit<AlertDeliveryLog, "alert_events"> & {
  alert_events:
    | {
        message: string;
        alert_type: string;
        severity: string;
        triggered_at: string;
      }
    | {
        message: string;
        alert_type: string;
        severity: string;
        triggered_at: string;
      }[]
    | null;
};

type DeliveredAlertEventRow = AlertEventRow & {
  delivery_id: string | null;
  product_name: string | null;
  product_sku: string | null;
  folder_id: string | null;
  folder_name: string | null;
};

export const fetchAlertRules = async (
  companyId: string,
): Promise<AlertRule[]> => {
  const { data, error } = await db
    .from("alert_rules")
    .select(
      "id, company_id, name, alert_type, enabled, condition, delivery_channels, recipients, created_at, alert_rule_connector_targets(target_id)",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as AlertRule[] | null) ?? [];
};

export const fetchAlertRule = async (
  companyId: string,
  ruleId: string,
): Promise<AlertRule | null> => {
  const { data, error } = await db
    .from("alert_rules")
    .select(
      "id, company_id, name, alert_type, enabled, condition, delivery_channels, recipients, created_at, alert_rule_connector_targets(target_id)",
    )
    .eq("company_id", companyId)
    .eq("id", ruleId)
    .maybeSingle();

  if (error) throw error;

  return (data as AlertRule | null) ?? null;
};

export const createAlertRule = async (
  companyId: string,
  payload: {
    name: string;
    alertType: AlertRule["alert_type"];
    condition: Record<string, unknown>;
    deliveryChannels: AlertChannel[];
    recipients: string[];
    connectorTargetIds?: string[];
    enabled?: boolean;
  },
) => {
  const { data, error } = await db
    .from("alert_rules")
    .insert({
      company_id: companyId,
      name: payload.name,
      alert_type: payload.alertType,
      condition: payload.condition,
      delivery_channels: payload.deliveryChannels,
      recipients: payload.recipients,
      enabled: payload.enabled ?? true,
    })
    .select("id")
    .single();

  if (error) throw error;

  const ruleId = (data as { id: string } | null)?.id;
  if (ruleId) {
    await replaceAlertRuleConnectorTargets(
      ruleId,
      payload.connectorTargetIds ?? [],
    );
  }
};

export const updateAlertRule = async (
  companyId: string,
  ruleId: string,
  payload: {
    name: string;
    alertType: AlertRule["alert_type"];
    condition: Record<string, unknown>;
    deliveryChannels: AlertChannel[];
    recipients: string[];
    connectorTargetIds?: string[];
    enabled: boolean;
  },
) => {
  const { error } = await db
    .from("alert_rules")
    .update({
      name: payload.name,
      alert_type: payload.alertType,
      condition: payload.condition,
      delivery_channels: payload.deliveryChannels,
      recipients: payload.recipients,
      enabled: payload.enabled,
    })
    .eq("id", ruleId)
    .eq("company_id", companyId);

  if (error) throw error;

  await replaceAlertRuleConnectorTargets(
    ruleId,
    payload.connectorTargetIds ?? [],
  );
};

const replaceAlertRuleConnectorTargets = async (
  ruleId: string,
  targetIds: string[],
) => {
  const { error: deleteError } = await db
    .from("alert_rule_connector_targets")
    .delete()
    .eq("rule_id", ruleId);

  if (deleteError) throw deleteError;

  const uniqueTargetIds = [...new Set(targetIds)].filter(Boolean);
  if (uniqueTargetIds.length === 0) return;

  const { error: insertError } = await db
    .from("alert_rule_connector_targets")
    .insert(
      uniqueTargetIds.map((targetId) => ({
        rule_id: ruleId,
        target_id: targetId,
      })),
    );

  if (insertError) throw insertError;
};

export const updateAlertRuleEnabled = async (
  companyId: string,
  ruleId: string,
  enabled: boolean,
) => {
  const { error } = await db
    .from("alert_rules")
    .update({ enabled })
    .eq("id", ruleId)
    .eq("company_id", companyId);

  if (error) throw error;
};

export const fetchAlertEvents = async (
  companyId: string,
): Promise<AlertEvent[]> => {
  const { data, error } = await db
    .from("delivered_alert_events")
    .select("id, company_id, rule_id, product_id, alert_type, severity, status, message, triggered_at, delivery_id, product_name, product_sku, folder_id, folder_name")
    .eq("company_id", companyId)
    .order("triggered_at", { ascending: false });

  if (error) throw error;

  return ((data as DeliveredAlertEventRow[] | null) ?? []).map((row) => ({
    id: row.id,
    company_id: row.company_id,
    rule_id: row.rule_id,
    product_id: row.product_id,
    folder_id: row.folder_id,
    alert_type: row.alert_type,
    severity: row.severity,
    status: row.status,
    message: row.message,
    triggered_at: row.triggered_at,
    folder_name: row.folder_name,
    products:
      row.product_name || row.product_sku
        ? {
            name: row.product_name ?? "Unknown product",
            sku: row.product_sku ?? "N/A",
          }
        : null,
  }));
};

export const updateAlertEventStatus = async (
  companyId: string,
  eventId: string,
  status: AlertEvent["status"],
) => {
  const { error } = await supabase.rpc("update_stoqr_delivered_alert_status", {
    target_company_id: companyId,
    target_event_id: eventId,
    next_status: status,
  });

  if (error) throw error;
};

export const fetchAlertDeliveryLogs = async (
  companyId: string,
): Promise<AlertDeliveryLog[]> => {
  const { data, error } = await db
    .from("alert_delivery_logs")
    .select(
      "id, alert_event_id, channel, recipient, status, sent_at, error_message, alert_events(message, alert_type, severity, triggered_at)",
    )
    .eq("company_id", companyId)
    .order("sent_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  return ((data as AlertDeliveryLogRow[] | null) ?? []).map((row) => ({
    ...row,
    alert_events: normalizeSingle(row.alert_events),
  }));
};

export const fetchAlertConnectors = async (
  companyId: string,
): Promise<AlertConnector[]> => {
  const { data, error } = await db
    .from("alert_connectors")
    .select(
      "id, company_id, provider, display_name, status, health_status, last_error, created_at, alert_connector_targets(id, connector_id, target_type, target_name, provider_target_id, enabled, created_at)",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return ((data as AlertConnector[] | null) ?? []).map((connector) => ({
    ...connector,
    alert_connector_targets: connector.alert_connector_targets ?? [],
  }));
};

export const createAlertConnector = async (
  companyId: string,
  payload: {
    provider: AlertConnectorProvider;
    displayName: string;
    status?: AlertConnector["status"];
  },
) => {
  const { data, error } = await db
    .from("alert_connectors")
    .insert({
      company_id: companyId,
      provider: payload.provider,
      display_name: payload.displayName,
      status: payload.status ?? "connected",
    })
    .select("id")
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
};

export const createAlertConnectorTarget = async (
  connectorId: string,
  payload: {
    targetType: AlertConnectorTarget["target_type"];
    targetName: string;
    providerTargetId: string;
  },
) => {
  const { data, error } = await db
    .from("alert_connector_targets")
    .insert({
      connector_id: connectorId,
      target_type: payload.targetType,
      target_name: payload.targetName,
      provider_target_id: payload.providerTargetId,
      enabled: true,
    })
    .select("id")
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
};

export const dispatchAlertEmails = async (
  companyId: string,
): Promise<AlertEmailDispatchResult> => {
  const { data, error } = await supabase.functions.invoke(
    "send-stoqr-alert-emails",
    {
      body: { companyId, batchSize: 25 },
    },
  );

  if (error) throw error;

  return (data ?? {
    claimed: 0,
    sent: 0,
    failed: 0,
    results: [],
  }) as AlertEmailDispatchResult;
};

export const dispatchAlertNotifications = async (
  companyId: string,
): Promise<AlertNotificationDispatchResult> => {
  const { data, error } = await supabase.functions.invoke(
    "send-stoqr-alert-notifications",
    {
      body: { companyId, batchSize: 25 },
    },
  );

  if (error) throw error;

  return (data ?? {
    claimed: 0,
    sent: 0,
    failed: 0,
    results: [],
  }) as AlertNotificationDispatchResult;
};

export const testAlertConnectorTarget = async (
  companyId: string,
  targetId: string,
): Promise<AlertIntegrationTestResult> => {
  const { data, error } = await supabase.functions.invoke(
    "manage-stoqr-alert-connectors",
    {
      body: { action: "test_connector_target", companyId, targetId },
    },
  );

  if (error) throw error;

  return (data ?? {}) as AlertIntegrationTestResult;
};

export const testAlertEmailRecipients = async (
  companyId: string,
  roleIds: string[],
): Promise<AlertIntegrationTestResult> => {
  const { data, error } = await supabase.functions.invoke(
    "manage-stoqr-alert-connectors",
    {
      body: { action: "test_email_recipients", companyId, roleIds },
    },
  );

  if (error) throw error;

  return (data ?? {}) as AlertIntegrationTestResult;
};
