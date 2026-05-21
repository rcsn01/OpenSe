import { type ReactNode } from 'react'
import { Alert, EmptyState, Spinner } from '@repo/ui'

interface AccountsPageShellProps {
  title: string
  description: string
  actions?: ReactNode
  alert?: ReactNode
  loading?: boolean
  loadingLabel?: string
  empty?: {
    title: string
    description?: string
  } | null
  children: ReactNode
}

export const AccountsPageShell = ({
  title,
  description,
  actions,
  alert,
  loading = false,
  loadingLabel = 'Loading account data...',
  empty = null,
  children,
}: AccountsPageShellProps) => {
  return (
    <main className="min-h-full bg-[var(--color-background)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-[var(--color-heading)] sm:text-2xl">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-[var(--color-muted-foreground)]">{description}</p>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        {alert}

        {loading ? (
          <div className="flex min-h-40 items-center gap-2 border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 text-sm text-[var(--color-muted-foreground)]">
            <Spinner size="sm" />
            {loadingLabel}
          </div>
        ) : empty ? (
          <div className="border border-[var(--color-border)] bg-[var(--color-surface)]">
            <EmptyState title={empty.title} description={empty.description ?? ''} />
          </div>
        ) : (
          children
        )}
      </div>
    </main>
  )
}

interface AccountsSectionProps {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

export const AccountsSection = ({ title, description, actions, children }: AccountsSectionProps) => {
  return (
    <section className="border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex flex-col gap-2 border-b border-[var(--color-border)] px-4 py-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-heading)]">{title}</h2>
          {description ? <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

export const AccountsField = ({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) => (
  <div>
    <dt className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">{label}</dt>
    <dd className="mt-1 text-sm text-[var(--color-heading)]">{value}</dd>
  </div>
)

export const AccountsAlert = ({
  error,
  success,
  errorTitle = 'Action failed',
}: {
  error?: string | null
  success?: string | null
  errorTitle?: string
}) => {
  if (error) return <Alert variant="destructive" title={errorTitle}>{error}</Alert>
  if (success) return <Alert variant="success" title="Saved">{success}</Alert>
  return null
}
