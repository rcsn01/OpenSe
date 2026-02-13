import { Play } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

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
  submitLabel?: string
  googleLabel?: string
  demoLabel?: string
  onEmailSignIn: (credentials: LoginCredentials) => Promise<void> | void
  onGoogleSignIn?: () => Promise<void> | void
  onDemoSignIn?: () => Promise<void> | void
  footer?: ReactNode
}

const GoogleIcon = () => (
  <svg className="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.813.96 6.493 2.507l2.56-2.56C19.093 1.253 16.133 0 12.48 0 5.867 0 .533 5.333.533 12S5.867 24 12.48 24c3.44 0 6.027-1.133 7.827-2.96 1.867-1.867 2.44-4.573 2.44-6.653 0-.613-.053-1.187-.147-1.72h-10.12z" />
  </svg>
)

export const SharedLoginPage = ({
  appName,
  title = 'Sign in',
  description = 'Continue to your workspace.',
  loading = false,
  error = null,
  submitLabel = 'Sign in',
  googleLabel = 'Google',
  demoLabel = 'Try Demo Mode',
  onEmailSignIn,
  onGoogleSignIn,
  onDemoSignIn,
  footer,
}: SharedLoginPageProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onEmailSignIn({ email, password })
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="grid md:grid-cols-2">
            <section className="hidden min-h-[620px] flex-col justify-between border-r border-slate-800 p-10 md:flex">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">{appName}</p>
              </div>

              <div className="relative mx-auto h-72 w-72">
                <div className="absolute inset-x-4 top-5 h-40 rounded-2xl border border-cyan-300/60 bg-cyan-400/20" />
                <div className="absolute left-0 top-14 h-36 w-32 rounded-2xl border border-fuchsia-300/60 bg-fuchsia-400/20" />
                <div className="absolute right-0 top-16 h-28 w-28 rounded-2xl border border-violet-300/60 bg-violet-400/20" />
                <div className="absolute bottom-1 left-12 h-36 w-48 rounded-2xl border border-teal-300/60 bg-teal-400/20" />
                <div className="absolute bottom-10 right-10 h-20 w-20 rounded-2xl border border-cyan-300/60 bg-slate-900/90" />
              </div>

              <p className="max-w-sm text-sm text-slate-400">
                Secure sign-in with a modern shared auth screen for all OpenSe apps.
              </p>
            </section>

            <section className="flex min-h-[620px] flex-col justify-center p-8 sm:p-12">
              <div className="mx-auto w-full max-w-md space-y-7">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-100">{title}</h1>
                  <p className="mt-2 text-sm text-slate-400">{description}</p>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <label className="block space-y-2 text-sm text-slate-300">
                    <span>Email</span>
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </label>

                  <label className="block space-y-2 text-sm text-slate-300">
                    <span>Password</span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-blue-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Signing in...' : submitLabel}
                  </button>
                </form>

                <div className="space-y-3">
                  {onGoogleSignIn && (
                    <button
                      type="button"
                      onClick={onGoogleSignIn}
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <GoogleIcon />
                      {googleLabel}
                    </button>
                  )}

                  {onDemoSignIn && (
                    <button
                      type="button"
                      onClick={onDemoSignIn}
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300/50 bg-emerald-400/15 px-4 py-2.5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Play className="h-4 w-4" />
                      {demoLabel}
                    </button>
                  )}
                </div>

                {footer && <div className="text-sm text-slate-400">{footer}</div>}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
