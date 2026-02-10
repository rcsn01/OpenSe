import { type ReactNode, useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/cn'

/* ── Dropdown Menu ────────────────────────────────────── */

interface DropdownProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, children, align = 'left', className }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1 min-w-[10rem] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-lg)]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

/* ── Dropdown Item ────────────────────────────────────── */

interface DropdownItemProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  destructive?: boolean
  disabled?: boolean
}

export function DropdownItem({ children, onClick, className, destructive, disabled }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm transition-colors',
        destructive
          ? 'text-[var(--color-destructive)] hover:bg-[var(--color-destructive-light)]'
          : 'text-[var(--color-foreground)] hover:bg-[var(--color-muted)]',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      {children}
    </button>
  )
}

/* ── Dropdown Separator ───────────────────────────────── */

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-[var(--color-border)]" />
}
