import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { usePageTopBarSearch, useTopBarSearchValue } from '../components/Search/TopBarSearch'
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

export const TeamSettingsPage = () => {
  const { companyId } = useCompany()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { searchValue } = useTopBarSearchValue()
  const { tab } = useParams<{ tab?: string }>()
  const tabAliasMap: Record<string, string> = {
    'user-management': 'teams',
    rbac: 'permissions',
  }
  const normalizedTab = tab ? (tabAliasMap[tab] ?? tab) : 'teams'
  const validTabs = ['teams', 'permissions', 'activity', 'pages', 'two-factor'] as const
  const activeTab = validTabs.includes(normalizedTab as (typeof validTabs)[number]) ? normalizedTab : 'teams'
  const teamsSearchTerm = activeTab === 'teams' ? searchValue : ''
  const permissionsSearchTerm = activeTab === 'permissions' ? searchValue : ''
  const activitySearchTerm = activeTab === 'activity' ? searchValue : ''
  const pagesSearchTerm = activeTab === 'pages' ? searchValue : ''
  const twoFactorSearchTerm = activeTab === 'two-factor' ? searchValue : ''
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
  const activitySuggestions = useMemo(
    () => activity.slice(0, 8).map((log) => ({
      id: log.id,
      title: log.message ?? log.event_type,
      subtitle: `${log.profiles?.full_name ?? log.profiles?.username ?? 'System'} · ${log.event_type}`,
      value: log.message ?? log.event_type,
      badge: 'Log',
    })),
    [activity],
  )
  const memberSuggestions = useMemo(
    () => members.slice(0, 8).map((member) => ({
      id: member.id,
      title: member.profiles?.full_name ?? member.profiles?.username ?? 'Unknown member',
      subtitle: `${member.roles?.name ?? 'No role'} · ${member.user_id}`,
      value: member.profiles?.full_name ?? member.profiles?.username ?? member.user_id,
      badge: 'Member',
    })),
    [members],
  )
  const permissionSuggestions = useMemo(
    () => [
      ...roles.slice(0, 4).map((role) => ({
        id: `role-${role.id}`,
        title: role.name,
        subtitle: role.description ?? 'Organisation role',
        value: role.name,
        badge: 'Role',
      })),
      ...permissions.slice(0, 4).map((permission) => ({
        id: `permission-${permission.code}`,
        title: permission.code,
        subtitle: permission.description ?? 'Permission code',
        value: permission.code,
        badge: 'Permission',
      })),
    ],
    [permissions, roles],
  )
  const pageAccessSuggestions = useMemo(
    () => ([
      {
        id: 'page-access-reports',
        title: organisationPageFeatureLabels.reports,
        subtitle: 'Analytics, exports, and saved reports',
        value: organisationPageFeatureLabels.reports,
        badge: 'Page',
      },
      {
        id: 'page-access-procurement',
        title: organisationPageFeatureLabels.procurement,
        subtitle: 'Purchase orders, suppliers, and receiving',
        value: organisationPageFeatureLabels.procurement,
        badge: 'Page',
      },
      {
        id: 'page-access-alerts',
        title: organisationPageFeatureLabels.alerts,
        subtitle: 'Alert feeds, rules, and alert management',
        value: organisationPageFeatureLabels.alerts,
        badge: 'Page',
      },
    ]),
    [],
  )
  const teamSettingsSearchConfig = useMemo(() => {
    if (activeTab === 'teams') {
      return {
        searchKey: 'team-settings-teams',
        placeholder: 'Search team members...',
        defaultSuggestions: [
          {
            id: 'team-members-default',
            title: 'Team Members',
            subtitle: 'Search by member name, role, or user ID',
            value: 'team members',
            badge: 'Member',
          },
        ],
        suggestions: memberSuggestions,
      }
    }

    if (activeTab === 'permissions') {
      return {
        searchKey: 'team-settings-permissions',
        placeholder: 'Search roles and permissions...',
        defaultSuggestions: [
          {
            id: 'team-permissions-default',
            title: 'Organisation Permissions',
            subtitle: 'Search roles, access levels, and permission codes',
            value: 'permissions',
            badge: 'Role',
          },
        ],
        suggestions: permissionSuggestions,
      }
    }

    if (activeTab === 'pages') {
      return {
        searchKey: 'team-settings-pages',
        placeholder: 'Search page access...',
        suggestions: pageAccessSuggestions,
      }
    }

    if (activeTab === 'two-factor') {
      return {
        searchKey: 'team-settings-two-factor',
        placeholder: 'Search two-factor...',
        defaultSuggestions: [
          {
            id: 'team-two-factor-enabled',
            title: 'Verified Factors',
            subtitle: 'Look for active enrolled authentication factors',
            value: 'verified',
            badge: '2FA',
          },
          {
            id: 'team-two-factor-authenticator',
            title: 'Authenticator App',
            subtitle: 'Search enrolled app-based authentication methods',
            value: 'authenticator',
            badge: '2FA',
          },
        ],
      }
    }

    return {
      searchKey: 'team-settings-activity',
      placeholder: 'Search activity logs...',
      suggestions: activitySuggestions,
    }
  }, [activeTab, activitySuggestions, memberSuggestions, pageAccessSuggestions, permissionSuggestions])

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

  usePageTopBarSearch(teamSettingsSearchConfig)

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
                searchTerm={teamsSearchTerm}
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
                searchTerm={permissionsSearchTerm}
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
                searchTerm={pagesSearchTerm}
              />
            ),
          },
          {
            id: 'two-factor',
            label: 'Two-Factor Authentication',
            content: <TwoFactorTab searchTerm={twoFactorSearchTerm} />,
          },
        ]}
      />
    </BasePage>
  )
}
