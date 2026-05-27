import { type ReactNode, useState, useRef, useEffect } from "react";
import { cn } from "../../lib/cn";

/* ── Children-based Dropdown ──────────────────────────── */

interface DropdownProps {
  trigger: ReactNode | ((open: boolean) => ReactNode);
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
  defaultOpen?: boolean;
}

export function Dropdown({
  trigger,
  children,
  align = "left",
  className,
  defaultOpen = false,
}: DropdownProps) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen((v) => !v)} className="cursor-pointer [&>button]:border-0">
        {typeof trigger === "function" ? trigger(open) : trigger}
      </div>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute z-50 mt-1 min-w-[180px] rounded-[var(--radius-xl)] bg-[color:color-mix(in_srgb,var(--color-card)_95%,transparent)] p-1.5 shadow-[var(--shadow-lg)] backdrop-blur-xl animate-in fade-in-0 zoom-in-95",
            align === "right" ? "right-0" : "left-0",
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ── DropdownItem ─────────────────────────────────────── */

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function DropdownItem({
  children,
  onClick,
  destructive,
  disabled,
  icon,
  className,
}: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-sm transition-colors",
        destructive
          ? "text-[var(--color-destructive)] hover:bg-[var(--color-destructive-light)]"
          : "text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/* ── DropdownSeparator ────────────────────────────────── */

export function DropdownSeparator({ className }: { className?: string }) {
  return (
    <div
      className={cn("my-1 h-px bg-[var(--color-shell-border)]", className)}
    />
  );
}

/* ── Items-array Dropdown (alternative API) ───────────── */

export type DropdownArrayItem = {
  label: string;
  value?: string;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: "default" | "destructive";
  divider?: boolean;
  disabled?: boolean;
};

interface DropdownArrayProps {
  trigger: ReactNode;
  items: DropdownArrayItem[];
  align?: "left" | "right";
  className?: string;
}

export function DropdownMenu({
  trigger,
  items,
  align = "left",
  className,
}: DropdownArrayProps) {
  return (
    <Dropdown trigger={trigger} align={align} className={className}>
      {items.map((item, i) => {
        if (item.divider) return <DropdownSeparator key={i} />;
        return (
          <DropdownItem
            key={i}
            onClick={item.onClick}
            destructive={item.variant === "destructive"}
            disabled={item.disabled}
            icon={item.icon}
          >
            {item.label}
          </DropdownItem>
        );
      })}
    </Dropdown>
  );
}
