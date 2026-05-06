import { useMemo } from 'react'
import {
  OrganisationTeamsTab,
  type OrganisationTeamsTabMember,
  type OrganisationTeamsTabRole,
} from '@repo/ui'
import { fuzzyRankings, fuzzySearchItems } from '../../lib/pageSearch'

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

type SearchableMember = OrganisationTeamsTabMember & {
  roleName: string
}

export const MembersTab = ({
  members,
  roles,
  currentUserId,
  onRoleChange,
  onInvite,
  inviteMessage,
  roleChangeMessage,
  searchTerm = '',
}: {
  members: Member[]
  roles: Role[]
  currentUserId?: string
  onRoleChange: (memberId: string, roleId: string) => Promise<void>
  onInvite: (email: string, roleId: string) => void
  inviteMessage: string | null
  roleChangeMessage: string | null
  searchTerm?: string
}) => {
  const sharedMembers = useMemo<SearchableMember[]>(
    () => members.map((member) => ({
      id: member.id,
      userId: member.user_id,
      displayName: member.profiles?.full_name ?? member.profiles?.username ?? 'Unknown',
      subtitle: member.user_id,
      roleId: member.role_id,
      roleName: member.roles?.name ?? '',
    })),
    [members],
  )

  const filteredMembers = useMemo(
    () => fuzzySearchItems(sharedMembers, searchTerm, [
      {
        key: (member) => member.displayName,
        maxRanking: fuzzyRankings.WORD_STARTS_WITH,
      },
      {
        key: (member) => member.subtitle,
        maxRanking: fuzzyRankings.CONTAINS,
      },
      {
        key: (member) => member.roleName,
        maxRanking: fuzzyRankings.CONTAINS,
      },
    ]),
    [searchTerm, sharedMembers],
  )

  const sharedRoles = useMemo<OrganisationTeamsTabRole[]>(
    () => roles.map((role) => ({
      id: role.id,
      name: role.name,
    })),
    [roles],
  )

  return (
    <OrganisationTeamsTab
      members={filteredMembers}
      roles={sharedRoles}
      canManageTeam={true}
      isRoleEditable={(member) => {
        const rawRoleName = members.find((item) => item.id === member.id)?.roles?.name ?? ''
        return rawRoleName.trim().toLowerCase() !== 'owner' && member.userId !== currentUserId
      }}
      onRoleChange={onRoleChange}
      onInvite={onInvite}
      inviteMessage={inviteMessage}
      roleChangeMessage={roleChangeMessage}
    />
  )
}
