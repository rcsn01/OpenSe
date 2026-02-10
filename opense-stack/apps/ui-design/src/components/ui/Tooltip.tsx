import { type ReactNode, useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/cn'

/* ── Tooltip ──────────────────────────────────────────── */

interface TooltipProps {
  children: ReactNode
  content: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

const positionClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

export function Tooltip({ children, content, side = 'top', className }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const show = () => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setVisible(true), 200)
  }

  const hide = () => {
    clearTimeout(timeoutRef.current)
    setVisible(false)
  }

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            'absolute z-50 whitespace-nowrap rounded-[var(--radius-md)] bg-[var(--color-foreground)] px-2.5 py-1 text-xs text-[var(--color-background)] shadow-[var(--shadow-md)] pointer-events-none',
            positionClasses[side],
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}
