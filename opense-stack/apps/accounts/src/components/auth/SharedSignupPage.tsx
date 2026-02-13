import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

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
  onSignUp: (credentials: SignupCredentials) => Promise<void> | void
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
  onSignUp,
  footer,
}: SharedSignupPageProps) => {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSignUp({ fullName, email, password, confirmPassword })
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
              <div className="space-y-4 text-slate-300">
                <h2 className="text-2xl font-semibold text-slate-100">One account for every OpenSe app</h2>
                <p className="text-sm text-slate-400">
                  Create your account once and use it across ETL, StoQR, and future tools.
                </p>
              </div>
              <p className="max-w-sm text-sm text-slate-400">
                Centralized sign-up keeps authentication consistent and secure.
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

                {success && (
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    {success}
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <label className="block space-y-2 text-sm text-slate-300">
                    <span>Full Name</span>
                    <input
                      type="text"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </label>

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
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </label>

                  <label className="block space-y-2 text-sm text-slate-300">
                    <span>Confirm Password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-blue-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Creating account...' : submitLabel}
                  </button>
                </form>

                {footer && <div className="text-sm text-slate-400">{footer}</div>}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
