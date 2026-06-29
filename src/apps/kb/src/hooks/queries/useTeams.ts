import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addTeamMember, createTeam, deleteTeam, fetchTeamMembers, fetchTeams, removeTeamMember, updateTeam } from '../../api/teams'
import type { OpenKbTeamInput, OpenKbTeamMemberInput, OpenKbTeamMemberRemoveInput, OpenKbTeamUpdateInput } from '../../types'
import { projectKeys } from './useProjects'

export const teamKeys = {
  all: (organisationId: string | null) => ['open-kb', 'teams', organisationId] as const,
  members: (organisationId: string | null, teamId?: string | null) =>
    ['open-kb', 'teams', organisationId, 'members', teamId ?? 'all'] as const,
}

export const useTeams = (organisationId: string | null) =>
  useQuery({
    queryKey: teamKeys.all(organisationId),
    queryFn: () => fetchTeams(organisationId ?? ''),
    enabled: Boolean(organisationId),
  })

export const useCreateTeam = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: OpenKbTeamInput) => createTeam(input),
    onSuccess: async (_team, input) => {
      await queryClient.invalidateQueries({ queryKey: teamKeys.all(input.organisation_id) })
    },
  })
}

export const useUpdateTeam = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: OpenKbTeamUpdateInput) => updateTeam(input),
    onSuccess: async (_team, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: teamKeys.all(input.organisation_id) }),
        queryClient.invalidateQueries({ queryKey: projectKeys.all(input.organisation_id) }),
      ])
    },
  })
}

export const useDeleteTeam = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTeam,
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: teamKeys.all(input.organisationId) }),
        queryClient.invalidateQueries({ queryKey: projectKeys.all(input.organisationId) }),
      ])
    },
  })
}

export const useTeamMembers = (organisationId: string | null, teamId?: string | null, enabled = true) =>
  useQuery({
    queryKey: teamKeys.members(organisationId, teamId),
    queryFn: () => fetchTeamMembers(organisationId ?? '', teamId),
    enabled: Boolean(enabled && organisationId),
  })

export const useAddTeamMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: OpenKbTeamMemberInput) => addTeamMember(input),
    onSuccess: async (_member, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: teamKeys.members(input.organisation_id, input.team_id) }),
        queryClient.invalidateQueries({ queryKey: teamKeys.members(input.organisation_id) }),
      ])
    },
  })
}

export const useRemoveTeamMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: OpenKbTeamMemberRemoveInput) => removeTeamMember(input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ['open-kb', 'teams', input.organisationId, 'members'] })
    },
  })
}
