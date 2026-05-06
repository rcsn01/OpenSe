import { useMemo } from "react";
import {
  AnalyticsBarChart,
  AnalyticsDonutChart,
  AnalyticsEmptyPanel,
  AnalyticsLegend,
  AnalyticsMetricCard,
  AnalyticsMetricGrid,
  AnalyticsPanel,
} from "@repo/ui";
import { useReportsData } from "../../hooks/queries/useReports";
import { useProductFolders } from "../../hooks/queries/useProducts";
import { formatCurrency } from "../../utils";

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

  const movedProductIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of transactions) {
      if (t.products?.id) ids.add(t.products.id);
    }
    return ids;
  }, [transactions]);

  const healthBreakdown = useMemo(() => {
    let healthy = 0;
    let excess = 0;
    let dead = 0;
    for (const p of products) {
      const val = p.quantity_on_hand * (p.cost_price ?? 0);
      if (!movedProductIds.has(p.id)) {
        dead += val;
      } else if (
        p.quantity_on_hand > (p.selling_price ?? Number.POSITIVE_INFINITY)
      ) {
        // Use max_stock_level if available via custom_fields, fallback heuristic
        excess += val;
      } else {
        healthy += val;
      }
    }
    return { healthy, excess, dead };
  }, [products, movedProductIds]);

  const healthTotal =
    healthBreakdown.healthy + healthBreakdown.excess + healthBreakdown.dead ||
    1;

  const turnover = useMemo(() => {
    if (totalValue === 0) return 0;
    return cogs30d > 0 ? (cogs30d * 12) / totalValue : 0;
  }, [cogs30d, totalValue]);

  const daysOnHand = useMemo(() => {
    if (cogs30d === 0) return 0;
    return Math.round(totalValue / (cogs30d / 30));
  }, [totalValue, cogs30d]);

  // Aging stock analysis
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
      "0-30 Days": 0,
      "31-60 Days": 0,
      "61-90 Days": 0,
      "90+ Days": 0,
    };
    for (const p of products) {
      const val = p.quantity_on_hand * (p.cost_price ?? 0);
      const last = lastMovement.get(p.id);
      const days = last
        ? Math.floor((now - last) / (24 * 60 * 60 * 1000))
        : 999;
      if (days <= 30) buckets["0-30 Days"] += val;
      else if (days <= 60) buckets["31-60 Days"] += val;
      else if (days <= 90) buckets["61-90 Days"] += val;
      else buckets["90+ Days"] += val;
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

  const DONUT_COLORS = [
    "var(--color-foreground)",
    "#2563eb",
    "#94a3b8",
    "#cbd5e1",
    "#d4a373",
    "#ccd5ae",
  ];

  const BAR_COLORS = ["#0f172a", "#1e40af", "#2563eb", "#93c5fd"];

  return (
    <div className="stoqr-analytics-tab">
      <AnalyticsMetricGrid variant="stats-4">
        <AnalyticsMetricCard
          label="Total Inventory Value"
          value={formatCurrency(totalValue)}
        />
        <AnalyticsMetricCard
          label="COGS (30 Days)"
          value={formatCurrency(cogs30d)}
        />
        <AnalyticsPanel title="Stock Health Breakdown">
          <div
            style={{
              display: "flex",
              height: 6,
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
          <AnalyticsLegend
            muted
            items={[
              { label: "Healthy", color: "var(--color-success)", shape: "dot" },
              { label: "Excess", color: "var(--color-warning)", shape: "dot" },
              {
                label: "Dead",
                color: "var(--color-destructive)",
                shape: "dot",
              },
            ]}
          />
          <div
            style={{
              display: "flex",
              gap: 12,
              fontSize: "var(--type-size-xs)",
              color: "var(--color-muted-foreground)",
            }}
          >
            <span>{formatCurrency(healthBreakdown.healthy)}</span>
            <span>{formatCurrency(healthBreakdown.excess)}</span>
            <span>{formatCurrency(healthBreakdown.dead)}</span>
          </div>
        </AnalyticsPanel>
        <AnalyticsPanel title="Efficiency Targets">
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
                background: "#2563eb",
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
      </AnalyticsMetricGrid>

      <div className="grid grid-2">
        <AnalyticsPanel title="Aging Stock Analysis">
          <AnalyticsBarChart
            data={agingData}
            categoryKey="name"
            series={[
              {
                dataKey: "value",
                label: "Value",
                color: BAR_COLORS[0] ?? "#0f172a",
              },
            ]}
            yTickFormatter={(value) => `$${(Number(value) / 1000).toFixed(0)}k`}
            tooltipFormatter={(value) => [
              formatCurrency(Number(value)),
              "Value",
            ]}
            cellColors={BAR_COLORS}
          />
        </AnalyticsPanel>

        <AnalyticsPanel title="Valuation by Folder">
          {folderValuation.length === 0 ? (
            <AnalyticsEmptyPanel message="No folder data available." />
          ) : (
            <AnalyticsBarChart
              data={folderValuation}
              categoryKey="name"
              layout="vertical"
              series={[{ dataKey: "value", label: "Value", color: "#2563eb" }]}
              xTickFormatter={(value) =>
                `$${(Number(value) / 1000).toFixed(0)}k`
              }
              tooltipFormatter={(value) => [
                formatCurrency(Number(value)),
                "Value",
              ]}
            />
          )}
        </AnalyticsPanel>
      </div>

      <div className="grid grid-2">
        <AnalyticsPanel
          title="ABC Analysis"
          headerAside={<span className="pill">Pareto (80/20)</span>}
        >
          <AnalyticsBarChart
            data={abcData}
            categoryKey="name"
            series={[
              {
                dataKey: "valuePct",
                label: "% of Total Value",
                color: "#0f172a",
              },
              {
                dataKey: "itemsPct",
                label: "% of Total Items",
                color: "#93c5fd",
              },
            ]}
            yTickFormatter={(value) => `${value}%`}
            tooltipFormatter={(value) => [`${value}%`]}
          />
          <AnalyticsLegend
            muted
            items={[
              { label: "% of Total Value", color: "#0f172a" },
              { label: "% of Total Items", color: "#93c5fd" },
            ]}
          />
        </AnalyticsPanel>

        <AnalyticsPanel title="Category Breakdown">
          {categoryData.length === 0 ? (
            <AnalyticsEmptyPanel message="No category data available." />
          ) : (
            <>
              <AnalyticsDonutChart
                data={categoryData}
                colors={DONUT_COLORS}
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
  );
};
