import { ChevronRight } from 'lucide-react'
import { buildSwitchableAppHref, getSwitchableApps } from '@repo/shared/switchable-apps'
import { SWITCHABLE_APP_ICONS } from '@repo/ui'
import { AccountsPageShell } from '../components/AccountsPageShell'

export const HomePage = () => {
  const appDestinations = getSwitchableApps()

  return (
    <AccountsPageShell
      title="Home"
      description="Open connected OpenSe apps from your account workspace."
    >
      <div className="grid gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {appDestinations.map((app) => {
          const Icon = SWITCHABLE_APP_ICONS[app.key]
          const href = buildSwitchableAppHref(app)

          return (
            <a
              key={app.key}
              href={href}
              className="flex min-h-16 items-center gap-3 bg-[var(--color-surface)] px-4 py-3 text-[var(--color-heading)] transition hover:bg-[var(--color-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)] sm:aspect-[4/3] sm:min-h-32 sm:flex-col sm:justify-center sm:p-4 sm:text-center"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center bg-[var(--color-muted)] sm:h-12 sm:w-12">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold sm:flex-none">{app.title}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] sm:hidden" />
            </a>
          )
        })}
      </div>
    </AccountsPageShell>
  )
}
