import { getRuntimeConfigValue } from '@repo/shared/runtime-config'

export const isGoogleAuthEnabled = () =>
  getRuntimeConfigValue('VITE_GOOGLE_AUTH_ENABLED') === 'true'
