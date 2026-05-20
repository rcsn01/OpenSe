import { buildAccountsAuthUrl as buildSharedAccountsAuthUrl, type AuthMode } from '@repo/shared/utils'
import { getRuntimeConfigValue } from '@repo/shared/runtime-config'

const ACCOUNTS_URL =
  getRuntimeConfigValue('VITE_ACCOUNTS_URL', 'https://accounts.rcsn01.com') ??
  'https://accounts.rcsn01.com'
const APP_PUBLIC_URL =
  getRuntimeConfigValue('VITE_STOQR_PUBLIC_URL', 'https://open-stoqr.rcsn01.com') ??
  'https://open-stoqr.rcsn01.com'

export const buildAccountsAuthUrl = (mode: AuthMode) => {
  return buildSharedAccountsAuthUrl({
    mode,
    accountsUrl: ACCOUNTS_URL,
    appPublicUrl: APP_PUBLIC_URL,
    appName: 'Open-StoQR',
  })
}
