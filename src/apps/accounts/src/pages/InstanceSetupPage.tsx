import { type FormEvent, useMemo, useState } from 'react'
import { Button, Input, ThemeProvider } from '@repo/ui'
import {
  buildDiscoveryUrl,
  describeSetupError,
  fetchDiscoveryConfig,
  MOBILE_STORAGE_KEY,
  normalizeAccountsUrl,
  type DiscoveryConfig,
} from '../lib/instanceSetup'

type RuntimeTarget = 'desktop' | 'mobile'

type InstanceSetupPageProps = {
  target: RuntimeTarget
}

type DesktopSetupBridge = {
  configure?: (accountsUrl: string) => Promise<unknown>
}

const getDesktopBridge = () =>
  (window as Window & { openseDesktop?: DesktopSetupBridge }).openseDesktop

const getInitialAccountsUrl = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(MOBILE_STORAGE_KEY) || '{}') as {
      accountsUrl?: unknown
    }
    return typeof stored.accountsUrl === 'string' ? stored.accountsUrl : ''
  } catch {
    return ''
  }
}

const saveMobileConfig = (accountsUrl: string, discovery: DiscoveryConfig) => {
  window.localStorage.setItem(MOBILE_STORAGE_KEY, JSON.stringify({ accountsUrl, discovery }))
}

export const InstanceSetupPage = ({ target }: InstanceSetupPageProps) => {
  const [accountsUrl, setAccountsUrl] = useState(() => (target === 'mobile' ? getInitialAccountsUrl() : ''))
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const title = 'Connect to Instance'
  const discoveryPreview = useMemo(() => {
    if (!accountsUrl.trim()) return ''

    try {
      return buildDiscoveryUrl(accountsUrl)
    } catch {
      return ''
    }
  }, [accountsUrl])

  const submitDesktop = async (normalizedUrl: string) => {
    const bridge = getDesktopBridge()
    if (!bridge?.configure) {
      throw new Error('Desktop setup bridge is unavailable.')
    }

    setStatus('Saving desktop configuration...')
    await bridge.configure(normalizedUrl)
  }

  const submitMobile = async (normalizedUrl: string) => {
    const discoveryUrl = buildDiscoveryUrl(normalizedUrl)
    setStatus(`Fetching ${discoveryUrl} ...`)
    const discovery = await fetchDiscoveryConfig(normalizedUrl)
    setStatus('Connected. Opening Accounts...')
    saveMobileConfig(normalizedUrl, discovery)
    window.location.assign('/accounts/index.html#/login')
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setStatus('')
    setLoading(true)

    try {
      const normalizedUrl = normalizeAccountsUrl(accountsUrl)
      setAccountsUrl(normalizedUrl)

      if (target === 'desktop') {
        await submitDesktop(normalizedUrl)
      } else {
        await submitMobile(normalizedUrl)
      }
    } catch (submitError) {
      setError(describeSetupError(submitError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="opense-theme" cookieKey="opense-theme" respectStoredTheme={true}>
      <main className="min-h-screen bg-[var(--color-background)] px-6 py-10 text-[var(--color-foreground)] sm:px-10">
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[520px] flex-col justify-center">
          <div className="mb-7">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)]">
              OpenSe
            </p>
            <p className="m-0 text-sm font-semibold text-[var(--color-foreground)]">
              {target === 'desktop' ? 'Desktop Setup' : 'Mobile Setup'}
            </p>
          </div>

          <h1 className="m-0 text-2xl font-semibold leading-tight text-[var(--color-foreground)]">{title}</h1>
          <p className="mb-6 mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
            Enter the login URL.
          </p>

          <form onSubmit={onSubmit} className="grid gap-3">
            <label htmlFor="accounts-url" className="text-sm font-medium text-[var(--color-foreground)]">
              Accounts URL
            </label>
            <Input
              id="accounts-url"
              name="accountsUrl"
              type="url"
              autoComplete="url"
              inputMode="url"
              placeholder="https://accounts.example.com"
              value={accountsUrl}
              disabled={loading}
              error={error}
              onChange={(event) => setAccountsUrl(event.target.value)}
              required
            />
            <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
              Connect
            </Button>
          </form>

          <div className="mt-4 min-h-5 text-sm leading-5 text-[var(--color-muted-foreground)]" role="status" aria-live="polite">
            {status}
          </div>

          {discoveryPreview && status && (
            <p className="mt-4 break-words text-xs leading-5 text-[var(--color-muted-foreground)]">
              Discovery: {discoveryPreview}
            </p>
          )}
        </section>
      </main>
    </ThemeProvider>
  )
}
