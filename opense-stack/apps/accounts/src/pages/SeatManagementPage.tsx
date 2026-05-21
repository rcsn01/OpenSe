import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  DataTable,
  Textarea,
  type DataTableColumn,
} from '@repo/ui'
import {
  assignSeat,
  cancelSeatInvite,
  getSeatAssignmentSnapshot,
  inviteSeatMembers,
  unassignSeat,
  type PendingSeatInvite,
  type SeatMember,
  type SeatMemberRole,
} from '../api/seatAssignments'
import type { AppCode } from '../api/organisationBilling'
import { AccountsPageShell, AccountsSection } from '../components/AccountsPageShell'

const appCodes: AppCode[] = ['etl', 'stoqr']

const parseEmailList = (value: string): string[] => {
  return value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

export const SeatManagementPage = () => {
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const [inviteInput, setInviteInput] = useState('')
  const [orgId, setOrgId] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<SeatMemberRole | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [members, setMembers] = useState<SeatMember[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingSeatInvite[]>([])

  const canManage = useMemo(() => currentRole === 'owner' || currentRole === 'admin', [currentRole])

  const inviteColumns: Array<DataTableColumn<PendingSeatInvite>> = [
    {
      id: 'email',
      header: 'Email',
      renderCell: (invite) => <span className="font-medium text-[var(--color-heading)]">{invite.email}</span>,
    },
    {
      id: 'created',
      header: 'Created',
      renderCell: (invite) => <span className="text-sm text-[var(--color-muted-foreground)]">{new Date(invite.createdAt).toLocaleDateString()}</span>,
    },
    {
      id: 'action',
      header: 'Action',
      renderCell: (invite) => {
        const key = `invite:${invite.id}`
        return (
          <Button
            variant="outline"
            size="sm"
            disabled={savingKey === key || !canManage}
            onClick={() => {
              void handleCancelInvite(invite)
            }}
          >
            {savingKey === key ? 'Cancelling...' : 'Cancel'}
          </Button>
        )
      },
    },
  ]

  const memberColumns: Array<DataTableColumn<SeatMember>> = [
    {
      id: 'member',
      header: 'Member',
      renderCell: (member) => (
        <div className="flex flex-col">
          <span className="font-medium text-[var(--color-heading)]">{member.fullName ?? 'Unnamed user'}</span>
          <span className="text-xs text-[var(--color-muted-foreground)]">{member.email ?? member.userId}</span>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      renderCell: (member) => <Badge variant="neutral">{member.role}</Badge>,
    },
    ...appCodes.map((appCode): DataTableColumn<SeatMember> => ({
      id: appCode,
      header: appCode.toUpperCase(),
      renderCell: (member) => {
        const assigned = member.assignedApps.includes(appCode)
        const key = `${member.orgMemberId}:${appCode}`
        return (
          <Button
            variant={assigned ? 'outline' : 'primary'}
            size="sm"
            disabled={savingKey === key || !canManage}
            onClick={() => {
              void handleToggleSeat(member, appCode)
            }}
          >
            {savingKey === key ? 'Saving...' : assigned ? 'Remove' : 'Assign'}
          </Button>
        )
      },
    })),
  ]

  const loadMembers = async () => {
    try {
      setLoading(true)
      setError(null)
      const snapshot = await getSeatAssignmentSnapshot()
      setOrgId(snapshot.orgId)
      setCurrentRole(snapshot.currentRole)
      setMembers(snapshot.members)
      setPendingInvites(snapshot.pendingInvites)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load seat assignments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMembers()
  }, [])

  const handleToggleSeat = async (member: SeatMember, appCode: AppCode) => {
    if (!canManage) {
      return
    }

    const currentlyAssigned = member.assignedApps.includes(appCode)
    const actionKey = `${member.orgMemberId}:${appCode}`

    try {
      setSavingKey(actionKey)
      setError(null)
      setSuccess(null)

      if (currentlyAssigned) {
        await unassignSeat(member.orgMemberId, appCode)
      } else {
        await assignSeat(member.orgMemberId, appCode)
      }

      setSuccess(`${currentlyAssigned ? 'Removed' : 'Assigned'} ${appCode.toUpperCase()} seat for ${member.fullName ?? member.email ?? 'user'}.`)
      await loadMembers()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update seat assignment.')
    } finally {
      setSavingKey(null)
    }
  }

  const handleSendInvites = async () => {
    const emails = parseEmailList(inviteInput)

    if (!orgId) {
      setError('No organisation context found.')
      return
    }

    if (emails.length === 0) {
      setError('Enter at least one email address to invite.')
      return
    }

    try {
      setInviting(true)
      setError(null)
      setSuccess(null)
      await inviteSeatMembers(orgId, emails)
      setSuccess(`Created ${emails.length} pending invitation${emails.length > 1 ? 's' : ''}.`)
      setInviteInput('')
      await loadMembers()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to invite members.')
    } finally {
      setInviting(false)
    }
  }

  const handleCancelInvite = async (invite: PendingSeatInvite) => {
    if (!orgId) {
      setError('No organisation context found.')
      return
    }

    try {
      setSavingKey(`invite:${invite.id}`)
      setError(null)
      setSuccess(null)
      await cancelSeatInvite(orgId, invite.id)
      setSuccess(`Cancelled invitation for ${invite.email}.`)
      await loadMembers()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to cancel invitation.')
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <AccountsPageShell
      title="Seat Assignments"
      description="Invite members and assign ETL and StoQR subscription seats in your organisation."
      loading={loading}
      loadingLabel="Loading seat assignments..."
      alert={
        <>
          {error ? <Alert variant="destructive" title="Seat management failed">{error}</Alert> : null}
          {success ? <Alert variant="success" title="Saved">{success}</Alert> : null}
        </>
      }
    >
      <div className="grid gap-5">
        {!canManage ? (
          <Alert variant="info" title="Read-only seat access">Your role does not allow inviting members or assigning seats.</Alert>
        ) : null}

        <AccountsSection title="Invite members" description="Invitations create pending organisation memberships. Seats can be assigned after members accept.">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-body)]" htmlFor="seat-invite-emails">
              Invite emails
            </label>
            <Textarea
              id="seat-invite-emails"
              value={inviteInput}
              onChange={(event) => setInviteInput(event.target.value)}
              placeholder="name@company.com, another@company.com"
              disabled={loading || inviting || !canManage}
            />
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {canManage ? 'Separate multiple emails with commas or new lines.' : 'Your role does not allow inviting members.'}
            </p>
          </div>
          <Button
            disabled={loading || inviting || !canManage}
            onClick={() => {
              void handleSendInvites()
            }}
          >
            {inviting ? 'Sending...' : 'Send invitations'}
          </Button>
        </AccountsSection>

        <AccountsSection title="Pending invitations" description="Cancel invitations that have not been accepted.">
          <DataTable
            variant="operational"
            rows={pendingInvites}
            columns={inviteColumns}
            getRowId={(invite) => invite.id}
            emptyState="No pending invitations."
            minTableWidth="42rem"
          />
        </AccountsSection>

        <AccountsSection title="Organisation members" description="Owners and admins can assign seats. Seat limits are managed in Billing.">
          <DataTable
            variant="operational"
            rows={members}
            columns={memberColumns}
            getRowId={(member) => member.orgMemberId}
            emptyState="No organisation members found."
            minTableWidth="48rem"
          />
        </AccountsSection>
      </div>
    </AccountsPageShell>
  )
}
