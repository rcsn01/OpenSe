import { type ReactNode, useState, createContext, useContext, useCallback, useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'
import { X } from 'lucide-react'

/* ── Dialog Context ───────────────────────────────────── */

interface DialogContextValue { open: boolean; onClose: () => void }
const DialogContext = createContext<DialogContextValue>({ open: false, onClose: () => {} })

interface DialogProps {
  children: ReactNode
  open: boolean
  onClose: () => void
  layout?: 'center' | 'right-sheet'
}

const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const selector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
  )
}

export function Dialog({ children, open, onClose, layout = 'center' }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)
  const [isMounted, setIsMounted] = useState(open)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const animationDurationMs = 220

    if (open) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }

      setIsMounted(true)
      setIsVisible(false)
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = window.requestAnimationFrame(() => {
          setIsVisible(true)
          frameRef.current = null
        })
      })
      return () => {
        if (frameRef.current) {
          window.cancelAnimationFrame(frameRef.current)
          frameRef.current = null
        }
      }
    }

    setIsVisible(false)
    closeTimerRef.current = window.setTimeout(() => {
      setIsMounted(false)
      closeTimerRef.current = null
    }, animationDurationMs)

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

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

  if (!isMounted) return null

  const containerClassName =
    layout === 'right-sheet' ? 'fixed inset-0 z-50 flex items-stretch justify-end' : 'fixed inset-0 z-50 flex items-center justify-center'

  const panelClassName = cn(
    'relative z-10 transition-transform duration-200 ease-out',
    layout === 'right-sheet'
      ? 'h-[100dvh] w-full max-w-none sm:w-[min(92vw,64rem)]'
      : 'w-full max-w-lg mx-4 transition-all duration-200 ease-out',
    layout === 'right-sheet' ? (isVisible ? 'translate-x-0' : 'translate-x-full') : isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0',
  )

  const backdropClassName = cn(
    'fixed inset-0 transition-colors duration-200 ease-out',
    isVisible ? 'bg-black/50 backdrop-blur-sm' : 'bg-black/0',
  )

  return (
    <DialogContext.Provider value={{ open, onClose }}>
      <div className={containerClassName}>
        <div data-testid="dialog-backdrop" className={backdropClassName} onClick={onClose} />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className={panelClassName}
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
