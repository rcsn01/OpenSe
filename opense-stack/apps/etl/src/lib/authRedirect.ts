import { buildAccountsAuthUrl as buildSharedAccountsAuthUrl, type AuthMode } from '@repo/shared/utils'

const ACCOUNTS_URL = (import.meta.env.VITE_ACCOUNTS_URL as string | undefined) ?? 'https://accounts.rcsn01.com'
const APP_PUBLIC_URL = (import.meta.env.VITE_ETL_PUBLIC_URL as string | undefined) ?? 'https://open-etl.rcsn01.com'

export const buildAccountsAuthUrl = (mode: AuthMode) => {
  return buildSharedAccountsAuthUrl({
    mode,
    accountsUrl: ACCOUNTS_URL,
    appPublicUrl: APP_PUBLIC_URL,
    appName: 'Open-ETL',
  })
}
