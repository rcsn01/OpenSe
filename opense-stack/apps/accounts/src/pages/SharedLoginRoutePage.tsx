import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { signIn, signInWithGoogle } from '@repo/shared/auth'
import { useAuth } from '@repo/shared/auth/context'
import { SharedLoginPage } from '../components/auth/SharedLoginPage'
import { buildQueryString, getAppNameFromQuery, redirectBackToApp } from '../lib/redirect'

export const SharedLoginRoutePage = () => {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasRedirected = useRef(false)
  const query = buildQueryString()
  const querySuffix = query ? `?${query}` : ''

  useEffect(() => {
    if (!authLoading && user && !hasRedirected.current) {
      hasRedirected.current = true
      // Brief delay so auth state is fully settled before redirect (avoids flash loop with dashboard)
      const id = setTimeout(() => {
        redirectBackToApp()
      }, 150)
      return () => clearTimeout(id)
    }
  }, [authLoading, user])

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    setLoading(true)
    setError(null)

    try {
      await signIn(email, password)
      const redirected = redirectBackToApp()
      if (!redirected) {
        setLoading(false)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to sign in')
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
