import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Spinner } from '@repo/ui'
import { getPendingInvites } from '../../api/invitations'

/**
 * Root onboarding page: redirects to invitation choice or create based on pending invites.
 */
export const OnboardingRootPage = () => {
  const location = useLocation()
  const [deciding, setDeciding] = useState(true)
  const [hasInvites, setHasInvites] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const invites = await getPendingInvites()
        setHasInvites(invites.length > 0)
      } catch {
        setHasInvites(false)
      } finally {
        setDeciding(false)
      }
    }
    void check()
  }, [])

  if (deciding) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (hasInvites) {
    return <Navigate to="/onboarding/invitations" replace state={location.state} />
  }

  return <Navigate to="/onboarding/create" replace state={location.state} />
}
