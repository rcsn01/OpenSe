import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createProject,
  addProjectTab,
  fetchProject,
  fetchProjectMembers,
  fetchProjects,
  fetchProjectSummary,
  fetchProjectTabs,
  removeProjectMember,
  removeProjectTab,
  updateProject,
  updateProjectTab,
  upsertProjectMember,
} from '../../api/projects'
import type { ProjectInput, ProjectMemberInput, ProjectTabInput, ProjectTabUpdateInput, ProjectUpdateInput } from '../../types'

export const projectKeys = {
  all: (organisationId: string | null) => ['open-kb', 'projects', organisationId] as const,
  detail: (organisationId: string | null, projectId: string | null) =>
    ['open-kb', 'projects', organisationId, 'detail', projectId] as const,
  members: (organisationId: string | null, projectId: string | null) =>
    ['open-kb', 'projects', organisationId, 'members', projectId] as const,
  tabs: (organisationId: string | null, projectId: string | null) =>
    ['open-kb', 'projects', organisationId, 'tabs', projectId] as const,
  summary: (organisationId: string | null) => ['open-kb', 'project-summary', organisationId] as const,
}

export const useProjects = (organisationId: string | null) =>
  useQuery({
    queryKey: projectKeys.all(organisationId),
    queryFn: () => fetchProjects(organisationId ?? ''),
    enabled: Boolean(organisationId),
  })

export const useProject = (organisationId: string | null, projectId: string | null) =>
  useQuery({
    queryKey: projectKeys.detail(organisationId, projectId),
    queryFn: () => fetchProject(organisationId ?? '', projectId ?? ''),
    enabled: Boolean(organisationId && projectId),
  })

export const useProjectSummary = (organisationId: string | null) =>
  useQuery({
    queryKey: projectKeys.summary(organisationId),
    queryFn: () => fetchProjectSummary(organisationId ?? ''),
    enabled: Boolean(organisationId),
  })

export const useProjectMembers = (organisationId: string | null, projectId: string | null) =>
  useQuery({
    queryKey: projectKeys.members(organisationId, projectId),
    queryFn: () => fetchProjectMembers(organisationId ?? '', projectId ?? ''),
    enabled: Boolean(organisationId && projectId),
  })

export const useProjectTabs = (organisationId: string | null, projectId: string | null) =>
  useQuery({
    queryKey: projectKeys.tabs(organisationId, projectId),
    queryFn: () => fetchProjectTabs(organisationId ?? '', projectId ?? ''),
    enabled: Boolean(organisationId && projectId),
  })

export const useCreateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ProjectInput) => createProject(input),
    onSuccess: async (_project, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.all(input.organisation_id) }),
        queryClient.invalidateQueries({ queryKey: projectKeys.summary(input.organisation_id) }),
      ])
    },
  })
}

export const useUpdateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ProjectUpdateInput) => updateProject(input),
    onSuccess: async (project, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.all(input.organisation_id) }),
        queryClient.setQueryData(projectKeys.detail(input.organisation_id, project.id), project),
      ])
    },
  })
}

export const useUpsertProjectMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ProjectMemberInput) => upsertProjectMember(input),
    onSuccess: async (_member, input) => {
      await queryClient.invalidateQueries({ queryKey: projectKeys.members(input.organisation_id, input.project_id) })
    },
  })
}

export const useRemoveProjectMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeProjectMember,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ['open-kb', 'projects', input.organisationId, 'members'] })
    },
  })
}

export const useAddProjectTab = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ProjectTabInput) => addProjectTab(input),
    onSuccess: async (_tab, input) => {
      await queryClient.invalidateQueries({ queryKey: projectKeys.tabs(input.organisation_id, input.project_id) })
    },
  })
}

export const useUpdateProjectTab = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ProjectTabUpdateInput) => updateProjectTab(input),
    onSuccess: async (_tab, input) => {
      await queryClient.invalidateQueries({ queryKey: projectKeys.tabs(input.organisation_id, input.project_id) })
    },
  })
}

export const useRemoveProjectTab = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeProjectTab,
    onSuccess: async (_tab, input) => {
      await queryClient.invalidateQueries({ queryKey: projectKeys.tabs(input.organisation_id, input.project_id) })
    },
  })
}
