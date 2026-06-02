import type { ReactNode } from 'react'
import { Spinner } from '@repo/ui'

export type OnboardingStepKey = 'invites' | 'create' | 'invite-members'

const steps: Array<{ key: OnboardingStepKey; label: string }> = [
  { key: 'invites', label: 'Join' },
  { key: 'create', label: 'Create' },
  { key: 'invite-members', label: 'Invite' },
]

interface OnboardingStepIndicatorProps {
  currentStep: OnboardingStepKey
}

export const OnboardingStepIndicator = ({ currentStep }: OnboardingStepIndicatorProps) => {
  const currentIndex = steps.findIndex((step) => step.key === currentStep)

  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Onboarding progress">
      {steps.map((step, index) => {
        const isCurrent = step.key === currentStep
        const isComplete = index < currentIndex

        return (
          <li
            key={step.key}
            className={[
              'inline-flex h-7 items-center gap-2 border px-2.5 text-xs font-medium',
              isCurrent
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                : isComplete
                  ? 'border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-heading)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]',
            ].join(' ')}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span>{index + 1}</span>
            <span>{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

interface OnboardingShellProps {
  title: string
  description: string
  currentStep: OnboardingStepKey
  alert?: ReactNode
  loading?: boolean
  loadingLabel?: string
  actions?: ReactNode
  children: ReactNode
}

export const OnboardingShell = ({
  title,
  description,
  currentStep,
  alert,
  loading = false,
  loadingLabel = 'Loading onboarding...',
  actions,
  children,
}: OnboardingShellProps) => {
  return (
    <main className="min-h-screen bg-[var(--color-background)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">OpenSe Accounts</p>
            <h1 className="mt-1 text-xl font-semibold text-[var(--color-heading)] sm:text-2xl">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-[var(--color-muted-foreground)]">{description}</p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
            <OnboardingStepIndicator currentStep={currentStep} />
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </header>

        {alert}

        {loading ? (
          <div className="flex min-h-40 items-center gap-2 border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 text-sm text-[var(--color-muted-foreground)]">
            <Spinner size="sm" />
            {loadingLabel}
          </div>
        ) : (
          children
        )}
      </div>
    </main>
  )
}
