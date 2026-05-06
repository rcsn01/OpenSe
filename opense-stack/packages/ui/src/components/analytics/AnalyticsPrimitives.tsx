import { type HTMLAttributes, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "../../lib/cn";
import { Card } from "../ui/Card";

export type AnalyticsLegendItem = {
  label: string;
  color: string;
  shape?: "square" | "dot";
};

export type AnalyticsMetricAccent = {
  label: string;
  direction?: "up" | "down" | "neutral";
  tone?: "positive" | "warning" | "danger" | "neutral";
};

type AnalyticsSurface = "plain" | "card";

export type AnalyticsMetricCardProps = {
  label: string;
  value: ReactNode;
  valueMeta?: ReactNode;
  accent?: AnalyticsMetricAccent;
  detail?: ReactNode;
  visual?: ReactNode;
  surface?: AnalyticsSurface;
  className?: string;
};

export const AnalyticsMetricGrid = ({
  children,
  variant = "stats-4",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: "summary" | "stats-2" | "stats-3" | "stats-4";
}) => (
  <div
    {...props}
    className={cn(
      "analytics-metric-grid",
      `analytics-metric-grid--${variant}`,
      className,
    )}
  >
    {children}
  </div>
);

const MetricContent = ({
  label,
  value,
  valueMeta,
  accent,
  detail,
  visual,
}: Omit<AnalyticsMetricCardProps, "surface" | "className">) => {
  const AccentIcon =
    accent?.direction === "down"
      ? ArrowDownRight
      : accent?.direction === "up"
        ? ArrowUpRight
        : null;

  return (
    <>
      <p className="analytics-metric-card__label">{label}</p>
      <div className="analytics-metric-card__value-row">
        <strong className="analytics-metric-card__value">{value}</strong>
        {valueMeta ? (
          <span className="analytics-metric-card__value-meta">{valueMeta}</span>
        ) : null}
      </div>
      {accent ? (
        <div
          className={cn(
            "analytics-metric-card__accent",
            `is-${accent.tone ?? "neutral"}`,
          )}
        >
          {AccentIcon ? <AccentIcon size={13} /> : null}
          <span>{accent.label}</span>
        </div>
      ) : null}
      {detail ? (
        <p className="analytics-metric-card__detail">{detail}</p>
      ) : null}
      {visual ? (
        <div className="analytics-metric-card__visual">{visual}</div>
      ) : null}
    </>
  );
};

export const AnalyticsMetricCard = ({
  surface = "plain",
  className,
  ...content
}: AnalyticsMetricCardProps) => {
  if (surface === "plain") {
    return (
      <article
        className={cn(
          "analytics-metric-card analytics-metric-card--plain",
          className,
        )}
      >
        <MetricContent {...content} />
      </article>
    );
  }

  return (
    <Card
      padding="lg"
      className={cn(
        "analytics-metric-card analytics-metric-card--card",
        className,
      )}
    >
      <MetricContent {...content} />
    </Card>
  );
};

export type AnalyticsPanelProps = {
  title?: string;
  subtitle?: ReactNode;
  headerAside?: ReactNode;
  surface?: AnalyticsSurface;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  children: ReactNode;
};

export const AnalyticsPanel = ({
  title,
  subtitle,
  headerAside,
  surface = "plain",
  className,
  headerClassName,
  bodyClassName,
  children,
}: AnalyticsPanelProps) => {
  const header =
    title || subtitle || headerAside ? (
      <header className={cn("analytics-panel__header", headerClassName)}>
        <div className="analytics-panel__heading">
          {title ? <h3 className="analytics-panel__title">{title}</h3> : null}
          {subtitle ? (
            <p className="analytics-panel__subtitle">{subtitle}</p>
          ) : null}
        </div>
        {headerAside ? (
          <div className="analytics-panel__aside">{headerAside}</div>
        ) : null}
      </header>
    ) : null;

  if (surface === "card") {
    return (
      <Card
        padding="lg"
        className={cn("analytics-panel analytics-panel--card", className)}
      >
        {header}
        <div className={cn("analytics-panel__body", bodyClassName)}>
          {children}
        </div>
      </Card>
    );
  }

  return (
    <article
      className={cn("analytics-panel analytics-panel--plain", className)}
    >
      {header}
      <div className={cn("analytics-panel__body", bodyClassName)}>
        {children}
      </div>
    </article>
  );
};

export type AnalyticsTablePanelProps = {
  title: string;
  subtitle?: ReactNode;
  headerAside?: ReactNode;
  surface?: AnalyticsSurface;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  children: ReactNode;
};

export const AnalyticsTablePanel = ({
  title,
  subtitle,
  headerAside,
  surface = "plain",
  className,
  headerClassName,
  bodyClassName,
  children,
}: AnalyticsTablePanelProps) => {
  const header = (
    <div className={cn("analytics-table-panel__header", headerClassName)}>
      <div className="analytics-table-panel__heading">
        <h3 className="analytics-panel__title">{title}</h3>
        {subtitle ? (
          <p className="analytics-panel__subtitle">{subtitle}</p>
        ) : null}
      </div>
      {headerAside ? (
        <div className="analytics-table-panel__aside">{headerAside}</div>
      ) : null}
    </div>
  );

  if (surface === "card") {
    return (
      <Card
        padding="none"
        className={cn(
          "analytics-table-panel analytics-table-panel--card",
          className,
        )}
      >
        {header}
        <div className={cn("analytics-table-panel__body", bodyClassName)}>
          {children}
        </div>
      </Card>
    );
  }

  return (
    <article
      className={cn(
        "analytics-table-panel analytics-table-panel--plain",
        className,
      )}
    >
      {header}
      <div className={cn("analytics-table-panel__body", bodyClassName)}>
        {children}
      </div>
    </article>
  );
};

export const AnalyticsLegend = ({
  items,
  className,
  muted = false,
}: {
  items: AnalyticsLegendItem[];
  className?: string;
  muted?: boolean;
}) => (
  <div
    className={cn(
      "analytics-legend",
      muted && "analytics-legend--muted",
      className,
    )}
    aria-hidden="true"
  >
    {items.map((item) => (
      <span
        key={`${item.label}-${item.color}`}
        className="analytics-legend__item"
      >
        <span
          className={cn(
            "analytics-legend__swatch",
            item.shape === "dot" && "is-dot",
          )}
          style={{ background: item.color }}
        />
        {item.label}
      </span>
    ))}
  </div>
);

export const AnalyticsEmptyPanel = ({
  message,
  className,
}: {
  message: ReactNode;
  className?: string;
}) => <div className={cn("analytics-empty-panel", className)}>{message}</div>;

export const AnalyticsMiniSparkline = ({
  data,
  color,
  width = 120,
  height = 30,
  fallbackBars = 7,
  showDots = true,
  className,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
  fallbackBars?: number;
  showDots?: boolean;
  className?: string;
}) => {
  if (data.length < 2) {
    return (
      <div
        className={cn(
          "analytics-sparkline analytics-sparkline--fallback",
          className,
        )}
      >
        {Array.from({ length: fallbackBars }).map((_, index) => (
          <span
            key={index}
            data-testid="analytics-sparkline-bar"
            className="analytics-sparkline__fallback-bar"
            style={{ background: color, opacity: 0.15 + index * 0.08 }}
          />
        ))}
      </div>
    );
  }

  const max = Math.max(...data, 1);
  const step = width / (data.length - 1);
  const points = data
    .map((value, index) => `${index * step},${height - (value / max) * height}`)
    .join(" ");

  return (
    <svg
      className={cn("analytics-sparkline", className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Trend sparkline"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDots
        ? data.map((value, index) => (
            <circle
              key={index}
              cx={index * step}
              cy={height - (value / max) * height}
              r="3"
              fill={color}
            />
          ))
        : null}
    </svg>
  );
};
