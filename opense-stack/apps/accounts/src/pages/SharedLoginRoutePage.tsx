import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { signIn, signInWithGoogle } from '@repo/shared/auth'
import { useAuth } from '@repo/shared/auth/context'
import { SharedLoginPage } from '../components/auth/SharedLoginPage'
import { buildQueryString, getAppNameFromQuery, redirectBackToApp } from '../lib/redirect'

export const SharedLoginRoutePage = () => {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && user) {
      redirectBackToApp()
    }
  }, [authLoading, user])

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    setLoading(true)
    setError(null)

    try {
      await signIn(email, password)
      redirectBackToApp()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to sign in')
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      const query = buildQueryString()
      await signInWithGoogle(`/login?${query}`)
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
          <Link to={`/register?${buildQueryString()}`} className="font-medium text-blue-300 hover:text-blue-200">
            Sign up
          </Link>
        </div>
      }
    />
  )
}
