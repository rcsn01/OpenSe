import { Play } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { GoogleSignInButton } from './GoogleSignInButton'

type LoginCredentials = {
  email: string
  password: string
}

export type SharedLoginPageProps = {
  appName: string
  title?: string
  description?: string
  loading?: boolean
  error?: string | null
  success?: string | null
  submitLabel?: string
  googleLabel?: string
  googleAuthEnabled?: boolean
  demoLabel?: string
  onEmailSignIn: (credentials: LoginCredentials) => Promise<void> | void
  onGoogleSignIn?: () => Promise<void> | void
  onDemoSignIn?: () => Promise<void> | void
  footer?: ReactNode
}

export const SharedLoginPage = ({
  appName,
  title = 'Sign in',
  description = 'Continue to your workspace.',
  loading = false,
  error = null,
  success = null,
  submitLabel = 'Sign in',
  googleLabel = 'Google',
  googleAuthEnabled = false,
  demoLabel = 'Try Demo Mode',
  onEmailSignIn,
  onGoogleSignIn,
  onDemoSignIn,
  footer,
}: SharedLoginPageProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const inputClassName =
    'w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ' +
    'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] ' +
    'focus:border-[var(--color-ring)] focus:ring-[color-mix(in_srgb,var(--color-ring)_20%,transparent)]'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onEmailSignIn({ email, password })
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

              <div className="relative mx-auto h-72 w-72">
                <div className="absolute inset-x-4 top-5 h-40 rounded-2xl border border-[var(--color-border)] bg-[var(--color-primary-light)]" />
                <div className="absolute left-0 top-14 h-36 w-32 rounded-2xl border border-[var(--color-border)] bg-[var(--color-info-light)]" />
                <div className="absolute right-0 top-16 h-28 w-28 rounded-2xl border border-[var(--color-border)] bg-[var(--color-warning-light)]" />
                <div className="absolute bottom-1 left-12 h-36 w-48 rounded-2xl border border-[var(--color-border)] bg-[var(--color-success-light)]" />
                <div className="absolute bottom-10 right-10 h-20 w-20 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]" />
              </div>

              <p className="max-w-sm text-sm text-[var(--color-muted-foreground)]">
                Secure sign-in with a modern shared auth screen for all OpenSe apps.
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
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={inputClassName}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Signing in...' : submitLabel}
                  </button>
                </form>

                <div className="space-y-3">
                  <GoogleSignInButton
                    label={googleLabel}
                    loading={loading}
                    enabled={googleAuthEnabled}
                    onClick={onGoogleSignIn}
                  />

                  {onDemoSignIn && (
                    <button
                      type="button"
                      onClick={onDemoSignIn}
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-success)] bg-[var(--color-success-light)] px-4 py-2.5 text-sm font-medium text-[var(--color-success)] transition hover:bg-[color-mix(in_srgb,var(--color-success)_28%,var(--color-background))] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Play className="h-4 w-4" />
                      {demoLabel}
                    </button>
                  )}
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
