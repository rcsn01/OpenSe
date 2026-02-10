import { type ReactNode, useState, useCallback, createContext, useContext } from 'react'
import { cn } from '../../lib/cn'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

/* ── Toast Types ──────────────────────────────────────── */

type ToastVariant = 'default' | 'success' | 'destructive' | 'warning' | 'info'

interface ToastMessage {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

/* ── Toast Context ────────────────────────────────────── */

interface ToastContextValue {
  toasts: ToastMessage[]
  toast: (t: Omit<ToastMessage, 'id'>) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  toast: () => {},
  dismiss: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

/* ── Toast Provider ───────────────────────────────────── */

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const toast = useCallback((t: Omit<ToastMessage, 'id'>) => {
    const id = nextId++
    setToasts((prev) => [...prev, { ...t, id }])
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

/* ── Toast Container ──────────────────────────────────── */

const iconMap = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: AlertCircle,
}

const variantClasses: Record<ToastVariant, string> = {
  default: 'border-[var(--color-border)]',
  success: 'border-[var(--color-success)]/30',
  destructive: 'border-[var(--color-destructive)]/30',
  warning: 'border-[var(--color-warning)]/30',
  info: 'border-[var(--color-info)]/30',
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => {
        const Icon = iconMap[t.variant]
        return (
          <div
            key={t.id}
            className={cn(
              'flex items-start gap-3 rounded-[var(--radius-lg)] border bg-[var(--color-card)] p-3 shadow-[var(--shadow-lg)] animate-in slide-in-from-right',
              variantClasses[t.variant],
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{t.description}</p>
              )}
            </div>
            <button onClick={() => onDismiss(t.id)} className="shrink-0 opacity-70 hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
