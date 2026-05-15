import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  ContentTabs,
  DataTable,
  type DataTableColumn,
  Toggle,
} from "@repo/ui";
import {
  AlertCircle,
  AlertTriangle,
  CheckCheck,
  Info,
  Plus,
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
  useAlertRules,
  useUpdateAlertEventStatus,
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
type AlertSortKey = "message" | "triggered_at" | "severity" | "category" | "status";

const legacyTabRedirects: Record<string, AlertsTab> = {
  notifications: "feed",
  delivery: "rules",
  history: "feed",
};

const feedPageSize = 8;

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
  if (sortKey === "triggered_at") return event.triggered_at;
  return event.message;
};

const renderSeverityIcon = (severity: FeedSeverity) => {
  if (severity === "critical")
    return <AlertCircle size={12} aria-hidden="true" />;
  if (severity === "high") return <AlertTriangle size={12} aria-hidden="true" />;
  return <Info size={12} aria-hidden="true" />;
};

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
  if (rule.delivery_channels.includes("telegram")) channels.push("Telegram");
  if (rule.delivery_channels.includes("mattermost")) channels.push("Mattermost");
  if (rule.delivery_channels.includes("whatsapp")) channels.push("WhatsApp");
  return channels.length ? channels.join(", ") : "No channels";
};

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
  const { data: rules = [], isLoading: loadingRules } = useAlertRules(companyId);
  const { data: teamSettings } = useTeamSettingsData(companyId);
  const updateRuleEnabledMutation = useUpdateAlertRuleEnabled(companyId);
  const updateEventStatusMutation = useUpdateAlertEventStatus(companyId);

  const roles = teamSettings?.roles ?? [];
  const rolesById = useMemo(
    () => new Map(roles.map((role) => [role.id, role])),
    [roles],
  );
  const [activeFilter, setActiveFilter] = useState<FeedCategory>("all");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [tablePage, setTablePage] = useState(1);
  const [tableSortField, setTableSortField] = useState<AlertSortKey>("message");
  const [tableSortDirection, setTableSortDirection] = useState<"asc" | "desc">(
    "asc",
  );

  const lowStockRules = useMemo(
    () => rules.filter((rule) => rule.alert_type === "low_stock"),
    [rules],
  );

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

  const alertColumns: Array<DataTableColumn<AlertEvent, AlertSortKey>> = [
    {
      id: "message",
      header: "Alert",
      sortKey: "message",
      width: "40%",
      renderCell: (event) => (
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-[var(--color-foreground)]">
            {event.message}
          </div>
        </div>
      ),
    },
    {
      id: "triggered_at",
      header: "Date / Time",
      sortKey: "triggered_at",
      width: "16%",
      renderCell: (event) => formatDateTime(event.triggered_at),
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
      width: "18%",
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
      width: "16%",
      renderCell: (rule) => (
        <div onClick={(event) => event.stopPropagation()}>
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
        </div>
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
        onRowClick={(event) => navigate(`/alerts/feed/${event.id}`)}
        pagination={{
          currentPage: currentTablePage,
          totalItems: visibleEvents.length,
          itemsPerPage: feedPageSize,
          onPageChange: setTablePage,
        }}
      />
    </Card>
  );

  const rulesContent = (
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
        <Button type="button" variant="secondary" size="sm" onClick={() => navigate("/alerts/rules/new")}>
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
        onRowClick={(rule) => navigate(`/alerts/rules/${rule.id}`)}
      />
    </Card>
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
