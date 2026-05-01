import { type CSSProperties, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './Dialog'

interface SideSheetProps {
  children: ReactNode
  open: boolean
  onClose: () => void
  panelStyle?: CSSProperties
}

interface SideSheetSectionProps {
  children: ReactNode
  className?: string
}

export function SideSheet({ children, open, onClose, panelStyle }: SideSheetProps) {
  return (
    <Dialog open={open} onClose={onClose} layout="right-sheet" panelStyle={panelStyle}>
      {children}
    </Dialog>
  )
}

export function SideSheetContent({ children, className }: SideSheetSectionProps) {
  return (
    <DialogContent
      className={cn(
        'flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border-0 p-4 shadow-none sm:rounded-l-[var(--radius-xl)] sm:border sm:p-6 sm:shadow-[var(--shadow-xl)]',
        className,
      )}
    >
      {children}
    </DialogContent>
  )
}

export function SideSheetHeader({ children, className }: SideSheetSectionProps) {
  return <DialogHeader className={cn('shrink-0', className)}>{children}</DialogHeader>
}

export function SideSheetTitle({ children, className }: SideSheetSectionProps) {
  return <DialogTitle className={className}>{children}</DialogTitle>
}

export function SideSheetDescription({ children, className }: SideSheetSectionProps) {
  return <DialogDescription className={className}>{children}</DialogDescription>
}

export function SideSheetBody({ children, className }: SideSheetSectionProps) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto', className)}>{children}</div>
}

export function SideSheetFooter({ children, className }: SideSheetSectionProps) {
  return (
    <DialogFooter className={cn('mt-4 shrink-0 border-t border-[var(--color-border)] pt-4', className)}>
      {children}
    </DialogFooter>
  )
}
