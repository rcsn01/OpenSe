import { useCallback, useEffect, useRef, useState } from 'react'
import { Settings } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signIn, signInWithGoogle } from '@repo/shared/auth'
import { useAuth } from '@repo/shared/auth/context'
import { getOnboardingStatus } from '../api/onboarding'
import { SharedLoginPage } from '../components/auth/SharedLoginPage'
import { isGoogleAuthEnabled } from '../lib/googleAuth'
import { buildPathWithQuery, buildQueryString, getAppNameFromQuery, redirectBackToApp } from '../lib/redirect'
import { getOnboardingCompletedFallbackPath, getOnboardingPathForStatus } from '../lib/onboardingUi'
import { canUseWrapperSetup } from '../lib/wrapperRuntime'

export const SharedLoginRoutePage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const success =
    typeof (location.state as { success?: unknown } | null)?.success === 'string'
      ? ((location.state as { success: string }).success)
      : null
  const isRedirecting = useRef(false)
  const query = buildQueryString()
  const querySuffix = query ? `?${query}` : ''
  const showInstanceSettings = canUseWrapperSetup()

  const getInternalNextPath = useCallback((): string | null => {
    const next = (location.state as { next?: unknown } | null)?.next
    if (typeof next !== 'string') return null
    if (!next.startsWith('/') || next.startsWith('//')) return null
    if (next.startsWith('/login') || next.startsWith('/signin') || next.startsWith('/register') || next.startsWith('/signup')) return null
    return next
  }, [location.state])

  const performRedirect = useCallback(async () => {
    if (isRedirecting.current) return
    isRedirecting.current = true

    try {
      const onboardingStatus = await getOnboardingStatus()

      if (onboardingStatus.needsOnboarding) {
        navigate(buildPathWithQuery(getOnboardingPathForStatus(onboardingStatus)), { replace: true })
        return
      }
    } catch {
      navigate(buildPathWithQuery('/onboarding/create-organisation'), { replace: true })
      return
    }

    if (redirectBackToApp()) return

    const nextPath = getInternalNextPath()
    if (nextPath) {
      navigate(nextPath, { replace: true })
      return
    }

    navigate(getOnboardingCompletedFallbackPath(), { replace: true })
  }, [getInternalNextPath, navigate])

  // Primary: redirect immediately when user becomes available (from any source)
  useEffect(() => {
    if (authLoading || !user) {
      isRedirecting.current = false
      return
    }
    void performRedirect()
  }, [authLoading, user, performRedirect])

  // Fallback: hard redirect if still on login page after auth settles
  useEffect(() => {
    if (authLoading || !user) return
    const id = setTimeout(() => {
      const path = window.location.pathname
      if (path === '/login' || path === '/signin') {
        window.location.replace(getOnboardingCompletedFallbackPath())
      }
    }, 3000)
    return () => clearTimeout(id)
  }, [authLoading, user])

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    setLoading(true)
    setError(null)

    try {
      await signIn(email, password)
      // Backup: trigger redirect immediately after successful sign-in
      // in case auth state propagation through context is delayed
      void performRedirect()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign in'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      await signInWithGoogle(`/login${querySuffix}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with Google'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <>
      <SharedLoginPage
        appName={getAppNameFromQuery()}
        title="Sign in"
        description="Continue to your workspace."
        loading={loading || authLoading}
        error={error}
        success={success}
        onEmailSignIn={handleLogin}
        onGoogleSignIn={handleGoogleLogin}
        googleAuthEnabled={isGoogleAuthEnabled()}
        googleLabel="Continue with Google"
        footer={
          <div className="text-center">
            <span className="text-[var(--color-muted-foreground)]">Need an account? </span>
            <Link
              to={`/register${querySuffix}`}
              className="font-medium text-[var(--color-primary)] transition hover:text-[var(--color-primary-hover)]"
            >
              Sign up
            </Link>
          </div>
        }
      />

      {showInstanceSettings && (
        <Link
          to="/setup"
          aria-label="Change linked instance"
          className="group fixed bottom-6 right-6 z-50 inline-flex h-10 max-w-10 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-[var(--color-muted-foreground)] shadow-[var(--shadow-lg)] transition-[max-width,border-color,color,background-color] duration-200 hover:max-w-56 hover:border-[var(--color-border-hover)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] focus-visible:max-w-56 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2"
        >
          <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="ml-0 max-w-0 whitespace-nowrap text-sm font-medium opacity-0 transition-[margin,max-width,opacity] duration-200 group-hover:ml-2 group-hover:max-w-44 group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-44 group-focus-visible:opacity-100">
            Change linked instance
          </span>
        </Link>
      )}
    </>
  )
}
