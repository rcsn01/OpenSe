import { useMemo, useState } from "react";
import {
  AnalyticsDonutChart,
  AnalyticsEmptyPanel,
  AnalyticsLegend,
  AnalyticsMetricCard,
  AnalyticsMetricGrid,
  AnalyticsPanel,
  AnalyticsTablePanel,
  DataTable,
} from "@repo/ui";
import { useAuditShrinkageData } from "../../hooks/queries/useReports";

const REASON_COLORS: Record<string, string> = {
  "Damaged in Transit": "var(--color-primary)",
  Expired: "var(--color-warning)",
  "Lost/Theft": "var(--color-destructive)",
  "Counting Error": "var(--color-muted-foreground)",
};

const reasonOptions = [
  "all",
  "Damaged in Transit",
  "Expired",
  "Lost/Theft",
  "Counting Error",
] as const;

const inferReasonCode = (input: {
  transaction_type: string;
  source: string | null;
  notes: string | null;
}) => {
  const note = (input.notes ?? "").toLowerCase();

  if (
    note.includes("damage") ||
    note.includes("damaged") ||
    note.includes("transit") ||
    note.includes("broken")
  ) {
    return "Damaged in Transit";
  }
  if (note.includes("expir")) {
    return "Expired";
  }
  if (
    input.transaction_type === "loss" ||
    note.includes("theft") ||
    note.includes("stolen") ||
    note.includes("missing") ||
    note.includes("shrink") ||
    note.includes("loss")
  ) {
    return "Lost/Theft";
  }
  if (input.source === "receiving") {
    return "Damaged in Transit";
  }
  return "Counting Error";
};

const formatCompactCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

const formatAuditDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

