import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Toggle,
} from "@repo/ui";
import {
  ArrowLeft,
  BellRing,
  Hash,
  Mail,
  MessageCircle,
  Save,
  Smartphone,
} from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { BasePage } from "../components/BasePage";
import { PageAvailabilityGuard } from "../components/PageAvailabilityGuard";
import { useCompany } from "../contexts/CompanyContext";
import {
  useAlertConnectors,
  useAlertRule,
  useCreateAlertConnector,
  useCreateAlertConnectorTarget,
  useCreateAlertRule,
  useStartWhatsAppPairing,
  useTestAlertConnectorTarget,
  useTestAlertEmailRecipients,
  useUpdateAlertRule,
} from "../hooks/queries/useAlerts";
import { useTeamSettingsData } from "../hooks/queries/useTeamSettings";
import type {
  AlertChannel,
  AlertConnectorProvider,
  AlertConnectorTarget,
  AlertRule,
} from "../api/alerts";

type DispatchMethods = {
  inApp: boolean;
  email: boolean;
  telegram: boolean;
  mattermost: boolean;
  whatsapp: boolean;
};

type RuleFormState = {
  name: string;
  recipientRoleIds: string[];
  selectedConnectorTargetIds: string[];
  enabled: boolean;
  dispatchMethods: DispatchMethods;
};

type NewTargetFormState = {
  provider: AlertConnectorProvider;
  mattermostMode: "webhook" | "bot_channel";
  mattermostBaseUrl: string;
  mattermostBotToken: string;
  connectorName: string;
  targetName: string;
  providerTargetId: string;
};

type ConnectorTargetOption = AlertConnectorTarget & {
  provider: AlertConnectorProvider;
  connectorName: string;
  connectorStatus: "disconnected" | "pairing" | "connected" | "error";
};

const LOW_STOCK_RULE_CONDITION = { thresholdSource: "product_reorder_point" };

const chatProviders: AlertConnectorProvider[] = [
  "telegram",
  "mattermost",
  "whatsapp",
];

const emptyRuleForm: RuleFormState = {
  name: "Low stock alert",
  recipientRoleIds: [],
  selectedConnectorTargetIds: [],
  enabled: true,
  dispatchMethods: {
    inApp: true,
    email: false,
    telegram: false,
    mattermost: false,
    whatsapp: false,
  },
};

const emptyNewTargetForm: NewTargetFormState = {
  provider: "telegram",
  mattermostMode: "webhook",
  mattermostBaseUrl: "",
  mattermostBotToken: "",
  connectorName: "Telegram alerts",
  targetName: "",
  providerTargetId: "",
};

const roleToken = (roleId: string) => `role:${roleId}`;

const parseRecipientRoleIds = (rule: AlertRule) =>
  rule.recipients
    .map((recipient) => recipient.replace(/^role:/, ""))
    .filter(Boolean);

const formFromRule = (rule: AlertRule): RuleFormState => ({
  name: rule.name,
  recipientRoleIds: parseRecipientRoleIds(rule),
  selectedConnectorTargetIds:
    rule.alert_rule_connector_targets?.map((target) => target.target_id) ?? [],
  enabled: rule.enabled,
  dispatchMethods: {
    inApp: rule.delivery_channels.includes("in_app"),
    email: rule.delivery_channels.includes("email"),
    telegram: rule.delivery_channels.includes("telegram"),
    mattermost: rule.delivery_channels.includes("mattermost"),
    whatsapp: rule.delivery_channels.includes("whatsapp"),
  },
});

const dispatchMethodLabel: Record<keyof DispatchMethods, string> = {
  inApp: "In-app",
  email: "Email",
  telegram: "Telegram",
  mattermost: "Mattermost",
  whatsapp: "WhatsApp",
};

const providerSetupHint: Record<AlertConnectorProvider, string> = {
  telegram:
    "Use a Telegram Bot API chat ID discovered from bot updates or entered manually.",
  mattermost:
    "Use either a simple incoming webhook or a bot token channel target from your Mattermost server.",
  whatsapp:
    "Pair WhatsApp first, then add the chat or group JID returned by the gateway.",
};

