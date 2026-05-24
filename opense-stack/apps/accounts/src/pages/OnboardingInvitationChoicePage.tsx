import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Badge, Button, DataTable, type DataTableColumn } from '@repo/ui'
import { Building2, CheckCircle2, XCircle } from 'lucide-react'
import {
  acceptOrganisationInvite,
  completeOrganisationOnboarding,
  declineOrganisationInvite,
  getOnboardingStatus,
  type OnboardingStatus,
  type PendingInvite,
} from '../api/onboarding'
import { AccountsSection } from '../components/AccountsPageShell'
import { OnboardingShell } from '../components/OnboardingShell'
import { buildPathWithQuery, redirectBackToApp } from '../lib/redirect'
import {
  getInvitationAcceptedPath,
  getInvitationDeclinedPath,
  getOnboardingCompletedFallbackPath,
  getOnboardingPathForStatus,
  shouldSkipInviteMembersStep,
} from '../lib/onboardingUi'

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
          navigate(getOnboardingCompletedFallbackPath(), { replace: true })
        }
        return
      }

      if (status.step === 'create') {
        navigate(buildPathWithQuery('/onboarding/create-organisation'), { replace: true })
        return
      }

      if (status.step === 'blocked') {
        navigate(buildPathWithQuery('/onboarding/blocked'), { replace: true })
        return
      }

      if (status.step === 'invite-members') {
        if (shouldSkipInviteMembersStep(status.role)) {
          await completeOrganisationOnboarding()
          const redirected = redirectBackToApp()
          if (!redirected) {
            navigate(getOnboardingCompletedFallbackPath(), { replace: true })
          }
          return
        }

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
      const invite = invites.find((candidate) => candidate.id === inviteId)
      await acceptOrganisationInvite(inviteId)
      if (shouldSkipInviteMembersStep(invite?.role)) {
        await completeOrganisationOnboarding()
        const redirected = redirectBackToApp()
        if (!redirected) {
          navigate(getOnboardingCompletedFallbackPath(), { replace: true })
        }
        return
      }

      navigate(buildPathWithQuery(getInvitationAcceptedPath()), { replace: true })
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

      const nextPath = getInvitationDeclinedPath(remaining)
      if (nextPath) {
        const nextStatus = await getOnboardingStatus()
        navigate(buildPathWithQuery(getOnboardingPathForStatus(nextStatus)), { replace: true })
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

      const nextStatus = await getOnboardingStatus()
      navigate(buildPathWithQuery(getOnboardingPathForStatus(nextStatus)), { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to decline invitations.'
      setError(message)
      setActionLoading(null)
    }
  }

  const columns: Array<DataTableColumn<PendingInvite>> = [
    {
      id: 'organisation',
      header: 'Organisation',
      renderCell: (invite) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center border border-[var(--color-border)] bg-[var(--color-muted)]">
            <Building2 className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--color-heading)]">{invite.orgName}</p>
            <p className="truncate text-xs text-[var(--color-muted-foreground)]">Invited by {invite.inviterName}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      width: 120,
      renderCell: (invite) => <Badge variant="neutral">{invite.role}</Badge>,
    },
    {
      id: 'createdAt',
      header: 'Received',
      width: 180,
      renderCell: (invite) => new Date(invite.createdAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: 'Actions',
      width: 260,
      align: 'right',
      renderCell: (invite) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            disabled={actionLoading !== null}
            onClick={() => {
              void handleAcceptInvite(invite.id)
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            {actionLoading === invite.id ? 'Accepting...' : 'Accept invitation'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={actionLoading !== null}
            onClick={() => {
              void handleDeclineInvite(invite.id)
            }}
          >
            <XCircle className="h-4 w-4" />
            {actionLoading === invite.id ? 'Declining...' : 'Decline'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <OnboardingShell
      title="Join an organisation"
      description="Review pending invitations, join an existing organisation, or decline all invitations and create your own."
      currentStep="invites"
      loading={loading}
      loadingLabel="Loading invitations..."
      alert={error ? <Alert variant="destructive" title="Unable to continue">{error}</Alert> : null}
    >
      <AccountsSection
        title="Pending invitations"
        description="Accept one invitation to continue, or decline invitations that are not relevant."
        actions={
          invites.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading !== null}
              onClick={() => {
                void handleCreateOwnOrganisation()
              }}
            >
              {actionLoading === 'decline-all' ? 'Processing...' : 'Decline all and create my own organisation'}
            </Button>
          ) : null
        }
      >
        {invites.length === 0 ? (
          <div className="flex flex-col gap-3 text-sm text-[var(--color-muted-foreground)]">
            <p>No pending invitations were found.</p>
            <div>
              <Button
                onClick={() => {
                  navigate(buildPathWithQuery('/onboarding/create-organisation'), { replace: true })
                }}
              >
                Continue to organisation creation
              </Button>
            </div>
          </div>
        ) : (
          <DataTable
            variant="operational"
            rows={invites}
            columns={columns}
            getRowId={(invite) => invite.id}
            minTableWidth={760}
          />
        )}
      </AccountsSection>
    </OnboardingShell>
  )
}
