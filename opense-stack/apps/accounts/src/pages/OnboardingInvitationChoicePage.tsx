import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from '@repo/ui'
import {
  acceptOrganisationInvite,
  declineOrganisationInvite,
  getOnboardingStatus,
  type OnboardingStatus,
  type PendingInvite,
} from '../api/onboarding'
import { buildPathWithQuery, redirectBackToApp } from '../lib/redirect'

export const OnboardingInvitationChoicePage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [invites, setInvites] = useState<PendingInvite[]>([])

  const loadStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const status: OnboardingStatus = await getOnboardingStatus()

      if (!status.needsOnboarding) {
        const redirected = redirectBackToApp()
        if (!redirected) {
          navigate('/general', { replace: true })
        }
        return
      }

      if (status.step === 'create') {
        navigate(buildPathWithQuery('/onboarding/create-organisation'), { replace: true })
        return
      }

      if (status.step === 'invite-members') {
        navigate(buildPathWithQuery('/onboarding/invite-members'), { replace: true })
        return
      }

      setInvites(status.pendingInvites)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load invitations.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStatus()
  }, [])

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      setActionLoading(inviteId)
      setError(null)
      await acceptOrganisationInvite(inviteId)
      navigate(buildPathWithQuery('/onboarding/invite-members'), { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to accept invitation.'
      setError(message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      setActionLoading(inviteId)
      setError(null)
      await declineOrganisationInvite(inviteId)
      const remaining = invites.filter((invite) => invite.id !== inviteId)
      setInvites(remaining)

      if (remaining.length === 0) {
        navigate(buildPathWithQuery('/onboarding/create-organisation'), { replace: true })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to decline invitation.'
      setError(message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreateOwnOrganisation = async () => {
    try {
      setActionLoading('decline-all')
      setError(null)

      for (const invite of invites) {
        await declineOrganisationInvite(invite.id)
      }

      navigate(buildPathWithQuery('/onboarding/create-organisation'), { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to decline invitations.'
      setError(message)
      setActionLoading(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Join an organisation</h1>
        <p className="text-sm text-slate-600">You have pending invitations. Accept one, or decline and create your own organisation.</p>
      </div>

      {error ? <Alert variant="destructive" title="Unable to continue">{error}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
          <CardDescription>Pick one invitation to join now.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Loading invitations...
            </div>
          ) : invites.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">No pending invitations were found.</p>
              <Button
                onClick={() => {
                  navigate(buildPathWithQuery('/onboarding/create-organisation'), { replace: true })
                }}
              >
                Continue to organisation creation
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => (
                <div key={invite.id} className="rounded-md border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-900">{invite.orgName}</p>
                  <p className="text-xs text-slate-500">Invited by {invite.inviterName} • Role: {invite.role}</p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      disabled={actionLoading !== null}
                      onClick={() => {
                        void handleAcceptInvite(invite.id)
                      }}
                    >
                      {actionLoading === invite.id ? 'Accepting...' : 'Accept invitation'}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={actionLoading !== null}
                      onClick={() => {
                        void handleDeclineInvite(invite.id)
                      }}
                    >
                      {actionLoading === invite.id ? 'Declining...' : 'Decline'}
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                disabled={actionLoading !== null}
                onClick={() => {
                  void handleCreateOwnOrganisation()
                }}
              >
                {actionLoading === 'decline-all' ? 'Processing...' : 'Decline all and create my own organisation'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
