import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@repo/shared/auth/context'
import {
  buildGetStartedAuthenticatedUrl,
  buildGetStartedGuestUrl,
  normalizeLandingContext,
  setActiveLandingContext,
} from '../lib/authRedirect'

export const GetStartedRedirectPage = () => {
  const [searchParams] = useSearchParams()
  const { loading, user } = useAuth()
  const hasRedirected = useRef(false)
  const landingContext = normalizeLandingContext(searchParams.get('context'))

  useEffect(() => {
    setActiveLandingContext(landingContext)
  }, [landingContext])

  useEffect(() => {
    if (loading || hasRedirected.current) {
      return
    }

    hasRedirected.current = true
    const nextUrl = user
      ? buildGetStartedAuthenticatedUrl(landingContext)
      : buildGetStartedGuestUrl(landingContext)

    window.location.replace(nextUrl)
  }, [landingContext, loading, user])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600">
      {loading ? 'Loading session...' : 'Redirecting...'}
    </div>
  )
}