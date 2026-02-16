import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Spinner,
} from '@repo/ui'
import { Building2, Loader2, UserPlus } from 'lucide-react'
import { getPendingInvites, acceptInvite, rejectInvite, type OrgInvite } from '../../api/invitations'

export const OnboardingInvitationChoicePage = () => {
  const navigate = useNavigate()
  const [invites, setInvites] = useState<OrgInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const list = await getPendingInvites()
        setInvites(list)
        if (list.length === 0) {
          navigate('/onboarding/create', { replace: true })
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load invitations')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [navigate])

  const handleAccept = async (inviteId: string) => {
    setProcessingId(inviteId)
    setError(null)
    try {
      await acceptInvite(inviteId)
      navigate('/settings', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDecline = async () => {
    setError(null)
    try {
      await Promise.all(invites.map((i) => rejectInvite(i.id)))
      navigate('/onboarding/create', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to decline invitations')
    }
  }

  const handleCreateOwn = () => {
    void handleDecline()
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">You've been invited</h1>
        <p className="mt-1 text-sm text-slate-600">
          Choose to join an existing organisation or create your own.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" title="Error">
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
          <CardDescription>Accept one or decline and create your own organisation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{invite.org_name}</p>
                  <p className="text-sm text-slate-500">
                    Invited by {invite.inviter_name} • {invite.role}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleAccept(invite.id)}
                disabled={!!processingId}
              >
                {processingId === invite.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Accept'
                )}
              </Button>
            </div>
          ))}

          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600 mb-3">
              Prefer to create your own organisation instead?
            </p>
            <Button variant="outline" onClick={handleCreateOwn} disabled={!!processingId}>
              <UserPlus className="mr-2 h-4 w-4" />
              Decline and create my organisation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
