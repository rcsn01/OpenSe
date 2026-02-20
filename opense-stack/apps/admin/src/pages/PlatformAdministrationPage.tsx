import { useEffect, useState } from 'react'
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
import { listAdminAuditEvents, listAdminUsers, type AdminAuditEventRow, type AdminUserRow } from '../api/etlAdmin'
import { getErrorMessage } from '../lib/errors'
import { listPlatformAuditEvents, type PlatformAuditEventRow } from '../api/adminPlatform'
import type { PlatformAdminTabId } from '../types/admin-tabs'

const tabs: Array<{ id: PlatformAdminTabId; label: string }> = [
  { id: 'team', label: 'Admin Team' },
  { id: 'roles', label: 'Roles & Permissions' },
  { id: 'audit', label: 'Global Audit Logs' },
]

type RolePolicy = {
  id: string
  role: string
  canViewOrgConfig: boolean
  canChangeSeats: boolean
  canChangeGlobalPricing: boolean
  canChangeFeatureFlags: boolean
}

const defaultPolicies: RolePolicy[] = [
  {
    id: 'r1',
    role: 'Support',
    canViewOrgConfig: true,
    canChangeSeats: false,
    canChangeGlobalPricing: false,
    canChangeFeatureFlags: false,
  },
  {
    id: 'r2',
    role: 'Sales',
    canViewOrgConfig: true,
    canChangeSeats: true,
    canChangeGlobalPricing: false,
    canChangeFeatureFlags: false,
  },
  {
    id: 'r3',
    role: 'Engineering',
    canViewOrgConfig: true,
    canChangeSeats: true,
    canChangeGlobalPricing: false,
    canChangeFeatureFlags: true,
  },
]

export const PlatformAdministrationPage = () => {
  const [activeTab, setActiveTab] = useState<PlatformAdminTabId>('team')
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [auditEvents, setAuditEvents] = useState<AdminAuditEventRow[]>([])
  const [platformAuditEvents, setPlatformAuditEvents] = useState<PlatformAuditEventRow[]>([])
  const [policies] = useState<RolePolicy[]>(defaultPolicies)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')

  useEffect(() => {
    if (!error) return
    const timeout = window.setTimeout(() => setError(null), 3000)
    return () => window.clearTimeout(timeout)
  }, [error])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [nextUsers, nextAudit, nextPlatformAudit] = await Promise.all([
          listAdminUsers(),
          listAdminAuditEvents(null, 50),
          listPlatformAuditEvents(100),
        ])
        setUsers(nextUsers)
        setAuditEvents(nextAudit)
        setPlatformAuditEvents(nextPlatformAudit)
      } catch (loadError: unknown) {
        setError(getErrorMessage(loadError, 'Failed to load platform administration data'))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  return (
    <BasePage isLoading={loading} loadingMessage="Loading platform administration...">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Platform Administration</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Manage admin access, RBAC scaffolding, and immutable audit visibility for the suite.
          </p>
        </div>

        {error ? (
          <Card className="border-[var(--color-destructive)]/30">
            <CardContent>
              <p className="text-sm text-[var(--color-destructive)]">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as PlatformAdminTabId)} />

        {activeTab === 'team' ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
            <Card>
              <CardHeader>
                <CardTitle>Invite Admin</CardTitle>
                <CardDescription>Invite developers, support, and sales staff to this dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="email"
                  placeholder="admin@company.com"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />
                <Button disabled>Send Invite</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Admin Team</CardTitle>
                <CardDescription>Super-admin users currently recognized by platform controls.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.full_name ?? 'No name'}</TableCell>
                        <TableCell>{user.email ?? 'No email'}</TableCell>
                        <TableCell>{(user.super_admin_members?.length ?? 0) > 0 ? 'Super Admin' : 'User'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === 'roles' ? (
          <Card>
            <CardHeader>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>
                RBAC scaffold preview for future delegated roles. Current enforcement remains super-admin only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>View Org Config</TableHead>
                    <TableHead>Change Seats</TableHead>
                    <TableHead>Change Global Pricing</TableHead>
                    <TableHead>Change Feature Flags</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">{policy.role}</TableCell>
                      <TableCell>{policy.canViewOrgConfig ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{policy.canChangeSeats ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{policy.canChangeGlobalPricing ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{policy.canChangeFeatureFlags ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" disabled>
                          Preview Only
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === 'audit' ? (
          <Card>
            <CardHeader>
              <CardTitle>Global Audit Logs</CardTitle>
              <CardDescription>Uneditable timeline of administrative actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {platformAuditEvents.length === 0 && auditEvents.length === 0 ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">No audit events available.</p>
              ) : (
                <>
                  {platformAuditEvents.map((event) => (
                    <div key={event.id} className="rounded-md border border-[var(--color-border)] p-3">
                      <p className="text-sm font-medium">{event.action}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {event.actor_email ?? 'Unknown actor'} • Platform • {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}

                  {auditEvents.slice(0, 20).map((event) => (
                    <div key={event.id} className="rounded-md border border-[var(--color-border)] p-3">
                      <p className="text-sm font-medium">{event.action}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {event.actor_email ?? 'Unknown actor'} • {event.org_name} • {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </BasePage>
  )
}
