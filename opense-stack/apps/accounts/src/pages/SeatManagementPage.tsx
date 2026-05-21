import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-heading)]">Seat Assignments</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">Assign ETL and StoQR subscription seats to members in your organisation.</p>
      </div>

      {error ? <Alert variant="destructive" title="Seat management failed">{error}</Alert> : null}
      {success ? <Alert variant="success" title="Saved">{success}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Invite members</CardTitle>
          <CardDescription>Invitations create pending organisation memberships. Seats can be assigned after members accept.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
          <CardDescription>Cancel invitations that have not been accepted.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
              <Spinner size="sm" />
              Loading invitations...
            </div>
          ) : pendingInvites.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No pending invitations.</p>
          ) : (
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvites.map((invite) => {
                    const key = `invite:${invite.id}`
                    return (
                      <TableRow key={invite.id}>
                        <TableCell>
                          <span className="font-medium text-[var(--color-heading)]">{invite.email}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-[var(--color-muted-foreground)]">{new Date(invite.createdAt).toLocaleDateString()}</span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            disabled={savingKey === key || !canManage}
                            onClick={() => {
                              void handleCancelInvite(invite)
                            }}
                          >
                            {savingKey === key ? 'Cancelling...' : 'Cancel'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organisation members</CardTitle>
          <CardDescription>Owner and admins can assign seats. Owner controls seat limits in Billing & Limits.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
              <Spinner size="sm" />
              Loading members...
            </div>
          ) : (
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>ETL</TableHead>
                    <TableHead>StoQR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.orgMemberId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-[var(--color-heading)]">{member.fullName ?? 'Unnamed user'}</span>
                          <span className="text-xs text-[var(--color-muted-foreground)]">{member.email ?? member.userId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">{member.role}</Badge>
                      </TableCell>
                      {appCodes.map((appCode) => {
                        const assigned = member.assignedApps.includes(appCode)
                        const key = `${member.orgMemberId}:${appCode}`
                        return (
                          <TableCell key={appCode}>
                            <Button
                              variant={assigned ? 'outline' : 'primary'}
                              disabled={savingKey === key || !canManage}
                              onClick={() => {
                                void handleToggleSeat(member, appCode)
                              }}
                            >
                              {savingKey === key ? 'Saving...' : assigned ? 'Remove' : 'Assign'}
                            </Button>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
