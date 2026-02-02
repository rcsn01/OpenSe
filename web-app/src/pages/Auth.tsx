import { useState } from 'react'
import { supabase } from '../supabaseClient'

export const Auth = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setMessage(null)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setMessage(error ? error.message : 'Welcome back!')
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      setMessage(
        error
          ? error.message
          : 'Check your email to confirm your account before signing in.',
      )
    }

    if (inviteToken.trim()) {
      localStorage.setItem('fts_invite_token', inviteToken.trim())
    }

    setIsLoading(false)
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Open-StoQR</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Sign in to manage inventory and your team.
        </p>
        <div className="row" style={{ marginBottom: 16 }}>
          <button
            className={`button ${mode === 'signin' ? '' : 'secondary'}`}
            onClick={() => setMode('signin')}
            type="button"
          >
            Sign in
          </button>
          <button
            className={`button ${mode === 'signup' ? '' : 'secondary'}`}
            onClick={() => setMode('signup')}
            type="button"
          >
            Create account
          </button>
        </div>
        <form className="stack" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label className="stack">
              Full name
              <input
                className="input"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>
          )}
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
            {isLoading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
          {message && <p className="muted">{message}</p>}
        </form>
      </div>
    </div>
  )
}
