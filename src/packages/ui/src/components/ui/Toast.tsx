import {
  type ReactNode,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react";
import { cn } from "../../lib/cn";
import {
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
} from "lucide-react";

/* ── Toast Types ──────────────────────────────────────── */

type ToastVariant = "default" | "success" | "destructive" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  title?: string;
  variant: ToastVariant;
  duration?: number;
}

const variantStyles: Record<ToastVariant, string> = {
  default:
    "bg-[color:color-mix(in_srgb,var(--color-card)_94%,transparent)] text-[var(--color-foreground)] backdrop-blur-xl",
  success: "bg-[var(--color-success-light)] text-[var(--color-success)]",
  destructive:
    "bg-[var(--color-destructive-light)] text-[var(--color-destructive)]",
  warning: "bg-[var(--color-warning-light)] text-[var(--color-warning)]",
  info: "bg-[var(--color-info-light)] text-[var(--color-info)]",
};

const variantIcons: Record<ToastVariant, typeof Info> = {
  default: Info,
  success: CheckCircle2,
  destructive: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

/* ── Context ──────────────────────────────────────────── */

interface ToastContextValue {
  toast: (opts: {
    message: string;
    title?: string;
    variant?: ToastVariant;
    duration?: number;
  }) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback(
    ({
      message,
      title,
      variant = "default",
      duration = 4000,
    }: {
      message: string;
      title?: string;
      variant?: ToastVariant;
      duration?: number;
    }) => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev, { id, message, title, variant, duration }]);
      if (duration > 0)
        setTimeout(
          () => setToasts((prev) => prev.filter((t) => t.id !== id)),
          duration,
        );
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => {
          const Icon = variantIcons[t.variant];
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-start gap-3 rounded-[var(--radius-xl)] p-4 shadow-[var(--shadow-lg)] animate-in slide-in-from-right",
                variantStyles[t.variant],
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1 min-w-0">
                {t.title && <p className="font-medium text-sm">{t.title}</p>}
                <p className="text-sm">{t.message}</p>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 opacity-70 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
