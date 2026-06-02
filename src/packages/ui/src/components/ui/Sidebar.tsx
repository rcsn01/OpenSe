import { type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
  width?: string;
  collapsedWidth?: string;
}

export function Sidebar({
  children,
  header,
  footer,
  collapsible = true,
  defaultCollapsed = false,
  className,
  width = "280px",
  collapsedWidth = "64px",
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  return (
    <aside
      className={cn(
        "relative flex h-full flex-col bg-[var(--color-shell)] transition-all duration-[var(--transition-normal)]",
        className,
      )}
      style={{ width: collapsed ? collapsedWidth : width }}
    >
      {header && <div className="p-4">{header}</div>}
      <div className="flex-1 overflow-y-auto p-3">{children}</div>
      {footer && <div className="p-4">{footer}</div>}
      {collapsible && (
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-foreground)]"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      )}
    </aside>
  );
}

interface SidebarItemProps {
  children: ReactNode;
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function SidebarItem({
  children,
  icon,
  active,
  onClick,
  className,
}: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors",
        active
          ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
          : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
        className,
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
}

export function SidebarSection({
  children,
  title,
  className,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      {title && (
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {title}
        </p>
      )}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}
