import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  ContentTabs,
  DataTable,
  type DataTableColumn,
  Input,
  Select,
  Toggle,
} from "@repo/ui";
import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  CheckCheck,
  Info,
  Mail,
  Plus,
  Settings2,
} from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { BasePage } from "../components/BasePage";
import { PageAvailabilityGuard } from "../components/PageAvailabilityGuard";
import {
  usePageTopBarSearch,
  useTopBarSearchValue,
} from "../components/Search/TopBarSearch";
import { useCompany } from "../contexts/CompanyContext";
import {
  useAlertEvents,
  useAlertDeliveryLogs,
  useAlertRules,
  useCreateAlertRule,
  useDispatchAlertEmails,
  useUpdateAlertEventStatus,
  useUpdateAlertRule,
  useUpdateAlertRuleEnabled,
} from "../hooks/queries/useAlerts";
import { useTeamSettingsData } from "../hooks/queries/useTeamSettings";
import {
  fuzzyRankings,
  fuzzySearchItems,
  normalizePageSearchTerm,
} from "../lib/pageSearch";
import type { AlertEvent, AlertRule } from "../api/alerts";
import type { Role } from "../api/teamSettings";

type AlertsTab = "feed" | "rules";
type FeedCategory = "all" | "stock" | "procurement" | "system";
type FeedSeverity = AlertEvent["severity"];
type AlertSortKey = "message" | "severity" | "category" | "status";

type RuleFormState = {
  id: string | null;
  name: string;
  recipientRoleIds: string[];
  emailEnabled: boolean;
  enabled: boolean;
};

const legacyTabRedirects: Record<string, AlertsTab> = {
  notifications: "feed",
  delivery: "rules",
  history: "feed",
};

const feedPageSize = 8;
const LOW_STOCK_RULE_CONDITION = { thresholdSource: "product_reorder_point" };

const severityVariant = {
  low: "secondary",
  medium: "info",
  high: "warning",
  critical: "destructive",
} as const;

const severityLabel = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
} as const;

const alertCategoryLabel: Record<FeedCategory, string> = {
  all: "All",
  stock: "Stock & Inventory",
  procurement: "Procurement & Orders",
  system: "System & Operations",
};

const feedFilters: Array<{ id: FeedCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "stock", label: "Stock & Inventory" },
  { id: "procurement", label: "Procurement & Orders" },
  { id: "system", label: "System & Operations" },
];

