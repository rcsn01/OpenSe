import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createRoleWithPermissions,
  fetchTeamActivityEvents,
  fetchTeamSettingsData,
  fetchTwoFactorStatus,
  inviteCompanyMember,
  saveRoleWithPermissions,
  type Role,
  updateCompanyMemberRole,
} from '../../api/teamSettings'

const teamSettingsKey = (companyId: string | null) => ['stoqr', 'team-settings', companyId] as const
const teamActivityKey = (companyId: string | null) => ['stoqr', 'team-settings', 'activity', companyId] as const
const teamMfaKey = ['stoqr', 'team-settings', 'mfa'] as const

export const useTeamSettingsData = (companyId: string | null) =>
  useQuery({
    queryKey: teamSettingsKey(companyId),
    queryFn: () => fetchTeamSettingsData(companyId as string),
    enabled: !!companyId,
  })

export const useInviteCompanyMember = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, roleId }: { email: string; roleId: string }) => {
      if (!companyId) throw new Error('No company selected')
      return inviteCompanyMember(companyId, email, roleId)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamSettingsKey(companyId) }),
  })
}

export const useUpdateCompanyMemberRole = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ memberId, roleId }: { memberId: string; roleId: string }) =>
      updateCompanyMemberRole(memberId, roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamSettingsKey(companyId) }),
  })
}

export const useSaveRoleWithPermissions = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ role, desiredPermissions, initialPermissions }: { role: Role; desiredPermissions: string[]; initialPermissions: string[] }) =>
      saveRoleWithPermissions(role, desiredPermissions, initialPermissions),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamSettingsKey(companyId) }),
  })
}

export const useCreateRoleWithPermissions = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name, description, perms }: { name: string; description: string; perms: string[] }) => {
      if (!companyId) throw new Error('No company selected')
      return createRoleWithPermissions(companyId, { name, description, perms })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamSettingsKey(companyId) }),
  })
}

export const useTeamActivityEvents = (companyId: string | null) =>
  useQuery({
    queryKey: teamActivityKey(companyId),
    queryFn: () => fetchTeamActivityEvents(companyId as string),
    enabled: !!companyId,
    staleTime: 30_000,
  })

export const useTwoFactorStatus = () =>
  useQuery({
    queryKey: teamMfaKey,
    queryFn: fetchTwoFactorStatus,
    staleTime: 30_000,
    retry: false,
  })
