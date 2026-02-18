import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signUp } from '@repo/shared/auth'
import { SharedSignupPage } from '../components/auth/SharedSignupPage'
import { buildQueryString, getAppNameFromQuery } from '../lib/redirect'

export const SharedSignupRoutePage = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const query = buildQueryString()
  const querySuffix = query ? `?${query}` : ''

  const handleSignUp = async ({
    fullName,
    email,
    password,
    confirmPassword,
  }: {
    fullName: string
    email: string
    password: string
    confirmPassword: string
  }) => {
    setError(null)
    setSuccess(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password, { fullName })
      setSuccess('Check your email to confirm your account, then sign in.')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SharedSignupPage
      appName={getAppNameFromQuery()}
      title="Create account"
      description="Create your OpenSe account to continue."
      loading={loading}
      error={error}
      success={success}
      onSignUp={handleSignUp}
      footer={
        <div className="text-center">
          <span className="text-[var(--color-muted-foreground)]">Already have an account? </span>
          <Link
            to={`/login${querySuffix}`}
            className="font-medium text-[var(--color-primary)] transition hover:text-[var(--color-primary-hover)]"
          >
            Sign in
          </Link>
        </div>
      }
    />
  )
}
