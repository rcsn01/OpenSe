import { useMemo, useState } from "react";
import {
  AnalyticsLegend,
  AnalyticsLineChart,
  AnalyticsMetricCard,
  AnalyticsMetricGrid,
  AnalyticsMiniSparkline,
  AnalyticsPanel,
  AnalyticsTablePanel,
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  cn,
  type DataTableColumn,
} from "@repo/ui";
import { useReportsData } from "../../hooks/queries/useReports";

type RangeKey = "7d" | "30d" | "quarter" | "custom";

const RANGE_LABELS: Record<string, string> = {
  "7d": "7 Days",
  "30d": "30 Days",
  quarter: "This Quarter",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getQuarterStart = () => {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), q * 3, 1).getTime();
};

const getRangeCutoff = (
  range: RangeKey,
  customStart?: string,
  customEnd?: string,
) => {
  const now = Date.now();
  if (range === "7d") return { start: now - 7 * 86_400_000, end: now };
  if (range === "30d") return { start: now - 30 * 86_400_000, end: now };
  if (range === "quarter") return { start: getQuarterStart(), end: now };
  return {
    start: customStart ? new Date(customStart).getTime() : now - 7 * 86_400_000,
    end: customEnd ? new Date(customEnd).getTime() + 86_400_000 - 1 : now,
  };
};

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

