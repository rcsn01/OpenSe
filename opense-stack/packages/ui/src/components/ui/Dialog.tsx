import { type ReactNode, useState, createContext, useContext, useCallback, useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'
import { X } from 'lucide-react'

/* ── Dialog Context ───────────────────────────────────── */

interface DialogContextValue { open: boolean; onClose: () => void }
const DialogContext = createContext<DialogContextValue>({ open: false, onClose: () => {} })

interface DialogProps { children: ReactNode; open: boolean; onClose: () => void }

const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const selector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
  )
}

export function Dialog({ children, open, onClose }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const dialogElement = dialogRef.current
    if (!dialogElement) return

    const focusable = getFocusableElements(dialogElement)
    const firstFocusable = focusable[0]

    if (firstFocusable) {
      firstFocusable.focus()
    } else {
      dialogElement.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const dialogElement = dialogRef.current
      if (!dialogElement) return

      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const focusable = getFocusableElements(dialogElement)
      if (focusable.length === 0) {
        event.preventDefault()
        dialogElement.focus()
        return
      }

      const firstFocusable = focusable[0]
      const lastFocusable = focusable[focusable.length - 1]
      const activeElement = document.activeElement

      if (event.shiftKey && activeElement === firstFocusable) {
        event.preventDefault()
        lastFocusable.focus()
      } else if (!event.shiftKey && activeElement === lastFocusable) {
        event.preventDefault()
        firstFocusable.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null
  return (
    <DialogContext.Provider value={{ open, onClose }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div data-testid="dialog-backdrop" className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className="relative z-10 w-full max-w-lg mx-4"
        >
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  )
}

export function DialogContent({ children, className }: { children: ReactNode; className?: string }) {
  const { onClose } = useContext(DialogContext)
  return (
    <div className={cn('rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-xl)]', className)}>
      <button
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-[var(--radius-sm)] p-1 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
      {children}
    </div>
  )
}

export function DialogHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-4 flex flex-col gap-1.5', className)}>{children}</div>
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('text-lg font-semibold', className)}>{children}</h2>
}

export function DialogDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-sm text-[var(--color-muted-foreground)]', className)}>{children}</p>
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mt-6 flex justify-end gap-2', className)}>{children}</div>
}

export function useDialog() {
  const [open, setOpen] = useState(false)
  const onOpen = useCallback(() => setOpen(true), [])
  const onClose = useCallback(() => setOpen(false), [])
  return { open, onOpen, onClose }
}
