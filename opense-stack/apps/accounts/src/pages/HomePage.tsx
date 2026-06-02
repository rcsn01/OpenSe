import { Boxes, Palette, Workflow, type LucideIcon } from 'lucide-react'
import { appendAppPath, getRuntimeConfigValue } from '@repo/shared/runtime-config'
import { AccountsPageShell } from '../components/AccountsPageShell'

type AppDestination = {
  key: string
  name: string
  url: string
  path?: string
  icon: LucideIcon
}

const defaultAppUrls = {
  etl: 'http://localhost:5992',
  stoqr: 'http://localhost:5993',
  ui: 'http://localhost:5999',
} as const

const buildAppUrl = (baseUrl: string, path?: string) => {
  if (!path) return baseUrl
  return appendAppPath(baseUrl, path)
}

const getAppDestinations = (): AppDestination[] => [
  {
    key: 'etl',
    name: 'Open-ETL',
    url: getRuntimeConfigValue('VITE_ETL_PUBLIC_URL') ?? getRuntimeConfigValue('VITE_ETL_URL') ?? defaultAppUrls.etl,
    path: '/dashboard',
    icon: Workflow,
  },
  {
    key: 'stoqr',
    name: 'Open-StoQR',
    url: getRuntimeConfigValue('VITE_STOQR_PUBLIC_URL') ?? getRuntimeConfigValue('VITE_STOQR_URL') ?? defaultAppUrls.stoqr,
    path: '/dashboard',
    icon: Boxes,
  },
  {
    key: 'ui',
    name: 'UI Design',
    url: getRuntimeConfigValue('VITE_UI_PUBLIC_URL') ?? getRuntimeConfigValue('VITE_UI_DESIGN_URL') ?? defaultAppUrls.ui,
    icon: Palette,
  },
]

export const HomePage = () => {
  const appDestinations = getAppDestinations()

  return (
    <AccountsPageShell
      title="Home"
      description="Open connected OpenSe apps from your account workspace."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {appDestinations.map((app) => {
          const Icon = app.icon
          const href = buildAppUrl(app.url, app.path)

          return (
            <a
              key={app.key}
              href={href}
              className="flex aspect-[4/3] min-h-32 flex-col items-center justify-center gap-3 bg-[var(--color-surface)] p-4 text-center text-[var(--color-heading)] transition hover:bg-[var(--color-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]"
            >
              <span className="grid h-12 w-12 place-items-center bg-[var(--color-muted)]">
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold">{app.name}</span>
            </a>
          )
        })}
      </div>
    </AccountsPageShell>
  )
}
