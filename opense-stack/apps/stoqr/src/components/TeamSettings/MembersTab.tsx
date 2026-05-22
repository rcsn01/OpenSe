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
  roleChangeMessage,
  canManage = false,
  searchTerm = '',
}: {
  members: Member[]
  roles: Role[]
  currentUserId?: string
  onRoleChange: (memberId: string, roleId: string) => Promise<void>
  roleChangeMessage: string | null
  canManage?: boolean
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
      canManageTeam={canManage}
      isRoleEditable={(member) => {
        const rawRoleName = members.find((item) => item.id === member.id)?.roles?.name ?? ''
        return rawRoleName.trim().toLowerCase() !== 'owner' && member.userId !== currentUserId
      }}
      onRoleChange={onRoleChange}
      roleChangeMessage={roleChangeMessage}
      emptyStateDescription="Manage organisation membership through Accounts."
    />
  )
}
