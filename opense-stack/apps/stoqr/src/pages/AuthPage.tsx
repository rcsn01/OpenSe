import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signIn, signUp } from '@repo/shared/auth'
import { SharedLoginPage } from '@repo/ui'

export const AuthPage = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async ({ email, password }: { email: string; password: string }) => {
    setIsLoading(true)
    setMessage(null)

    try {
      await signIn(email, password)
    } catch (error: any) {
      setMessage(error?.message ?? 'Failed to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      await signUp(email, password, { fullName })
      setMessage('Check your email to confirm your account before signing in.')
    } catch (error: any) {
      setMessage(error?.message ?? 'Failed to sign up')
    }

    if (inviteToken.trim()) {
      localStorage.setItem('fts_invite_token', inviteToken.trim())
    }

    setIsLoading(false)
  }

  if (mode === 'signin') {
    return (
      <SharedLoginPage
        appName="Open-StoQR"
        title="Log into my account"
        description="Sign in to manage inventory, procurement and your team."
        loading={isLoading}
        error={message}
        onEmailSignIn={handleSignIn}
        footer={(
          <div className="text-center">
            <button
              type="button"
              onClick={() => setMode('signup')}
              className="font-medium text-blue-300 hover:text-blue-200"
            >
              Create account
            </button>
            <span className="mx-2 text-slate-600">•</span>
            <Link to="/" className="font-medium text-slate-400 hover:text-slate-300">
              Back to home
            </Link>
          </div>
        )}
      />
    )
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Link to="/" className="text-inherit no-underline hover:opacity-90">
          <h1>Open-StoQR</h1>
        </Link>
        <p className="muted" style={{ marginTop: 0 }}>
          Create your account to manage inventory and your team.
        </p>
        <div className="row" style={{ marginBottom: 16 }}>
          <button
            className="button secondary"
            onClick={() => setMode('signin')}
            type="button"
          >
            Sign in
          </button>
          <button
            className="button"
            onClick={() => setMode('signup')}
            type="button"
          >
            Create account
          </button>
        </div>
        <form className="stack" onSubmit={handleSubmit}>
          <label className="stack">
            Full name
            <input
              className="input"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </label>
          <label className="stack">
            Email
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="stack">
            Password
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <label className="stack">
            Invite token (optional)
            <input
              className="input"
              value={inviteToken}
              onChange={(event) => setInviteToken(event.target.value)}
              placeholder="Paste invite token to join an organization"
            />
          </label>
          <button className="button" type="submit" disabled={isLoading}>
            {isLoading ? 'Please wait...' : 'Create account'}
          </button>
          {message && <p className="muted">{message}</p>}
        </form>
      </div>
    </div>
  )
}
