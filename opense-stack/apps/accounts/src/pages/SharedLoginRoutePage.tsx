import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn, signInWithGoogle } from '@repo/shared/auth'
import { useAuth } from '@repo/shared/auth/context'
import { getOnboardingStatus, type OnboardingStatus } from '../api/onboarding'
import { SharedLoginPage } from '../components/auth/SharedLoginPage'
import { buildPathWithQuery, buildQueryString, getAppNameFromQuery, redirectBackToApp } from '../lib/redirect'

const getOnboardingRouteFromStatus = (status: OnboardingStatus) => {
  if (status.step === 'invites') return '/onboarding/invitations'
  if (status.step === 'create') return '/onboarding/create-organisation'
  if (status.step === 'invite-members') return '/onboarding/invite-members'
  return '/settings'
}

export const SharedLoginRoutePage = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const redirectedUserId = useRef<string | null>(null)
  const query = buildQueryString()
  const querySuffix = query ? `?${query}` : ''

  const handleAuthenticatedRedirect = useCallback(async () => {
    try {
      const onboardingStatus = await getOnboardingStatus()

      if (onboardingStatus.needsOnboarding) {
        navigate(buildPathWithQuery(getOnboardingRouteFromStatus(onboardingStatus)), { replace: true })
        return
      }
    } catch {
      navigate(buildPathWithQuery('/onboarding/create-organisation'), { replace: true })
      return
    }

    const redirected = redirectBackToApp()
    if (!redirected) {
      navigate('/settings', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!user) {
      redirectedUserId.current = null
      return
    }

    if (redirectedUserId.current === user.id) {
      return
    }

    redirectedUserId.current = user.id

    // Brief delay so auth state is fully settled before redirect (avoids flash loop with dashboard)
    const id = setTimeout(() => {
      void handleAuthenticatedRedirect()
    }, 150)

    return () => clearTimeout(id)
  }, [authLoading, handleAuthenticatedRedirect, user])

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    setLoading(true)
    setError(null)

    try {
      await signIn(email, password)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      await signInWithGoogle(`/login${querySuffix}`)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to sign in with Google')
      setLoading(false)
    }
  }

  return (
    <SharedLoginPage
      appName={getAppNameFromQuery()}
      title="Sign in"
      description="Continue to your workspace."
      loading={loading || authLoading}
      error={error}
      onEmailSignIn={handleLogin}
      onGoogleSignIn={handleGoogleLogin}
      googleLabel="Continue with Google"
      footer={
        <div className="text-center">
          <span className="text-slate-400">Need an account? </span>
          <Link to={`/register${querySuffix}`} className="font-medium text-blue-300 hover:text-blue-200">
            Sign up
          </Link>
        </div>
      }
    />
  )
}
