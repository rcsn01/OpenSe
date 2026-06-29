import { createAccountsRedirects, type AuthMode } from '@repo/shared/utils'
import { getRuntimeConfigValue } from '@repo/shared/runtime-config'

const ACCOUNTS_URL =
  getRuntimeConfigValue('VITE_ACCOUNTS_URL', 'https://accounts.rcsn01.com') ??
  'https://accounts.rcsn01.com'
const APP_PUBLIC_URL =
  getRuntimeConfigValue('VITE_OPEN_KB_PUBLIC_URL', 'https://open-kb.rcsn01.com') ??
  'https://open-kb.rcsn01.com'

const accountsRedirects = createAccountsRedirects({
  accountsUrl: ACCOUNTS_URL,
  appPublicUrl: APP_PUBLIC_URL,
  appName: 'Open-KB',
  defaultRedirectPath: '/home',
})

export const buildAccountsAuthUrl = (mode: AuthMode) => accountsRedirects.auth(mode)

export const buildAccountsSettingsUrl = () => accountsRedirects.settings()

export const buildAccountsProfileUrl = () => accountsRedirects.profile()

export const buildAccountsOnboardingUrl = (redirectPath?: string) =>
  accountsRedirects.onboarding({ redirectPath })