const emptyRuleForm: RuleFormState = {
  id: null,
  name: "Low stock alert",
  recipientRoleIds: [],
  emailEnabled: false,
  enabled: true,
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const getEventCategory = (event: AlertEvent): FeedCategory => {
  if (event.alert_type === "low_stock" || event.alert_type === "expiration") {
    return "stock";
  }
  if (event.alert_type === "reorder_point") return "procurement";
  return "system";
};

const getAlertSortValue = (event: AlertEvent, sortKey: AlertSortKey) => {
  if (sortKey === "severity") return severityLabel[event.severity];
  if (sortKey === "category") return alertCategoryLabel[getEventCategory(event)];
  if (sortKey === "status") return event.status;
  return event.message;
};

const renderSeverityIcon = (severity: FeedSeverity) => {
  if (severity === "critical")
    return <AlertCircle size={12} aria-hidden="true" />;
  if (severity === "high") return <AlertTriangle size={12} aria-hidden="true" />;
  return <Info size={12} aria-hidden="true" />;
};

const roleToken = (roleId: string) => `role:${roleId}`;

const parseRecipientRoleIds = (rule: AlertRule) =>
  rule.recipients
    .map((recipient) => recipient.replace(/^role:/, ""))
    .filter(Boolean);

const getRuleRoleNames = (rule: AlertRule, rolesById: Map<string, Role>) => {
  const names = parseRecipientRoleIds(rule)
    .map((roleId) => rolesById.get(roleId)?.name ?? "Unknown role")
    .filter(Boolean);

  return names.length ? names.join(", ") : "No roles selected";
};

const getRuleChannelsLabel = (rule: AlertRule) => {
  const channels = [];
  if (rule.delivery_channels.includes("in_app")) channels.push("In-app");
  if (rule.delivery_channels.includes("email")) channels.push("Email");
  if (rule.delivery_channels.includes("push")) channels.push("Push");
  return channels.length ? channels.join(", ") : "No channels";
};

const getPrimaryLowStockRule = (rules: AlertRule[]) =>
  rules.find((rule) => rule.alert_type === "low_stock") ?? null;

export const AlertsPage = () => {
  const { companyId } = useCompany();
  const navigate = useNavigate();
  const { searchValue } = useTopBarSearchValue();
  const { tab } = useParams<{ tab?: string }>();
  const activeTab = tab === "rules" ? "rules" : "feed";
  const feedSearchTerm = activeTab === "feed" ? searchValue : "";
  const rulesSearchTerm = activeTab === "rules" ? searchValue : "";
  const normalizedSearchTerm = normalizePageSearchTerm(feedSearchTerm);
  const normalizedRulesSearchTerm = normalizePageSearchTerm(rulesSearchTerm);

  const { data: events = [], isLoading: loadingEvents } = useAlertEvents(companyId);
  const { data: deliveries = [], isLoading: loadingDeliveries } =
    useAlertDeliveryLogs(companyId);
  const { data: rules = [], isLoading: loadingRules } = useAlertRules(companyId);
  const { data: teamSettings, isLoading: loadingTeamSettings } =
    useTeamSettingsData(companyId);
  const createRuleMutation = useCreateAlertRule(companyId);
  const updateRuleMutation = useUpdateAlertRule(companyId);
  const updateRuleEnabledMutation = useUpdateAlertRuleEnabled(companyId);
  const updateEventStatusMutation = useUpdateAlertEventStatus(companyId);
  const dispatchEmailMutation = useDispatchAlertEmails(companyId);

  const roles = teamSettings?.roles ?? [];
  const rolesById = useMemo(
    () => new Map(roles.map((role) => [role.id, role])),
    [roles],
  );
  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: role.id, label: role.name })),
    [roles],
  );

  const [activeFilter, setActiveFilter] = useState<FeedCategory>("all");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [tablePage, setTablePage] = useState(1);
  const [tableSortField, setTableSortField] = useState<AlertSortKey>("message");
  const [tableSortDirection, setTableSortDirection] = useState<"asc" | "desc">(
    "asc",
  );
  const [ruleForm, setRuleForm] = useState<RuleFormState>(emptyRuleForm);
  const [ruleMessage, setRuleMessage] = useState<string | null>(null);
  const [dispatchMessage, setDispatchMessage] = useState<string | null>(null);

  const lowStockRules = useMemo(
    () => rules.filter((rule) => rule.alert_type === "low_stock"),
    [rules],
  );
  const lowStockRule = useMemo(
    () => getPrimaryLowStockRule(lowStockRules),
    [lowStockRules],
  );

  useEffect(() => {
    if (!lowStockRule) return;
    setRuleForm({
      id: lowStockRule.id,
      name: lowStockRule.name,
      recipientRoleIds: parseRecipientRoleIds(lowStockRule),
      emailEnabled: lowStockRule.delivery_channels.includes("email"),
      enabled: lowStockRule.enabled,
    });
  }, [lowStockRule]);

  useEffect(() => {
    setTablePage(1);
  }, [feedSearchTerm, activeFilter]);

  const selectedEventIdSet = useMemo(
    () => new Set(selectedEventIds),
    [selectedEventIds],
  );
  const hasSelectedEvents = selectedEventIds.length > 0;

  const categoryFilteredEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          activeFilter === "all" || getEventCategory(event) === activeFilter,
      ),
    [activeFilter, events],
  );

  const visibleEvents = useMemo(
    () =>
      fuzzySearchItems(categoryFilteredEvents, normalizedSearchTerm, [
        {
          key: (event) => event.message,
          maxRanking: fuzzyRankings.WORD_STARTS_WITH,
        },
        {
          key: (event) => event.products?.name ?? "",
          maxRanking: fuzzyRankings.CONTAINS,
        },
        {
          key: (event) => event.products?.sku ?? "",
          maxRanking: fuzzyRankings.CONTAINS,
        },
        {
          key: (event) => severityLabel[event.severity],
          maxRanking: fuzzyRankings.CONTAINS,
        },
      ]),
    [categoryFilteredEvents, normalizedSearchTerm],
  );

  const visibleRules = useMemo(
    () =>
      fuzzySearchItems(lowStockRules, normalizedRulesSearchTerm, [
        {
          key: (rule) => rule.name,
          maxRanking: fuzzyRankings.WORD_STARTS_WITH,
        },
        {
          key: (rule) => rule.alert_type.replace(/_/g, " "),
          maxRanking: fuzzyRankings.CONTAINS,
        },
        {
          key: (rule) => getRuleRoleNames(rule, rolesById),
          maxRanking: fuzzyRankings.CONTAINS,
        },
      ]),
    [lowStockRules, normalizedRulesSearchTerm, rolesById],
  );

  const alertSuggestions = useMemo(
    () =>
      visibleEvents.slice(0, 8).map((event) => ({
        id: event.id,
        title: event.message,
        subtitle: `${event.products?.sku ?? "No SKU"} · ${severityLabel[event.severity]}`,
        value: event.message,
        badge: "Alert",
      })),
    [visibleEvents],
  );

  const rulesSuggestions = useMemo(
    () =>
      visibleRules.slice(0, 8).map((rule) => ({
        id: rule.id,
        title: rule.name,
        subtitle: getRuleRoleNames(rule, rolesById),
        value: rule.name,
        badge: "Rule",
      })),
    [rolesById, visibleRules],
  );

  usePageTopBarSearch(
    useMemo(
      () => ({
        searchKey: activeTab === "feed" ? "alerts-feed" : "alerts-rules",
        placeholder:
          activeTab === "feed" ? "Search alerts..." : "Search alert rules...",
        defaultSuggestions:
          activeTab === "feed"
            ? [
                {
                  id: "alerts-stock",
                  title: "Stock Alerts",
                  subtitle: "Inventory and replenishment issues",
                  value: "stock",
                  badge: "Alert",
                },
                {
                  id: "alerts-critical",
                  title: "Critical Alerts",
                  subtitle: "Immediate operational issues",
                  value: "critical",
                  badge: "Alert",
                },
              ]
            : [
                {
                  id: "alerts-rule-low-stock",
                  title: "Low stock alert",
                  subtitle: "Notify roles when stock reaches low stock level",
                  value: "low stock",
                  badge: "Rule",
                },
              ],
        suggestions: activeTab === "feed" ? alertSuggestions : rulesSuggestions,
      }),
      [activeTab, alertSuggestions, rulesSuggestions],
    ),
  );

  const legacyTabRedirect = tab ? legacyTabRedirects[tab] : undefined;

  if (legacyTabRedirect) {
    return <Navigate to={`/alerts/${legacyTabRedirect}`} replace />;
  }

  if (tab !== "feed" && tab !== "rules") {
    return <Navigate to="/alerts/feed" replace />;
  }

  const shouldUseSearchRanking =
    normalizedSearchTerm.length > 0 &&
    tableSortField === "message" &&
    tableSortDirection === "asc";
  const sortedEvents = shouldUseSearchRanking
    ? visibleEvents
    : [...visibleEvents].sort((left, right) => {
        const comparison = getAlertSortValue(
          left,
          tableSortField,
        ).localeCompare(getAlertSortValue(right, tableSortField));
        return tableSortDirection === "asc" ? comparison : -comparison;
      });
  const totalAlertPages = Math.max(
    1,
    Math.ceil(sortedEvents.length / feedPageSize),
  );
  const currentTablePage = Math.min(tablePage, totalAlertPages);
  const pagedEvents = sortedEvents.slice(
    (currentTablePage - 1) * feedPageSize,
    currentTablePage * feedPageSize,
  );
  const openCount = events.filter((event) => event.status === "open").length;
  const emailDeliveries = deliveries.filter((delivery) => delivery.channel === "email");
  const pendingEmailCount = emailDeliveries.filter(
    (delivery) => delivery.status === "pending",
  ).length;
  const sendingEmailCount = emailDeliveries.filter(
    (delivery) => delivery.status === "sending",
  ).length;
  const sentEmailCount = emailDeliveries.filter(
    (delivery) => delivery.status === "sent",
  ).length;
  const failedEmailCount = emailDeliveries.filter(
    (delivery) => delivery.status === "failed",
  ).length;
  const latestFailedEmail = emailDeliveries.find(
    (delivery) => delivery.status === "failed" && delivery.error_message,
  );

  const handleTableSort = (field: AlertSortKey) => {
    if (tableSortField === field) {
      setTableSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setTableSortField(field);
    setTableSortDirection("asc");
    setTablePage(1);
  };

  const toggleEventSelection = (eventId: string) => {
    setSelectedEventIds((currentIds) =>
      currentIds.includes(eventId)
        ? currentIds.filter((currentId) => currentId !== eventId)
        : [...currentIds, eventId],
    );
  };

  const toggleSelectAllPagedEvents = () => {
    const visibleIds = pagedEvents.map((event) => event.id);
    const allPagedEventsSelected =
      visibleIds.length > 0 &&
      visibleIds.every((eventId) => selectedEventIdSet.has(eventId));

    setSelectedEventIds((currentIds) => {
      if (allPagedEventsSelected) {
        return currentIds.filter((currentId) => !visibleIds.includes(currentId));
      }

      return [...new Set([...currentIds, ...visibleIds])];
    });
  };

  const updateSelectedStatus = async (status: AlertEvent["status"]) => {
    if (selectedEventIds.length === 0) return;

    await Promise.all(
      selectedEventIds.map((eventId) =>
        updateEventStatusMutation.mutateAsync({ eventId, status }),
      ),
    );
    setSelectedEventIds([]);
  };

  const updateSingleStatus = async (
    eventId: string,
    status: AlertEvent["status"],
  ) => {
    await updateEventStatusMutation.mutateAsync({ eventId, status });
  };

  const dispatchQueuedEmails = async () => {
    setDispatchMessage(null);
    try {
      const result = await dispatchEmailMutation.mutateAsync();
      setDispatchMessage(
        result.claimed === 0
          ? "No queued email alerts to send."
          : `Email dispatch finished: ${result.sent} sent, ${result.failed} failed.`,
      );
    } catch (error) {
      setDispatchMessage(
        error instanceof Error
          ? error.message
          : "Email dispatch failed. Check the Edge Function logs.",
      );
    }
  };

  const toggleRoleRecipient = (roleId: string) => {
    setRuleForm((current) => ({
      ...current,
      recipientRoleIds: current.recipientRoleIds.includes(roleId)
        ? current.recipientRoleIds.filter((currentId) => currentId !== roleId)
        : [...current.recipientRoleIds, roleId],
    }));
  };

  const resetRuleForm = () => {
    setRuleForm(emptyRuleForm);
    setRuleMessage(null);
  };

  const editRule = (rule: AlertRule) => {
    setRuleForm({
      id: rule.id,
      name: rule.name,
      enabled: rule.enabled,
      recipientRoleIds: parseRecipientRoleIds(rule),
      emailEnabled: rule.delivery_channels.includes("email"),
    });
    setRuleMessage(null);
  };

  const saveRule = async () => {
    if (!ruleForm.name.trim()) {
      setRuleMessage("Add a rule name before saving.");
      return;
    }
    if (ruleForm.recipientRoleIds.length === 0) {
      setRuleMessage("Select at least one organisation role.");
      return;
    }

    const payload = {
      name: ruleForm.name.trim(),
      alertType: "low_stock" as const,
      condition: LOW_STOCK_RULE_CONDITION,
      deliveryChannels: ruleForm.emailEnabled
        ? (["in_app", "email"] satisfies AlertRule["delivery_channels"])
        : (["in_app"] satisfies AlertRule["delivery_channels"]),
      recipients: ruleForm.recipientRoleIds.map(roleToken),
      enabled: ruleForm.enabled,
    };

    if (ruleForm.id) {
      await updateRuleMutation.mutateAsync({ ruleId: ruleForm.id, ...payload });
      setRuleMessage("Low stock alert rule updated.");
    } else {
      await createRuleMutation.mutateAsync(payload);
      setRuleMessage("Low stock alert rule created.");
    }
  };

  const alertColumns: Array<DataTableColumn<AlertEvent, AlertSortKey>> = [
    {
      id: "message",
      header: "Alert",
      sortKey: "message",
      width: "46%",
      renderCell: (event) => (
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
            <span className="font-semibold uppercase tracking-[0.08em] text-[var(--color-foreground)]">
              {event.products?.sku ?? "No SKU"}
            </span>
            <span aria-hidden="true">•</span>
            <span>{formatDateTime(event.triggered_at)}</span>
          </div>
          <div className="text-base font-semibold text-[var(--color-foreground)]">
            {event.message}
          </div>
          {event.products?.name ? (
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {event.products.name}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "severity",
      header: "Severity",
      sortKey: "severity",
      width: "14%",
      renderCell: (event) => (
        <Badge
          variant={severityVariant[event.severity]}
          size="md"
          className="gap-1.5"
        >
          {renderSeverityIcon(event.severity)}
          {severityLabel[event.severity]}
        </Badge>
      ),
    },
    {
      id: "category",
      header: "Category",
      sortKey: "category",
      width: "16%",
      renderCell: (event) => alertCategoryLabel[getEventCategory(event)],
    },
    {
      id: "status",
      header: "Status",
      sortKey: "status",
      width: "12%",
      renderCell: (event) => (
        <Badge
          variant={event.status === "open" ? "success" : "secondary"}
          size="sm"
        >
          {event.status === "open"
            ? "Open"
            : event.status === "acknowledged"
              ? "Acknowledged"
              : "Resolved"}
        </Badge>
      ),
    },
    {
      id: "action",
      header: "",
      align: "right",
      width: "12%",
      sortable: false,
      renderCell: (event) => (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="shadow-none"
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            void updateSingleStatus(
              event.id,
              event.status === "open" ? "acknowledged" : "resolved",
            );
          }}
        >
          {event.status === "open" ? "Acknowledge" : "Resolve"}
        </Button>
      ),
    },
  ];

  const ruleColumns: Array<DataTableColumn<AlertRule>> = [
    {
      id: "rule",
      header: "Rule",
      width: "32%",
      renderCell: (rule) => (
        <div>
          <p className="font-semibold text-[var(--color-foreground)]">
            {rule.name}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Quantity on hand reaches Low Stock Alert level
          </p>
        </div>
      ),
    },
    {
      id: "roles",
      header: "Notify roles",
      width: "28%",
      renderCell: (rule) => getRuleRoleNames(rule, rolesById),
    },
    {
      id: "channel",
      header: "Channel",
      width: "14%",
      renderCell: (rule) => getRuleChannelsLabel(rule),
    },
    {
      id: "status",
      header: "Status",
      width: "12%",
      renderCell: (rule) => (
        <Toggle
          checked={rule.enabled}
          aria-label={`Toggle ${rule.name}`}
          onChange={(event) =>
            updateRuleEnabledMutation.mutate({
              ruleId: rule.id,
              enabled: event.target.checked,
            })
          }
        />
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      width: "14%",
      renderCell: (rule) => (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => editRule(rule)}
        >
          Edit
        </Button>
      ),
    },
  ];

  const feedContent = (
    <Card
      variant="plain"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      padding="none"
    >
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-4 py-4 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1 sm:gap-3">
            {hasSelectedEvents ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void updateSelectedStatus("acknowledged")}
                >
                  <CheckCheck size={14} aria-hidden="true" />
                  Acknowledge
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void updateSelectedStatus("resolved")}
                >
                  Resolve
                </Button>
              </>
            ) : (
              feedFilters.map((filter) => (
                <Button
                  key={filter.id}
                  type="button"
                  variant={activeFilter === filter.id ? "secondary" : "ghost"}
                  size="xs"
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.label}
                </Button>
              ))
            )}
          </div>

          <div className="text-sm text-[var(--color-muted-foreground)]">
            Showing {visibleEvents.length} of {events.length} alerts
          </div>
        </div>
      </div>

      <DataTable
        className="min-h-0 flex-1"
        columns={alertColumns}
        rows={pagedEvents}
        getRowId={(event) => event.id}
        emptyState={
          loadingEvents
            ? "Loading alerts..."
            : normalizedSearchTerm.length > 0
              ? `No alerts matched "${normalizedSearchTerm}".`
              : "No delivered alerts yet."
        }
        sortField={tableSortField}
        sortDirection={tableSortDirection}
        onSortChange={handleTableSort}
        minTableWidth={940}
        tableLayout="fixed"
        tableWrapClassName="border-0 bg-white"
        tableClassName="bg-white"
        selection={{
          selectedRowIds: selectedEventIdSet,
          onToggleAll: toggleSelectAllPagedEvents,
          onToggleRow: (event) => toggleEventSelection(event.id),
          selectAllLabel: "Select all visible alerts",
          getRowLabel: (event) => event.message,
          columnWidth: 28,
        }}
        rowClassName={(event) =>
          selectedEventIdSet.has(event.id)
            ? "bg-[var(--color-primary-light)]"
            : undefined
        }
        pagination={{
          currentPage: currentTablePage,
          totalItems: visibleEvents.length,
          itemsPerPage: feedPageSize,
          onPageChange: setTablePage,
        }}
      />
    </Card>
  );

  const rolesLoading = loadingTeamSettings || loadingRules;
  const saveDisabled =
    rolesLoading ||
    createRuleMutation.isPending ||
    updateRuleMutation.isPending ||
    roleFormHasNoRecipients(ruleForm);

  const rulesContent = (
    <div className="grid min-h-0 gap-7 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card variant="plain" className="overflow-hidden" padding="none">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              Alert Triggers
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Manage automatic notifications for inventory conditions.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={resetRuleForm}>
            <Plus size={14} aria-hidden="true" />
            New Trigger
          </Button>
        </div>

        <DataTable
          columns={ruleColumns}
          rows={visibleRules}
          getRowId={(rule) => rule.id}
          emptyState={
            loadingRules
              ? "Loading alert triggers..."
              : "No alert triggers yet. Create a low-stock trigger to get started."
          }
          minTableWidth={780}
          tableLayout="fixed"
        />
      </Card>

      <Card variant="plain" className="overflow-hidden" padding="none">
        <div className="border-b border-[var(--color-border)] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--color-info-light)] p-3 text-[var(--color-info)]">
              <Settings2 size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                {ruleForm.id ? "Edit Low-Stock Trigger" : "Create Low-Stock Trigger"}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Notify selected roles when an item reaches its Low Stock Alert level.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 px-6 py-5">
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

          <div className="flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                Notify roles
              </h3>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Select one or more organisation roles.
              </p>
            </div>
            {rolesLoading ? (
              <div className="rounded-lg bg-[var(--color-surface-subtle)] p-4 text-sm text-[var(--color-muted-foreground)]">
                Loading organisation roles...
              </div>
            ) : roleOptions.length === 0 ? (
              <div className="rounded-lg bg-[var(--color-surface-subtle)] p-4 text-sm text-[var(--color-muted-foreground)]">
                No organisation roles are available yet. Create roles in Organisations settings first.
              </div>
            ) : (
              <div className="grid gap-2">
                {roleOptions.map((role) => (
                  <label
                    key={role.value}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2"
                  >
                    <span className="text-sm text-[var(--color-foreground)]">
                      {role.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={ruleForm.recipientRoleIds.includes(role.value)}
                      onChange={() => toggleRoleRecipient(role.value)}
                      aria-label={`Notify ${role.label}`}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[var(--color-info-light)] p-2 text-[var(--color-info)]">
                <BellRing size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  In-app notifications
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Delivery rows are created for members in the selected roles.
                </p>
              </div>
            </div>
            <Toggle checked aria-label="In-app notifications enabled" disabled readOnly />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[var(--color-success-light)] p-2 text-[var(--color-success)]">
                <Mail size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  Email notifications
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Queue email delivery for members in the selected roles.
                </p>
              </div>
            </div>
            <Toggle
              checked={ruleForm.emailEnabled}
              aria-label="Email notifications enabled"
              onChange={(event) =>
                setRuleForm((current) => ({
                  ...current,
                  emailEnabled: event.target.checked,
                }))
              }
            />
          </div>

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

          <div className="rounded-lg border border-[var(--color-border)] px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  Email delivery status
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {loadingDeliveries
                    ? "Loading delivery queue..."
                    : `${pendingEmailCount} queued, ${sendingEmailCount} sending, ${sentEmailCount} sent, ${failedEmailCount} failed`}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void dispatchQueuedEmails()}
                disabled={dispatchEmailMutation.isPending || pendingEmailCount === 0}
              >
                <Mail size={14} aria-hidden="true" />
                Send queued
              </Button>
            </div>
            {latestFailedEmail?.error_message ? (
              <p className="mt-2 text-sm text-[var(--color-danger)]">
                Latest failure: {latestFailedEmail.error_message}
              </p>
            ) : null}
            {dispatchMessage ? (
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                {dispatchMessage}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={resetRuleForm}>
              Reset
            </Button>
            <Button type="button" onClick={() => void saveRule()} disabled={saveDisabled}>
              {ruleForm.id ? "Save Trigger" : "Create Trigger"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <BasePage
      companyId={companyId}
      isLoading={false}
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to view alerts."
      contentClassName="flex h-full min-h-0 overflow-hidden px-2 pb-8 pt-[18px]"
      containerClassName="[&>*]:min-w-0 flex h-full min-h-0 min-w-0 flex-1 flex-col gap-7 overflow-hidden text-[var(--color-foreground)]"
    >
      <PageAvailabilityGuard companyId={companyId} feature="alerts">
        <h1 className="sr-only">Alerts</h1>
        <ContentTabs
          activeTab={activeTab}
          onTabChange={(nextTab) => navigate(`/alerts/${nextTab}`)}
          bottomSpacing
          className="overflow-hidden"
          contentClassName="overflow-hidden"
          tabs={[
            {
              id: "feed",
              label: "Alerts Feed",
              count: openCount,
              content: feedContent,
            },
            { id: "rules", label: "Alert Rules", content: rulesContent },
          ]}
        />
      </PageAvailabilityGuard>
    </BasePage>
  );
};

const roleFormHasNoRecipients = (ruleForm: RuleFormState) =>
  ruleForm.recipientRoleIds.length === 0;
