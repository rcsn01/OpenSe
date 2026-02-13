type AuthMode = 'signin' | 'signup'

const ACCOUNTS_URL = (import.meta.env.VITE_ACCOUNTS_URL as string | undefined) ?? 'https://accounts.rcsn01.com'
const APP_PUBLIC_URL = (import.meta.env.VITE_APP_PUBLIC_URL as string | undefined) ?? 'https://open-stoqr.rcsn01.com'

export const buildAccountsAuthUrl = (mode: AuthMode) => {
  const returnTo = `${APP_PUBLIC_URL}/dashboard`
  const params = new URLSearchParams({
    app: 'Open-StoQR',
    returnTo,
  })

  return `${ACCOUNTS_URL}/${mode === 'signup' ? 'register' : 'login'}?${params.toString()}`
}
