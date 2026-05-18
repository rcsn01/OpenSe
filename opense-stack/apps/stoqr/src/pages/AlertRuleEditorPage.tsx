import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Select,
  Toggle,
} from "@repo/ui";
import {
  ArrowLeft,
  BellRing,
  Mail,
  MessageCircle,
  MessageSquare,
  Plus,
  Save,
  Send,
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
  const [activeSetupProvider, setActiveSetupProvider] =
    useState<AlertConnectorProvider | null>(null);
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
    setActiveSetupProvider(provider);
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

  const dispatchMethodItems = [
    {
      method: "inApp",
      title: "In-App Notifications",
      ariaLabel: "In-app notifications enabled",
      description: "Show alerts within the dashboard notification center.",
      icon: BellRing,
    },
    {
      method: "email",
      title: "Email Dispatch",
      ariaLabel: "Email notifications enabled",
      description: "Send standard email summaries to organisation roles.",
      icon: Mail,
    },
    {
      method: "telegram",
      title: "Telegram Connector",
      ariaLabel: "Telegram enabled",
      description: "Forward alerts to designated Telegram chats or groups.",
      icon: MessageCircle,
    },
    {
      method: "mattermost",
      title: "Mattermost Connector",
      ariaLabel: "Mattermost enabled",
      description: "Push detailed rich-text alerts to Mattermost channels.",
      icon: MessageSquare,
    },
    {
      method: "whatsapp",
      title: "WhatsApp Connector",
      ariaLabel: "WhatsApp enabled",
      description: "Send alerts to a paired WhatsApp device or group.",
      icon: Smartphone,
    },
  ] as const;

  const renderEmailTargets = () => (
    <div className="ml-0 border-t border-dashed border-[var(--color-border)] pt-7 sm:ml-[4.5rem]">
      <p className="text-sm font-semibold text-[var(--color-foreground)]">
        Select Target Roles
      </p>
      {loadingTeamSettings ? (
        <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)] p-4 text-sm text-[var(--color-muted-foreground)]">
          Loading organisation roles...
        </div>
      ) : roles.length === 0 ? (
        <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)] p-4 text-sm text-[var(--color-muted-foreground)]">
          No organisation roles are available yet. Create roles in
          Organisations settings first.
        </div>
      ) : (
        <div className="mt-4 grid gap-x-16 gap-y-4 sm:grid-cols-2">
          {roles.map((role) => (
            <label
              key={role.id}
              className="flex min-h-6 items-center gap-3 text-sm font-semibold text-[var(--color-foreground)]"
            >
              <input
                type="checkbox"
                checked={ruleForm.recipientRoleIds.includes(role.id)}
                onChange={() => toggleRoleRecipient(role.id)}
                aria-label={`Notify ${role.name}`}
                className="h-5 w-5 rounded-[var(--radius-sm)] border border-[var(--color-border)] accent-[var(--color-ring)]"
              />
              <span>{role.name}</span>
            </label>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Test email integration"
        className="mt-7 border-[var(--color-border)] text-[var(--color-muted-foreground)]"
        onClick={() => void testEmailRecipients()}
        disabled={
          !ruleForm.dispatchMethods.email ||
          ruleForm.recipientRoleIds.length === 0 ||
          testEmailRecipientsMutation.isPending
        }
      >
        <Send size={14} aria-hidden="true" />
        Send Test Email
      </Button>
    </div>
  );

  const renderConnectorSetup = (provider: AlertConnectorProvider) => (
    <div className="mt-6 grid gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
            Set up {dispatchMethodLabel[provider]} target
          </h3>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {providerSetupHint[provider]}
          </p>
          {provider === "mattermost" ? (
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
            selectNewTargetProvider(event.target.value as AlertConnectorProvider)
          }
          className="bg-[var(--color-background)] md:max-w-48"
        />
      </div>
      {provider === "mattermost" ? (
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
              className="bg-[var(--color-background)]"
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
                  className="bg-[var(--color-background)]"
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
                  className="bg-[var(--color-background)]"
                />
              </label>
              <div className="rounded-[var(--radius-md)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-muted-foreground)] md:col-span-2">
                These secrets are not saved in StoQR. Put them in the connector
                gateway env as MATTERMOST_BASE_URL and MATTERMOST_BOT_TOKEN,
                then restart the gateway.
              </div>
            </div>
          ) : (
            <div className="rounded-[var(--radius-md)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
              Paste a Mattermost incoming webhook URL, or use a key from
              MATTERMOST_WEBHOOKS_JSON if the URL is stored on the gateway.
            </div>
          )}
        </div>
      ) : null}
      <div
        className={
          provider === "mattermost"
            ? "grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
            : "grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
        }
      >
        {provider === "mattermost" ? null : (
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
            className="bg-[var(--color-background)]"
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
            provider === "mattermost" &&
            newTargetForm.mattermostMode === "bot_channel"
              ? "Mattermost channel ID"
              : "Provider target ID"
          }
          className="bg-[var(--color-background)]"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void addConnectorTarget()}
        >
          <Plus size={14} aria-hidden="true" />
          Add {dispatchMethodLabel[provider]} target
        </Button>
      </div>
    </div>
  );

  const renderConnectorTargets = (provider: AlertConnectorProvider) => {
    const providerTargets = connectorTargets.filter(
      (target) => target.provider === provider,
    );
    const shouldShowPanel = ruleForm.dispatchMethods[provider];

    if (!shouldShowPanel) return null;

    return (
      <div className="ml-0 border-t border-dashed border-[var(--color-border)] pt-7 sm:ml-[4.5rem]">
        {loadingConnectors ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Loading targets...
          </p>
        ) : providerTargets.length === 0 ? (
          <div className="flex flex-col gap-5">
            <p className="text-sm italic text-[var(--color-muted-foreground)]">
              No targets configured yet.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Set up ${dispatchMethodLabel[provider]}`}
              className="w-fit border-[var(--color-ring)] text-[var(--color-ring)]"
              onClick={() => selectNewTargetProvider(provider)}
            >
              <Plus size={14} aria-hidden="true" />
              Add {dispatchMethodLabel[provider]} Target
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {providerTargets.map((target) => {
              const selected = ruleForm.selectedConnectorTargetIds.includes(
                target.id,
              );
              return (
                <div
                  key={target.id}
                  className="flex min-h-10 flex-col gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <label className="flex min-w-0 items-center gap-3 text-sm text-[var(--color-foreground)]">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!target.enabled}
                      onChange={(event) =>
                        toggleConnectorTarget(target.id, event.target.checked)
                      }
                      aria-label={`Send ${dispatchMethodLabel[target.provider]} to ${target.target_name}`}
                      className="h-5 w-5 rounded-[var(--radius-sm)] border border-[var(--color-border)] accent-[var(--color-ring)]"
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
                    <span className="rounded-[var(--radius-full)] bg-[var(--color-surface-strong)] px-2.5 py-1 text-xs font-semibold text-[var(--color-muted-foreground)]">
                      {target.enabled
                        ? selected
                          ? "Selected"
                          : "Not selected"
                        : "Disabled"}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => void testConnectorTarget(target.id)}
                      disabled={!target.enabled || testingTargetId === target.id}
                    >
                      Test integration
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {activeSetupProvider === provider ? renderConnectorSetup(provider) : null}
        {provider === "whatsapp" ? (
          <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-info-light)] text-[var(--color-info)]">
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
                variant="outline"
                size="sm"
                onClick={() => void startWhatsAppPairing()}
              >
                <MessageCircle size={14} aria-hidden="true" />
                Pair
              </Button>
            </div>
            {whatsAppQr ? (
              <pre className="mt-3 max-h-32 overflow-auto rounded-[var(--radius-md)] bg-[var(--color-background)] p-3 text-xs text-[var(--color-foreground)]">
                {whatsAppQr}
              </pre>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <BasePage
      companyId={companyId}
      isLoading={false}
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to edit alert rules."
      contentClassName="px-6 pb-12 pt-8 sm:px-8 lg:px-12"
      containerClassName="mx-auto flex w-full max-w-[848px] min-w-0 flex-1 flex-col gap-10 text-[var(--color-foreground)]"
    >
      <PageAvailabilityGuard companyId={companyId} feature="alerts">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-7">
            <Button
              type="button"
              variant="link"
              size="sm"
              className="w-fit text-sm font-semibold text-[var(--color-muted-foreground)] no-underline hover:text-[var(--color-foreground)] hover:no-underline"
              onClick={() => navigate("/alerts/rules")}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Back to Alert Rules
            </Button>
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-[560px]">
                <h1 className="text-[2rem] font-bold leading-tight text-[var(--color-foreground)]">
                  Configure Alert Rule
                </h1>
                <h2 className="sr-only">
                  {isCreateMode ? "Create Alert Rule" : "Edit Alert Rule"}
                </h2>
                <p className="mt-2 text-sm leading-5 text-[var(--color-muted-foreground)]">
                  Set up the conditions and notification channels for when stock
                  levels fall below their defined thresholds.
                </p>
              </div>
              <div className="flex w-full items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 md:w-[218px]">
                <div>
                  <p className="text-center text-sm font-bold leading-5 text-[var(--color-foreground)] md:text-left">
                    Rule Status
                  </p>
                  <p className="text-xs leading-4 text-[var(--color-muted-foreground)]">
                    {ruleForm.enabled ? "Active and monitoring" : "Paused"}
                  </p>
                </div>
                <Toggle
                  checked={ruleForm.enabled}
                  aria-label="Trigger enabled"
                  className="h-6 w-11"
                  onChange={(event) =>
                    setRuleForm((current) => ({
                      ...current,
                      enabled: event.target.checked,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <section className="flex flex-col gap-7">
            <div className="border-b border-[var(--color-border)] pb-3">
              <h2 className="text-xl font-bold leading-7 text-[var(--color-foreground)]">
                General Information
              </h2>
            </div>
            <div className="grid gap-12 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[var(--color-foreground)]">
                  Rule Name <span className="text-[var(--color-destructive)]">*</span>
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
                  className="h-11 border-[var(--color-border)] bg-[var(--color-background)] px-4 text-sm shadow-[var(--shadow-sm)]"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[var(--color-foreground)]">
                  Trigger Condition
                </span>
                <Input
                  value="Quantity on hand <= Low stock alert level"
                  readOnly
                  aria-label="Trigger type"
                  className="h-11 border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 text-sm shadow-[var(--shadow-sm)]"
                />
              </label>
            </div>
          </section>

          <section className="flex flex-col gap-7">
            <div className="border-b border-[var(--color-border)] pb-3">
              <h2 className="text-xl font-bold leading-7 text-[var(--color-foreground)]">
                Dispatch Methods
              </h2>
              <p className="mt-3 text-sm leading-5 text-[var(--color-muted-foreground)]">
                Configure how and where notifications should be routed when this
                rule triggers.
              </p>
            </div>

            <div className="flex flex-col gap-8">
              {dispatchMethodItems.map(
                ({ method, title, ariaLabel, description, icon: Icon }) => {
                  const isEnabled = ruleForm.dispatchMethods[method];
                  const isChatProvider = chatProviders.includes(
                    method as AlertConnectorProvider,
                  );
                  return (
                    <div key={method} className="flex flex-col gap-6">
                      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-6">
                        <div
                          className={[
                            "flex h-12 w-12 items-center justify-center rounded-[var(--radius-full)]",
                            isEnabled
                              ? "bg-[var(--color-info-light)] text-[var(--color-ring)]"
                              : "bg-[var(--color-surface-subtle)] text-[var(--color-muted-foreground)]",
                          ].join(" ")}
                        >
                          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold leading-6 text-[var(--color-foreground)]">
                            {title}
                          </h3>
                          <p className="text-sm leading-5 text-[var(--color-muted-foreground)]">
                            {description}
                          </p>
                        </div>
                        <Toggle
                          checked={isEnabled}
                          aria-label={ariaLabel}
                          onChange={(event) =>
                            toggleDispatchMethod(method, event.target.checked)
                          }
                        />
                      </div>

                      {method === "email" && isEnabled
                        ? renderEmailTargets()
                        : null}
                      {isChatProvider
                        ? renderConnectorTargets(method as AlertConnectorProvider)
                        : null}
                    </div>
                  );
                },
              )}
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-6">
            {ruleMessage ? (
              <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)] px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
                {ruleMessage}
              </div>
            ) : null}
            {testMessage ? (
              <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)] px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
                {testMessage}
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => void saveRule()}
                disabled={saveDisabled}
              >
                <Save size={14} aria-hidden="true" />
                {isCreateMode ? "Create Rule" : "Save Rule"}
              </Button>
            </div>
          </div>

          {chatProviders.map((provider) => {
            const providerTargets = connectorTargets.filter(
              (target) => target.provider === provider,
            );
            return providerTargets.length === 0 &&
              !ruleForm.dispatchMethods[provider] ? (
              <Button
                key={provider}
                type="button"
                variant="link"
                size="sm"
                aria-label={`Set up ${dispatchMethodLabel[provider]}`}
                className="sr-only"
                onClick={() => selectNewTargetProvider(provider)}
              >
                Set up {dispatchMethodLabel[provider]}
              </Button>
            ) : null;
          })}
          {activeSetupProvider === null ? (
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
              className="sr-only"
            />
          ) : null}
          {!ruleForm.dispatchMethods.whatsapp && !whatsAppQr ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="sr-only"
              onClick={() => void startWhatsAppPairing()}
            >
              Pair
            </Button>
          ) : null}
          {!ruleForm.dispatchMethods.whatsapp && whatsAppQr ? (
            <pre className="sr-only">{whatsAppQr}</pre>
          ) : null}
        </div>
      </PageAvailabilityGuard>
    </BasePage>
  );
};
