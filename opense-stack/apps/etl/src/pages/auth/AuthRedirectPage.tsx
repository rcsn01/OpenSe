import { useEffect } from 'react'
import { buildAccountsAuthUrl } from '../../lib/authRedirect'

type AuthRedirectPageProps = {
  mode: 'signin' | 'signup'
}

export const AuthRedirectPage = ({ mode }: AuthRedirectPageProps) => {
  useEffect(() => {
    window.location.replace(buildAccountsAuthUrl(mode))
  }, [mode])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600">
      Redirecting to Accounts...
    </div>
  )
}
