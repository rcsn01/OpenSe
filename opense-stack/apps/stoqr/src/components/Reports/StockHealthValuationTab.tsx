import { useMemo } from "react";
import {
  AnalyticsBarChart,
  AnalyticsDonutChart,
  AnalyticsEmptyPanel,
  AnalyticsLegend,
  AnalyticsMetricCard,
  AnalyticsPanel,
  AnalyticsTablePanel,
  DataTable,
  type DataTableColumn,
} from "@repo/ui";
import { useReportsData } from "../../hooks/queries/useReports";
import { useProductFolders } from "../../hooks/queries/useProducts";
import { formatCurrency } from "../../utils";

type ProductHealthStatus = "Healthy" | "Slow moving" | "No recent movement";

type ProductHealthInsight = {
  id: string;
  name: string;
  sku: string;
  value: number;
  quantity: number;
  status: ProductHealthStatus;
  statusTone: "positive" | "warning" | "danger";
  lastMovementLabel: string;
  action: string;
};

const formatInteger = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);

export const StockHealthValuationTab = ({
  companyId,
}: {
  companyId: string | null;
}) => {
  const { data } = useReportsData(companyId);
  const { data: folders } = useProductFolders(companyId);

  const products = data?.products ?? [];
  const transactions = data?.transactions ?? [];

  const totalValue = useMemo(
    () =>
      products.reduce(
        (sum, p) => sum + p.quantity_on_hand * (p.cost_price ?? 0),
        0,
      ),
    [products],
  );

  const cogs30d = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return transactions
      .filter(
        (t) =>
          new Date(t.created_at).getTime() >= cutoff && t.quantity_change < 0,
      )
      .reduce(
        (sum, t) =>
          sum + Math.abs(t.quantity_change) * (t.products?.cost_price ?? 0),
        0,
      );
  }, [transactions]);

  const productInsights = useMemo<ProductHealthInsight[]>(() => {
    const lastMovement = new Map<string, number>();
    const outboundByProduct = new Map<string, number>();

    for (const transaction of transactions) {
      if (!transaction.products?.id) continue;

      const productId = transaction.products.id;
      const movementTime = new Date(transaction.created_at).getTime();
      const existingMovement = lastMovement.get(productId);
      if (!existingMovement || movementTime > existingMovement) {
        lastMovement.set(productId, movementTime);
      }

      if (transaction.quantity_change < 0) {
        outboundByProduct.set(
          productId,
          (outboundByProduct.get(productId) ?? 0) +
            Math.abs(transaction.quantity_change),
        );
      }
    }

    const now = Date.now();

    return products
      .map((product) => {
        const value = product.quantity_on_hand * (product.cost_price ?? 0);
        const last = lastMovement.get(product.id);
        const outbound = outboundByProduct.get(product.id) ?? 0;
        const estimatedDaysOnHand =
          outbound > 0
            ? Math.round(product.quantity_on_hand / (outbound / 30))
            : null;

        let status: ProductHealthStatus = "Healthy";
        let statusTone: ProductHealthInsight["statusTone"] = "positive";
        let action = "Keep stocked";

        if (!last) {
          status = "No recent movement";
          statusTone = "danger";
          action = "Review demand or classify";
        } else if ((estimatedDaysOnHand ?? 0) > 90) {
          status = "Slow moving";
          statusTone = "warning";
          action = "Reduce reorder quantity";
        }

        const lastMovementLabel = last
          ? `${Math.max(0, Math.floor((now - last) / (24 * 60 * 60 * 1000)))}d ago`
          : "No 30d movement";

        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          value,
          quantity: product.quantity_on_hand,
          status,
          statusTone,
          lastMovementLabel,
          action,
        };
      })
      .filter((insight) => insight.value > 0)
      .sort((left, right) => {
        const statusRank: Record<ProductHealthStatus, number> = {
          "No recent movement": 0,
          "Slow moving": 1,
          Healthy: 2,
        };

        return (
          statusRank[left.status] - statusRank[right.status] ||
          right.value - left.value
        );
      });
  }, [products, transactions]);

  const healthBreakdown = useMemo(() => {
    let healthy = 0;
    let excess = 0;
    let dead = 0;
    for (const insight of productInsights) {
      if (insight.status === "No recent movement") {
        dead += insight.value;
      } else if (insight.status === "Slow moving") {
        excess += insight.value;
      } else if (insight.status === "Healthy") {
        healthy += insight.value;
      }
    }
    return { healthy, excess, dead };
  }, [productInsights]);

  const healthTotal =
    healthBreakdown.healthy + healthBreakdown.excess + healthBreakdown.dead ||
    1;
  const atRiskValue = healthBreakdown.excess + healthBreakdown.dead;
  const atRiskItems = productInsights.filter(
    (insight) => insight.status !== "Healthy",
  ).length;

  const turnover = useMemo(() => {
    if (totalValue === 0) return 0;
    return cogs30d > 0 ? (cogs30d * 12) / totalValue : 0;
  }, [cogs30d, totalValue]);

  const daysOnHand = useMemo(() => {
    if (cogs30d === 0) return 0;
    return Math.round(totalValue / (cogs30d / 30));
  }, [totalValue, cogs30d]);

  const agingData = useMemo(() => {
    const now = Date.now();
    const lastMovement = new Map<string, number>();
    for (const t of transactions) {
      if (!t.products?.id) continue;
      const time = new Date(t.created_at).getTime();
      const existing = lastMovement.get(t.products.id);
      if (!existing || time > existing) lastMovement.set(t.products.id, time);
    }

    const buckets = {
      "0-7 Days": 0,
      "8-30 Days": 0,
      "No 30d Movement": 0,
    };
    for (const p of products) {
      const val = p.quantity_on_hand * (p.cost_price ?? 0);
      const last = lastMovement.get(p.id);
      if (!last) {
        buckets["No 30d Movement"] += val;
        continue;
      }
      const days = Math.floor((now - last) / (24 * 60 * 60 * 1000));
      if (days <= 7) buckets["0-7 Days"] += val;
      else buckets["8-30 Days"] += val;
    }

    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [products, transactions]);

  // Valuation by folder (proxy for location)
  const folderValuation = useMemo(() => {
    const folderMap = new Map<string | null, number>();
    const folderNames = new Map<string, string>();
    if (folders) {
      for (const f of folders) folderNames.set(f.id, f.name);
    }
    for (const p of products) {
      const val = p.quantity_on_hand * (p.cost_price ?? 0);
      const key = (p as Record<string, unknown>).folder_id as string | null;
      folderMap.set(key ?? null, (folderMap.get(key ?? null) ?? 0) + val);
    }
    return Array.from(folderMap.entries())
      .map(([id, value]) => ({
        name: id ? (folderNames.get(id) ?? "Unknown Folder") : "Uncategorized",
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [products, folders]);

  // ABC Analysis
  const abcData = useMemo(() => {
    const sorted = [...products]
      .map((p) => ({
        ...p,
        totalValue: p.quantity_on_hand * (p.cost_price ?? 0),
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    const total = sorted.reduce((s, p) => s + p.totalValue, 0);
    const count = sorted.length || 1;
    let cumValue = 0;
    let classA = 0;
    let classAItems = 0;
    let classB = 0;
    let classBItems = 0;
    let classC = 0;
    let classCItems = 0;

    for (const p of sorted) {
      cumValue += p.totalValue;
      if (cumValue <= total * 0.8) {
        classA += p.totalValue;
        classAItems++;
      } else if (cumValue <= total * 0.95) {
        classB += p.totalValue;
        classBItems++;
      } else {
        classC += p.totalValue;
        classCItems++;
      }
    }

    return [
      {
        name: "Class A",
        valuePct: total > 0 ? Math.round((classA / total) * 100) : 0,
        itemsPct: Math.round((classAItems / count) * 100),
      },
      {
        name: "Class B",
        valuePct: total > 0 ? Math.round((classB / total) * 100) : 0,
        itemsPct: Math.round((classBItems / count) * 100),
      },
      {
        name: "Class C",
        valuePct: total > 0 ? Math.round((classC / total) * 100) : 0,
        itemsPct: Math.round((classCItems / count) * 100),
      },
    ];
  }, [products]);

  // Category breakdown by top-level folder
  const categoryData = useMemo(() => {
    const folderNames = new Map<string, string>();
    if (folders) {
      for (const f of folders) folderNames.set(f.id, f.name);
    }

    const byFolder = new Map<string, number>();
    for (const p of products) {
      const fid = (p as Record<string, unknown>).folder_id as string | null;
      const key = fid ?? "_uncategorized";
      byFolder.set(
        key,
        (byFolder.get(key) ?? 0) + p.quantity_on_hand * (p.cost_price ?? 0),
      );
    }

    return Array.from(byFolder.entries())
      .map(([id, value]) => ({
        name:
          id === "_uncategorized"
            ? "Uncategorized"
            : (folderNames.get(id) ?? "Unknown"),
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [products, folders]);

  const uncategorizedValue =
    categoryData.find((entry) => entry.name === "Uncategorized")?.value ?? 0;
  const hasMeaningfulCategories =
    categoryData.filter((entry) => entry.value > 0).length > 1;
  const hasMeaningfulFolders =
    folderValuation.filter((entry) => entry.value > 0).length > 1;
  const primaryFolderValuation = folderValuation[0];
  const topExceptions = productInsights
    .filter((insight) => insight.status !== "Healthy")
    .slice(0, 6);

  const DONUT_COLORS = [
    "var(--color-chart-secondary)",
    "var(--color-chart-primary)",
    "var(--color-muted-foreground)",
    "var(--color-border)",
    "var(--color-warning)",
    "var(--color-success-light)",
  ];

  const BAR_COLORS = [
    "var(--color-chart-secondary)",
    "var(--color-info)",
    "var(--color-warning)",
  ];

  const exceptionColumns = useMemo<DataTableColumn<ProductHealthInsight>[]>(
    () => [
      {
        id: "product",
        header: "Product",
        renderCell: (row) => (
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-medium text-[var(--color-foreground)]">
              {row.name}
            </span>
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {row.sku}
            </span>
          </div>
        ),
      },
      {
        id: "status",
        header: "Signal",
        renderCell: (row) => (
          <span
            className={[
              "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
              row.statusTone === "danger"
                ? "bg-[var(--color-muted)] text-[var(--color-destructive)]"
                : row.statusTone === "warning"
                  ? "bg-[var(--color-muted)] text-[var(--color-warning)]"
                  : "bg-[var(--color-muted)] text-[var(--color-success)]",
            ].join(" ")}
          >
            {row.status}
          </span>
        ),
      },
      {
        id: "value",
        header: "Value",
        align: "right",
        renderCell: (row) => formatCurrency(row.value),
      },
      {
        id: "quantity",
        header: "On hand",
        align: "right",
        renderCell: (row) => formatInteger(row.quantity),
      },
      {
        id: "lastMovement",
        header: "Last move",
        renderCell: (row) => row.lastMovementLabel,
      },
      {
        id: "action",
        header: "Suggested action",
        renderCell: (row) => row.action,
      },
    ],
    [],
  );

  return (
    <div className="flex min-w-0 flex-col gap-7">
      <div className="grid items-start gap-6 min-[1180px]:grid-cols-2 min-[1640px]:grid-cols-[minmax(360px,0.9fr)_minmax(520px,1.35fr)_minmax(320px,0.85fr)]">
        <AnalyticsPanel title="Inventory Summary">
          <div className="grid gap-5 sm:grid-cols-2 min-[1180px]:grid-cols-2">
            <AnalyticsMetricCard
              label="Total Inventory Value"
              value={formatCurrency(totalValue)}
              detail={`${formatInteger(products.length)} active SKUs`}
            />
            <AnalyticsMetricCard
              label="At-Risk Value"
              value={formatCurrency(atRiskValue)}
              accent={{
                label: `${formatInteger(atRiskItems)} SKUs need review`,
                tone: atRiskValue > 0 ? "warning" : "positive",
              }}
            />
            <AnalyticsMetricCard
              label="Turnover"
              value={`${turnover.toFixed(1)}x`}
              accent={{
                label: "Goal 8.0x",
                tone: turnover >= 8 ? "positive" : "warning",
              }}
            />
            <AnalyticsMetricCard
              label="Days on Hand"
              value={cogs30d === 0 ? "N/A" : `${daysOnHand}d`}
              accent={{
                label: "Limit 45d",
                tone: daysOnHand > 45 ? "warning" : "positive",
              }}
              detail={`COGS 30d ${formatCurrency(cogs30d)}`}
            />
          </div>
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Stock Health Breakdown"
          subtitle="Inventory value by current action signal"
        >
          <div className="flex flex-col gap-4">
            <div
              style={{
                display: "flex",
                height: 14,
                borderRadius: "var(--radius-full)",
                overflow: "hidden",
                background: "var(--color-muted)",
              }}
            >
              <div
                style={{
                  width: `${(healthBreakdown.healthy / healthTotal) * 100}%`,
                  background: "var(--color-success)",
                }}
              />
              <div
                style={{
                  width: `${(healthBreakdown.excess / healthTotal) * 100}%`,
                  background: "var(--color-warning)",
                }}
              />
              <div
                style={{
                  width: `${(healthBreakdown.dead / healthTotal) * 100}%`,
                  background: "var(--color-destructive)",
                }}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  label: "Healthy",
                  value: healthBreakdown.healthy,
                  color: "var(--color-success)",
                },
                {
                  label: "Slow moving",
                  value: healthBreakdown.excess,
                  color: "var(--color-warning)",
                },
                {
                  label: "No recent movement",
                  value: healthBreakdown.dead,
                  color: "var(--color-destructive)",
                },
              ].map((entry) => (
                <div
                  key={entry.label}
                  className="rounded-[var(--radius-lg)] bg-[var(--color-surface-subtle)] p-3"
                >
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: entry.color }}
                    />
                    {entry.label}
                  </div>
                  <div className="text-lg font-semibold text-[var(--color-foreground)]">
                    {formatCurrency(entry.value)}
                  </div>
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    {Math.round((entry.value / healthTotal) * 100)}% of value
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Efficiency Targets"
          subtitle="How stock performance compares with operating targets"
          className="min-[1180px]:col-span-2 min-[1640px]:col-span-1"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "var(--type-size-xs)",
            }}
          >
            <span>
              Turnover: <strong>{turnover.toFixed(1)}x</strong>
            </span>
            <span style={{ color: "var(--color-muted-foreground)" }}>
              Goal: 8.0x
            </span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: "var(--radius-full)",
              background: "var(--color-muted)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min((turnover / 8) * 100, 100)}%`,
                height: "100%",
                borderRadius: "var(--radius-full)",
                background: "var(--color-chart-primary)",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "var(--type-size-xs)",
            }}
          >
            <span>
              Days on Hand: <strong>{daysOnHand}d</strong>
            </span>
            <span style={{ color: "var(--color-muted-foreground)" }}>
              Limit: 45d
            </span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: "var(--radius-full)",
              background: "var(--color-muted)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min((daysOnHand / 45) * 100, 100)}%`,
                height: "100%",
                borderRadius: "var(--radius-full)",
                background:
                  daysOnHand > 45
                    ? "var(--color-warning)"
                    : "var(--color-success)",
              }}
            />
          </div>
        </AnalyticsPanel>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(360px,0.9fr)_minmax(360px,0.9fr)_minmax(320px,0.7fr)]">
        <AnalyticsPanel
          title="Recent Movement Aging"
          subtitle="Value grouped by the last movement found in the 30-day report window"
        >
          <AnalyticsBarChart
            data={agingData}
            categoryKey="name"
            series={[
              {
                dataKey: "value",
                label: "Value",
                color: BAR_COLORS[0] ?? "var(--color-chart-secondary)",
              },
            ]}
            yTickFormatter={(value) => `$${(Number(value) / 1000).toFixed(0)}k`}
            tooltipFormatter={(value) => [
              formatCurrency(Number(value)),
              "Value",
            ]}
            cellColors={BAR_COLORS}
            height={240}
          />
        </AnalyticsPanel>

        <AnalyticsPanel
          title="ABC Analysis"
          headerAside={<span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">Pareto (80/20)</span>}
        >
          <AnalyticsBarChart
            data={abcData}
            categoryKey="name"
            series={[
              {
                dataKey: "valuePct",
                label: "Value Share",
                color: "var(--color-chart-secondary)",
              },
              {
                dataKey: "itemsPct",
                label: "SKU Share",
                color: "var(--color-chart-muted)",
              },
            ]}
            yTickFormatter={(value) => `${value}%`}
            tooltipFormatter={(value) => [`${value}%`]}
            height={240}
          />
          <AnalyticsLegend
            muted
            items={[
              { label: "Value Share", color: "var(--color-chart-secondary)" },
              { label: "SKU Share", color: "var(--color-chart-muted)" },
            ]}
          />
        </AnalyticsPanel>

        <div className="grid gap-6">
          <AnalyticsPanel title="Valuation by Folder">
            {folderValuation.length === 0 ? (
              <AnalyticsEmptyPanel message="No folder data available." />
            ) : !hasMeaningfulFolders && primaryFolderValuation ? (
              <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-subtle)] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                  {primaryFolderValuation.name}
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">
                  {formatCurrency(primaryFolderValuation.value)}
                </p>
                <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                  Add folders or locations to compare valuation across stock areas.
                </p>
              </div>
            ) : (
              <AnalyticsBarChart
                data={folderValuation}
                categoryKey="name"
                layout="vertical"
                series={[{ dataKey: "value", label: "Value", color: "var(--color-chart-primary)" }]}
                xTickFormatter={(value) =>
                  `$${(Number(value) / 1000).toFixed(0)}k`
                }
                tooltipFormatter={(value) => [
                  formatCurrency(Number(value)),
                  "Value",
                ]}
                height={220}
              />
            )}
          </AnalyticsPanel>

          <AnalyticsPanel title="Category Breakdown">
            {categoryData.length === 0 ? (
              <AnalyticsEmptyPanel message="No category data available." />
            ) : !hasMeaningfulCategories ? (
              <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-subtle)] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
                  Uncategorized
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">
                  {formatCurrency(uncategorizedValue)}
                </p>
                <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                  Categorize inventory before using a distribution chart here.
                </p>
              </div>
            ) : (
              <>
                <AnalyticsDonutChart
                  data={categoryData}
                  colors={DONUT_COLORS}
                  height={220}
                  tooltipFormatter={(value) => [
                    formatCurrency(Number(value)),
                    "Value",
                  ]}
                />
                <AnalyticsLegend
                  muted
                  items={categoryData.map((entry, index) => ({
                    label: entry.name,
                    color:
                      DONUT_COLORS[index % DONUT_COLORS.length] ??
                      "var(--color-muted-foreground)",
                    shape: "dot",
                  }))}
                />
              </>
            )}
          </AnalyticsPanel>
        </div>
      </div>

      <AnalyticsTablePanel
        title="Largest Value Exceptions"
        subtitle="Highest-value SKUs with weak recent movement or excess days on hand"
      >
        <DataTable
          variant="dashboard"
          rows={topExceptions}
          columns={exceptionColumns}
          getRowId={(row) => row.id}
          emptyState="No stock health exceptions in the current report window."
          minTableWidth={780}
        />
      </AnalyticsTablePanel>
    </div>
  );
};
