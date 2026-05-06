import { type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { ChevronDown } from "lucide-react";
import { Label } from "./Typography";

/* ── TabBar: props-based tab navigation ───────────────── */

export type TabItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
};

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  bottomSpacing?: boolean;
  className?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  inactiveItemClassName?: string;
}

export function TabBar({
  tabs,
  activeTab,
  onTabChange,
  bottomSpacing = false,
  className,
  itemClassName,
  activeItemClassName,
  inactiveItemClassName,
}: TabBarProps) {
  const containerCls = cn(
    className ?? "flex overflow-x-auto gap-2",
    bottomSpacing && "mb-[var(--gap-4)]",
  );
  const baseCls =
    itemClassName ??
    "rounded-full px-3 py-1.5 font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap";
  const activeCls =
    activeItemClassName ??
    "bg-[var(--color-surface-strong)] text-[var(--color-tab-active)]";
  const inactiveCls =
    inactiveItemClassName ??
    "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]";

  return (
    <nav className={containerCls}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onTabChange(t.id)}
          className={cn(baseCls, t.id === activeTab ? activeCls : inactiveCls)}
        >
          {t.icon}
          <Label className="font-inherit text-inherit">{t.label}</Label>
          {typeof t.count === "number" && (
            <span className="ml-1 inline-flex items-center rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs font-medium">
              {t.count}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}

/* ── Accordion ────────────────────────────────────────── */

export function AccordionItem({
  children,
  title,
  defaultOpen = false,
  className,
}: {
  children: ReactNode;
  title: string;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] bg-[var(--color-surface-subtle)] px-4 py-1",
        className,
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-3 text-sm font-medium transition-colors hover:text-[var(--color-foreground)]"
      >
        {title}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="pb-3 text-sm text-[var(--color-muted-foreground)]">
          {children}
        </div>
      )}
    </div>
  );
}
