import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AnalyticsAreaChart,
  AnalyticsBarChart,
  AnalyticsComparisonBars,
  AnalyticsDonutChart,
  AnalyticsEmptyPanel,
  AnalyticsLegend,
  AnalyticsLineChart,
  AnalyticsMetricCard,
  AnalyticsMiniSparkline,
  AnalyticsPanel,
  AnalyticsTablePanel,
} from "..";

vi.mock("recharts", () => {
  const Wrapper = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="recharts-wrapper">{children}</div>
  );
  const Null = () => null;

  return {
    ResponsiveContainer: Wrapper,
    AreaChart: Wrapper,
    Area: Wrapper,
    BarChart: Wrapper,
    Bar: Wrapper,
    CartesianGrid: Null,
    Cell: Null,
    LineChart: Wrapper,
    Line: Wrapper,
    PieChart: Wrapper,
    Pie: Wrapper,
    Tooltip: Null,
    XAxis: Null,
    YAxis: Null,
  };
});

describe("analytics components", () => {
  it("renders a metric card with accent and detail", () => {
    render(
      <AnalyticsMetricCard
        surface="plain"
        label="Total Value"
        value="$124K"
        accent={{ label: "+12%", direction: "up", tone: "positive" }}
        detail="Inventory trend"
      />,
    );

    expect(screen.getByText("Total Value")).toBeInTheDocument();
    expect(screen.getByText("$124K")).toBeInTheDocument();
    expect(screen.getByText("+12%")).toBeInTheDocument();
    expect(screen.getByText("Inventory trend")).toBeInTheDocument();
  });

  it("renders panel shells and shared empty state copy", () => {
    render(
      <>
        <AnalyticsPanel
          title="Actionable Alerts"
          headerAside={<span>Live</span>}
        >
          <AnalyticsEmptyPanel message="No alerts right now." />
        </AnalyticsPanel>
        <AnalyticsTablePanel title="Recent Transfers">
          <div>Table body</div>
        </AnalyticsTablePanel>
      </>,
    );

    expect(screen.getByText("Actionable Alerts")).toBeInTheDocument();
    expect(screen.getByText("No alerts right now.")).toBeInTheDocument();
    expect(screen.getByText("Recent Transfers")).toBeInTheDocument();
    expect(screen.getByText("Table body")).toBeInTheDocument();
  });

  it("renders legends, sparkline fallbacks, and comparison bars", () => {
    render(
      <>
        <AnalyticsLegend
          items={[
            { label: "Inbound", color: "#2563eb" },
            { label: "Outbound", color: "#1e293b" },
          ]}
        />
        <AnalyticsMiniSparkline data={[12]} color="#2563eb" />
        <AnalyticsComparisonBars
          ariaLabel="Inbound and outbound inventory volume"
          labelKey="label"
          data={[
            { label: "Mon", inbound: 8, outbound: 4 },
            { label: "Tue", inbound: 6, outbound: 5 },
          ]}
          series={[
            { dataKey: "inbound", label: "Inbound", color: "#e2e8f0" },
            { dataKey: "outbound", label: "Outbound", color: "#1e293b" },
          ]}
        />
      </>,
    );

    expect(screen.getByText("Inbound")).toBeInTheDocument();
    expect(screen.getByText("Outbound")).toBeInTheDocument();
    expect(
      screen.getAllByTestId("analytics-sparkline-bar").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("img", {
        name: "Inbound and outbound inventory volume",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("analytics-comparison-bar")).toHaveLength(4);
  });

  it("renders chart wrappers through the shared recharts surface", () => {
    render(
      <>
        <AnalyticsLineChart
          data={[{ label: "Mon", inbound: 8, outbound: 4 }]}
          xDataKey="label"
          series={[
            { dataKey: "inbound", label: "Inbound", color: "#2563eb" },
            { dataKey: "outbound", label: "Outbound", color: "#1e293b" },
          ]}
        />
        <AnalyticsAreaChart
          data={[{ label: "Mon", value: 12 }]}
          xDataKey="label"
          series={[{ dataKey: "value", label: "Value", color: "#f97316" }]}
        />
        <AnalyticsBarChart
          data={[{ label: "0-30 Days", value: 2500 }]}
          categoryKey="label"
          series={[{ dataKey: "value", label: "Value", color: "#2563eb" }]}
        />
        <AnalyticsDonutChart
          data={[{ name: "Healthy", value: 80 }]}
          colors={["#16a34a"]}
        />
      </>,
    );

    expect(screen.getAllByTestId("recharts-wrapper").length).toBeGreaterThan(0);
  });
});
