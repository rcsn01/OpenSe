import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { signIn } from '@repo/shared/auth'
import { useAuth } from '@repo/shared/auth/context'

export const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && user) {
    const nextPath = typeof location.state?.next === 'string' ? location.state.next : '/stoqr'
    return <Navigate to={nextPath} replace />
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    try {
      await signIn(email, password)
      navigate('/stoqr', { replace: true })
    } catch (signInError: any) {
      setError(signInError.message ?? 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <h1 className="text-xl font-semibold text-slate-900">Admin Sign In</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in with your super-admin account.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  )
}
