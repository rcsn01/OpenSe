import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@repo/shared/auth/context'
import { useCompany } from '../contexts/CompanyContext'
import {
  defaultOrganisationPageSettings,
  organisationPageFeatureLabels,
  setOrganisationPageFeatureEnabled,
  type OrganisationPageFeature,
} from '../api/organisationPageSettings'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { ActivityLogsTab } from '../components/TeamSettings/ActivityLogsTab'
import { MembersTab } from '../components/TeamSettings/MembersTab'
import { PagesTab } from '../components/TeamSettings/PagesTab'
import { RolesTab } from '../components/TeamSettings/RolesTab'
import { TwoFactorTab } from '../components/TeamSettings/TwoFactorTab'
import { useOrganisationPageSettings, useUpdateOrganisationPageSettings } from '../hooks/queries/useOrganisationPageSettings'
import {
  useCreateRoleWithPermissions,
  useInviteCompanyMember,
  useTeamActivityEvents,
  useTeamSettingsData,
  useUpdateRoleWithPermissions,
  useUpdateCompanyMemberRole,
} from '../hooks/queries/useTeamSettings'
import type { AppLayoutOutletContext } from '../layouts/AppLayout'

export const TeamSettingsPage = () => {
  const { companyId } = useCompany()
  const { user } = useAuth()
  const navigate = useNavigate()
  const layoutContext = useOutletContext<AppLayoutOutletContext | null>()
  const { tab } = useParams<{ tab?: string }>()
  const tabAliasMap: Record<string, string> = {
    'user-management': 'teams',
    rbac: 'permissions',
  }
  const normalizedTab = tab ? (tabAliasMap[tab] ?? tab) : 'teams'
  const validTabs = ['teams', 'permissions', 'activity', 'pages', 'two-factor'] as const
  const activeTab = validTabs.includes(normalizedTab as (typeof validTabs)[number]) ? normalizedTab : 'teams'
  const activitySearchTerm = activeTab === 'activity' ? (layoutContext?.topBarSearchValue ?? '') : ''
  const { data, isLoading } = useTeamSettingsData(companyId)
  const { data: pageSettings = defaultOrganisationPageSettings, isLoading: loadingPageSettings } = useOrganisationPageSettings(companyId)
  const { data: activity = [], isLoading: loadingActivity } = useTeamActivityEvents(companyId)
  const inviteMutation = useInviteCompanyMember(companyId)
  const updateMemberRoleMutation = useUpdateCompanyMemberRole(companyId)
  const updateRoleMutation = useUpdateRoleWithPermissions(companyId)
  const createRoleMutation = useCreateRoleWithPermissions(companyId)
  const updatePageSettingsMutation = useUpdateOrganisationPageSettings(companyId)

  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  const [roleChangeMessage, setRoleChangeMessage] = useState<string | null>(null)

  const members = data?.members ?? []
  const permissions = data?.permissions ?? []
  const rolePermissions = data?.rolePermissions ?? {}
  const roles = (data?.roles ?? []).map((role) => ({
    ...role,
    roleRank: role.role_rank,
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

  const handleCreateRole = async ({ name, description, roleRank, permissionCodes }: { name: string; description: string; roleRank: number; permissionCodes: string[] }) => {
    if (!companyId || !name) return
    await createRoleMutation.mutateAsync({ name, description, roleRank, perms: permissionCodes })
  }

  const handleUpdateRole = async (
    roleId: string,
    { name, description, roleRank, permissionCodes }: { name: string; description: string; roleRank: number; permissionCodes: string[] },
  ) => {
    await updateRoleMutation.mutateAsync({ roleId, name, description, roleRank, permissionCodes })
  }

  const handlePageToggle = async (feature: OrganisationPageFeature, enabled: boolean) => {
    try {
      await updatePageSettingsMutation.mutateAsync(setOrganisationPageFeatureEnabled(pageSettings, feature, enabled))
      toast.success(`${organisationPageFeatureLabels[feature]} page ${enabled ? 'enabled' : 'disabled'} for the organisation.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update page access.')
      throw error
    }
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
        bottomSpacing
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
            content: loadingActivity ? <div className="empty-state">Loading activity logs...</div> : <ActivityLogsTab logs={activity} searchTerm={activitySearchTerm} />,
          },
          {
            id: 'pages',
            label: 'Pages',
            content: (
              <PagesTab
                settings={pageSettings}
                isLoading={loadingPageSettings}
                isUpdating={updatePageSettingsMutation.isPending}
                onToggle={handlePageToggle}
              />
            ),
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