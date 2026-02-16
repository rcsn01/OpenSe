import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@repo/ui'
import { UserPlus, Mail } from 'lucide-react'
import { inviteMember } from '../../api/invitations'

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

export const OnboardingInviteMembersPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const orgId = (location.state as { orgId?: string } | null)?.orgId

  const [email, setEmail] = useState('')
  const [invitedEmails, setInvitedEmails] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!orgId) {
    navigate('/onboarding/create', { replace: true })
    return null
  }

  const handleAddInvite = () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    if (!isValidEmail(trimmed)) {
      setError('Please enter a valid email address')
      return
    }
    if (invitedEmails.includes(trimmed)) {
      setError('This email has already been added')
      return
    }
    setInvitedEmails((prev) => [...prev, trimmed])
    setEmail('')
    setError(null)
  }

  const handleRemoveInvite = (toRemove: string) => {
    setInvitedEmails((prev) => prev.filter((e) => e !== toRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (invitedEmails.length > 0) {
      setLoading(true)
      try {
        const errors: string[] = []
        for (const em of invitedEmails) {
          try {
            await inviteMember(orgId, em, 'member')
          } catch (err) {
            errors.push(`${em}: ${err instanceof Error ? err.message : 'Failed'}`)
          }
        }
        if (errors.length > 0) {
          setError(errors.join('\n'))
        } else {
          setSuccess(`Invitation${invitedEmails.length > 1 ? 's' : ''} sent.`)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to send invitations')
      } finally {
        setLoading(false)
      }
    }

    navigate('/settings', { replace: true })
  }

  const handleSkip = () => {
    navigate('/settings', { replace: true })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Invite team members</h1>
        <p className="mt-1 text-sm text-slate-600">
          Invite people to join your organisation. You can add more later from settings.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" title="Error">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" title="Saved">
          {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Email invitations</CardTitle>
            <CardDescription>
              Enter email addresses to invite. They will receive an invitation to join.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInvite())}
                  placeholder="colleague@example.com"
                  className="pl-9"
                />
              </div>
              <Button type="button" variant="outline" onClick={handleAddInvite}>
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>

            {invitedEmails.length > 0 && (
              <ul className="space-y-2">
                {invitedEmails.map((em) => (
                  <li
                    key={em}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  >
                    {em}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveInvite(em)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-between">
          <Button type="button" variant="outline" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Continue to settings'}
          </Button>
        </div>
      </form>
    </div>
  )
}
