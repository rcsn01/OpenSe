import { cn } from "../../lib/cn";

/* ── StatusBadge (ETL compat) ─────────────────────────── */

type StatusTone = "success" | "neutral" | "danger" | "warning" | "info";

const toneClasses: Record<StatusTone, string> = {
  success: "bg-[var(--color-success-light)] text-[var(--color-success)]",
  neutral:
    "bg-[var(--color-surface-subtle)] text-[var(--color-muted-foreground)]",
  danger: "bg-[var(--color-destructive-light)] text-[var(--color-destructive)]",
  warning: "bg-[var(--color-warning-light)] text-[var(--color-warning)]",
  info: "bg-[var(--color-info-light)] text-[var(--color-info)]",
};

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  className?: string;
}

export function StatusBadge({
  label,
  tone = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      <span
        className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", {
          "bg-[var(--color-success)]": tone === "success",
          "bg-[var(--color-muted-foreground)]": tone === "neutral",
          "bg-[var(--color-destructive)]": tone === "danger",
          "bg-[var(--color-warning)]": tone === "warning",
          "bg-[var(--color-info)]": tone === "info",
        })}
      />
      {label}
    </span>
  );
}