const mattermostSetupHint = {
  webhook:
    "Incoming webhook needs only the webhook URL, or a key from MATTERMOST_WEBHOOKS_JSON if you keep webhook URLs in gateway env.",
  bot_channel:
    "Bot token channel needs MATTERMOST_BASE_URL and MATTERMOST_BOT_TOKEN on the connector gateway, plus a Mattermost Channel ID.",
};

const providerTargetPlaceholder = (form: NewTargetFormState) => {
  if (form.provider === "telegram")
    return "Telegram chat ID, e.g. -1001234567890";
  if (form.provider === "whatsapp")
    return "WhatsApp chat/group JID after pairing";
  return form.mattermostMode === "bot_channel"
    ? "Mattermost Channel ID, e.g. abc123def456ghi789jkl012mn"
    : "Mattermost webhook URL or MATTERMOST_WEBHOOKS_JSON key";
};

export const AlertRuleEditorPage = () => {
  const { companyId } = useCompany();
  const navigate = useNavigate();
  const { ruleId } = useParams<{ ruleId?: string }>();
  const isCreateMode = !ruleId || ruleId === "new";
  const editableRuleId = isCreateMode ? null : (ruleId ?? null);

  const { data: rule, isLoading: loadingRule } = useAlertRule(
    companyId,
    editableRuleId,
  );
  const { data: connectors = [], isLoading: loadingConnectors } =
    useAlertConnectors(companyId);
  const { data: teamSettings, isLoading: loadingTeamSettings } =
    useTeamSettingsData(companyId);
  const createRuleMutation = useCreateAlertRule(companyId);
  const updateRuleMutation = useUpdateAlertRule(companyId);
  const createConnectorMutation = useCreateAlertConnector(companyId);
  const createConnectorTargetMutation =
    useCreateAlertConnectorTarget(companyId);
  const startWhatsAppPairingMutation = useStartWhatsAppPairing(companyId);
  const testConnectorTargetMutation = useTestAlertConnectorTarget(companyId);
  const testEmailRecipientsMutation = useTestAlertEmailRecipients(companyId);

  const roles = teamSettings?.roles ?? [];
  const [ruleForm, setRuleForm] = useState<RuleFormState>(emptyRuleForm);
  const [newTargetForm, setNewTargetForm] =
    useState<NewTargetFormState>(emptyNewTargetForm);
  const [ruleMessage, setRuleMessage] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testingTargetId, setTestingTargetId] = useState<string | null>(null);
  const [whatsAppQr, setWhatsAppQr] = useState<string | null>(null);
  const [localConnectorTargets, setLocalConnectorTargets] = useState<
    ConnectorTargetOption[]
  >([]);

  useEffect(() => {
    if (rule) setRuleForm(formFromRule(rule));
    if (isCreateMode) setRuleForm(emptyRuleForm);
  }, [isCreateMode, rule]);

  const connectorTargets = useMemo(
    () => {
      const byId = new Map<string, ConnectorTargetOption>();
      for (const target of connectors.flatMap((connector) =>
        connector.alert_connector_targets.map((target) => ({
          ...target,
          provider: connector.provider,
          connectorName: connector.display_name,
          connectorStatus: connector.status,
        })),
      )) {
        byId.set(target.id, target);
      }
      for (const target of localConnectorTargets) {
        byId.set(target.id, target);
      }
      return [...byId.values()];
    },
    [connectors, localConnectorTargets],
  );

  if (!isCreateMode && !loadingRule && editableRuleId && !rule) {
    return <Navigate to="/alerts/rules" replace />;
  }

  const toggleRoleRecipient = (roleId: string) => {
    setRuleForm((current) => ({
      ...current,
      recipientRoleIds: current.recipientRoleIds.includes(roleId)
        ? current.recipientRoleIds.filter((currentId) => currentId !== roleId)
        : [...current.recipientRoleIds, roleId],
    }));
  };

  const toggleDispatchMethod = (
    method: keyof DispatchMethods,
    checked: boolean,
  ) => {
    setRuleForm((current) => ({
      ...current,
      dispatchMethods: { ...current.dispatchMethods, [method]: checked },
      selectedConnectorTargetIds:
        !checked && chatProviders.includes(method as AlertConnectorProvider)
          ? current.selectedConnectorTargetIds.filter((targetId) => {
              const target = connectorTargets.find(
                (candidate) => candidate.id === targetId,
              );
              return target?.provider !== method;
            })
          : current.selectedConnectorTargetIds,
    }));
  };

  const toggleConnectorTarget = (targetId: string, checked: boolean) => {
    const target = connectorTargets.find(
      (candidate) => candidate.id === targetId,
    );
    setRuleForm((current) => {
      const selectedConnectorTargetIds = checked
        ? [...new Set([...current.selectedConnectorTargetIds, targetId])]
        : current.selectedConnectorTargetIds.filter(
            (currentTargetId) => currentTargetId !== targetId,
          );

      return {
        ...current,
        selectedConnectorTargetIds,
        dispatchMethods:
          target && checked
            ? { ...current.dispatchMethods, [target.provider]: true }
            : current.dispatchMethods,
      };
    });
  };

  const selectNewTargetProvider = (provider: AlertConnectorProvider) => {
    setNewTargetForm((current) => ({
      ...current,
      provider,
      connectorName: `${dispatchMethodLabel[provider]} alerts`,
      mattermostMode:
        provider === "mattermost" ? current.mattermostMode : "webhook",
    }));
  };

  const normalizeProviderTargetId = () => {
    const value = newTargetForm.providerTargetId.trim();
    if (
      newTargetForm.provider === "mattermost" &&
      newTargetForm.mattermostMode === "bot_channel" &&
      !value.startsWith("channel:")
    ) {
      return `channel:${value}`;
    }
    return value;
  };

  const connectorTargetType = () => {
    if (newTargetForm.provider !== "mattermost") return "chat";
    return newTargetForm.mattermostMode === "webhook" ? "webhook" : "channel";
  };

  const connectorTargetName = () => {
    const explicitName = newTargetForm.targetName.trim();
    if (explicitName) return explicitName;

    const providerTargetId = normalizeProviderTargetId();
    if (newTargetForm.provider === "mattermost") {
      if (newTargetForm.mattermostMode === "bot_channel") {
        return `Mattermost channel ${providerTargetId.replace(/^channel:/, "").slice(0, 8)}`;
      }
      if (/^https?:\/\//i.test(providerTargetId)) {
        try {
          return `Mattermost webhook ${new URL(providerTargetId).hostname}`;
        } catch {
          return "Mattermost webhook";
        }
      }
      return `Mattermost webhook ${providerTargetId}`;
    }

    return explicitName;
  };

  const addConnectorTarget = async () => {
    if (!newTargetForm.providerTargetId.trim()) {
      setRuleMessage(
        "Add the provider target ID before creating a connector target.",
      );
      return;
    }

    if (
      newTargetForm.provider !== "mattermost" &&
      !newTargetForm.targetName.trim()
    ) {
      setRuleMessage("Add a target name before creating a connector target.");
      return;
    }

    let connector = connectors.find(
      (item) => item.provider === newTargetForm.provider,
    );
    if (!connector) {
      const connectorId = await createConnectorMutation.mutateAsync({
        provider: newTargetForm.provider,
        displayName:
          newTargetForm.connectorName.trim() ||
          `${newTargetForm.provider} alerts`,
        status:
          newTargetForm.provider === "whatsapp" ? "disconnected" : "connected",
      });
      connector = {
        id: connectorId,
        company_id: companyId ?? "",
        provider: newTargetForm.provider,
        display_name:
          newTargetForm.connectorName.trim() ||
          `${newTargetForm.provider} alerts`,
        status:
          newTargetForm.provider === "whatsapp" ? "disconnected" : "connected",
        health_status: null,
        last_error: null,
        created_at: new Date().toISOString(),
        alert_connector_targets: [],
      };
    }

    const targetName = connectorTargetName();
    const targetType = connectorTargetType();
    const providerTargetId = normalizeProviderTargetId();
    const targetId = await createConnectorTargetMutation.mutateAsync({
      connectorId: connector.id,
      payload: {
        targetType,
        targetName,
        providerTargetId,
      },
    });
    if (targetId) {
      setLocalConnectorTargets((current) => [
        ...current.filter((target) => target.id !== targetId),
        {
          id: targetId,
          connector_id: connector.id,
          target_type: targetType,
          target_name: targetName,
          provider_target_id: providerTargetId,
          enabled: true,
          created_at: new Date().toISOString(),
          provider: newTargetForm.provider,
          connectorName: connector.display_name,
          connectorStatus: connector.status,
        },
      ]);
    }
    setRuleForm((current) => ({
      ...current,
      dispatchMethods: {
        ...current.dispatchMethods,
        [newTargetForm.provider]: true,
      },
      selectedConnectorTargetIds: targetId
        ? [...new Set([...current.selectedConnectorTargetIds, targetId])]
        : current.selectedConnectorTargetIds,
    }));
    setRuleMessage("Notification target added.");
    setNewTargetForm((current) => ({
      ...current,
      targetName: "",
      providerTargetId: "",
    }));
  };

  const startWhatsAppPairing = async () => {
    let connector = connectors.find((item) => item.provider === "whatsapp");
    if (!connector) {
      const connectorId = await createConnectorMutation.mutateAsync({
        provider: "whatsapp",
        displayName: "WhatsApp alerts",
        status: "disconnected",
      });
      connector = {
        id: connectorId,
        company_id: companyId ?? "",
        provider: "whatsapp",
        display_name: "WhatsApp alerts",
        status: "disconnected",
        health_status: null,
        last_error: null,
        created_at: new Date().toISOString(),
        alert_connector_targets: [],
      };
    }

    const result = await startWhatsAppPairingMutation.mutateAsync(connector.id);
    setWhatsAppQr(result.qr);
    setRuleMessage(
      result.qr
        ? "Scan the WhatsApp QR code using Linked Devices."
        : (result.message ?? "WhatsApp pairing started."),
    );
  };

  const saveRule = async () => {
    if (!ruleForm.name.trim()) {
      setRuleMessage("Add a rule name before saving.");
      return;
    }

    const roleChannels: AlertChannel[] = [];
    if (ruleForm.dispatchMethods.inApp) roleChannels.push("in_app");
    if (ruleForm.dispatchMethods.email) roleChannels.push("email");

    if (
      ruleForm.dispatchMethods.email &&
      ruleForm.recipientRoleIds.length === 0
    ) {
      setRuleMessage(
        "Select at least one organisation role for email notifications.",
      );
      return;
    }

    const enabledChatProviders = chatProviders.filter(
      (provider) => ruleForm.dispatchMethods[provider],
    );
    const missingTargets = enabledChatProviders.filter(
      (provider) =>
        !connectorTargets.some(
          (target) =>
            target.provider === provider &&
            target.enabled &&
            ruleForm.selectedConnectorTargetIds.includes(target.id),
        ),
    );
    if (missingTargets.length > 0) {
      setRuleMessage(
        `Select at least one ${missingTargets.map((provider) => dispatchMethodLabel[provider]).join(", ")} target for this rule.`,
      );
      return;
    }

    const connectorChannels = enabledChatProviders as AlertChannel[];
    const deliveryChannels = [...roleChannels, ...connectorChannels];
    const selectedConnectorTargetIds = connectorTargets
      .filter(
        (target) =>
          target.enabled &&
          enabledChatProviders.includes(target.provider) &&
          ruleForm.selectedConnectorTargetIds.includes(target.id),
      )
      .map((target) => target.id);

    if (deliveryChannels.length === 0) {
      setRuleMessage("Select at least one dispatch method before saving.");
      return;
    }

    const payload = {
      name: ruleForm.name.trim(),
      alertType: "low_stock" as const,
      condition: LOW_STOCK_RULE_CONDITION,
      deliveryChannels,
      recipients: ruleForm.dispatchMethods.email
        ? ruleForm.recipientRoleIds.map(roleToken)
        : [],
      connectorTargetIds: selectedConnectorTargetIds,
      enabled: ruleForm.enabled,
    };

    if (isCreateMode) {
      await createRuleMutation.mutateAsync(payload);
      setRuleMessage("Low stock alert rule created.");
      navigate("/alerts/rules");
      return;
    }

    if (!editableRuleId) return;
    await updateRuleMutation.mutateAsync({
      ruleId: editableRuleId,
      ...payload,
    });
    setRuleMessage("Low stock alert rule updated.");
  };

  const testEmailRecipients = async () => {
    setTestMessage(null);
    try {
      const result = await testEmailRecipientsMutation.mutateAsync(
        ruleForm.recipientRoleIds,
      );
      setTestMessage(
        `Email test sent to ${result.recipients?.length ?? 0} recipient${result.recipients?.length === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setTestMessage(
        error instanceof Error
          ? error.message
          : "Email integration test failed.",
      );
    }
  };

  const testConnectorTarget = async (targetId: string) => {
    setTestMessage(null);
    setTestingTargetId(targetId);
    try {
      const result = await testConnectorTargetMutation.mutateAsync(targetId);
      setTestMessage(
        `Test message sent to ${result.targetName ?? "connector target"}.`,
      );
    } catch (error) {
      setTestMessage(
        error instanceof Error
          ? error.message
          : "Connector integration test failed.",
      );
    } finally {
      setTestingTargetId(null);
    }
  };

  const saveDisabled =
    loadingRule ||
    loadingTeamSettings ||
    createRuleMutation.isPending ||
    updateRuleMutation.isPending;

  return (
    <BasePage
      companyId={companyId}
      isLoading={false}
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to edit alert rules."
      contentClassName="px-2 pb-8 pt-4"
      containerClassName="flex w-full min-w-0 flex-1 flex-col gap-6 text-[var(--color-foreground)]"
    >
      <PageAvailabilityGuard companyId={companyId} feature="alerts">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => navigate("/alerts/rules")}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Back to rules
            </Button>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant={ruleForm.enabled ? "success" : "secondary"}
                  size="sm"
                >
                  {ruleForm.enabled ? "Enabled" : "Disabled"}
                </Badge>
                <Badge variant="secondary" size="sm">
                  Low stock
                </Badge>
              </div>
              <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
                {isCreateMode ? "Create Alert Rule" : "Edit Alert Rule"}
              </h1>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Configure who gets low-stock alerts and where StoQR sends them.
              </p>
            </div>
          </div>
        </div>

        <div className="grid w-full gap-6 xl:grid-cols-4">
          <div className="flex min-w-0 flex-col gap-6 xl:col-span-3">
            <Card padding="lg">
              <CardHeader>
                <CardTitle>Rule details</CardTitle>
                <CardDescription>
                  Keep the trigger simple so warehouse staff can understand when
                  it fires.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-[var(--color-foreground)]">
                    Rule name
                  </span>
                  <Input
                    value={ruleForm.name}
                    onChange={(event) =>
                      setRuleForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    aria-label="Rule name"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-[var(--color-foreground)]">
                    Trigger
                  </span>
                  <Select
                    value="low_stock"
                    disabled
                    aria-label="Trigger type"
                    options={[
                      {
                        value: "low_stock",
                        label: "Quantity on hand <= Low Stock Alert level",
                      },
                    ]}
                  />
                </label>
                <div className="rounded-lg bg-[var(--color-background)] px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">
                    Trigger source
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    Uses each product's Low Stock Alert level.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card padding="lg">
              <CardHeader>
                <CardTitle>Dispatch methods</CardTitle>
                <CardDescription>
                  Select one or more destinations for this alert rule.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(
                  [
                    [
                      "inApp",
                      "In-app notifications",
                      "Delivery rows for members in the selected roles.",
                      BellRing,
                    ],
                    [
                      "email",
                      "Email notifications",
                      "Queue email delivery for members in the selected roles.",
                      Mail,
                    ],
                    [
                      "telegram",
                      "Telegram",
                      "Send alerts to selected organisation Telegram targets.",
                      MessageCircle,
                    ],
                    [
                      "mattermost",
                      "Mattermost",
                      "Send alerts to selected organisation Mattermost targets.",
                      Hash,
                    ],
                    [
                      "whatsapp",
                      "WhatsApp",
                      "Send alerts to selected organisation WhatsApp targets.",
                      Smartphone,
                    ],
                  ] as const
                ).map(([method, title, description, Icon]) => (
                  <div
                    key={method}
                    className="flex min-h-20 items-center justify-between gap-3 rounded-lg bg-[var(--color-background)] px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-lg bg-[var(--color-surface-subtle)] p-2 text-[var(--color-foreground)]">
                        <Icon size={16} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-foreground)]">
                          {title}
                        </p>
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                          {description}
                        </p>
                      </div>
                    </div>
                    <Toggle
                      checked={ruleForm.dispatchMethods[method]}
                      aria-label={`${title} enabled`}
                      onChange={(event) =>
                        toggleDispatchMethod(method, event.target.checked)
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card padding="lg">
              <CardHeader>
                <CardTitle>Email recipients</CardTitle>
                <CardDescription>
                  Email notifications go to members in these organisation roles.
                  Chat connectors are organisation-wide.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTeamSettings ? (
                  <div className="rounded-lg bg-[var(--color-surface-subtle)] p-4 text-sm text-[var(--color-muted-foreground)]">
                    Loading organisation roles...
                  </div>
                ) : roles.length === 0 ? (
                  <div className="rounded-lg bg-[var(--color-surface-subtle)] p-4 text-sm text-[var(--color-muted-foreground)]">
                    No organisation roles are available yet. Create roles in
                    Organisations settings first.
                  </div>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className="flex min-h-10 items-center justify-between gap-3 rounded-lg bg-[var(--color-background)] px-4 py-2"
                      >
                        <span className="text-sm text-[var(--color-foreground)]">
                          {role.name}
                        </span>
                        <input
                          type="checkbox"
                          checked={ruleForm.recipientRoleIds.includes(role.id)}
                          onChange={() => toggleRoleRecipient(role.id)}
                          aria-label={`Notify ${role.name}`}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void testEmailRecipients()}
                  disabled={
                    !ruleForm.dispatchMethods.email ||
                    ruleForm.recipientRoleIds.length === 0 ||
                    testEmailRecipientsMutation.isPending
                  }
                >
                  <Mail size={14} aria-hidden="true" />
                  Test email integration
                </Button>
              </CardFooter>
            </Card>

            <Card padding="lg">
              <CardHeader>
                <CardTitle>Connector targets</CardTitle>
                <CardDescription>
                  Chat alerts go once to each selected organisation target for
                  this rule.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                {chatProviders.map((provider) => {
                  const providerTargets = connectorTargets.filter(
                    (target) => target.provider === provider,
                  );
                  return (
                    <div
                      key={provider}
                      className="rounded-lg bg-[var(--color-background)] p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                            {dispatchMethodLabel[provider]}
                          </h3>
                          <p className="text-sm text-[var(--color-muted-foreground)]">
                            Select the group chats, channels, or webhooks for
                            this rule.
                          </p>
                        </div>
                        <Badge
                          variant={
                            ruleForm.dispatchMethods[provider]
                              ? "success"
                              : "secondary"
                          }
                          size="sm"
                        >
                          {ruleForm.dispatchMethods[provider]
                            ? "Enabled"
                            : "Off"}
                        </Badge>
                      </div>
                      {loadingConnectors ? (
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                          Loading targets...
                        </p>
                      ) : providerTargets.length === 0 ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm text-[var(--color-muted-foreground)]">
                            No {provider} targets yet.
                          </p>
                          <Button
                            type="button"
                            variant="secondary"
                            size="xs"
                            onClick={() => selectNewTargetProvider(provider)}
                          >
                            Set up {dispatchMethodLabel[provider]}
                          </Button>
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          {providerTargets.map((target) => {
                            const selected =
                              ruleForm.selectedConnectorTargetIds.includes(
                                target.id,
                              );
                            return (
                              <div
                                key={target.id}
                                className="flex min-h-10 items-center justify-between gap-3 rounded-md bg-[var(--color-surface-subtle)] px-3 py-2"
                              >
                                <label className="flex min-w-0 items-center gap-3 text-sm text-[var(--color-foreground)]">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    disabled={!target.enabled}
                                    onChange={(event) =>
                                      toggleConnectorTarget(
                                        target.id,
                                        event.target.checked,
                                      )
                                    }
                                    aria-label={`Send ${dispatchMethodLabel[target.provider]} to ${target.target_name}`}
                                  />
                                  <span className="min-w-0">
                                    <span className="font-semibold">
                                      {target.target_name}
                                    </span>
                                    <span className="text-[var(--color-muted-foreground)]">
                                      {" "}
                                      · {target.connectorName}
                                    </span>
                                  </span>
                                </label>
                                <div className="flex shrink-0 items-center gap-2">
                                  <Badge
                                    variant={selected ? "success" : "secondary"}
                                    size="sm"
                                  >
                                    {target.enabled
                                      ? selected
                                        ? "Selected"
                                        : "Not selected"
                                      : "Disabled"}
                                  </Badge>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="xs"
                                    onClick={() =>
                                      void testConnectorTarget(target.id)
                                    }
                                    disabled={
                                      !target.enabled ||
                                      testingTargetId === target.id
                                    }
                                  >
                                    Test integration
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="grid gap-4 rounded-lg bg-[var(--color-background)] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                        Set up {dispatchMethodLabel[newTargetForm.provider]}{" "}
                        target
                      </h3>
                      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                        {providerSetupHint[newTargetForm.provider]}
                      </p>
                      {newTargetForm.provider === "mattermost" ? (
                        <p className="mt-2 max-w-3xl text-sm text-[var(--color-muted-foreground)]">
                          {newTargetForm.mattermostMode === "webhook"
                            ? mattermostSetupHint.webhook
                            : mattermostSetupHint.bot_channel}
                        </p>
                      ) : null}
                    </div>
                    <Select
                      aria-label="Connector provider"
                      value={newTargetForm.provider}
                      options={[
                        { value: "telegram", label: "Telegram" },
                        { value: "mattermost", label: "Mattermost" },
                        { value: "whatsapp", label: "WhatsApp" },
                      ]}
                      onChange={(event) =>
                        selectNewTargetProvider(
                          event.target.value as AlertConnectorProvider,
                        )
                      }
                    />
                  </div>
                  {newTargetForm.provider === "mattermost" ? (
                    <div className="grid gap-3">
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-[var(--color-foreground)]">
                          Mattermost setup type
                        </span>
                        <Select
                          aria-label="Mattermost setup type"
                          value={newTargetForm.mattermostMode}
                          options={[
                            { value: "webhook", label: "Incoming webhook" },
                            {
                              value: "bot_channel",
                              label: "Bot token channel",
                            },
                          ]}
                          onChange={(event) =>
                            setNewTargetForm((current) => ({
                              ...current,
                              mattermostMode: event.target
                                .value as NewTargetFormState["mattermostMode"],
                              providerTargetId: "",
                            }))
                          }
                        />
                      </label>
                      {newTargetForm.mattermostMode === "bot_channel" ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-[var(--color-foreground)]">
                              Mattermost base URL
                            </span>
                            <Input
                              value={newTargetForm.mattermostBaseUrl}
                              onChange={(event) =>
                                setNewTargetForm((current) => ({
                                  ...current,
                                  mattermostBaseUrl: event.target.value,
                                }))
                              }
                              placeholder="https://mattermost.example.com"
                              aria-label="Mattermost base URL"
                            />
                          </label>
                          <label className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-[var(--color-foreground)]">
                              Mattermost bot token
                            </span>
                            <Input
                              type="password"
                              value={newTargetForm.mattermostBotToken}
                              onChange={(event) =>
                                setNewTargetForm((current) => ({
                                  ...current,
                                  mattermostBotToken: event.target.value,
                                }))
                              }
                              placeholder="Paste bot token"
                              aria-label="Mattermost bot token"
                            />
                          </label>
                          <div className="rounded-md bg-[var(--color-surface-subtle)] px-3 py-2 text-sm text-[var(--color-muted-foreground)] md:col-span-2">
                            These secrets are not saved in StoQR. Put them in
                            the connector gateway env as MATTERMOST_BASE_URL and
                            MATTERMOST_BOT_TOKEN, then restart the gateway.
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-md bg-[var(--color-surface-subtle)] px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
                          Paste a Mattermost incoming webhook URL, or use a key
                          from MATTERMOST_WEBHOOKS_JSON if the URL is stored on
                          the gateway.
                        </div>
                      )}
                    </div>
                  ) : null}
                  <div
                    className={
                      newTargetForm.provider === "mattermost"
                        ? "grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
                        : "grid gap-3 md:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
                    }
                  >
                    {newTargetForm.provider === "mattermost" ? null : (
                      <Input
                        value={newTargetForm.targetName}
                        onChange={(event) =>
                          setNewTargetForm((current) => ({
                            ...current,
                            targetName: event.target.value,
                          }))
                        }
                        placeholder="Target name"
                        aria-label="Connector target name"
                      />
                    )}
                    <Input
                      value={newTargetForm.providerTargetId}
                      onChange={(event) =>
                        setNewTargetForm((current) => ({
                          ...current,
                          providerTargetId: event.target.value,
                        }))
                      }
                      placeholder={providerTargetPlaceholder(newTargetForm)}
                      aria-label={
                        newTargetForm.provider === "mattermost" &&
                        newTargetForm.mattermostMode === "bot_channel"
                          ? "Mattermost channel ID"
                          : "Provider target ID"
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void addConnectorTarget()}
                    >
                      <Hash size={14} aria-hidden="true" />
                      Add {dispatchMethodLabel[newTargetForm.provider]} target
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg bg-[var(--color-background)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-[var(--color-info-light)] p-2 text-[var(--color-info)]">
                        <Smartphone size={16} aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-foreground)]">
                          WhatsApp QR pairing
                        </p>
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                          Pair the gateway using WhatsApp Linked Devices.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void startWhatsAppPairing()}
                    >
                      <MessageCircle size={14} aria-hidden="true" />
                      Pair
                    </Button>
                  </div>
                  {whatsAppQr ? (
                    <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-[var(--color-surface-subtle)] p-3 text-xs text-[var(--color-foreground)]">
                      {whatsAppQr}
                    </pre>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex min-w-0 flex-col gap-6 xl:col-span-1">
            <Card padding="lg">
              <CardHeader>
                <CardTitle>Save changes</CardTitle>
                <CardDescription>
                  Review status before this rule starts sending alerts.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[var(--color-foreground)]">
                    Trigger enabled
                  </span>
                  <Toggle
                    checked={ruleForm.enabled}
                    aria-label="Trigger enabled"
                    onChange={(event) =>
                      setRuleForm((current) => ({
                        ...current,
                        enabled: event.target.checked,
                      }))
                    }
                  />
                </div>
                {ruleMessage ? (
                  <div className="rounded-lg bg-[var(--color-surface-subtle)] px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
                    {ruleMessage}
                  </div>
                ) : null}
                {testMessage ? (
                  <div className="rounded-lg bg-[var(--color-surface-subtle)] px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
                    {testMessage}
                  </div>
                ) : null}
              </CardContent>
              <CardFooter>
                <Button
                  type="button"
                  onClick={() => void saveRule()}
                  disabled={saveDisabled}
                >
                  <Save size={14} aria-hidden="true" />
                  {isCreateMode ? "Create Rule" : "Save Rule"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </PageAvailabilityGuard>
    </BasePage>
  );
};
