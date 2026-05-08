import { type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
        secondary:
          "bg-[var(--color-secondary-light)] text-[var(--color-secondary)]",
        success: "bg-[var(--color-success-light)] text-[var(--color-success)]",
        warning: "bg-[var(--color-warning-light)] text-[var(--color-warning)]",
        destructive:
          "bg-[var(--color-destructive-light)] text-[var(--color-destructive)]",
        info: "bg-[var(--color-info-light)] text-[var(--color-info)]",
        outline:
          "bg-[var(--color-surface-subtle)] text-[var(--color-foreground)]",
        // compat aliases
        neutral:
          "bg-[var(--color-secondary-light)] text-[var(--color-secondary)]",
        danger:
          "bg-[var(--color-destructive-light)] text-[var(--color-destructive)]",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: ReactNode;
  className?: string;
}

export function Badge({ children, variant, size, className }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)}>
      {children}
    </span>
  );
}

/* ── StatusBadge (ETL compat) ─────────────────────────── */

type StatusTone = "success" | "neutral" | "danger";

const toneToVariant: Record<StatusTone, NonNullable<BadgeProps["variant"]>> = {
  success: "success",
  neutral: "neutral",
  danger: "danger",
};

export interface StatusBadgeProps {
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
    <Badge variant={toneToVariant[tone]} className={className}>
      {label}
    </Badge>
  );
}
