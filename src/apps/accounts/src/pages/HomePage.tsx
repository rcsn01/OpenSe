import { Bot, Boxes, ChevronRight, Workflow, type LucideIcon } from 'lucide-react'
import { appendAppPath, getRuntimeConfigValue, isDesktopRuntime } from '@repo/shared/runtime-config'
import { AccountsPageShell } from '../components/AccountsPageShell'

type AppDestination = {
  key: string
  name: string
  url: string
  path?: string
  icon: LucideIcon
}

const defaultAppUrls = {
  ass: 'http://localhost:5995',
  etl: 'http://localhost:5992',
  stoqr: 'http://localhost:5993',
} as const

const buildAppUrl = (baseUrl: string, path?: string) => {
  if (!path) return baseUrl
  return appendAppPath(baseUrl, path)
}

const shouldShowAss = () =>
  isDesktopRuntime() || Boolean(getRuntimeConfigValue('VITE_ASS_PUBLIC_URL'))

const getAppDestinations = (): AppDestination[] => {
  const destinations: AppDestination[] = [
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
  ]

  if (shouldShowAss()) {
    destinations.push({
      key: 'ass',
      name: 'Open-Ass',
      url: getRuntimeConfigValue('VITE_ASS_PUBLIC_URL') ?? defaultAppUrls.ass,
      path: '/',
      icon: Bot,
    })
  }

  return destinations
}

export const HomePage = () => {
  const appDestinations = getAppDestinations()

  return (
    <AccountsPageShell
      title="Home"
      description="Open connected OpenSe apps from your account workspace."
    >
      <div className="grid gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {appDestinations.map((app) => {
          const Icon = app.icon
          const href = buildAppUrl(app.url, app.path)

          return (
            <a
              key={app.key}
              href={href}
              className="flex min-h-16 items-center gap-3 bg-[var(--color-surface)] px-4 py-3 text-[var(--color-heading)] transition hover:bg-[var(--color-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)] sm:aspect-[4/3] sm:min-h-32 sm:flex-col sm:justify-center sm:p-4 sm:text-center"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center bg-[var(--color-muted)] sm:h-12 sm:w-12">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold sm:flex-none">{app.name}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] sm:hidden" />
            </a>
          )
        })}
      </div>
    </AccountsPageShell>
  )
}
