import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addIssueCycleLink,
  addIssueModuleLink,
  createCycle,
  createEstimate,
  createModule,
  fetchCycleIssueLinks,
  fetchCycles,
  fetchEstimatePoints,
  fetchEstimates,
  fetchIssueCycleLinks,
  fetchIssueModuleLinks,
  fetchModuleIssueLinks,
  fetchModules,
  removeIssueCycleLink,
  removeIssueModuleLink,
} from '../../api/planning'
import type { CycleInput, ModuleInput } from '../../types'
import type { EstimateInput } from '../../types'

export const planningKeys = {
  cycles: (organisationId: string | null, projectId?: string | null) =>
    ['open-kb', 'cycles', organisationId, projectId ?? 'all'] as const,
  modules: (organisationId: string | null, projectId?: string | null) =>
    ['open-kb', 'modules', organisationId, projectId ?? 'all'] as const,
  estimates: (organisationId: string | null, projectId?: string | null) =>
    ['open-kb', 'estimates', organisationId, projectId ?? 'all'] as const,
  estimatePoints: (organisationId: string | null, projectId?: string | null) =>
    ['open-kb', 'estimate-points', organisationId, projectId ?? 'all'] as const,
  issueCycles: (organisationId: string | null, issueId: string | null) =>
    ['open-kb', 'issue-cycles', organisationId, issueId] as const,
  cycleIssues: (organisationId: string | null, projectId?: string | null) =>
    ['open-kb', 'cycle-issues', organisationId, projectId ?? 'all'] as const,
  issueModules: (organisationId: string | null, issueId: string | null) =>
    ['open-kb', 'issue-modules', organisationId, issueId] as const,
  moduleIssues: (organisationId: string | null, projectId?: string | null) =>
    ['open-kb', 'module-issues', organisationId, projectId ?? 'all'] as const,
}

export const useCycles = (organisationId: string | null, projectId?: string | null, enabled = true) =>
  useQuery({
    queryKey: planningKeys.cycles(organisationId, projectId),
    queryFn: () => fetchCycles({ organisationId: organisationId ?? '', projectId }),
    enabled: Boolean(enabled && organisationId),
  })

export const useModules = (organisationId: string | null, projectId?: string | null, enabled = true) =>
  useQuery({
    queryKey: planningKeys.modules(organisationId, projectId),
    queryFn: () => fetchModules({ organisationId: organisationId ?? '', projectId }),
    enabled: Boolean(enabled && organisationId),
  })

export const useEstimates = (organisationId: string | null, projectId?: string | null, enabled = true) =>
  useQuery({
    queryKey: planningKeys.estimates(organisationId, projectId),
    queryFn: () => fetchEstimates({ organisationId: organisationId ?? '', projectId }),
    enabled: Boolean(enabled && organisationId),
  })

export const useEstimatePoints = (organisationId: string | null, projectId?: string | null) =>
  useQuery({
    queryKey: planningKeys.estimatePoints(organisationId, projectId),
    queryFn: () => fetchEstimatePoints({ organisationId: organisationId ?? '', projectId }),
    enabled: Boolean(organisationId),
  })

export const useIssueCycleLinks = (organisationId: string | null, issueId: string | null) =>
  useQuery({
    queryKey: planningKeys.issueCycles(organisationId, issueId),
    queryFn: () => fetchIssueCycleLinks(organisationId ?? '', issueId ?? ''),
    enabled: Boolean(organisationId && issueId),
  })

export const useCycleIssueLinks = (organisationId: string | null, projectId?: string | null, enabled = true) =>
  useQuery({
    queryKey: planningKeys.cycleIssues(organisationId, projectId),
    queryFn: () => fetchCycleIssueLinks({ organisationId: organisationId ?? '', projectId }),
    enabled: Boolean(enabled && organisationId),
  })

export const useIssueModuleLinks = (organisationId: string | null, issueId: string | null) =>
  useQuery({
    queryKey: planningKeys.issueModules(organisationId, issueId),
    queryFn: () => fetchIssueModuleLinks(organisationId ?? '', issueId ?? ''),
    enabled: Boolean(organisationId && issueId),
  })

export const useModuleIssueLinks = (organisationId: string | null, projectId?: string | null, enabled = true) =>
  useQuery({
    queryKey: planningKeys.moduleIssues(organisationId, projectId),
    queryFn: () => fetchModuleIssueLinks({ organisationId: organisationId ?? '', projectId }),
    enabled: Boolean(enabled && organisationId),
  })

export const useCreateCycle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CycleInput) => createCycle(input),
    onSuccess: async (_cycle, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'cycles', input.organisation_id] }),
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'project-summary', input.organisation_id] }),
      ])
    },
  })
}

export const useCreateModule = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ModuleInput) => createModule(input),
    onSuccess: async (_module, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'modules', input.organisation_id] }),
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'project-summary', input.organisation_id] }),
      ])
    },
  })
}

export const useCreateEstimate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: EstimateInput) => createEstimate(input),
    onSuccess: async (_estimate, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'estimates', input.organisation_id] }),
        queryClient.invalidateQueries({ queryKey: planningKeys.estimatePoints(input.organisation_id, input.project_id) }),
      ])
    },
  })
}

export const useAddIssueCycleLink = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addIssueCycleLink,
    onSuccess: async (_link, input) => {
      await queryClient.invalidateQueries({ queryKey: planningKeys.issueCycles(input.organisationId, input.issueId) })
    },
  })
}

export const useRemoveIssueCycleLink = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeIssueCycleLink,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ['open-kb', 'issue-cycles', input.organisationId] })
    },
  })
}

export const useAddIssueModuleLink = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addIssueModuleLink,
    onSuccess: async (_link, input) => {
      await queryClient.invalidateQueries({ queryKey: planningKeys.issueModules(input.organisationId, input.issueId) })
    },
  })
}

export const useRemoveIssueModuleLink = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeIssueModuleLink,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ['open-kb', 'issue-modules', input.organisationId] })
    },
  })
}
