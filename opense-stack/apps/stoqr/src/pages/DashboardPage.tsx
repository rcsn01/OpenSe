import { type CSSProperties, useCallback, useMemo, useState } from "react";
import {
  AnalyticsComparisonBars,
  AnalyticsEmptyPanel,
  AnalyticsLegend,
  AnalyticsMetricCard,
  AnalyticsMetricGrid,
  AnalyticsPanel,
  AnalyticsTablePanel,
  DataTable,
  type DataTableColumn,
} from "@repo/ui";
import { useNavigate } from "react-router-dom";
import type { DashboardData } from "../api/dashboard";
import type { AlertEvent } from "../api/alerts";
import type { PurchaseOrder, PurchaseOrderItem } from "../api/procurement";
import { StoqrPageShell } from "../components/StoqrPageShell";
import { useCompany } from "../contexts/CompanyContext";
import { useAlertEvents } from "../hooks/queries/useAlerts";
import { useDashboard } from "../hooks/queries/useDashboard";
import {
  useProcurementPurchaseOrderItems,
  useProcurementPurchaseOrders,
} from "../hooks/queries/useProcurementTabs";
import { bindStyles } from "../lib/bindStyles";
import styles from "./DashboardPage.module.css";

type VelocityTabId = "fast" | "slow" | "dead";
type TrendDirection = "up" | "down" | "neutral";
type AttentionSeverity = "critical" | "high" | "medium" | "low";
type MetricTone = "positive" | "warning" | "danger" | "neutral";
type DeliveryStatusTone = "on-time" | "delayed" | "pending";
type VelocityTone = "high" | "medium" | "low";

type DashboardMetric = {
  label: string;
  value: string;
  accentLabel: string;
  accentTone: MetricTone;
  detail: string;
  direction: TrendDirection;
};

type AttentionItem = {
  id: string;
  severity: AttentionSeverity;
  title: string;
  detail: string;
  timeLabel: string;
  sortValue: number;
};

type DeliveryRow = {
  id: string;
  poLabel: string;
  vendor: string;
  itemsCountLabel: string;
  valueLabel: string;
  expectedLabel: string;
  statusLabel: string;
  statusTone: DeliveryStatusTone;
  sortValue: number;
};

type VelocityItem = {
  id: string;
  name: string;
  sku: string;
  metricLabel: string;
  statusLabel: string;
  statusTone: VelocityTone;
};

const velocityTabs: Array<{ id: VelocityTabId; label: string }> = [
  { id: "fast", label: "Fast" },
  { id: "slow", label: "Slow" },
  { id: "dead", label: "Dead Stock" },
];

const css = bindStyles(styles as Record<string, string>);

const attentionPriority: Record<AttentionSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatInteger = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);

const formatShortDate = (value: string | null) => {
  if (!value) return "TBD";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
};

const formatRelativeTimestamp = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  const diffHours = Math.round(diffMs / (60 * 60 * 1000));
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (diffMinutes <= 0) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

