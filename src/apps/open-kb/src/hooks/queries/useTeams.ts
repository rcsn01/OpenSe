import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTeam, deleteTeam, fetchTeams, updateTeam } from '../../api/teams'
import type { OpenKbTeamInput, OpenKbTeamUpdateInput } from '../../types'
import { projectKeys } from './useProjects'

export const teamKeys = {
  all: (organisationId: string | null) => ['open-kb', 'teams', organisationId] as const,
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
