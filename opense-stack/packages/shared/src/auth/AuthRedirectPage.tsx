import { useEffect } from 'react'
import type { AuthMode } from '../utils/authRedirect'

type AuthRedirectPageProps = {
  mode: AuthMode
  buildAuthUrl: (mode: AuthMode) => string
}

export const AuthRedirectPage = ({ mode, buildAuthUrl }: AuthRedirectPageProps) => {
  useEffect(() => {
    window.location.replace(buildAuthUrl(mode))
  }, [buildAuthUrl, mode])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600">
      Redirecting to Accounts...
    </div>
  )
}
