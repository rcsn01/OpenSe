import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Boxes, Palette, ShieldCheck, Workflow } from 'lucide-react'
import { cn } from '../../lib/cn'

type CloseOptions = {
  returnFocus?: boolean
}

export interface SwitchAppPopoverProps {
  open: boolean
  triggerEl: HTMLButtonElement | null
  onClose: (options?: CloseOptions) => void
}

type AppSwitcherItem = {
  key: 'etl' | 'stoqr' | 'ui-design' | 'admin'
  label: string
  url: string
  /** Path to append to base URL when switching (e.g. /dashboard to skip landing) */
  path?: string
  icon: ReactNode
}

const DEFAULT_APP_URLS = {
  etl: 'http://localhost:5992',
  stoqr: 'http://localhost:5993',
  'ui-design': 'http://localhost:5999',
  admin: 'http://localhost:5990',
} as const

function buildAppUrl(base: string, path?: string): string {
  if (!path) return base
  const url = new URL(base)
  url.pathname = path.startsWith('/') ? path : `/${path}`
  return url.toString()
}

export function SwitchAppPopover({ open, triggerEl, onClose }: SwitchAppPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const apps = useMemo(() => {
    const env = import.meta.env as unknown as Record<string, string | undefined>
    const etlUrl = env.VITE_ETL_URL || DEFAULT_APP_URLS.etl
    const stoqrUrl = env.VITE_STOQR_URL || DEFAULT_APP_URLS.stoqr
    const uiDesignUrl = env.VITE_UI_DESIGN_URL || DEFAULT_APP_URLS['ui-design']
    const adminUrl = env.VITE_ADMIN_URL || DEFAULT_APP_URLS.admin

    return [
      { key: 'etl', label: 'ETL', url: etlUrl, path: '/dashboard', icon: <Workflow className="h-5 w-5" /> },
      { key: 'stoqr', label: 'StoQR', url: stoqrUrl, path: '/dashboard', icon: <Boxes className="h-5 w-5" /> },
      {
        key: 'ui-design',
        label: 'UI Design',
        url: uiDesignUrl,
        icon: <Palette className="h-5 w-5" />,
      },
      {
        key: 'admin',
        label: 'Admin',
        url: adminUrl,
        icon: <ShieldCheck className="h-5 w-5" />,
      },
    ] as AppSwitcherItem[]
  }, [])

  useEffect(() => {
    if (!open || !triggerEl) return

    const updatePosition = () => {
      const rect = triggerEl.getBoundingClientRect()
      const width = 288
      const viewportPadding = 8
      const top = rect.bottom + 8
      const maxLeft = Math.max(viewportPadding, window.innerWidth - width - viewportPadding)
      const left = Math.min(Math.max(viewportPadding, rect.right - width), maxLeft)
      setPosition({ top, left })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, triggerEl])

  useEffect(() => {
    if (!open || !triggerEl) return

    const onMouseDown = (event: MouseEvent) => {
      const targetNode = event.target as Node
      const clickedTrigger = triggerEl.contains(targetNode)
      const clickedPopover = popoverRef.current?.contains(targetNode) ?? false
      if (!clickedTrigger && !clickedPopover) {
        onClose()
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose({ returnFocus: true })
      }
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, triggerEl])

  useEffect(() => {
    if (open) {
      firstItemRef.current?.focus()
    }
  }, [open])

  if (!open || !triggerEl) return null

  const handleSelect = (app: AppSwitcherItem) => {
    onClose()
    window.location.assign(buildAppUrl(app.url, app.path))
  }

  return (
    <div
      ref={popoverRef}
      role="menu"
      aria-label="Switch app"
      className={cn(
        'fixed z-[70] w-72 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-lg)]',
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
            className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-transparent p-3 text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-muted)] text-[var(--color-foreground)]">
              {app.icon}
            </span>
            <span className="text-center leading-tight">{app.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
