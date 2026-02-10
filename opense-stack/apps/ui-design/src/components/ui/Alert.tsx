import { type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'

const alertVariants = cva(
  'relative flex gap-3 rounded-[var(--radius-lg)] border p-4 text-sm',
  {
    variants: {
      variant: {
        info: 'border-[var(--color-info)]/30 bg-[var(--color-info-light)] text-[var(--color-info)]',
        success: 'border-[var(--color-success)]/30 bg-[var(--color-success-light)] text-[var(--color-success)]',
        warning: 'border-[var(--color-warning)]/30 bg-[var(--color-warning-light)] text-[var(--color-warning)]',
        destructive: 'border-[var(--color-destructive)]/30 bg-[var(--color-destructive-light)] text-[var(--color-destructive)]',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
)

const iconMap = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: AlertCircle,
}

export interface AlertProps extends VariantProps<typeof alertVariants> {
  children: ReactNode
  title?: string
  className?: string
  dismissible?: boolean
  onDismiss?: () => void
}

export function Alert({ children, title, variant = 'info', className, dismissible, onDismiss }: AlertProps) {
  const Icon = iconMap[variant ?? 'info']
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        {title && <p className="mb-1 font-medium">{title}</p>}
        <div>{children}</div>
      </div>
      {dismissible && (
        <button onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100 transition-opacity">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