export const AuditsShrinkageTab = ({
  companyId,
}: {
  companyId: string | null;
}) => {
  const { data } = useAuditShrinkageData(companyId);
  const [reasonFilter, setReasonFilter] =
    useState<(typeof reasonOptions)[number]>("all");

  const discrepancies = data?.discrepancies ?? [];
  const sales = data?.sales ?? [];

  const shrinkageEvents = useMemo(
    () => discrepancies.filter((item) => item.quantity_change < 0),
    [discrepancies],
  );

  const totalShrinkageValue = useMemo(
    () =>
      shrinkageEvents.reduce(
        (sum, item) =>
          sum +
          Math.abs(item.quantity_change) * (item.products?.cost_price ?? 0),
        0,
      ),
    [shrinkageEvents],
  );

  const ytdRevenue = useMemo(
    () =>
      sales.reduce(
        (sum, item) =>
          sum +
          Math.abs(item.quantity_change) * (item.products?.selling_price ?? 0),
        0,
      ),
    [sales],
  );

  const shrinkageRate =
    ytdRevenue > 0 ? (totalShrinkageValue / ytdRevenue) * 100 : 0;

  const recentDiscrepancies = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return discrepancies.filter(
      (item) => new Date(item.created_at).getTime() >= cutoff,
    );
  }, [discrepancies]);

  const inventoryAccuracy = useMemo(() => {
    if (recentDiscrepancies.length === 0) return 100;

    const totalAccuracy = recentDiscrepancies.reduce((sum, item) => {
      const expected = Math.max(
        Math.abs(item.stock_after - item.quantity_change),
        1,
      );
      const variance = Math.abs(item.quantity_change);
      const accuracy = Math.max(0, 1 - variance / expected);
      return sum + accuracy;
    }, 0);

    return (totalAccuracy / recentDiscrepancies.length) * 100;
  }, [recentDiscrepancies]);

  const pendingDiscrepancies = recentDiscrepancies.length;

  const reasonBreakdown = useMemo(() => {
    const totals = new Map<string, number>();

    discrepancies.forEach((item) => {
      const reason = inferReasonCode(item);
      totals.set(
        reason,
        (totals.get(reason) ?? 0) + Math.abs(item.quantity_change),
      );
    });

    return Array.from(totals.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [discrepancies]);

  const logRows = useMemo(() => {
    const rows = discrepancies.map((item) => {
      const expected = item.stock_after - item.quantity_change;
      return {
        id: item.id,
        date: item.created_at,
        sku: item.products?.sku ?? "N/A",
        expected,
        actual: item.stock_after,
        variance: item.quantity_change,
        reason: inferReasonCode(item),
      };
    });

    return rows
      .filter((row) => reasonFilter === "all" || row.reason === reasonFilter)
      .slice(0, 6);
  }, [discrepancies, reasonFilter]);

  return (
    <div className="flex min-w-0 flex-col gap-7">
      <AnalyticsMetricGrid variant="stats-3">
        <AnalyticsMetricCard
          label="Total Shrinkage Value (YTD)"
          value={
            <span className="text-[var(--color-destructive)]">
              {formatCompactCurrency(totalShrinkageValue)}
            </span>
          }
          valueMeta={
            <span className="text-sm text-[var(--color-muted-foreground)]">
              {shrinkageRate.toFixed(1)}% of revenue
            </span>
          }
          visual={
            <div
              style={{
                marginTop: 10,
                height: 30,
                borderTop: "3px solid var(--color-destructive)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--color-muted-foreground) 16%, transparent), var(--color-muted-foreground))",
                borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
              }}
            />
          }
        />
        <AnalyticsMetricCard
          label="Inventory Accuracy"
          value={
            <span className="text-[var(--color-success)]">
              {inventoryAccuracy.toFixed(1)}%
            </span>
          }
          valueMeta={
            <span className="text-sm text-[var(--color-muted-foreground)]">Rolling 30-day average</span>
          }
          visual={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 0,
                marginTop: 10,
              }}
            >
              <div
                style={{
                  height: 3,
                  flex: 1,
                  background: "var(--color-success)",
                  borderRadius: "var(--radius-full)",
                }}
              />
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--color-success)",
                    margin: "0 12px",
                  }}
                />
              ))}
              <div
                style={{
                  height: 3,
                  flex: 1,
                  background: "var(--color-success)",
                  borderRadius: "var(--radius-full)",
                }}
              />
            </div>
          }
        />
        <AnalyticsMetricCard
          label="Pending Discrepancies"
          value={
            <span className="text-[var(--color-warning)]">{pendingDiscrepancies}</span>
          }
          valueMeta={
            <span className="text-sm text-[var(--color-muted-foreground)]">Requires manager review</span>
          }
          visual={
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  style={{
                    width: 32,
                    height: Math.max(24, 40 - index * 3),
                    borderRadius: "var(--radius-sm)",
                    background:
                      index < Math.min(pendingDiscrepancies, 5)
                        ? "var(--color-warning)"
                        : "var(--color-muted)",
                  }}
                />
              ))}
            </div>
          }
        />
      </AnalyticsMetricGrid>

      <div className="grid gap-5 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
        <AnalyticsPanel title="Shrinkage Reason Codes">
          {reasonBreakdown.length === 0 ? (
            <AnalyticsEmptyPanel message="No discrepancy data available." />
          ) : (
            <>
              <AnalyticsDonutChart
                data={reasonBreakdown}
                colors={reasonBreakdown.map(
                  (entry) =>
                    REASON_COLORS[entry.name] ??
                    "var(--color-muted-foreground)",
                )}
                innerRadius={62}
                outerRadius={90}
                strokeWidth={4}
                tooltipFormatter={(value) => [value, "Variance Units"]}
              />
              <AnalyticsLegend
                muted
                items={reasonBreakdown.map((entry) => ({
                  label: entry.name,
                  color:
                    REASON_COLORS[entry.name] ??
                    "var(--color-muted-foreground)",
                  shape: "dot",
                }))}
              />
            </>
          )}
        </AnalyticsPanel>

        <AnalyticsTablePanel
          title="Recent Discrepancy Log"
        >
          <DataTable
            topRow={{
              filters: [
                {
                  value: reasonFilter,
                  options: [
                    { value: "all", label: "All Reasons" },
                    { value: "Damaged in Transit", label: "Damaged in Transit" },
                    { value: "Expired", label: "Expired" },
                    { value: "Lost/Theft", label: "Lost/Theft" },
                    { value: "Counting Error", label: "Counting Error" },
                  ],
                  onChange: (value) =>
                    setReasonFilter(value as (typeof reasonOptions)[number]),
                  ariaLabel: "Discrepancy reason filter",
                  menuClassName: "min-w-[180px]",
                },
              ],
            }}
            emptyState={
              <AnalyticsEmptyPanel message="No discrepancy records for the selected filter." />
            }
            columns={[
              {
                id: "date",
                header: "Date",
                renderCell: (row: (typeof logRows)[number]) => (
                  <span className="text-sm text-[var(--color-muted-foreground)]">
                    {formatAuditDate(row.date)}
                  </span>
                ),
              },
              {
                id: "sku",
                header: "SKU",
                renderCell: (row: (typeof logRows)[number]) => (
                  <span className="font-semibold text-[var(--color-foreground)]">
                    {row.sku}
                  </span>
                ),
              },
              {
                id: "expected",
                header: "Expected",
                align: "right",
                renderCell: (row: (typeof logRows)[number]) => row.expected,
              },
              {
                id: "actual",
                header: "Actual",
                align: "right",
                renderCell: (row: (typeof logRows)[number]) => row.actual,
              },
              {
                id: "variance",
                header: "Variance",
                align: "right",
                renderCell: (row: (typeof logRows)[number]) => (
                  <span
                    className={row.variance < 0 ? "font-semibold text-[var(--color-destructive)]" : "font-semibold text-[var(--color-success)]"}
                  >
                    {row.variance > 0 ? "+" : ""}
                    {row.variance}
                  </span>
                ),
              },
              {
                id: "reason",
                header: "Reason",
                renderCell: (row: (typeof logRows)[number]) => (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
                    {row.reason}
                  </span>
                ),
              },
            ]}
            rows={logRows}
            getRowId={(row) => row.id}
          />
        </AnalyticsTablePanel>
      </div>
    </div>
  );
};
