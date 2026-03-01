import { useEffect, useState } from 'react'
import { EmptyState } from '../EmptyState'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  OrganisationMembersTable,
  OrganisationTeamsPage,
  Select,
  Button,
  type OrganisationMembersTableRow,
} from '@repo/ui'
import { UserPlus } from 'lucide-react'

type Member = {
  id: string
  user_id: string
  role_id: string | null
  joined_at: string
  profiles?: { id: string; full_name: string | null; username: string | null; avatar_url: string | null }
  roles?: { id: string; name: string }
}

type Role = {
  id: string
  name: string
  description: string | null
}

type Invitation = {
  id: string
  email: string
  role_id: string | null
  accepted_at: string | null
  created_at: string
  roles?: { id: string; name: string } | null
}

export const MembersTab = ({
  members,
  roles,
  onRoleChange,
  onInvite,
  inviteMessage,
  invitations,
}: {
  members: Member[]
  roles: Role[]
  onRoleChange: (memberId: string, roleId: string) => void
  onInvite: (email: string, roleId: string) => void
  inviteMessage: string | null
  invitations: Invitation[]
}) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>(roles[0]?.id ?? '')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    if (roles.length > 0 && !inviteRole) {
      setInviteRole(roles[0].id)
    }
  }, [roles, inviteRole])

  const handleInviteSubmit = () => {
    onInvite(inviteEmail, inviteRole)
    setInviteEmail('')
    setIsInviteModalOpen(false)
  }

  const filteredMembers = members.filter((member) => {
    if (roleFilter === 'all') return true
    return member.role_id === roleFilter
  })

  const rows: OrganisationMembersTableRow[] = filteredMembers.map((member) => ({
    id: member.id,
    displayName: member.profiles?.full_name ?? member.profiles?.username ?? 'Unknown',
    subtitle: member.user_id,
    roleContent: (
      <Select
        value={member.role_id ?? ''}
        onChange={(event) => onRoleChange(member.id, event.target.value)}
        options={roles.map((role) => ({ value: role.id, label: role.name }))}
        className="text-xs min-w-40"
      />
    ),
  }))

  const filterOptions = [
    { value: 'all', label: 'All Roles' },
    ...roles.map((role) => ({ value: role.id, label: role.name })),
  ]

  return (
    <>
      <OrganisationTeamsPage
        filterValue={roleFilter}
        onFilterChange={setRoleFilter}
        filterOptions={filterOptions}
        canManageTeam={true}
        onInviteClick={() => setIsInviteModalOpen(true)}
        inviteLabel="Invite Member"
        inviteIcon={<UserPlus className="w-4 h-4 mr-2" />}
        tableContent={
          rows.length === 0 ? (
            <div className="p-12">
              <EmptyState title="No members" description="Invite teammates to get started." />
            </div>
          ) : (
            <OrganisationMembersTable rows={rows} />
          )
        }
        secondaryContent={
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Pending Invitations</h3>
            {invitations.filter((invite) => !invite.accepted_at).length === 0 ? (
              <EmptyState title="No pending invites" description="Invitations will appear here until accepted." />
            ) : (
              <div className="space-y-2">
                {invitations
                  .filter((invite) => !invite.accepted_at)
                  .slice(0, 20)
                  .map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between border border-slate-100 rounded-lg p-2">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{invite.email}</div>
                        <div className="text-xs text-slate-500">{invite.roles?.name ?? 'Role pending'} · {new Date(invite.created_at).toLocaleDateString()}</div>
                      </div>
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">Pending</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        }
      />

      <Dialog open={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Add a colleague and assign their initial role.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Email
              <Input
                className="mt-1"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="colleague@example.com"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Role
              <Select
                className="mt-1"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value)}
                options={roles.map((role) => ({ value: role.id, label: role.name }))}
              />
            </label>

            {inviteMessage && <p className="text-sm text-slate-600">{inviteMessage}</p>}

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsInviteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" className="flex-1" onClick={handleInviteSubmit} disabled={!inviteEmail}>
                Send Invite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
