import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Badge, Button, Textarea } from '@repo/ui'
import { CheckCircle2, MailPlus, Send, ShieldAlert } from 'lucide-react'
import {
  completeOrganisationOnboarding,
  getOnboardingStatus,
  inviteOrganisationMembers,
  type OnboardingStatus,
} from '../api/onboarding'
import { AccountsField, AccountsSection } from '../components/AccountsPageShell'
import { OnboardingShell } from '../components/OnboardingShell'
import { buildPathWithQuery, redirectBackToApp } from '../lib/redirect'
import {
  canInviteDuringOnboarding,
  getOnboardingCompletedFallbackPath,
  parseOnboardingInviteEmails,
  shouldSkipInviteMembersStep,
} from '../lib/onboardingUi'

export const OnboardingInviteMembersPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [emailsInput, setEmailsInput] = useState('')
  const [status, setStatus] = useState<OnboardingStatus | null>(null)

  const canInvite = useMemo(() => canInviteDuringOnboarding(status?.role), [status?.role])
  const parsedEmails = useMemo(() => parseOnboardingInviteEmails(emailsInput), [emailsInput])

  const completeAndRedirect = async () => {
    await completeOrganisationOnboarding()
    const redirected = await redirectBackToApp()
    if (!redirected) {
      navigate(getOnboardingCompletedFallbackPath(), { replace: true })
    }
  }

  const loadStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const nextStatus = await getOnboardingStatus()
      setStatus(nextStatus)

      if (!nextStatus.needsOnboarding) {
        const redirected = await redirectBackToApp()
        if (!redirected) {
          navigate(getOnboardingCompletedFallbackPath(), { replace: true })
        }
        return
      }

      if (nextStatus.step === 'invites') {
        navigate(buildPathWithQuery('/onboarding/invitations'), { replace: true })
        return
      }

      if (nextStatus.step === 'create') {
        navigate(buildPathWithQuery('/onboarding/create-organisation'), { replace: true })
        return
      }

      if (nextStatus.step === 'blocked') {
        navigate(buildPathWithQuery('/onboarding/blocked'), { replace: true })
        return
      }

      if (nextStatus.step === 'invite-members' && shouldSkipInviteMembersStep(nextStatus.role)) {
        await completeAndRedirect()
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

    if (!canInvite) {
      setError('Your role does not allow inviting members.')
      return
    }

    if (parsedEmails.emails.length === 0) {
      setError('Enter at least one email address to send invites.')
      return
    }

    try {
      setSending(true)
      setError(null)
      setSuccess(null)
      await inviteOrganisationMembers(status.orgId, parsedEmails.emails)
      setSuccess(`Sent ${parsedEmails.emails.length} invitation${parsedEmails.emails.length > 1 ? 's' : ''}. You can send another batch or finish onboarding.`)
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
      await completeAndRedirect()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete onboarding.'
      setError(message)
      setFinishing(false)
    }
  }

  if (loading) {
    return (
      <OnboardingShell
        title="Invite members"
        description="Invite teammates to your organisation before entering Accounts."
        currentStep="invite-members"
        loading={true}
        loadingLabel="Loading onboarding..."
      >
        <div />
      </OnboardingShell>
    )
  }

  if (shouldSkipInviteMembersStep(status?.role)) {
    return (
      <OnboardingShell
        title="Finishing onboarding"
        description="Completing your organisation access before returning to Accounts."
        currentStep="invite-members"
        alert={error ? <Alert variant="destructive" title="Unable to continue">{error}</Alert> : null}
      >
        <div />
      </OnboardingShell>
    )
  }

  return (
    <OnboardingShell
      title="Invite members"
      description="Send one or more invite batches, then finish onboarding when the first setup pass is complete."
      currentStep="invite-members"
      alert={
        <>
          {error ? <Alert variant="destructive" title="Unable to continue">{error}</Alert> : null}
          {success ? <Alert variant="success" title="Invitations sent">{success}</Alert> : null}
        </>
      }
      actions={
        <Button
          variant="outline"
          size="sm"
          disabled={finishing || sending}
          onClick={() => {
            void handleComplete()
          }}
        >
          <CheckCircle2 className="h-4 w-4" />
          {finishing ? 'Finishing...' : 'Finish onboarding'}
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <AccountsSection
          title="Member invitations"
          description={canInvite ? 'Paste email addresses separated by commas, semicolons, or new lines.' : 'Your role can finish onboarding, but cannot send member invitations.'}
          actions={<Badge variant={canInvite ? 'success' : 'warning'}>{canInvite ? 'Invites enabled' : 'Read-only'}</Badge>}
        >
          <div className="grid gap-4">
            {!canInvite ? (
              <Alert variant="warning" title="Invitation controls disabled">
                Owners and admins can invite members. You can still finish onboarding for your account.
              </Alert>
            ) : null}

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-body)]" htmlFor="onboarding-invite-emails">
                <MailPlus className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                Invite emails
              </label>
              <Textarea
                id="onboarding-invite-emails"
                value={emailsInput}
                onChange={(event) => setEmailsInput(event.target.value)}
                placeholder="name@company.com, another@company.com"
                disabled={!canInvite || sending || finishing}
                className="min-h-36"
              />
              <p className="text-xs text-[var(--color-muted-foreground)]">Duplicates are normalized before invitations are sent.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                disabled={!canInvite || sending || finishing || parsedEmails.emails.length === 0}
                onClick={() => {
                  void handleSendInvites()
                }}
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending...' : 'Send invitations'}
              </Button>
              <Button
                variant="outline"
                disabled={finishing || sending}
                onClick={() => {
                  void handleComplete()
                }}
              >
                {finishing ? 'Finishing...' : 'Finish onboarding'}
              </Button>
            </div>
          </div>
        </AccountsSection>

        <aside className="space-y-5">
          <AccountsSection title={status?.orgName ?? 'Organisation'}>
            <dl className="grid gap-4">
              <AccountsField label="Your role" value={<Badge variant="neutral">{status?.role ?? '-'}</Badge>} />
              <AccountsField label="Invite permission" value={canInvite ? 'Owner/admin access' : 'Read-only'} />
              <AccountsField label="Next step" value="Finish onboarding" />
            </dl>
          </AccountsSection>

          <AccountsSection title="Parsed preview">
            <div className="space-y-4">
              {parsedEmails.emails.length === 0 ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">No invite emails parsed yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {parsedEmails.emails.map((email) => (
                    <Badge key={email} variant="neutral">{email}</Badge>
                  ))}
                </div>
              )}

              {parsedEmails.duplicateCount > 0 ? (
                <div className="flex items-start gap-2 border-t border-[var(--color-border)] pt-4 text-sm text-[var(--color-muted-foreground)]">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />
                  <span>
                    {parsedEmails.duplicateCount} duplicate {parsedEmails.duplicateCount === 1 ? 'entry was' : 'entries were'} removed
                    {parsedEmails.duplicateEmails.length > 0 ? `: ${parsedEmails.duplicateEmails.join(', ')}` : ''}.
                  </span>
                </div>
              ) : null}

              <div className="border-t border-[var(--color-border)] pt-4 text-sm text-[var(--color-muted-foreground)]">
                {parsedEmails.emails.length} unique of {parsedEmails.inputCount} parsed
              </div>
            </div>
          </AccountsSection>
        </aside>
      </div>
    </OnboardingShell>
  )
}
