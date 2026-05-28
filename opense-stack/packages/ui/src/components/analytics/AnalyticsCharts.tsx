import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "../../lib/cn";
import { AnalyticsEmptyPanel } from "./AnalyticsPrimitives";

export type AnalyticsSeriesConfig = {
  dataKey: string;
  label: string;
  color: string;
  stackId?: string;
};

type AnalyticsChartDatum = Record<string, string | number | null | undefined>;

type AnalyticsTooltipFormatter = (
  value: string | number | undefined,
  name: string | undefined,
  item?: unknown,
  index?: number,
  payload?: readonly unknown[],
) => ReactNode | [ReactNode, ReactNode];

type ChartMargin = {
  top?: number;
  right?: number;
  left?: number;
  bottom?: number;
};

const DEFAULT_MARGIN: Required<ChartMargin> = {
  top: 8,
  right: 12,
  left: 0,
  bottom: 0,
};

const AXIS_TICK = {
  fontSize: "var(--type-size-xs)",
  fill: "var(--color-chart-axis)",
};

const ChartFrame = ({
  height,
  renderChart,
  className,
}: {
  height: number;
  renderChart: () => ReactNode;
  className?: string;
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div
      className={cn("analytics-chart-frame", className)}
      style={{ height, width: "100%" }}
    >
      {isMounted ? (
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
};

export type AnalyticsLineChartProps = {
  data: AnalyticsChartDatum[];
  xDataKey: string;
  series: AnalyticsSeriesConfig[];
  height?: number;
  margin?: ChartMargin;
  xTickFormatter?: (value: string | number) => string;
  yTickFormatter?: (value: string | number) => string;
  tooltipFormatter?: AnalyticsTooltipFormatter;
  yAxisWidth?: number;
  showDots?: boolean;
  className?: string;
};

export const AnalyticsLineChart = ({
  data,
  xDataKey,
  series,
  height = 280,
  margin,
  xTickFormatter,
  yTickFormatter,
  tooltipFormatter,
  yAxisWidth = 40,
  showDots = true,
  className,
}: AnalyticsLineChartProps) => (
  <ChartFrame
    height={height}
    className={className}
    renderChart={() => (
      <LineChart data={data} margin={{ ...DEFAULT_MARGIN, ...margin }}>
        <CartesianGrid
          stroke="var(--color-chart-grid)"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey={xDataKey}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={xTickFormatter}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={yAxisWidth}
          tickFormatter={yTickFormatter}
        />
        <Tooltip formatter={tooltipFormatter} />
        {series.map((item) => (
          <Line
            key={item.dataKey}
            type="monotone"
            dataKey={item.dataKey}
            name={item.label}
            stroke={item.color}
            strokeWidth={2}
            dot={
              showDots
                ? {
                    fill: "var(--color-chart-dot-fill)",
                    stroke: item.color,
                    strokeWidth: 2,
                    r: 4,
                  }
                : false
            }
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    )}
  />
);

export type AnalyticsAreaChartProps = {
  data: AnalyticsChartDatum[];
  xDataKey: string;
  series: AnalyticsSeriesConfig[];
  height?: number;
  margin?: ChartMargin;
  xTickFormatter?: (value: string | number) => string;
  yTickFormatter?: (value: string | number) => string;
  tooltipFormatter?: AnalyticsTooltipFormatter;
  yAxisWidth?: number;
  className?: string;
};

export const AnalyticsAreaChart = ({
  data,
  xDataKey,
  series,
  height = 220,
  margin,
  xTickFormatter,
  yTickFormatter,
  tooltipFormatter,
  yAxisWidth = 40,
  className,
}: AnalyticsAreaChartProps) => {
  const baseId = useId().replace(/:/g, "");

  return (
    <ChartFrame
      height={height}
      className={className}
      renderChart={() => (
        <AreaChart
          data={data}
          margin={{ top: 16, right: 12, left: 0, bottom: 0, ...margin }}
        >
          <defs>
            {series.map((item) => (
              <linearGradient
                key={item.dataKey}
                id={`${baseId}-${item.dataKey}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={item.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={item.color} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            stroke="var(--color-chart-grid)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey={xDataKey}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={xTickFormatter}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={yAxisWidth}
            tickFormatter={yTickFormatter}
          />
          <Tooltip formatter={tooltipFormatter} />
          {series.map((item) => (
            <Area
              key={item.dataKey}
              type="monotone"
              dataKey={item.dataKey}
              name={item.label}
              stroke={item.color}
              fill={`url(#${baseId}-${item.dataKey})`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      )}
    />
  );
};

export type AnalyticsBarChartProps = {
  data: AnalyticsChartDatum[];
  categoryKey: string;
  series: AnalyticsSeriesConfig[];
  height?: number;
  layout?: "horizontal" | "vertical";
  margin?: ChartMargin;
  xTickFormatter?: (value: string | number) => string;
  yTickFormatter?: (value: string | number) => string;
  tooltipFormatter?: AnalyticsTooltipFormatter;
  yAxisWidth?: number;
  cellColors?: string[];
  className?: string;
};

export const AnalyticsBarChart = ({
  data,
  categoryKey,
  series,
  height = 260,
  layout = "horizontal",
  margin,
  xTickFormatter,
  yTickFormatter,
  tooltipFormatter,
  yAxisWidth,
  cellColors,
  className,
}: AnalyticsBarChartProps) => {
  const isVertical = layout === "vertical";

  return (
    <ChartFrame
      height={height}
      className={className}
      renderChart={() => (
        <BarChart
          data={data}
          layout={layout}
          margin={{ ...DEFAULT_MARGIN, ...margin }}
        >
          <CartesianGrid
            stroke="var(--color-chart-grid)"
            strokeDasharray="3 3"
            vertical={!isVertical ? false : undefined}
            horizontal={isVertical ? false : undefined}
          />
          {isVertical ? (
            <>
              <XAxis
                type="number"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={xTickFormatter}
              />
              <YAxis
                type="category"
                dataKey={categoryKey}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={yAxisWidth ?? 100}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={categoryKey}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={xTickFormatter}
              />
              <YAxis
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={yAxisWidth ?? 60}
                tickFormatter={yTickFormatter}
              />
            </>
          )}
          <Tooltip formatter={tooltipFormatter} />
          {series.map((item) => (
            <Bar
              key={item.dataKey}
              dataKey={item.dataKey}
              name={item.label}
              fill={item.color}
              stackId={item.stackId}
              radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            >
              {series.length === 1 && cellColors
                ? data.map((_, index) => (
                    <Cell
                      key={`${item.dataKey}-${index}`}
                      fill={cellColors[index % cellColors.length]}
                    />
                  ))
                : null}
            </Bar>
          ))}
        </BarChart>
      )}
    />
  );
};

export type AnalyticsDonutChartProps = {
  data: AnalyticsChartDatum[];
  colors: string[];
  dataKey?: string;
  nameKey?: string;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  stroke?: string;
  strokeWidth?: number;
  tooltipFormatter?: AnalyticsTooltipFormatter;
  className?: string;
};

export const AnalyticsDonutChart = ({
  data,
  colors,
  dataKey = "value",
  nameKey = "name",
  height = 220,
  innerRadius = 60,
  outerRadius = 90,
  stroke = "var(--color-card)",
  strokeWidth = 2,
  tooltipFormatter,
  className,
}: AnalyticsDonutChartProps) => (
  <ChartFrame
    height={height}
    className={className}
    renderChart={() => (
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          dataKey={dataKey}
          nameKey={nameKey}
          strokeWidth={strokeWidth}
          stroke={stroke}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={tooltipFormatter} />
      </PieChart>
    )}
  />
);

export type AnalyticsComparisonBarsProps = {
  data: AnalyticsChartDatum[];
  labelKey: string;
  series: AnalyticsSeriesConfig[];
  ariaLabel: string;
  emptyMessage?: string;
  className?: string;
  minHeight?: number;
};

export const AnalyticsComparisonBars = ({
  data,
  labelKey,
  series,
  ariaLabel,
  emptyMessage = "No data available.",
  className,
  minHeight = 180,
}: AnalyticsComparisonBarsProps) => {
  const maxValue = Math.max(
    ...data.flatMap((point) =>
      series.map((item) => Number(point[item.dataKey] ?? 0)),
    ),
    1,
  );
  const hasData = data.some((point) =>
    series.some((item) => Number(point[item.dataKey] ?? 0) > 0),
  );

  if (!hasData) {
    return <AnalyticsEmptyPanel message={emptyMessage} />;
  }

  return (
    <div
      className={cn("analytics-comparison-bars", className)}
      style={
        {
          "--analytics-comparison-columns": data.length,
          minHeight,
        } as CSSProperties
      }
      role="img"
      aria-label={ariaLabel}
    >
      {data.map((point, pointIndex) => (
        <div
          key={`${point[labelKey]}-${pointIndex}`}
          className="analytics-comparison-bars__group"
        >
          <div className="analytics-comparison-bars__bars">
            {series.map((item) => {
              const value = Number(point[item.dataKey] ?? 0);
              const height = Math.max(
                (value / maxValue) * 100,
                value > 0 ? 8 : 0,
              );

              return (
                <span
                  key={item.dataKey}
                  data-testid="analytics-comparison-bar"
                  className="analytics-comparison-bars__bar"
                  style={{ height: `${height}%`, background: item.color }}
                />
              );
            })}
          </div>
          <span className="analytics-comparison-bars__label">
            {String(point[labelKey] ?? "")}
          </span>
        </div>
      ))}
    </div>
  );
};
