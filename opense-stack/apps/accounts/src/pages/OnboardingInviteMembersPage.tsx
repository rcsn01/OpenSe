import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner, Textarea } from '@repo/ui'
import {
  completeOrganisationOnboarding,
  getOnboardingStatus,
  inviteOrganisationMembers,
  type OnboardingStatus,
} from '../api/onboarding'
import { buildPathWithQuery, redirectBackToApp } from '../lib/redirect'

const parseEmailList = (value: string): string[] => {
  return value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

export const OnboardingInviteMembersPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [emailsInput, setEmailsInput] = useState('')
  const [status, setStatus] = useState<OnboardingStatus | null>(null)

  const canInvite = useMemo(() => status?.role === 'owner' || status?.role === 'admin', [status?.role])

  const loadStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const nextStatus = await getOnboardingStatus()
      setStatus(nextStatus)

      if (!nextStatus.needsOnboarding) {
        const redirected = redirectBackToApp()
        if (!redirected) {
          navigate('/general', { replace: true })
        }
        return
      }

      if (nextStatus.step === 'invites') {
        navigate(buildPathWithQuery('/onboarding/invitations'), { replace: true })
        return
      }

      if (nextStatus.step === 'create') {
        navigate(buildPathWithQuery('/onboarding/create-organisation'), { replace: true })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load onboarding status.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStatus()
  }, [])

  const handleSendInvites = async () => {
    if (!status?.orgId) {
      setError('No organisation context found.')
      return
    }

    const emails = parseEmailList(emailsInput)
    if (emails.length === 0) {
      setError('Enter at least one email address to send invites.')
      return
    }

    try {
      setSending(true)
      setError(null)
      setSuccess(null)
      await inviteOrganisationMembers(status.orgId, emails)
      setSuccess(`Sent ${emails.length} invitation${emails.length > 1 ? 's' : ''}.`)
      setEmailsInput('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send invites.'
      setError(message)
    } finally {
      setSending(false)
    }
  }

  const handleComplete = async () => {
    try {
      setFinishing(true)
      setError(null)
      await completeOrganisationOnboarding()
      const redirected = redirectBackToApp()
      if (!redirected) {
        navigate('/general', { replace: true })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete onboarding.'
      setError(message)
      setFinishing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-[var(--color-muted-foreground)]">
        <div className="flex items-center gap-2">
          <Spinner size="sm" />
          Loading onboarding...
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-heading)]">Invite members</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">Invite teammates to your organisation before entering account settings.</p>
      </div>

      {error ? <Alert variant="destructive" title="Unable to continue">{error}</Alert> : null}
      {success ? <Alert variant="success" title="Invitations sent">{success}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>{status?.orgName ?? 'Organisation'}</CardTitle>
          <CardDescription>Send email invitations for members to join your organisation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canInvite ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-body)]" htmlFor="onboarding-invite-emails">
                  Invite emails
                </label>
                <Textarea
                  id="onboarding-invite-emails"
                  value={emailsInput}
                  onChange={(event) => setEmailsInput(event.target.value)}
                  placeholder="name@company.com, another@company.com"
                  disabled={sending || finishing}
                />
                <p className="text-xs text-[var(--color-muted-foreground)]">Separate multiple emails with commas or new lines.</p>
              </div>

              <Button
                disabled={sending || finishing}
                onClick={() => {
                  void handleSendInvites()
                }}
              >
                {sending ? 'Sending...' : 'Send invitations'}
              </Button>
            </>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">Your role does not allow inviting members. You can finish onboarding now.</p>
          )}

          <Button
            variant="outline"
            disabled={finishing || sending}
            onClick={() => {
              void handleComplete()
            }}
          >
            {finishing ? 'Finishing...' : 'Finish onboarding'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
