import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { hasUsers, signUp } from '@repo/shared/auth'
import { useAuth } from '@repo/shared/auth/context'
import { BasePage, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@repo/ui'
import { getErrorMessage } from '../lib/errors'

export const GodModePage = () => {
  const navigate = useNavigate()
  const { isSuperAdmin, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    const checkStatus = async () => {
      const anyUsers = await hasUsers()
      if (anyUsers && !isSuperAdmin) {
        navigate('/login')
      }
    }
    checkStatus()
  }, [authLoading, isSuperAdmin, navigate])

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm-password') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      await signUp(email, password)
      alert('System initialized. You are now the Super Admin. Please sign in.')
      navigate('/login')
    } catch (registerError: unknown) {
      setError(getErrorMessage(registerError, 'Failed to initialize system'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <BasePage containerClassName="min-h-screen flex flex-col items-center justify-center gap-6" containerStyle={{ maxWidth: 560 }}>
      <div className="text-center">
        <ShieldAlert className="w-12 h-12 text-[var(--color-primary)] mx-auto mb-3" />
        <h2 className="text-3xl font-bold">System Initialization</h2>
        <p className="mt-2 text-[var(--color-muted-foreground)]">
          No users detected. The first account created will be granted Super Admin access.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Initial Super Admin</CardTitle>
          <CardDescription>Use this once to bootstrap administration access.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleRegister}>
            {error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}

            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium">Super Admin Email</label>
              <Input id="email" name="email" type="email" required />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input id="password" name="password" type="password" required />
            </div>

            <div className="space-y-1">
              <label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</label>
              <Input id="confirm-password" name="confirm-password" type="password" required />
            </div>

            <Button type="submit" loading={loading} className="w-full">
              {loading ? 'Initializing...' : 'Initialize System'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </BasePage>
  )
}
