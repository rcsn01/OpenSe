import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  useSaveRoleWithPermissions,
  useTeamActivityEvents,
  useTeamSettingsData,
  useUpdateCompanyMemberRole,
} from '../hooks/queries/useTeamSettings'
import type { Role } from '../api/teamSettings'

export const TeamSettingsPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const { tab } = useParams<{ tab?: string }>()
  const validTabs = ['user-management', 'rbac', 'activity', 'two-factor'] as const
  const activeTab = validTabs.includes((tab ?? '') as (typeof validTabs)[number]) ? tab! : 'user-management'
  const { data, isLoading } = useTeamSettingsData(companyId)
  const { data: activity = [], isLoading: loadingActivity } = useTeamActivityEvents(companyId)
  const inviteMutation = useInviteCompanyMember(companyId)
  const updateMemberRoleMutation = useUpdateCompanyMemberRole(companyId)
  const saveRoleMutation = useSaveRoleWithPermissions(companyId)
  const createRoleMutation = useCreateRoleWithPermissions(companyId)

  const [roles, setRoles] = useState<Role[]>([])
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({})
  const [initialRolePermissions, setInitialRolePermissions] = useState<Record<string, string[]>>({})
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)

  const members = data?.members ?? []
  const invitations = data?.invitations ?? []
  const permissions = data?.permissions ?? []

  useEffect(() => {
    if (!data?.roles) return
    setRoles(data.roles)
  }, [data?.roles])

  useEffect(() => {
    if (!data?.rolePermissions) return
    setRolePermissions(data.rolePermissions)
    setInitialRolePermissions(data.rolePermissions)
  }, [data?.rolePermissions])

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
    await updateMemberRoleMutation.mutateAsync({ memberId, roleId })
  }

  const handleRoleSave = async (role: Role) => {
    await saveRoleMutation.mutateAsync({
      role,
      desiredPermissions: rolePermissions[role.id] ?? [],
      initialPermissions: initialRolePermissions[role.id] ?? [],
    })
    setInitialRolePermissions((prev) => ({ ...prev, [role.id]: [...(rolePermissions[role.id] ?? [])] }))
  }

  const handleCreateRole = async (name: string, description: string, perms: string[]) => {
    if (!companyId || !name) return
    await createRoleMutation.mutateAsync({ name, description, perms })
  }

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading}
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to manage your team."
      loadingMessage="Loading team settings..."
    >
      <Tabs
        activeTab={activeTab}
        onTabChange={(nextTab) => navigate(`/settings/team/${nextTab}`)}
        tabs={[
          {
            id: 'user-management',
            label: 'User Management',
            content: (
              <MembersTab
                members={members}
                invitations={invitations}
                roles={roles}
                onRoleChange={handleRoleChange}
                onInvite={handleInvite}
                inviteMessage={inviteMessage}
              />
            ),
          },
          {
            id: 'rbac',
            label: 'RBAC',
            content: (
              <RolesTab
                roles={roles}
                setRoles={setRoles}
                permissions={permissions}
                rolePermissions={rolePermissions}
                setRolePermissions={setRolePermissions}
                onSaveRole={handleRoleSave}
                onCreateRole={handleCreateRole}
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