export const MovementVelocityTab = ({
  companyId,
}: {
  companyId: string | null;
}) => {
  const { data } = useReportsData(companyId);
  const [range, setRange] = useState<RangeKey>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const transactions = data?.transactions ?? [];

  const { start, end } = useMemo(
    () => getRangeCutoff(range, customStart, customEnd),
    [range, customStart, customEnd],
  );

  const filtered = useMemo(
    () =>
      transactions.filter((t) => {
        const time = new Date(t.created_at).getTime();
        return time >= start && time <= end;
      }),
    [transactions, start, end],
  );

  // Inbound / outbound totals
  const inboundTotal = useMemo(
    () =>
      filtered
        .filter((t) => t.quantity_change > 0)
        .reduce((s, t) => s + t.quantity_change, 0),
    [filtered],
  );

  const outboundTotal = useMemo(
    () =>
      filtered
        .filter((t) => t.quantity_change < 0)
        .reduce((s, t) => s + Math.abs(t.quantity_change), 0),
    [filtered],
  );

  // Return rate
  const returnCount = useMemo(
    () =>
      filtered
        .filter((t) => t.transaction_type.toLowerCase() === "return")
        .reduce((s, t) => s + Math.abs(t.quantity_change), 0),
    [filtered],
  );
  const returnRate =
    outboundTotal > 0
      ? ((returnCount / outboundTotal) * 100).toFixed(1)
      : "0.0";

  // Sparkline data (last 7 data points for stat cards)
  const inboundSparkline = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const t of filtered) {
      if (t.quantity_change <= 0) continue;
      const day = new Date(t.created_at).toISOString().split("T")[0];
      buckets.set(day, (buckets.get(day) ?? 0) + t.quantity_change);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([, v]) => v);
  }, [filtered]);

  const outboundSparkline = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const t of filtered) {
      if (t.quantity_change >= 0) continue;
      const day = new Date(t.created_at).toISOString().split("T")[0];
      buckets.set(day, (buckets.get(day) ?? 0) + Math.abs(t.quantity_change));
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([, v]) => v);
  }, [filtered]);

  // Line chart: Inbound vs Outbound by day-of-week or date
  const chartData = useMemo(() => {
    const inMap = new Map<string, number>();
    const outMap = new Map<string, number>();

    for (const t of filtered) {
      const day = new Date(t.created_at).toISOString().split("T")[0];
      if (t.quantity_change > 0) {
        inMap.set(day, (inMap.get(day) ?? 0) + t.quantity_change);
      } else {
        outMap.set(day, (outMap.get(day) ?? 0) + Math.abs(t.quantity_change));
      }
    }

    const allDays = Array.from(
      new Set([...inMap.keys(), ...outMap.keys()]),
    ).sort();

    if (range === "7d" && allDays.length <= 7) {
      return allDays.map((day) => ({
        label: DAY_NAMES[new Date(day).getDay()],
        inbound: inMap.get(day) ?? 0,
        outbound: outMap.get(day) ?? 0,
      }));
    }

    return allDays.map((day) => ({
      label: day.slice(5), // MM-DD
      inbound: inMap.get(day) ?? 0,
      outbound: outMap.get(day) ?? 0,
    }));
  }, [filtered, range]);

  // Top moving SKUs
  const topSkus = useMemo(() => {
    const map = new Map<string, { name: string; sku: string; total: number }>();
    for (const t of filtered) {
      if (!t.products) continue;
      const existing = map.get(t.products.id) ?? {
        name: t.products.name,
        sku: t.products.sku,
        total: 0,
      };
      existing.total += Math.abs(t.quantity_change);
      map.set(t.products.id, existing);
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [filtered]);

  // Recent transfers (most recent transactions)
  const recentTransfers = useMemo(
    () =>
      [...filtered]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 4),
    [filtered],
  );
  const topSkuColumns = useMemo<DataTableColumn<(typeof topSkus)[number]>[]>(
    () => [
      {
        id: "product",
        header: "Product",
        renderCell: (sku) => (
          <div>
            <div className="font-semibold text-[var(--color-foreground)]">{sku.name}</div>
            <div className="text-sm text-[var(--color-muted-foreground)]">{sku.sku}</div>
          </div>
        ),
      },
      {
        id: "movement",
        header: "Movement",
        align: "right",
        renderCell: (sku) => (
          <div className="text-right font-semibold text-[var(--color-foreground)]">
            {sku.total.toLocaleString()} units
          </div>
        ),
      },
    ],
    [],
  );
  const recentTransferColumns = useMemo<
    DataTableColumn<(typeof recentTransfers)[number]>[]
  >(
    () => [
      {
        id: "transfer",
        header: "Transfer",
        renderCell: (transfer) => (
          <div>
            <div className="font-semibold text-[var(--color-foreground)]">
              {Math.abs(transfer.quantity_change)}x{" "}
              {transfer.products?.sku ?? "Unknown"}
            </div>
            <div className="text-sm text-[var(--color-muted-foreground)]">
              {transfer.transaction_type} ·{" "}
              {transfer.products?.name ?? "Unknown"}
            </div>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        align: "right",
        renderCell: (transfer) => (
          <div className="text-right">
            <Badge
              variant={
                transfer.transaction_type === "purchase" ||
                transfer.transaction_type === "scan_in"
                  ? "success"
                  : transfer.transaction_type === "return"
                    ? "warning"
                    : "info"
              }
            >
              {transfer.transaction_type === "purchase" ||
              transfer.transaction_type === "scan_in"
                ? "Completed"
                : transfer.transaction_type === "return"
                  ? "In Transit"
                  : "Completed"}
            </Badge>
            <div className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
              {formatRelative(transfer.created_at)}
            </div>
          </div>
        ),
      },
    ],
    [],
  );

  const rangeLabel =
    range === "7d"
      ? "this week"
      : range === "30d"
        ? "this month"
        : "this quarter";

  return (
    <div className="flex min-w-0 flex-col gap-7">
      {/* Range selector */}
      <Card className="px-6 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {(["7d", "30d", "quarter"] as const).map((key) => (
              <Button
                key={key}
                variant={range === key && !showCustom ? "primary" : "ghost"}
                size="sm"
                className="rounded-[var(--radius-lg)]"
                onClick={() => {
                  setRange(key);
                  setShowCustom(false);
                }}
              >
                {RANGE_LABELS[key]}
              </Button>
            ))}
          </div>
          <Button
            variant={showCustom ? "primary" : "ghost"}
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setShowCustom(!showCustom);
              if (!showCustom) setRange("custom");
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Custom Range
          </Button>
        </div>
        {showCustom && (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm text-[var(--color-muted-foreground)]">Start</span>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm text-[var(--color-muted-foreground)]">End</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </label>
          </div>
        )}
      </Card>

      <AnalyticsMetricGrid variant="stats-3">
        <AnalyticsMetricCard
          label="Inbound Volume"
          value={inboundTotal.toLocaleString()}
          valueMeta={
            <span className="text-sm text-[var(--color-muted-foreground)]">Units received {rangeLabel}</span>
          }
          visual={
            <AnalyticsMiniSparkline data={inboundSparkline} color="var(--color-chart-primary)" />
          }
        />
        <AnalyticsMetricCard
          label="Outbound Volume"
          value={outboundTotal.toLocaleString()}
          valueMeta={
            <span className="text-sm text-[var(--color-muted-foreground)]">Units shipped {rangeLabel}</span>
          }
          visual={
            <AnalyticsMiniSparkline
              data={outboundSparkline}
              color="var(--color-chart-secondary)"
            />
          }
        />
        <AnalyticsMetricCard
          label="Average Return Rate"
          value={`${returnRate}%`}
          valueMeta={
            <span className="text-sm text-[var(--color-muted-foreground)]">Consistent with 30d avg</span>
          }
          visual={
            <div className="mt-1 flex gap-1">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'h-[18px] w-[18px] rounded-[var(--radius-sm)]',
                    index < 5 ? 'bg-[var(--color-muted-foreground)]' : 'bg-[var(--color-border)]',
                  )}
                  style={{ opacity: 0.6 + index * 0.05 }}
                />
              ))}
            </div>
          }
        />
      </AnalyticsMetricGrid>

      <AnalyticsPanel
        title="Inbound vs. Outbound Volume"
        headerAside={
          <AnalyticsLegend
            items={[
              { label: "Inbound", color: "var(--color-chart-primary)", shape: "dot" },
              {
                label: "Outbound",
                color: "var(--color-chart-secondary)",
                shape: "dot",
              },
            ]}
          />
        }
      >
        <AnalyticsLineChart
          data={chartData}
          xDataKey="label"
          series={[
            { dataKey: "inbound", label: "Inbound", color: "var(--color-chart-primary)" },
            {
              dataKey: "outbound",
              label: "Outbound",
              color: "var(--color-chart-secondary)",
            },
          ]}
          height={280}
        />
      </AnalyticsPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsTablePanel title="Top Moving SKUs">
          <DataTable
            columns={topSkuColumns}
            rows={topSkus}
            getRowId={(row) => row.sku}
            emptyState="No movement data in this range."
          />
        </AnalyticsTablePanel>

        <AnalyticsTablePanel title="Recent Transfers">
          <DataTable
            columns={recentTransferColumns}
            rows={recentTransfers}
            getRowId={(row) => row.id}
            emptyState="No recent transfers."
          />
        </AnalyticsTablePanel>
      </div>
    </div>
  );
};
