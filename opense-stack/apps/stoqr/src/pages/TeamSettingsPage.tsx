import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@repo/shared/auth/context'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { ActivityLogsTab } from '../components/TeamSettings/ActivityLogsTab'
import { MembersTab } from '../components/TeamSettings/MembersTab'
import { RolesTab } from '../components/TeamSettings/RolesTab'
import { TwoFactorTab } from '../components/TeamSettings/TwoFactorTab'
import {
  useCreateRoleWithPermissions,
  useInviteCompanyMember,
  useTeamActivityEvents,
  useTeamSettingsData,
  useUpdateRoleWithPermissions,
  useUpdateCompanyMemberRole,
} from '../hooks/queries/useTeamSettings'

export const TeamSettingsPage = () => {
  const { companyId } = useCompany()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { tab } = useParams<{ tab?: string }>()
  const tabAliasMap: Record<string, string> = {
    'user-management': 'teams',
    rbac: 'permissions',
  }
  const normalizedTab = tab ? (tabAliasMap[tab] ?? tab) : 'teams'
  const validTabs = ['teams', 'permissions', 'activity', 'two-factor'] as const
  const activeTab = validTabs.includes(normalizedTab as (typeof validTabs)[number]) ? normalizedTab : 'teams'
  const { data, isLoading } = useTeamSettingsData(companyId)
  const { data: activity = [], isLoading: loadingActivity } = useTeamActivityEvents(companyId)
  const inviteMutation = useInviteCompanyMember(companyId)
  const updateMemberRoleMutation = useUpdateCompanyMemberRole(companyId)
  const updateRoleMutation = useUpdateRoleWithPermissions(companyId)
  const createRoleMutation = useCreateRoleWithPermissions(companyId)

  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  const [roleChangeMessage, setRoleChangeMessage] = useState<string | null>(null)

  const members = data?.members ?? []
  const permissions = data?.permissions ?? []
  const rolePermissions = data?.rolePermissions ?? {}
  const roles = (data?.roles ?? []).map((role) => ({
    ...role,
    permissionCodes: rolePermissions[role.id] ?? [],
  }))

  const handleInvite = async (email: string, roleId: string) => {
    if (!companyId || !email || !roleId) return
    setInviteMessage(null)
    try {
      await inviteMutation.mutateAsync({ email, roleId })
      setInviteMessage(`Invitation sent to ${email}.`)
    } catch (error) {
      setInviteMessage(error instanceof Error ? error.message : 'Failed to send invitation.')
    }
  }

  const handleRoleChange = async (memberId: string, roleId: string) => {
    setRoleChangeMessage(null)
    try {
      await updateMemberRoleMutation.mutateAsync({ memberId, roleId })
      setRoleChangeMessage('Member role updated successfully.')
    } catch (error) {
      setRoleChangeMessage(error instanceof Error ? error.message : 'Failed to update member role.')
    }
  }

  const handleCreateRole = async ({ name, description, permissionCodes }: { name: string; description: string; permissionCodes: string[] }) => {
    if (!companyId || !name) return
    await createRoleMutation.mutateAsync({ name, description, perms: permissionCodes })
  }

  const handleUpdateRole = async (
    roleId: string,
    { name, description, permissionCodes }: { name: string; description: string; permissionCodes: string[] },
  ) => {
    await updateRoleMutation.mutateAsync({ roleId, name, description, permissionCodes })
  }

  useEffect(() => {
    if (tab && tabAliasMap[tab]) {
      navigate(`/settings/organisations/${tabAliasMap[tab]}`, { replace: true })
    }
  }, [navigate, tab])

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading}
      emptyStateTitle="No organisation selected"
      emptyStateDescription="Choose an organisation to manage your teams and permissions."
      loadingMessage="Loading organisation settings..."
    >
      <Tabs
        activeTab={activeTab}
        onTabChange={(nextTab) => navigate(`/settings/organisations/${nextTab}`)}
        tabs={[
          {
            id: 'teams',
            label: 'Teams',
            content: (
              <MembersTab
                members={members}
                roles={data?.roles ?? []}
                currentUserId={user?.id}
                onRoleChange={handleRoleChange}
                onInvite={handleInvite}
                inviteMessage={inviteMessage}
                roleChangeMessage={roleChangeMessage}
              />
            ),
          },
          {
            id: 'permissions',
            label: 'Permissions',
            content: (
              <RolesTab
                roles={roles}
                permissions={permissions}
                loadingRoles={isLoading}
                loadingPermissions={isLoading}
                canManage={true}
                onCreateRole={handleCreateRole}
                onUpdateRole={handleUpdateRole}
              />
            ),
          },
          {
            id: 'activity',
            label: 'Activity Logs',
            content: loadingActivity ? <div className="empty-state">Loading activity logs...</div> : <ActivityLogsTab logs={activity} />,
          },
          {
            id: 'two-factor',
            label: 'Two-Factor Authentication',
            content: <TwoFactorTab />,
          },
        ]}
      />
    </BasePage>
  )
}