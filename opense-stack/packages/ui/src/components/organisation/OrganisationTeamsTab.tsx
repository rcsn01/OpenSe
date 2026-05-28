import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/Dialog'
import { Input, Select } from '../ui/Input'
import { EmptyState } from '../ui/EmptyState'
import type { DataTableTopRowConfig } from '../ui/DataTable'
import { OrganisationMembersTable, type OrganisationMembersTableRow } from './OrganisationMembersTable'
import { OrganisationTeamsPage } from './OrganisationTeamsPage'

export type OrganisationTeamsTabMember = {
  id: string
  displayName: string
  subtitle: string
  roleId: string | null
  userId?: string
  initials?: string
}

export type OrganisationTeamsTabRole = {
  id: string
  name: string
}

type OrganisationTeamsTabProps = {
  members: OrganisationTeamsTabMember[]
  roles: OrganisationTeamsTabRole[]
  canManageTeam: boolean
  onRoleChange: (memberId: string, roleId: string) => Promise<void> | void
  isRoleEditable?: (member: OrganisationTeamsTabMember) => boolean
  onInvite?: (email: string, roleId: string) => void
  searchValue?: string
  inviteMessage?: string | null
  roleChangeMessage?: string | null
  emptyStateTitle?: string
  emptyStateDescription?: string
}

export function OrganisationTeamsTab({
  members,
  roles,
  canManageTeam,
  onRoleChange,
  isRoleEditable,
  onInvite,
  searchValue = '',
  inviteMessage,
  roleChangeMessage,
  emptyStateTitle = 'No members',
  emptyStateDescription = 'Invite teammates to get started.',
}: OrganisationTeamsTabProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>(roles[0]?.id ?? '')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    if (roles.length > 0 && !inviteRole) {
      setInviteRole(roles[0].id)
    }
  }, [roles, inviteRole])

  const filteredMembers = useMemo(() => {
    const roleFilteredMembers = roleFilter === 'all'
      ? members
      : members.filter((member) => member.roleId === roleFilter)
    const normalizedSearchValue = searchValue.trim().toLowerCase()

    if (!normalizedSearchValue) {
      return roleFilteredMembers
    }

    return roleFilteredMembers.filter((member) => {
      const roleLabel = roles.find((role) => role.id === member.roleId)?.name ?? member.roleId ?? 'Member'

      return [
        member.displayName,
        member.subtitle,
        roleLabel,
      ].some((value) => value.toLowerCase().includes(normalizedSearchValue))
    })
  }, [members, roleFilter, roles, searchValue])

  const rows: OrganisationMembersTableRow[] = filteredMembers.map((member) => {
    const editable = canManageTeam && (isRoleEditable ? isRoleEditable(member) : true)

    return {
      id: member.id,
      displayName: member.displayName,
      subtitle: member.subtitle,
      initials: member.initials,
      roleSortValue: roles.find((role) => role.id === member.roleId)?.name ?? member.roleId ?? 'Member',
      roleContent: editable ? (
        <Select
          value={member.roleId ?? ''}
          onChange={(event) => {
            void onRoleChange(member.id, event.target.value)
          }}
          options={roles.map((role) => ({ value: role.id, label: role.name }))}
          className="text-xs min-w-40"
        />
      ) : (
        <span className="text-sm text-[var(--color-foreground)]">{roles.find((role) => role.id === member.roleId)?.name ?? member.roleId ?? 'Member'}</span>
      ),
    }
  })

  const filterOptions = [
    { value: 'all', label: 'All' },
    ...roles.map((role) => ({ value: role.id, label: role.name })),
  ]

  const tableTopRow: DataTableTopRowConfig = {
    filters: [
      {
        value: roleFilter,
        options: filterOptions,
        onChange: setRoleFilter,
        ariaLabel: 'Team role filter',
        menuClassName: 'min-w-[180px]',
      },
    ],
    actions: canManageTeam && onInvite
      ? [
          {
            id: 'invite-members',
            label: 'Invite Members',
            icon: <Plus className="h-4 w-4" />,
            variant: 'ghost',
            onClick: () => setIsInviteModalOpen(true),
          },
        ]
      : undefined,
  }

  const handleInviteSubmit = () => {
    if (!onInvite || !inviteEmail || !inviteRole) {
      return
    }

    onInvite(inviteEmail, inviteRole)
    setInviteEmail('')
    setIsInviteModalOpen(false)
  }

  return (
    <>
      <OrganisationTeamsPage
        tableContent={
          <OrganisationMembersTable
            rows={rows}
            topRow={tableTopRow}
            emptyState={<EmptyState title={emptyStateTitle} description={emptyStateDescription} />}
            containerClassName="flex min-h-0 flex-1 overflow-hidden"
          />
        }
      />

      {(roleChangeMessage || inviteMessage) && (
        <div className="px-1 text-sm text-[var(--color-muted-foreground)]">
          {roleChangeMessage ?? inviteMessage}
        </div>
      )}

      <Dialog open={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Add a colleague and assign their initial role.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              Email
              <Input
                className="mt-1"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="colleague@example.com"
              />
            </label>

            <label className="block text-sm font-medium text-[var(--color-foreground)]">
              Role
              <Select
                className="mt-1"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value)}
                options={roles.map((role) => ({ value: role.id, label: role.name }))}
              />
            </label>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsInviteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" className="flex-1" onClick={handleInviteSubmit} disabled={!inviteEmail || !inviteRole}>
                Send Invite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
