import { type ReactNode, useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/cn'

type Side = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps { children: ReactNode; content: ReactNode; side?: Side; className?: string }

const sideClasses: Record<Side, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

export function Tooltip({ children, content, side = 'top', className }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <span className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-[var(--radius-md)] bg-[var(--color-foreground)] px-2.5 py-1 text-xs text-[var(--color-background)] shadow-[var(--shadow-md)] animate-in fade-in-0',
          sideClasses[side], className,
        )}>
          {content}
        </span>
      )}
    </span>
  )
}
