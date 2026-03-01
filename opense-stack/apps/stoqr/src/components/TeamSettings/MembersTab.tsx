import {
  OrganisationTeamsTab,
  type OrganisationTeamsTabMember,
  type OrganisationTeamsTabRole,
} from '@repo/ui'

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

export const MembersTab = ({
  members,
  roles,
  onRoleChange,
  onInvite,
  inviteMessage,
  roleChangeMessage,
}: {
  members: Member[]
  roles: Role[]
  onRoleChange: (memberId: string, roleId: string) => Promise<void>
  onInvite: (email: string, roleId: string) => void
  inviteMessage: string | null
  roleChangeMessage: string | null
}) => {
  const sharedMembers: OrganisationTeamsTabMember[] = members.map((member) => ({
    id: member.id,
    displayName: member.profiles?.full_name ?? member.profiles?.username ?? 'Unknown',
    subtitle: member.user_id,
    roleId: member.role_id,
  }))

  const sharedRoles: OrganisationTeamsTabRole[] = roles.map((role) => ({
    id: role.id,
    name: role.name,
  }))

  return (
      <OrganisationTeamsTab
        members={sharedMembers}
        roles={sharedRoles}
        canManageTeam={true}
        onRoleChange={onRoleChange}
        onInvite={onInvite}
        inviteMessage={inviteMessage}
        roleChangeMessage={roleChangeMessage}
      />
  )
}
