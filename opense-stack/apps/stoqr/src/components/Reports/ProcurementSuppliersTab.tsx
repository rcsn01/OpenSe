import { useMemo } from "react";
import {
  AnalyticsEmptyPanel,
  AnalyticsLineChart,
  AnalyticsMetricCard,
  AnalyticsMetricGrid,
  AnalyticsMiniSparkline,
  AnalyticsPanel,
  AnalyticsTablePanel,
  DataTable,
} from "@repo/ui";
import {
  useProcurementSuppliers,
  useProcurementPurchaseOrders,
  useProcurementPurchaseOrderItems,
  useProcurementOrderHistory,
  useProcurementReceivingLogs,
} from "../../hooks/queries/useProcurementTabs";
import { formatCurrency } from "../../utils";

export const ProcurementSuppliersTab = ({
  companyId,
}: {
  companyId: string | null;
}) => {
  const { data: suppliers } = useProcurementSuppliers(companyId);
  const { data: orders } = useProcurementPurchaseOrders(companyId);
  const { data: orderItems } = useProcurementPurchaseOrderItems(companyId);
  const { data: history } = useProcurementOrderHistory(companyId);
  const { data: receivingLogs } = useProcurementReceivingLogs(companyId);

  const allOrders = orders ?? [];
  const allItems = orderItems ?? [];
  const allHistory = history ?? [];
  const allLogs = receivingLogs ?? [];
  const allSuppliers = suppliers ?? [];
  const mergedOrders = useMemo(() => {
    const byId = new Map<string, (typeof allOrders)[number]>();

    [...allOrders, ...allHistory].forEach((order) => {
      byId.set(order.id, order);
    });

    return Array.from(byId.values());
  }, [allOrders, allHistory]);

  // Pending PO value: sum of total_cost for orders that are draft/sent/partial
  const pendingPoValue = useMemo(() => {
    const pendingOrderIds = new Set(
      allOrders
        .filter((o) => ["draft", "sent", "partial"].includes(o.status))
        .map((o) => o.id),
    );
    return allItems
      .filter((item) => pendingOrderIds.has(item.po_id))
      .reduce((sum, item) => sum + item.quantity_ordered * item.unit_cost, 0);
  }, [allOrders, allItems]);

  // Completed POs (30d): sum of total_cost for closed orders in last 30d
  const completedPoValue = useMemo(() => {
    const cutoff = Date.now() - 30 * 86_400_000;
    const closedIds = new Set(
      mergedOrders
        .filter(
          (o) =>
            o.status === "closed" && new Date(o.created_at).getTime() >= cutoff,
        )
        .map((o) => o.id),
    );
    return allItems
      .filter((item) => closedIds.has(item.po_id))
      .reduce((sum, item) => sum + item.quantity_received * item.unit_cost, 0);
  }, [mergedOrders, allItems]);

  // Avg Lead Time: days between PO creation and receiving
  const avgLeadTime = useMemo(() => {
    const leadTimes: number[] = [];
    for (const log of allLogs) {
      if (!log.po_id) continue;
      const order = mergedOrders.find((o) => o.id === log.po_id);
      if (!order) continue;
      const created = new Date(order.created_at).getTime();
      const received = new Date(log.received_at).getTime();
      if (received > created) {
        leadTimes.push((received - created) / 86_400_000);
      }
    }
    if (leadTimes.length === 0) return 0;
    return leadTimes.reduce((s, v) => s + v, 0) / leadTimes.length;
  }, [mergedOrders, allLogs]);

  // Avg Defect Rate: (ordered - received) / ordered
  const avgDefectRate = useMemo(() => {
    const totalOrdered = allItems.reduce(
      (s, item) => s + item.quantity_ordered,
      0,
    );
    const totalReceived = allItems.reduce(
      (s, item) => s + item.quantity_received,
      0,
    );
    if (totalOrdered === 0) return 0;
    const shortfall = Math.max(totalOrdered - totalReceived, 0);
    return (shortfall / totalOrdered) * 100;
  }, [allItems]);

  // Supplier scorecard
  const supplierScorecard = useMemo(() => {
    return allSuppliers.map((supplier) => {
      const supplierOrders = mergedOrders.filter(
        (o) => o.supplier_id === supplier.id,
      );
      const supplierOrderIds = new Set(supplierOrders.map((o) => o.id));
      const supplierItems = allItems.filter((item) =>
        supplierOrderIds.has(item.po_id),
      );

      // On-time %: closed orders where received before/on expected_date
      const closedOrders = supplierOrders.filter((o) => o.status === "closed");
      let onTimeCount = 0;
      for (const order of closedOrders) {
        if (!order.expected_date) {
          onTimeCount++;
          continue;
        }
        const lastLog = allLogs
          .filter((l) => l.po_id === order.id)
          .sort(
            (a, b) =>
              new Date(b.received_at).getTime() -
              new Date(a.received_at).getTime(),
          )[0];
        if (
          lastLog &&
          new Date(lastLog.received_at) <=
            new Date(order.expected_date + "T23:59:59")
        ) {
          onTimeCount++;
        }
      }
      const onTimePct =
        closedOrders.length > 0
          ? Math.round((onTimeCount / closedOrders.length) * 100)
          : 0;

      // Defect %: shortfall ratio
      const totalOrdered = supplierItems.reduce(
        (s, i) => s + i.quantity_ordered,
        0,
      );
      const totalReceived = supplierItems.reduce(
        (s, i) => s + i.quantity_received,
        0,
      );
      const defectPct =
        totalOrdered > 0
          ? (Math.max(totalOrdered - totalReceived, 0) / totalOrdered) * 100
          : 0;

      // Fulfillment accuracy: received / ordered
      const fulfillmentAcc =
        totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

      // Rating
      let rating: "Excellent" | "Good" | "Needs Review";
      if (onTimePct >= 95 && defectPct <= 1 && fulfillmentAcc >= 98) {
        rating = "Excellent";
      } else if (onTimePct >= 85 && defectPct <= 2 && fulfillmentAcc >= 93) {
        rating = "Good";
      } else {
        rating = "Needs Review";
      }

      return {
        name: supplier.name,
        onTimePct,
        defectPct: Number(defectPct.toFixed(1)),
        fulfillmentAcc: Math.min(fulfillmentAcc, 100),
        rating,
      };
    });
  }, [allSuppliers, mergedOrders, allItems, allLogs]);

  // Price Variance: track unit_cost changes for top SKU over time
  const priceVarianceData = useMemo(() => {
    // Find the most-ordered product
    const productCounts = new Map<string, { sku: string; count: number }>();
    for (const item of allItems) {
      if (!item.products) continue;
      const existing = productCounts.get(item.products.id) ?? {
        sku: item.products.sku,
        count: 0,
      };
      existing.count += item.quantity_ordered;
      productCounts.set(item.products.id, existing);
    }
    const topProduct = Array.from(productCounts.entries()).sort(
      (a, b) => b[1].count - a[1].count,
    )[0];
    if (!topProduct) return { sku: "N/A", data: [] };

    const [productId, { sku }] = topProduct;

    // Collect unit_cost over time for this product, grouped by month
    const pricesByMonth = new Map<string, number[]>();
    for (const item of allItems) {
      if (item.product_id !== productId) continue;
      const po = item.purchase_orders;
      if (!po) continue;
      // Find order date from allOrders
      const order = mergedOrders.find((o) => o.id === item.po_id);
      if (!order) continue;
      const date = new Date(order.created_at);
      const monthKey = date.toLocaleDateString("en-US", { month: "short" });
      const prices = pricesByMonth.get(monthKey) ?? [];
      prices.push(item.unit_cost);
      pricesByMonth.set(monthKey, prices);
    }

    const data = Array.from(pricesByMonth.entries()).map(([month, prices]) => ({
      month,
      price: prices.reduce((s, p) => s + p, 0) / prices.length,
    }));

    return { sku, data };
  }, [allItems, mergedOrders]);

  // Sparkline data for pending PO
  const pendingSparkline = useMemo(() => {
    const pendingOrders = allOrders
      .filter((o) => ["draft", "sent", "partial"].includes(o.status))
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      .slice(-7);
    return pendingOrders.map((o) => {
      const items = allItems.filter((i) => i.po_id === o.id);
      return items.reduce((s, i) => s + i.quantity_ordered * i.unit_cost, 0);
    });
  }, [allOrders, allItems]);

  const RATING_STYLES: Record<string, { bg: string; color: string }> = {
    Excellent: { bg: "rgba(22, 163, 74, 0.12)", color: "#166534" },
    Good: { bg: "rgba(37, 99, 235, 0.12)", color: "#1e40af" },
    "Needs Review": { bg: "rgba(245, 158, 11, 0.16)", color: "#92400e" },
  };

  return (
    <div className="stoqr-analytics-tab">
      <AnalyticsMetricGrid variant="stats-4">
        <AnalyticsMetricCard
          label="Pending PO Value"
          value={formatCompact(pendingPoValue)}
          valueMeta={<span className="small muted">Active order pipeline</span>}
          visual={
            <AnalyticsMiniSparkline
              data={pendingSparkline}
              color="var(--color-foreground)"
              showDots={false}
            />
          }
        />
        <AnalyticsMetricCard
          label="Completed POs (30d)"
          value={formatCompact(completedPoValue)}
          valueMeta={<span className="small muted">Total received value</span>}
        />
        <AnalyticsMetricCard
          label="Avg Lead Time"
          value={`${avgLeadTime.toFixed(1)}d`}
          valueMeta={
            <span className="small muted">
              {avgLeadTime <= 14 ? "Slight improvement" : "Needs attention"}
            </span>
          }
          visual={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 0,
                marginTop: 6,
              }}
            >
              <div
                style={{
                  height: 3,
                  flex: 1,
                  background: "#2563eb",
                  borderRadius: "var(--radius-full)",
                }}
              />
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#2563eb",
                    margin: "0 4px",
                  }}
                />
              ))}
              <div
                style={{
                  height: 3,
                  flex: 1,
                  background: "#2563eb",
                  borderRadius: "var(--radius-full)",
                }}
              />
            </div>
          }
        />
        <AnalyticsMetricCard
          label="Avg Defect Rate"
          value={`${avgDefectRate.toFixed(1)}%`}
          valueMeta={
            <span className="small muted">
              {avgDefectRate > 2 ? "Requires attention" : "Within targets"}
            </span>
          }
          visual={
            <svg
              width="120"
              height="20"
              viewBox="0 0 120 20"
              style={{ marginTop: 4 }}
            >
              <path
                d="M0,10 Q10,2 20,10 T40,10 T60,10 T80,10 T100,10 T120,10"
                fill="none"
                stroke={
                  avgDefectRate > 2
                    ? "var(--color-destructive)"
                    : "var(--color-success)"
                }
                strokeWidth="1.5"
                opacity="0.6"
              />
            </svg>
          }
        />
      </AnalyticsMetricGrid>

      <div className="grid grid-2">
        <AnalyticsTablePanel title="Supplier Scorecard">
          {supplierScorecard.length === 0 ? (
            <AnalyticsEmptyPanel message="No supplier data available." />
          ) : (
            <DataTable
              columns={[
                {
                  id: "supplier",
                  header: "Supplier",
                  renderCell: (row: (typeof supplierScorecard)[number]) => (
                    <span style={{ fontWeight: "var(--type-weight-semibold)" }}>
                      {row.name}
                    </span>
                  ),
                },
                {
                  id: "on-time",
                  header: "On-Time %",
                  align: "center",
                  renderCell: (row: (typeof supplierScorecard)[number]) =>
                    `${row.onTimePct}%`,
                },
                {
                  id: "defect",
                  header: "Defect %",
                  align: "center",
                  renderCell: (row: (typeof supplierScorecard)[number]) =>
                    `${row.defectPct}%`,
                },
                {
                  id: "fulfillment",
                  header: "Fulfillment Acc.",
                  align: "center",
                  renderCell: (row: (typeof supplierScorecard)[number]) =>
                    `${row.fulfillmentAcc}%`,
                },
                {
                  id: "rating",
                  header: "Rating",
                  align: "center",
                  renderCell: (row: (typeof supplierScorecard)[number]) => (
                    <span
                      className="badge"
                      style={{
                        background: RATING_STYLES[row.rating]?.bg,
                        color: RATING_STYLES[row.rating]?.color,
                      }}
                    >
                      {row.rating}
                    </span>
                  ),
                },
              ]}
              rows={supplierScorecard}
              getRowId={(row) => row.name}
            />
          )}
        </AnalyticsTablePanel>

        <AnalyticsPanel
          title={`Price Variance${priceVarianceData.sku !== "N/A" ? ` (SKU: ${priceVarianceData.sku})` : ""}`}
        >
          {priceVarianceData.data.length === 0 ? (
            <AnalyticsEmptyPanel message="No price history available." />
          ) : (
            <AnalyticsLineChart
              data={priceVarianceData.data}
              xDataKey="month"
              yAxisWidth={50}
              series={[
                { dataKey: "price", label: "Unit Cost", color: "#2563eb" },
              ]}
              tooltipFormatter={(value) => [
                formatCurrency(Number(value)),
                "Unit Cost",
              ]}
            />
          )}
        </AnalyticsPanel>
      </div>
    </div>
  );
};

/** Format large numbers compactly (e.g. $145K, $1.2M) */
const formatCompact = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value.toFixed(0)}`;
};
