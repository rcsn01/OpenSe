import { useEffect, useState } from 'react'
import { Alert, Button, Spinner } from '@repo/ui'
import { LogOut } from 'lucide-react'
import { useAuth } from '@repo/shared/auth/context'
import { getOnboardingInstancePolicy, type OnboardingInstancePolicy } from '../api/onboarding'

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

export const OnboardingBlockedPage = () => {
  const { logout } = useAuth()
  const [policy, setPolicy] = useState<OnboardingInstancePolicy | null>(null)
  const [policyLoading, setPolicyLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    const loadPolicy = async () => {
      try {
        setPolicyLoading(true)
        setError(null)
        setPolicy(await getOnboardingInstancePolicy())
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Failed to load instance policy.'))
      } finally {
        setPolicyLoading(false)
      }
    }

    void loadPolicy()
  }, [])

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      setError(null)
      await logout()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to log out.'))
      setLoggingOut(false)
    }
  }

  const limitMessage = policy
    ? `This OpenSe instance is configured for ${policy.maxOrganisations} organisation${policy.maxOrganisations === 1 ? '' : 's'}. Ask the instance operator to raise the limit before creating another organisation.`
    : 'This OpenSe instance is not accepting new organisations. Ask the instance operator to raise the limit before creating an organisation.'

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl">
        <p className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">OpenSe Accounts</p>
        <h1 className="mt-1 text-xl font-semibold text-[var(--color-heading)] sm:text-2xl">Organisation limit reached</h1>
        <Alert className="mt-3" variant="info" title="Organisation limit reached">
          {policyLoading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" />
              Loading instance policy...
            </span>
          ) : (
            limitMessage
          )}
        </Alert>
        {error ? <Alert className="mt-3" variant="destructive" title="Unable to continue">{error}</Alert> : null}
        <Button className="mt-4" variant="outline" onClick={() => void handleLogout()} disabled={loggingOut}>
          <LogOut className="h-4 w-4" />
          {loggingOut ? 'Logging out...' : 'Log out'}
        </Button>
      </div>
    </main>
  )
}