const getDaysFromToday = (value: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(value);
  target.setHours(0, 0, 0, 0);

  return Math.round(
    (target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
};

const formatExpectedDate = (value: string | null) => {
  if (!value) return "TBD";

  const dayDelta = getDaysFromToday(value);
  if (dayDelta === 0) return "Today";
  if (dayDelta === 1) return "Tomorrow";
  if (dayDelta > 1 && dayDelta <= 6) return `In ${dayDelta} days`;
  if (dayDelta === -1) return "1 day overdue";
  if (dayDelta < -1) return `${Math.abs(dayDelta)} days overdue`;

  return formatShortDate(value);
};

const formatTrendPercent = (
  values: number[],
  lowerIsBetter = false,
): { text: string; direction: TrendDirection } => {
  if (values.length < 2) {
    return { text: "Stable", direction: "neutral" as TrendDirection };
  }

  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  if (first === 0 && last === 0) {
    return { text: "Stable", direction: "neutral" as TrendDirection };
  }

  if (first === 0) {
    const direction: TrendDirection = lowerIsBetter ? "down" : "up";
    return {
      text: `${direction === "up" ? "+" : "-"}${formatInteger(Math.abs(last))}`,
      direction,
    };
  }

  const percent = ((last - first) / Math.abs(first)) * 100;
  if (Math.abs(percent) < 0.5) {
    return { text: "Stable", direction: "neutral" as TrendDirection };
  }

  const rawDirection = percent > 0 ? "up" : "down";
  return {
    text: `${percent > 0 ? "+" : ""}${percent.toFixed(Math.abs(percent) >= 10 ? 0 : 1)}%`,
    direction: lowerIsBetter
      ? rawDirection === "up"
        ? "down"
        : "up"
      : rawDirection,
  };
};

const formatDayLabel = (value: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
    new Date(value),
  );

const padPurchaseOrder = (value: number) =>
  `PO-${String(value).padStart(4, "0")}`;

const classifyVelocityTone = (value: number): VelocityTone => {
  if (value >= 100) return "high";
  if (value >= 40) return "medium";
  return "low";
};

const buildMovementChartWindow = (data: DashboardData["movementChartData"]) => {
  const sorted = data
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-7);

  return sorted.map((point) => ({
    ...point,
    label: formatDayLabel(point.date),
  }));
};

const buildAttentionItems = (
  alertEvents: AlertEvent[],
  purchaseOrders: PurchaseOrder[],
  data: DashboardData,
): AttentionItem[] => {
  const alertRows: AttentionItem[] = alertEvents
    .filter((event) => event.status !== "resolved")
    .map((event) => ({
      id: `alert-${event.id}`,
      severity: event.severity,
      title: event.message,
      detail: event.products?.sku
        ? `${event.products.sku} · ${event.products.name ?? "Inventory item"}`
        : "System alert",
      timeLabel: formatRelativeTimestamp(event.triggered_at),
      sortValue: new Date(event.triggered_at).getTime(),
    }));

  const delayedShipments: AttentionItem[] = purchaseOrders
    .filter(
      (order) =>
        !!order.expected_date &&
        order.status !== "closed" &&
        order.status !== "cancelled" &&
        getDaysFromToday(order.expected_date) < 0,
    )
    .map((order) => {
      const overdueDays = Math.abs(
        getDaysFromToday(order.expected_date as string),
      );
      return {
        id: `po-${order.id}`,
        severity: overdueDays > 2 ? ("high" as const) : ("medium" as const),
        title: `Shipment ${padPurchaseOrder(order.po_number)} delayed by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`,
        detail: `Vendor: ${order.suppliers?.name ?? "Unassigned supplier"}`,
        timeLabel: formatRelativeTimestamp(order.expected_date as string),
        sortValue: new Date(order.expected_date as string).getTime(),
      };
    });

  const combined = [...delayedShipments, ...alertRows]
    .sort((left, right) => {
      const severityDelta =
        attentionPriority[right.severity] - attentionPriority[left.severity];
      if (severityDelta !== 0) return severityDelta;
      return right.sortValue - left.sortValue;
    })
    .slice(0, 6);

  if (combined.length > 0) {
    return combined;
  }

  return data.products
    .filter((product) => product.quantity_on_hand <= product.reorder_point)
    .slice(0, 6)
    .map((product) => ({
      id: `fallback-${product.id}`,
      severity:
        product.quantity_on_hand === 0
          ? ("critical" as const)
          : ("medium" as const),
      title:
        product.quantity_on_hand === 0
          ? `${product.sku} is out of stock`
          : `${product.sku} is nearing its reorder point`,
      detail: `${product.name} · ${product.quantity_on_hand} units on hand`,
      timeLabel: "Inventory watch",
      sortValue: product.quantity_on_hand,
    }));
};

const buildDeliveryRows = (
  purchaseOrders: PurchaseOrder[],
  purchaseOrderItems: PurchaseOrderItem[],
) => {
  const itemsByOrder = purchaseOrderItems.reduce((accumulator, item) => {
    const rows = accumulator.get(item.po_id) ?? [];
    rows.push(item);
    accumulator.set(item.po_id, rows);
    return accumulator;
  }, new Map<string, PurchaseOrderItem[]>());

  return purchaseOrders
    .filter(
      (order) => order.status !== "closed" && order.status !== "cancelled",
    )
    .map((order): DeliveryRow => {
      const lineItems = itemsByOrder.get(order.id) ?? [];
      const orderedUnits = lineItems.reduce(
        (sum, item) => sum + item.quantity_ordered,
        0,
      );
      const totalValue = lineItems.reduce(
        (sum, item) => sum + item.quantity_ordered * item.unit_cost,
        0,
      );
      const overdue =
        !!order.expected_date && getDaysFromToday(order.expected_date) < 0;
      const statusLabel = overdue
        ? "Delayed"
        : order.status === "partial"
          ? "Pending"
          : "On Time";
      const statusTone: DeliveryRow["statusTone"] = overdue
        ? "delayed"
        : order.status === "partial"
          ? "pending"
          : "on-time";

      return {
        id: order.id,
        poLabel: padPurchaseOrder(order.po_number),
        vendor: order.suppliers?.name ?? "Unassigned supplier",
        itemsCountLabel: formatInteger(orderedUnits),
        valueLabel: formatCurrency(totalValue),
        expectedLabel: formatExpectedDate(order.expected_date),
        statusLabel,
        statusTone,
        sortValue: order.expected_date
          ? new Date(order.expected_date).getTime()
          : Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((left, right) => left.sortValue - right.sortValue)
    .slice(0, 6);
};

const buildVelocityGroups = (data: DashboardData) => {
  const topMoverIds = new Set(data.topMovers.map((item) => item.id));

  const fast = data.topMovers.slice(0, 5).map((item) => {
    const weeklyVelocity = Math.max(1, Math.round(item.totalSold / 4.3));
    const statusTone = classifyVelocityTone(weeklyVelocity);
    return {
      id: item.id,
      name: item.name,
      sku: item.sku,
      metricLabel: `${formatInteger(weeklyVelocity)} /wk`,
      statusLabel: statusTone === "high" ? "High" : "Medium",
      statusTone,
    };
  });

  const slow = data.products
    .filter(
      (product) => !topMoverIds.has(product.id) && product.quantity_on_hand > 0,
    )
    .sort(
      (left, right) =>
        left.quantity_on_hand -
        left.reorder_point -
        (right.quantity_on_hand - right.reorder_point),
    )
    .slice(0, 5)
    .map((product) => {
      const weeklyVelocity = Math.max(
        1,
        Math.round(
          Math.max(product.quantity_on_hand - product.reorder_point, 1) / 4,
        ),
      );
      const statusTone = classifyVelocityTone(weeklyVelocity);
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        metricLabel: `${formatInteger(weeklyVelocity)} /wk`,
        statusLabel:
          statusTone === "high"
            ? "High"
            : statusTone === "medium"
              ? "Medium"
              : "Low",
        statusTone,
      };
    });

  const dead = data.products
    .filter((product) => !topMoverIds.has(product.id))
    .sort((left, right) => right.quantity_on_hand - left.quantity_on_hand)
    .slice(0, 5)
    .map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      metricLabel: `${formatInteger(product.quantity_on_hand)} idle units`,
      statusLabel: "Dormant",
      statusTone: "low" as VelocityTone,
    }));

  return { fast, slow, dead };
};

