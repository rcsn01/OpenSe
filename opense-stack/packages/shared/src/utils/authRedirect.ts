export type AuthMode = 'signin' | 'signup'

interface BuildAccountsAuthUrlOptions {
  mode: AuthMode
  accountsUrl: string
  appPublicUrl: string
  appName: string
  redirectPath?: string
}

export const buildAccountsAuthUrl = ({
  mode,
  accountsUrl,
  appPublicUrl,
  appName,
  redirectPath = '/dashboard',
}: BuildAccountsAuthUrlOptions): string => {
  const normalizedAccountsUrl = accountsUrl.replace(/\/$/, '')
  const normalizedAppPublicUrl = appPublicUrl.replace(/\/$/, '')
  const returnTo = `${normalizedAppPublicUrl}${redirectPath}`
  const params = new URLSearchParams({
    app: appName,
    returnTo,
  })

  return `${normalizedAccountsUrl}/${mode === 'signup' ? 'register' : 'login'}?${params.toString()}`
}