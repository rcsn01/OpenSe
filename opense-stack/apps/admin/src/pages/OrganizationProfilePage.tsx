import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  BasePage,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  TabBar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import { listAdminAuditEvents, listAdminOrgs } from '../api/etlAdmin'
import { getErrorMessage } from '../lib/errors'
import {
  listOrgMemberSeatAssignments,
  listOrgSeatSummary,
  updateOrgSeatLimits,
  type AdminOrgMemberSeatAssignmentRow,
} from '../api/adminPlatform'
import type { OrgDetailTabId } from '../types/admin-tabs'

const profileTabs: Array<{ id: OrgDetailTabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'subscriptions', label: 'Subscriptions & Seats' },
  { id: 'etl-config', label: 'App 1 Configuration' },
  { id: 'stoqr-config', label: 'App 2 Configuration' },
  { id: 'users', label: 'Users' },
  { id: 'billing', label: 'Billing & Invoices' },
]

export const OrganizationProfilePage = () => {
  const { orgId, tab } = useParams<{ orgId: string; tab?: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [seatsLoading, setSeatsLoading] = useState(false)
  const [savingSeats, setSavingSeats] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const activeTab: OrgDetailTabId =
    tab === 'subscriptions' || tab === 'etl-config' || tab === 'stoqr-config' || tab === 'users' || tab === 'billing' ? tab : 'overview'
  const [app1SeatLimit, setApp1SeatLimit] = useState('0')
  const [app2SeatLimit, setApp2SeatLimit] = useState('0')
  const [app1UsedSeats, setApp1UsedSeats] = useState(0)
  const [app2UsedSeats, setApp2UsedSeats] = useState(0)
  const [members, setMembers] = useState<AdminOrgMemberSeatAssignmentRow[]>([])
  const [auditEvents, setAuditEvents] = useState<Array<{ id: string; action: string; created_at: string }>>([])
  const [selectedOrg, setSelectedOrg] = useState<Awaited<ReturnType<typeof listAdminOrgs>>[number] | null>(null)

  useEffect(() => {
    if (!message) return
    const timeout = window.setTimeout(() => setMessage(null), 3000)
    return () => window.clearTimeout(timeout)
  }, [message])

  const loadSeatAndMemberData = async (targetOrgId: string) => {
    setSeatsLoading(true)
    try {
      const [seatRows, memberRows, events] = await Promise.all([
        listOrgSeatSummary(targetOrgId),
        listOrgMemberSeatAssignments(targetOrgId),
        listAdminAuditEvents(targetOrgId, 12),
      ])
      const etl = seatRows.find((row) => row.app_code === 'etl')
      const stoqr = seatRows.find((row) => row.app_code === 'stoqr')
      setApp1SeatLimit(String(etl?.seat_limit ?? 0))
      setApp2SeatLimit(String(stoqr?.seat_limit ?? 0))
      setApp1UsedSeats(etl?.assigned_seats ?? 0)
      setApp2UsedSeats(stoqr?.assigned_seats ?? 0)
      setMembers(memberRows)
      setAuditEvents(events.map((event) => ({ id: event.id, action: event.action, created_at: event.created_at })))
    } finally {
      setSeatsLoading(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      if (!orgId) return

      setLoading(true)
      setError(null)
      try {
        const orgs = await listAdminOrgs()
        const org = orgs.find((entry) => entry.id === orgId) ?? null
        setSelectedOrg(org)

        if (!org) {
          setError('Organization not found')
          return
        }

        await loadSeatAndMemberData(org.id)
      } catch (loadError: unknown) {
        setError(getErrorMessage(loadError, 'Failed to load organization profile'))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [orgId])

  const saveSeatLimits = async () => {
    if (!selectedOrg) return

    setSavingSeats(true)
    setError(null)
    try {
      await updateOrgSeatLimits(
        selectedOrg.id,
        Math.max(0, Number(app1SeatLimit) || 0),
        Math.max(0, Number(app2SeatLimit) || 0),
      )
      await loadSeatAndMemberData(selectedOrg.id)
      setMessage('Seat limits updated')
    } catch (saveError: unknown) {
      setError(getErrorMessage(saveError, 'Failed to update seat limits'))
    } finally {
      setSavingSeats(false)
    }
  }

  const usersTableRows = useMemo(
    () =>
      members.map((member) => {
        const assignedApps = member.app_codes
          .map((code) => (code === 'stoqr' ? 'App 2' : 'App 1'))
          .join(' + ')
        return {
          id: member.org_member_id,
          name: member.full_name ?? member.email ?? member.user_id,
          email: member.email ?? 'No email',
          role: member.role,
          seats: assignedApps || '—',
        }
      }),
    [members],
  )

  return (
    <BasePage isLoading={loading} loadingMessage="Loading organization profile...">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Organization Profile</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">{selectedOrg?.name ?? 'Select an organization'}</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/organisations')}>Back to Organizations List</Button>
        </div>

        {error ? (
          <Card className="border-[var(--color-destructive)]/30">
            <CardContent>
              <p className="text-sm text-[var(--color-destructive)]">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        {message ? (
          <Card className="border-[var(--color-primary)]/30">
            <CardContent>
              <p className="text-sm text-[var(--color-primary)]">{message}</p>
            </CardContent>
          </Card>
        ) : null}

        <TabBar
          tabs={profileTabs}
          activeTab={activeTab}
          bottomSpacing
          onTabChange={(nextTab) => {
            if (!orgId) return
            navigate(`/organisations/${orgId}/${nextTab}`)
          }}
        />

        {activeTab === 'overview' ? (
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-[var(--color-muted-foreground)]">Contact details:</span> {selectedOrg?.owner?.full_name ?? selectedOrg?.owner?.email ?? '—'}</p>
              <p><span className="text-[var(--color-muted-foreground)]">Primary admin:</span> {selectedOrg?.owner?.email ?? '—'}</p>
              <p><span className="text-[var(--color-muted-foreground)]">Account created:</span> {selectedOrg?.created_at ? new Date(selectedOrg.created_at).toLocaleDateString() : '—'}</p>
              <p><span className="text-[var(--color-muted-foreground)]">Account status:</span> {selectedOrg?.status === 'suspended' ? 'Suspended' : 'Active'}</p>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === 'subscriptions' ? (
          <Card>
            <CardHeader>
              <CardTitle>Subscriptions & Seats</CardTitle>
              <CardDescription>{seatsLoading ? 'Refreshing seat allocations...' : 'Adjust seat allocations per app.'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border border-[var(--color-border)] p-3">
                <p className="text-sm font-medium">App 1 Plan</p>
                <p className="text-xs text-[var(--color-muted-foreground)] mb-2">Current plan tier: Standard • Allocated seats: {app1SeatLimit} • Used seats: {app1UsedSeats}</p>
                <Input value={app1SeatLimit} onChange={(event) => setApp1SeatLimit(event.target.value)} />
              </div>

              <div className="rounded-md border border-[var(--color-border)] p-3">
                <p className="text-sm font-medium">App 2 Plan</p>
                <p className="text-xs text-[var(--color-muted-foreground)] mb-2">Current plan tier: Standard • Allocated seats: {app2SeatLimit} • Used seats: {app2UsedSeats}</p>
                <Input value={app2SeatLimit} onChange={(event) => setApp2SeatLimit(event.target.value)} />
              </div>

              <Button disabled={savingSeats} onClick={() => {
                void saveSeatLimits()
              }}>{savingSeats ? 'Saving...' : 'Save Seat Limits'}</Button>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === 'etl-config' ? (
          <Card>
            <CardHeader>
              <CardTitle>App 1 Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Org-specific App 1 settings placeholder:</p>
              <p>- Custom branding</p>
              <p>- Feature toggles</p>
              <p>- API keys</p>
              <p>- Integrations enabled for this org</p>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === 'stoqr-config' ? (
          <Card>
            <CardHeader>
              <CardTitle>App 2 Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Org-specific App 2 settings placeholder:</p>
              <p>- Data retention limits</p>
              <p>- Custom workflows</p>
              <p>- App-specific permissions</p>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === 'users' ? (
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Users in this organization and app seat assignments.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned Apps</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersTableRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.role}</TableCell>
                      <TableCell>{row.seats}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {usersTableRows.length === 0 ? <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">No users found.</p> : null}
            </CardContent>
          </Card>
        ) : null}

        {activeTab === 'billing' ? (
          <Card>
            <CardHeader>
              <CardTitle>Billing & Invoices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-[var(--color-muted-foreground)]">Payment method on file:</span> Coming soon</p>
              <p><span className="text-[var(--color-muted-foreground)]">Billing history:</span> Coming soon</p>
              <p><span className="text-[var(--color-muted-foreground)]">Upcoming invoice previews:</span> Coming soon</p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {auditEvents.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">No recent activity.</p>
            ) : (
              auditEvents.map((event) => (
                <div key={event.id} className="rounded-md border border-[var(--color-border)] p-3">
                  <p className="text-sm font-medium">{event.action}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">{new Date(event.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </BasePage>
  )
}
