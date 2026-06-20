import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createProjectDeployBoard,
  deleteProjectDeployBoard,
  fetchProjectDeployBoards,
  fetchPublicDeployBoard,
  fetchPublicDeployBoardIssues,
  updateProjectDeployBoard,
} from '../../api/deployBoards'
import type { ProjectDeployBoardInput, ProjectDeployBoardUpdateInput } from '../../types'

export const deployBoardKeys = {
  project: (organisationId: string | null, projectId: string | null) =>
    ['open-kb', 'deploy-boards', organisationId, projectId] as const,
  publicBoard: (slug: string | null) => ['open-kb', 'public-deploy-board', slug] as const,
  publicIssues: (slug: string | null) => ['open-kb', 'public-deploy-board-issues', slug] as const,
}

export const useProjectDeployBoards = (organisationId: string | null, projectId: string | null) =>
  useQuery({
    queryKey: deployBoardKeys.project(organisationId, projectId),
    queryFn: () => fetchProjectDeployBoards(organisationId ?? '', projectId ?? ''),
    enabled: Boolean(organisationId && projectId),
  })

export const useCreateProjectDeployBoard = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ProjectDeployBoardInput) => createProjectDeployBoard(input),
    onSuccess: async (_board, input) => {
      await queryClient.invalidateQueries({ queryKey: deployBoardKeys.project(input.organisation_id, input.project_id) })
    },
  })
}

export const useUpdateProjectDeployBoard = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ProjectDeployBoardUpdateInput) => updateProjectDeployBoard(input),
    onSuccess: async (_board, input) => {
      await queryClient.invalidateQueries({ queryKey: deployBoardKeys.project(input.organisation_id, input.project_id) })
    },
  })
}

export const useDeleteProjectDeployBoard = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProjectDeployBoard,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: deployBoardKeys.project(input.organisationId, input.projectId) })
    },
  })
}

export const usePublicDeployBoard = (slug: string | null) =>
  useQuery({
    queryKey: deployBoardKeys.publicBoard(slug),
    queryFn: () => fetchPublicDeployBoard(slug ?? ''),
    enabled: Boolean(slug),
  })

export const usePublicDeployBoardIssues = (slug: string | null) =>
  useQuery({
    queryKey: deployBoardKeys.publicIssues(slug),
    queryFn: () => fetchPublicDeployBoardIssues(slug ?? ''),
    enabled: Boolean(slug),
  })
