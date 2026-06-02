import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { getRuntimeConfigValue } from "@repo/shared/runtime-config";
import { cn } from "../../lib/cn";
import { SWITCHABLE_APP_ICONS } from "./AppBrandIcons";

type CloseOptions = {
  returnFocus?: boolean;
};

export interface SwitchAppPopoverProps {
  open: boolean;
  triggerEl: HTMLButtonElement | null;
  onClose: (options?: CloseOptions) => void;
}

type AppSwitcherItem = {
  key: "etl" | "stoqr";
  label: string;
  url: string;
  /** Path to append to base URL when switching (e.g. /dashboard to skip landing) */
  path?: string;
  icon: ReactNode;
};

const DEFAULT_APP_URLS = {
  etl: "http://localhost:5992",
  stoqr: "http://localhost:5993",
} as const;

function buildAppUrl(base: string, path?: string): string {
  if (!path) return base;
  const url = new URL(base);
  url.pathname = path.startsWith("/") ? path : `/${path}`;
  return url.toString();
}

export function SwitchAppPopover({
  open,
  triggerEl,
  onClose,
}: SwitchAppPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const apps = useMemo(() => {
    const EtlIcon = SWITCHABLE_APP_ICONS.etl;
    const StoqrIcon = SWITCHABLE_APP_ICONS.stoqr;
    const etlUrl =
      getRuntimeConfigValue("VITE_ETL_PUBLIC_URL") ||
      getRuntimeConfigValue("VITE_ETL_URL") ||
      DEFAULT_APP_URLS.etl;
    const stoqrUrl =
      getRuntimeConfigValue("VITE_STOQR_PUBLIC_URL") ||
      getRuntimeConfigValue("VITE_STOQR_URL") ||
      DEFAULT_APP_URLS.stoqr;
    return [
      {
        key: "etl",
        label: "ETL",
        url: etlUrl,
        path: "/dashboard",
        icon: <EtlIcon className="h-5 w-5" />,
      },
      {
        key: "stoqr",
        label: "StoQR",
        url: stoqrUrl,
        path: "/dashboard",
        icon: <StoqrIcon className="h-5 w-5" />,
      },
    ] as AppSwitcherItem[];
  }, []);

  useEffect(() => {
    if (!open || !triggerEl) return;

    const updatePosition = () => {
      const rect = triggerEl.getBoundingClientRect();
      const width = 288;
      const viewportPadding = 8;
      const top = rect.bottom + 8;
      const maxLeft = Math.max(
        viewportPadding,
        window.innerWidth - width - viewportPadding,
      );
      const left = Math.min(
        Math.max(viewportPadding, rect.right - width),
        maxLeft,
      );
      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, triggerEl]);

  useEffect(() => {
    if (!open || !triggerEl) return;

    const onMouseDown = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      const clickedTrigger = triggerEl.contains(targetNode);
      const clickedPopover = popoverRef.current?.contains(targetNode) ?? false;
      if (!clickedTrigger && !clickedPopover) {
        onClose();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose({ returnFocus: true });
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, triggerEl]);

  useEffect(() => {
    if (open) {
      firstItemRef.current?.focus();
    }
  }, [open]);

  if (!open || !triggerEl) return null;

  const handleSelect = (app: AppSwitcherItem) => {
    onClose();
    window.location.assign(buildAppUrl(app.url, app.path));
  };

  return (
    <div
      ref={popoverRef}
      role="menu"
      aria-label="Switch app"
      className={cn(
        "fixed z-[70] w-72 rounded-[var(--radius-2xl)] bg-[color:color-mix(in_srgb,var(--color-card)_95%,transparent)] p-3 shadow-[var(--shadow-lg)] backdrop-blur-xl",
      )}
      style={{ top: position.top, left: position.left }}
    >
      <div className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
        Switch app
      </div>
      <div className="grid grid-cols-2 gap-2">
        {apps.map((app, index) => (
          <button
            key={app.key}
            ref={index === 0 ? firstItemRef : undefined}
            type="button"
            role="menuitem"
            onClick={() => handleSelect(app)}
            className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] p-3 text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)] text-[var(--color-foreground)]">
              {app.icon}
            </span>
            <span className="text-center leading-tight">{app.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
