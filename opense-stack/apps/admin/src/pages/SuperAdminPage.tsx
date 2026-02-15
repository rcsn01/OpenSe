import { useEffect, useMemo, useState } from 'react'
import {
  BasePage,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  TabBar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import { Building2, ShieldCheck, Users } from 'lucide-react'
import {
  type AdminAuditEventRow,
  changeOrganisationOwner,
  createAdminUser,
  createOrganisationWithOwner,
  deleteAdminUser,
  deleteOrganisation,
  deleteOrganisationMember,
  inviteMemberToOrganisation,
  listAdminAuditEvents,
  listAdminOrgs,
  listAdminUsers,
  listOrganisationMembers,
  renameOrganisation,
  resetAdminUserPassword,
  updateUserProfile,
} from '../api/etlAdmin'
import type { AdminUserRow, MemberRow, OrgRow } from '../api/etlAdmin'
import { getErrorMessage } from '../lib/errors'

const roleOptions = [
  { value: 'member', label: 'Member' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
]

const tabs = [
  { id: 'orgs', label: 'Organisations', icon: <Building2 className="h-4 w-4" /> },
  { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" /> },
]

const actionLabelMap: Record<string, string> = {
  seat_limit_updated: 'Seat limit updated',
  seat_assigned: 'Seat assigned',
  seat_unassigned: 'Seat unassigned',
}

export const SuperAdminPage = () => {
  const [activeTab, setActiveTab] = useState('orgs')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [users, setUsers] = useState<AdminUserRow[]>([])

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [orgMembers, setOrgMembers] = useState<MemberRow[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [auditEvents, setAuditEvents] = useState<AdminAuditEventRow[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  const [orgName, setOrgName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'member'>('member')

  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')

  const selectedOrg = useMemo(
    () => orgs.find((org) => org.id === selectedOrgId) ?? null,
    [orgs, selectedOrgId],
  )

  const adminCount = useMemo(
    () => users.filter((user) => (user.super_admin_members?.length ?? 0) > 0).length,
    [users],
  )

  const loadAll = async () => {
    setLoading(true)
    setError(null)

    try {
      const [nextOrgs, nextUsers] = await Promise.all([listAdminOrgs(), listAdminUsers()])
      setOrgs(nextOrgs)
      setUsers(nextUsers)
      setSelectedOrgId((current) => {
        if (current && nextOrgs.some((org) => org.id === current)) return current
        return nextOrgs[0]?.id ?? null
      })
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, 'Failed to load ETL admin data'))
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async (orgId: string) => {
    setMembersLoading(true)
    try {
      const members = await listOrganisationMembers(orgId)
      setOrgMembers(members)
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, 'Failed to load members'))
      setOrgMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  const loadAuditEvents = async (orgId: string) => {
    setAuditLoading(true)
    try {
      const events = await listAdminAuditEvents(orgId, 20)
      setAuditEvents(events)
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, 'Failed to load audit activity'))
      setAuditEvents([])
    } finally {
      setAuditLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  useEffect(() => {
    if (!selectedOrgId) {
      setOrgMembers([])
      setAuditEvents([])
      return
    }

    void loadMembers(selectedOrgId)
    void loadAuditEvents(selectedOrgId)
  }, [selectedOrgId])

  const notify = (text: string) => {
    setMessage(text)
    setTimeout(() => setMessage(null), 3000)
  }

  const onCreateOrg = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    try {
      await createOrganisationWithOwner(orgName.trim(), ownerEmail.trim())
      setOrgName('')
      setOwnerEmail('')
      await loadAll()
      notify('Organisation created successfully')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to create organisation'))
    }
  }

  const onInviteMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedOrgId) return

    setError(null)
    try {
      await inviteMemberToOrganisation(selectedOrgId, inviteEmail, inviteRole)
      setInviteEmail('')
      await loadMembers(selectedOrgId)
      await loadAll()
      notify('Member added to organisation')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to add member'))
    }
  }

  const onRename = async (orgId: string, nextName: string) => {
    const clean = nextName.trim()
    if (!clean) return

    setError(null)
    try {
      await renameOrganisation(orgId, clean)
      await loadAll()
      notify('Organisation updated')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to update organisation'))
    }
  }

  const onTransferOwner = async (orgId: string) => {
    const email = window.prompt('Enter new owner email')?.trim()
    if (!email) return

    setError(null)
    try {
      await changeOrganisationOwner(orgId, email)
      await loadAll()
      notify('Organisation owner changed')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to transfer ownership'))
    }
  }

  const onDeleteOrg = async (orgId: string) => {
    if (!window.confirm('Delete this organisation?')) return

    setError(null)
    try {
      await deleteOrganisation(orgId)
      await loadAll()
      notify('Organisation deleted')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to delete organisation'))
    }
  }

  const onRemoveMember = async (memberId: string) => {
    if (!selectedOrgId) return

    setError(null)
    try {
      await deleteOrganisationMember(memberId)
      await loadMembers(selectedOrgId)
      await loadAll()
      notify('Member removed')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to remove member'))
    }
  }

  const onCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    try {
      await createAdminUser(newUserEmail.trim(), newUserPassword, newUserName.trim())
      setNewUserEmail('')
      setNewUserName('')
      setNewUserPassword('')
      await loadAll()
      notify('User created')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to create user'))
    }
  }

  const onResetPassword = async (userId: string) => {
    const password = window.prompt('Enter new password')
    if (!password) return

    setError(null)
    try {
      await resetAdminUserPassword(userId, password)
      notify('Password reset')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to reset password'))
    }
  }

  const onDeleteUser = async (userId: string) => {
    if (!window.confirm('Delete this user account?')) return

    setError(null)
    try {
      await deleteAdminUser(userId)
      await loadAll()
      notify('User deleted')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to delete user'))
    }
  }

  const onRenameUser = async (userId: string, fullName: string) => {
    setError(null)
    try {
      const nextName = fullName.trim()
      await updateUserProfile(userId, { full_name: nextName || undefined })
      await loadAll()
      notify('User updated')
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Failed to update user'))
    }
  }

  return (
    <BasePage isLoading={loading} loadingMessage="Loading ETL admin...">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">ETL Super Admin</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Manage ETL organisations, members, and users.</p>
        </div>

        {error && (
          <Card className="border-[var(--color-destructive)]/30">
            <CardContent>
              <p className="text-sm text-[var(--color-destructive)]">{error}</p>
            </CardContent>
          </Card>
        )}

        {message && (
          <Card className="border-[var(--color-primary)]/30">
            <CardContent>
              <p className="text-sm text-[var(--color-primary)]">{message}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent>
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Organisations</p>
              <p className="text-2xl font-semibold mt-1">{orgs.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Users</p>
              <p className="text-2xl font-semibold mt-1">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Super Admins</p>
              <p className="text-2xl font-semibold mt-1 flex items-center gap-2"><ShieldCheck className="h-5 w-5" />{adminCount}</p>
            </CardContent>
          </Card>
        </div>

        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'orgs' ? (
          <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Organisations</CardTitle>
                <CardDescription>Rename, transfer ownership, delete, and select for member management.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgs.map((org) => (
                      <TableRow key={org.id} className={selectedOrgId === org.id ? 'bg-[var(--color-muted)]/40' : ''}>
                        <TableCell>
                          <button
                            type="button"
                            className="text-left font-medium hover:underline"
                            onClick={() => setSelectedOrgId(org.id)}
                          >
                            {org.name}
                          </button>
                        </TableCell>
                        <TableCell>{org.owner?.email ?? '—'}</TableCell>
                        <TableCell>{org.member_count ?? 0}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => onRename(org.id, window.prompt('New organisation name', org.name) ?? org.name)}>
                              Rename
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onTransferOwner(org.id)}>
                              Transfer
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => onDeleteOrg(org.id)}>
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Create Organisation</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="flex flex-col gap-3" onSubmit={onCreateOrg}>
                    <Input
                      value={orgName}
                      onChange={(event) => setOrgName(event.target.value)}
                      placeholder="Organisation name"
                      required
                    />
                    <Input
                      type="email"
                      value={ownerEmail}
                      onChange={(event) => setOwnerEmail(event.target.value)}
                      placeholder="Owner email"
                      required
                    />
                    <Button type="submit">Create</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Organisation Members</CardTitle>
                  <CardDescription>{selectedOrg ? selectedOrg.name : 'Select an organisation'}</CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedOrg ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">Select an organisation first.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <form className="grid gap-2 md:grid-cols-[1fr_140px_auto]" onSubmit={onInviteMember}>
                        <Input
                          type="email"
                          value={inviteEmail}
                          onChange={(event) => setInviteEmail(event.target.value)}
                          placeholder="Member email"
                          required
                        />
                        <Select
                          value={inviteRole}
                          options={roleOptions}
                          onChange={(event) => setInviteRole(event.target.value as 'admin' | 'editor' | 'member')}
                        />
                        <Button type="submit">Add</Button>
                      </form>

                      {membersLoading ? (
                        <p className="text-sm text-[var(--color-muted-foreground)]">Loading members...</p>
                      ) : orgMembers.length === 0 ? (
                        <p className="text-sm text-[var(--color-muted-foreground)]">No members yet.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orgMembers.map((member) => (
                              <TableRow key={member.id}>
                                <TableCell>{member.profiles?.email ?? member.user_id}</TableCell>
                                <TableCell>{member.role}</TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="outline" onClick={() => onRemoveMember(member.id)}>
                                    Remove
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>{selectedOrg ? `Latest events for ${selectedOrg.name}` : 'Select an organisation'}</CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedOrg ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">Select an organisation first.</p>
                  ) : auditLoading ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">Loading activity...</p>
                  ) : auditEvents.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">No recent activity.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {auditEvents.map((event) => (
                        <div key={event.id} className="rounded-md border border-[var(--color-border)] p-2">
                          <p className="text-sm font-medium">
                            {actionLabelMap[event.action] ?? event.action}
                            {event.app_code ? ` (${event.app_code.toUpperCase()})` : ''}
                          </p>
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            {event.actor_email ?? 'Unknown actor'} • {new Date(event.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
            <Card>
              <CardHeader>
                <CardTitle>Create User</CardTitle>
                <CardDescription>Provision a platform user via secure admin function.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-3" onSubmit={onCreateUser}>
                  <Input
                    value={newUserName}
                    onChange={(event) => setNewUserName(event.target.value)}
                    placeholder="Full name"
                    required
                  />
                  <Input
                    type="email"
                    value={newUserEmail}
                    onChange={(event) => setNewUserEmail(event.target.value)}
                    placeholder="Email"
                    required
                  />
                  <Input
                    type="password"
                    value={newUserPassword}
                    onChange={(event) => setNewUserPassword(event.target.value)}
                    placeholder="Temporary password"
                    required
                  />
                  <Button type="submit">Create User</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Directory</CardTitle>
                <CardDescription>Manage profile names and access.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Memberships</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.full_name ?? '—'}</TableCell>
                        <TableCell>{user.email ?? '—'}</TableCell>
                        <TableCell>{(user.memberships ?? []).length}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const nextName = window.prompt('Full name', user.full_name ?? '')
                                if (typeof nextName === 'string') {
                                  void onRenameUser(user.id, nextName)
                                }
                              }}
                            >
                              Rename
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onResetPassword(user.id)}>
                              Reset Password
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => onDeleteUser(user.id)}>
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </BasePage>
  )
}
