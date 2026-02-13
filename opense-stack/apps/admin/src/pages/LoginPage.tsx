import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { signIn } from '@repo/shared/auth'
import { useAuth } from '@repo/shared/auth/context'
import { BasePage, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@repo/ui'
import { getErrorMessage } from '../lib/errors'

export const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && user) {
    const nextPath = typeof location.state?.next === 'string' ? location.state.next : '/platform'
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
      navigate('/platform', { replace: true })
    } catch (signInError: unknown) {
      setError(getErrorMessage(signInError, 'Sign in failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BasePage containerClassName="min-h-screen flex items-center justify-center" containerStyle={{ maxWidth: 480 }}>
      <Card>
        <CardHeader>
          <CardTitle>Admin Sign In</CardTitle>
          <CardDescription>Sign in with your super-admin account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}

            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input id="email" name="email" type="email" required />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input id="password" name="password" type="password" required />
            </div>

            <Button type="submit" loading={submitting} className="w-full">
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </BasePage>
  )
}
