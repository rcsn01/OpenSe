import { useEffect, useState } from 'react'
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
} from '@repo/ui'
import { assignSeat, getSeatAssignmentSnapshot, unassignSeat, type SeatMember } from '../api/seatAssignments'
import type { AppCode } from '../api/organisationBilling'

const appCodes: AppCode[] = ['etl', 'stoqr']

export const SeatManagementPage = () => {
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [members, setMembers] = useState<SeatMember[]>([])

  const loadMembers = async () => {
    try {
      setLoading(true)
      setError(null)
      const snapshot = await getSeatAssignmentSnapshot()
      setMembers(snapshot.members)
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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Seat Assignments</h1>
        <p className="text-sm text-slate-600">Assign ETL and StoQR subscription seats to members in your organisation.</p>
      </div>

      {error ? <Alert variant="destructive" title="Seat assignment failed">{error}</Alert> : null}
      {success ? <Alert variant="success" title="Saved">{success}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Organisation members</CardTitle>
          <CardDescription>Owner and admins can assign seats. Owner controls seat limits in Billing & Limits.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
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
                          <span className="font-medium text-slate-900">{member.fullName ?? 'Unnamed user'}</span>
                          <span className="text-xs text-slate-500">{member.email ?? member.userId}</span>
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
                              disabled={savingKey === key}
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
