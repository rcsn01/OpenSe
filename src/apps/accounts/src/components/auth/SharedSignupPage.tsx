import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { GoogleSignInButton } from './GoogleSignInButton'

type SignupCredentials = {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export type SharedSignupPageProps = {
  appName: string
  title?: string
  description?: string
  loading?: boolean
  error?: string | null
  success?: string | null
  submitLabel?: string
  googleLabel?: string
  googleAuthEnabled?: boolean
  onSignUp: (credentials: SignupCredentials) => Promise<void> | void
  onGoogleSignIn?: () => Promise<void> | void
  footer?: ReactNode
}

export const SharedSignupPage = ({
  appName,
  title = 'Create account',
  description = 'Set up your account to continue.',
  loading = false,
  error = null,
  success = null,
  submitLabel = 'Create account',
  googleLabel = 'Continue with Google',
  googleAuthEnabled = false,
  onSignUp,
  onGoogleSignIn,
  footer,
}: SharedSignupPageProps) => {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const inputClassName =
    'w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ' +
    'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] ' +
    'focus:border-[var(--color-ring)] focus:ring-[color-mix(in_srgb,var(--color-ring)_20%,transparent)]'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSignUp({ fullName, email, password, confirmPassword })
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] px-6 py-10 text-[var(--color-foreground)]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-xl)]">
          <div className="grid md:grid-cols-2">
            <section className="hidden min-h-[620px] flex-col justify-between border-r border-[var(--color-border)] bg-[var(--color-muted)] p-10 md:flex">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">{appName}</p>
              </div>
              <div className="space-y-4 text-[var(--color-foreground)]">
                <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">One account for every OpenSe app</h2>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Create your account once and use it across ETL, StoQR, and future tools.
                </p>
              </div>
              <p className="max-w-sm text-sm text-[var(--color-muted-foreground)]">
                Centralized sign-up keeps authentication consistent and secure.
              </p>
            </section>

            <section className="flex min-h-[620px] flex-col justify-center p-8 sm:p-12">
              <div className="mx-auto w-full max-w-md space-y-7">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">{title}</h1>
                  <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{description}</p>
                </div>

                {error && (
                  <div className="rounded-lg border border-[var(--color-destructive)] bg-[var(--color-destructive-light)] px-4 py-3 text-sm text-[var(--color-destructive)]">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-lg border border-[var(--color-success)] bg-[var(--color-success-light)] px-4 py-3 text-sm text-[var(--color-success)]">
                    {success}
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <label className="block space-y-2 text-sm text-[var(--color-foreground)]">
                    <span>Full Name</span>
                    <input
                      type="text"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className={inputClassName}
                    />
                  </label>

                  <label className="block space-y-2 text-sm text-[var(--color-foreground)]">
                    <span>Email</span>
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className={inputClassName}
                    />
                  </label>

                  <label className="block space-y-2 text-sm text-[var(--color-foreground)]">
                    <span>Password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={inputClassName}
                    />
                  </label>

                  <label className="block space-y-2 text-sm text-[var(--color-foreground)]">
                    <span>Confirm Password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className={inputClassName}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Creating account...' : submitLabel}
                  </button>
                </form>

                <div className="space-y-3">
                  <GoogleSignInButton
                    label={googleLabel}
                    loading={loading}
                    enabled={googleAuthEnabled}
                    onClick={onGoogleSignIn}
                  />
                </div>

                {footer && <div className="text-sm text-[var(--color-muted-foreground)]">{footer}</div>}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
