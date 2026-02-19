import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import type { useSuperAdminData } from './useSuperAdminData'

const roleOptions = [
  { value: 'member', label: 'Member' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
]

const actionLabelMap: Record<string, string> = {
  seat_limit_updated: 'Seat limit updated',
  seat_assigned: 'Seat assigned',
  seat_unassigned: 'Seat unassigned',
}

type Props = {
  data: ReturnType<typeof useSuperAdminData>
}

export const OrganisationsTab = ({ data }: Props) => {
  const {
    orgs,
    selectedOrgId,
    setSelectedOrgId,
    onRename,
    onTransferOwner,
    onDeleteOrg,
    orgName,
    setOrgName,
    ownerEmail,
    setOwnerEmail,
    onCreateOrg,
    selectedOrg,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    onInviteMember,
    membersLoading,
    orgMembers,
    onRemoveMember,
    auditLoading,
    auditEvents,
  } = data

  return (
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
  )
}
