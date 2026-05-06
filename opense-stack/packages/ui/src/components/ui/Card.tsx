import { type ReactNode } from "react";
import { cn } from "../../lib/cn";

/* ── Card ─────────────────────────────────────────────── */

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
}
type CardVariant = "default" | "plain";

const paddingMap = { none: "", sm: "p-3", md: "p-4", lg: "p-6" };

export function Card({
  children,
  className,
  padding = "md",
  hoverable = false,
  variant = "default",
}: CardProps & { variant?: CardVariant }) {
  return (
    <div
      className={cn(
        variant === "default"
          ? "rounded-[var(--radius-xl)] bg-[var(--color-surface-subtle)] text-[var(--color-card-foreground)]"
          : "bg-transparent text-[var(--color-card-foreground)] border-0 shadow-none rounded-none",
        paddingMap[padding],
        hoverable &&
          "transition-colors duration-[var(--transition-normal)] hover:bg-[var(--color-surface-strong)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface SectionProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: SectionProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 pb-3", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: SectionProps) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className,
      )}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children, className }: SectionProps) {
  return (
    <p
      className={cn("text-sm text-[var(--color-muted-foreground)]", className)}
    >
      {children}
    </p>
  );
}

export function CardContent({ children, className }: SectionProps) {
  return <div className={cn("", className)}>{children}</div>;
}

export function CardFooter({ children, className }: SectionProps) {
  return (
    <div className={cn("flex items-center gap-2 pt-3", className)}>
      {children}
    </div>
  );
}
