import { buildAccountsAuthUrl as buildSharedAccountsAuthUrl, type AuthMode } from '@repo/shared/utils'

const getAccountsUrl = () => {
  const fromEnv = import.meta.env.VITE_ACCOUNTS_URL as string | undefined
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5991'
  }
  return 'https://accounts.rcsn01.com'
}

const getAppPublicUrl = () => {
  const fromEnv = import.meta.env.VITE_STOQR_PUBLIC_URL as string | undefined
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `http://localhost:${window.location.port}`
  }
  return 'https://open-stoqr.rcsn01.com'
}

const ACCOUNTS_URL = getAccountsUrl()
const APP_PUBLIC_URL = getAppPublicUrl()

export { getAccountsUrl }

export const buildAccountsAuthUrl = (mode: AuthMode) => {
  return buildSharedAccountsAuthUrl({
    mode,
    accountsUrl: ACCOUNTS_URL,
    appPublicUrl: APP_PUBLIC_URL,
    appName: 'Open-StoQR',
  })
}