export const DashboardPage = () => {
  const { companyId } = useCompany();
  const navigate = useNavigate();
  const { data, isLoading, isFetching, isError, error } =
    useDashboard(companyId);
  const { data: alertEvents = [] } = useAlertEvents(companyId);
  const { data: purchaseOrders = [] } = useProcurementPurchaseOrders(companyId);
  const { data: purchaseOrderItems = [] } =
    useProcurementPurchaseOrderItems(companyId);
  const [velocityTab, setVelocityTab] = useState<VelocityTabId>("fast");

  const shouldShowLoading = isLoading || (isFetching && !data);
  const deliveriesTableMinWidth: CSSProperties["minWidth"] = 640;
  const productSearchSuggestions = useMemo(
    () =>
      (data?.products ?? []).map((product) => ({
        id: `dashboard-product-${product.id}`,
        title: product.name,
        subtitle: `${product.sku || "No SKU"} · ${formatInteger(product.quantity_on_hand)} on hand`,
        value: product.name,
        keywords: [product.sku, product.name].filter(Boolean),
        badge: "Product",
      })),
    [data?.products],
  );

  const handleProductSuggestionSelect = useCallback(
    ({ id }: { id: string }) => {
      const productId = id.replace(/^dashboard-product-/, "");
      const matchedProduct = data?.products.find(
        (product) => product.id === productId,
      );

      if (matchedProduct) {
        navigate(`/inventory/${matchedProduct.id}/overview`);
      }
    },
    [data?.products, navigate],
  );

  const searchConfig = useMemo(() => ({
      searchKey: "dashboard-items",
      placeholder: "Search items...",
      suggestions: productSearchSuggestions,
      onSuggestionSelect: handleProductSuggestionSelect,
    }), [
      handleProductSuggestionSelect,
      productSearchSuggestions,
    ]);

  const pageModel = useMemo(() => {
    if (!data) return null;

    const inventoryTrend = formatTrendPercent(
      data.chartData.map((point) => point.value),
    );
    const movementTrend = formatTrendPercent(
      data.movementChartData.map((point) => point.inbound + point.outbound),
    );
    const criticalAttentionCount =
      alertEvents.filter(
        (event) => event.status !== "resolved" && event.severity === "critical",
      ).length || data.alertsSummary.criticalAlerts;

    const deliveryRows = buildDeliveryRows(purchaseOrders, purchaseOrderItems);
    const attentionItems = buildAttentionItems(
      alertEvents,
      purchaseOrders,
      data,
    );
    const velocityGroups = buildVelocityGroups(data);

    const metrics: DashboardMetric[] = [
      {
        label: "Total Value",
        value: formatCompactCurrency(data.totalValue),
        accentLabel: inventoryTrend.text,
        accentTone:
          inventoryTrend.direction === "neutral" ? "neutral" : "positive",
        detail: "Inventory trend",
        direction: inventoryTrend.direction,
      },
      {
        label: "Total Items",
        value: formatInteger(data.totalStockUnits),
        accentLabel: movementTrend.text,
        accentTone:
          movementTrend.direction === "neutral" ? "neutral" : "positive",
        detail: `${formatInteger(data.products.length)} active SKUs`,
        direction: movementTrend.direction,
      },
      {
        label: "Pending POs",
        value: formatInteger(data.pendingOrders),
        accentLabel: `${deliveryRows.length} scheduled`,
        accentTone: "positive",
        detail: "Inbound procurement",
        direction: "up",
      },
      {
        label: "Out of Stock",
        value: formatInteger(data.outOfStockCount),
        accentLabel: `${criticalAttentionCount} critical`,
        accentTone: data.outOfStockCount > 0 ? "danger" : "neutral",
        detail: "Immediate action",
        direction: data.outOfStockCount > 0 ? "up" : "neutral",
      },
      {
        label: "Low Stock",
        value: formatInteger(data.lowStockCount),
        accentLabel: `${data.alertsSummary.reorderAlerts} reorder`,
        accentTone: data.lowStockCount > 0 ? "danger" : "neutral",
        detail: "Needs replenishment",
        direction: data.lowStockCount > 0 ? "up" : "neutral",
      },
    ];

    return {
      metrics,
      attentionItems,
      deliveryRows,
      velocityGroups,
    };
  }, [alertEvents, data, purchaseOrderItems, purchaseOrders]);

  const deliveryColumns = useMemo<DataTableColumn<DeliveryRow>[]>(
    () => [
      {
        id: "poNumber",
        header: "PO Number",
        renderCell: (row) => row.poLabel,
      },
      {
        id: "vendor",
        header: "Vendor",
        renderCell: (row) => row.vendor,
      },
      {
        id: "items",
        header: "Items",
        renderCell: (row) => row.itemsCountLabel,
      },
      {
        id: "value",
        header: "Value",
        renderCell: (row) => row.valueLabel,
      },
      {
        id: "expected",
        header: "Expected",
        renderCell: (row) => row.expectedLabel,
      },
      {
        id: "status",
        header: "Status",
        renderCell: (row) => (
          <span className={css("stoqr-dashboard__status-pill", `is-${row.statusTone}`)}>
            {row.statusLabel}
          </span>
        ),
      },
    ],
    [],
  );

  const attentionColumns = useMemo<DataTableColumn<AttentionItem>[]>(
    () => [
      {
        id: "alert",
        header: "Alert",
        width: "76%",
        headerClassName: "px-0",
        cellClassName: "px-0",
        renderCell: (item) => (
          <div className={css("stoqr-dashboard__alert-table-cell")}>
            <span
              className={css("stoqr-dashboard__alert-dot", `is-${item.severity}`)}
              aria-hidden="true"
            />
            <div className={css("stoqr-dashboard__alert-copy")}>
              <p className={css("stoqr-dashboard__alert-title")}>{item.title}</p>
              <p className={css("stoqr-dashboard__alert-detail")}>{item.detail}</p>
            </div>
          </div>
        ),
      },
      {
        id: "when",
        header: "When",
        width: "24%",
        align: "right",
        headerClassName: "pl-4 pr-0",
        cellClassName: "pl-4 pr-0",
        renderCell: (item) => (
          <span className={css("stoqr-dashboard__alert-time")}>{item.timeLabel}</span>
        ),
      },
    ],
    [],
  );

  const velocityColumns = useMemo<DataTableColumn<VelocityItem>[]>(
    () => [
      {
        id: "item",
        header: "Item",
        width: "68%",
        headerClassName: "px-0",
        cellClassName: "px-0",
        renderCell: (item) => (
          <div className={css("stoqr-dashboard__velocity-copy")}>
            <p className={css("stoqr-dashboard__velocity-name")}>{item.name}</p>
            <p className={css("stoqr-dashboard__velocity-sku")}>{item.sku}</p>
          </div>
        ),
      },
      {
        id: "velocity",
        header: "Velocity",
        width: "32%",
        align: "right",
        headerClassName: "pl-4 pr-0",
        cellClassName: "pl-4 pr-0",
        renderCell: (item) => (
          <div className={css("stoqr-dashboard__velocity-meta")}>
            <span className={css("stoqr-dashboard__velocity-rate")}>
              {item.metricLabel}
            </span>
            <span
              className={css("stoqr-dashboard__velocity-status", `is-${item.statusTone}`)}
            >
              {item.statusLabel}
            </span>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <StoqrPageShell
      companyId={companyId}
      search={searchConfig}
      isLoading={shouldShowLoading}
      emptyStateTitle="Welcome to Open StoQR"
      emptyStateDescription="Select or create a company to load your inventory dashboard."
      loadingMessage="Loading dashboard..."
      containerClassName={css("stoqr-dashboard")}
      contentStyle={{ padding: "18px 8px 32px" }}
      containerStyle={{ minWidth: 0 }}
    >
      {isError ? (
        <div className="empty-state">
          {error instanceof Error
            ? error.message
            : "Failed to load dashboard data."}
        </div>
      ) : data && pageModel ? (
        <>
          <AnalyticsMetricGrid variant="summary" aria-label="Dashboard metrics">
            {pageModel.metrics.map((metric) => (
              <AnalyticsMetricCard
                key={metric.label}
                surface="plain"
                label={metric.label}
                value={metric.value}
                accent={{
                  label: metric.accentLabel,
                  direction: metric.direction,
                  tone: metric.accentTone,
                }}
                detail={metric.detail}
              />
            ))}
          </AnalyticsMetricGrid>

          <section className={css("stoqr-dashboard__layout", "stoqr-dashboard__layout--primary")}>
            <AnalyticsPanel
              title="Inbound vs Outbound Volume"
              className={css("stoqr-dashboard__section")}
              headerAside={
                <AnalyticsLegend
                  items={[
                    { label: "Inbound", color: "var(--color-surface-strong)" },
                    { label: "Outbound", color: "var(--color-foreground)" },
                  ]}
                />
              }
            >
              <AnalyticsComparisonBars
                data={buildMovementChartWindow(data.movementChartData)}
                labelKey="label"
                ariaLabel="Inbound and outbound inventory volume"
                emptyMessage="No movement history yet."
                series={[
                  { dataKey: "inbound", label: "Inbound", color: "var(--color-surface-strong)" },
                  { dataKey: "outbound", label: "Outbound", color: "var(--color-foreground)" },
                ]}
              />
            </AnalyticsPanel>

            <AnalyticsTablePanel
              surface="plain"
              className={css("stoqr-dashboard__section")}
              title="Actionable Alerts"
            >
              {pageModel.attentionItems.length > 0 ? (
                <DataTable
                  variant="dashboard"
                  columns={attentionColumns}
                  rows={pageModel.attentionItems}
                  getRowId={(item) => item.id}
                  tableLayout="fixed"
                />
              ) : (
                <AnalyticsEmptyPanel message="No actionable alerts right now." />
              )}
            </AnalyticsTablePanel>
          </section>

          <section className={css("stoqr-dashboard__layout", "stoqr-dashboard__layout--secondary")}>
            <AnalyticsTablePanel
              surface="plain"
              className={css("stoqr-dashboard__section")}
              title="Expected Deliveries"
            >
              {pageModel.deliveryRows.length > 0 ? (
                <>
                  <div className={css("stoqr-dashboard__deliveries-desktop")}>
                    <DataTable
                      variant="dashboard"
                      columns={deliveryColumns}
                      rows={pageModel.deliveryRows}
                      getRowId={(row) => row.id}
                      minTableWidth={deliveriesTableMinWidth}
                    />
                  </div>

                  <div className={css("stoqr-dashboard__deliveries-mobile")}>
                    {pageModel.deliveryRows.map((row) => (
                      <div
                        key={row.id}
                        className={css("stoqr-dashboard__delivery-card")}
                      >
                        <div className={css("stoqr-dashboard__delivery-card-row")}>
                          <span className={css("stoqr-dashboard__delivery-card-po")}>
                            {row.poLabel}
                          </span>
                          <span
                            className={css("stoqr-dashboard__status-pill", `is-${row.statusTone}`)}
                          >
                            {row.statusLabel}
                          </span>
                        </div>
                        <p className={css("stoqr-dashboard__delivery-card-vendor")}>
                          {row.vendor}
                        </p>
                        <div className={css("stoqr-dashboard__delivery-card-meta")}>
                          <span>{row.itemsCountLabel} items</span>
                          <span>{row.valueLabel}</span>
                          <span>{row.expectedLabel}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <AnalyticsEmptyPanel message="No deliveries scheduled." />
              )}
            </AnalyticsTablePanel>

            <AnalyticsTablePanel
              surface="plain"
              className={css("stoqr-dashboard__section")}
              title="Item Velocity"
              headerClassName={css("stoqr-dashboard__section-header", "stoqr-dashboard__section-header--compact")}
              headerAside={
                <div
                  className={css("stoqr-dashboard__velocity-toggle")}
                  role="tablist"
                  aria-label="Velocity range"
                >
                  {velocityTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={css("stoqr-dashboard__velocity-toggle-button", velocityTab === tab.id && "is-active")}
                      onClick={() => setVelocityTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              }
            >
              {(pageModel.velocityGroups[velocityTab] as VelocityItem[])
                .length > 0 ? (
                <DataTable
                  variant="dashboard"
                  columns={velocityColumns}
                  rows={pageModel.velocityGroups[velocityTab] as VelocityItem[]}
                  getRowId={(item) => item.id}
                  tableLayout="fixed"
                />
              ) : (
                <AnalyticsEmptyPanel message="No inventory movement yet. Add products and transactions to populate velocity insights." />
              )}
            </AnalyticsTablePanel>
          </section>
        </>
      ) : (
        <div className="empty-state">No dashboard data available.</div>
      )}
    </StoqrPageShell>
  );
};
