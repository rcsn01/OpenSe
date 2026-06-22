import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createDraftIssue,
  deleteDraftIssue,
  fetchDraftIssue,
  fetchDraftIssues,
  publishDraftIssue,
  updateDraftIssue,
} from '../../api/drafts'

export const draftKeys = {
  list: (organisationId: string | null, profileId: string | null) =>
    ['open-kb', 'draft-issues', organisationId, profileId] as const,
  detail: (organisationId: string | null, draftId: string | null) =>
    ['open-kb', 'draft-issues', organisationId, 'detail', draftId] as const,
}

export const useDraftIssues = (organisationId: string | null, profileId: string | null, enabled = true) =>
  useQuery({
    queryKey: draftKeys.list(organisationId, profileId),
    queryFn: () => fetchDraftIssues({ organisationId: organisationId ?? '', profileId: profileId ?? '' }),
    enabled: Boolean(enabled && organisationId && profileId),
  })

export const useDraftIssue = (organisationId: string | null, draftId: string | null) =>
  useQuery({
    queryKey: draftKeys.detail(organisationId, draftId),
    queryFn: () => fetchDraftIssue({ organisationId: organisationId ?? '', draftId: draftId ?? '' }),
    enabled: Boolean(organisationId && draftId),
  })

export const useCreateDraftIssue = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDraftIssue,
    onSuccess: async (_draft, input) => {
      await queryClient.invalidateQueries({
        queryKey: draftKeys.list(input.organisation_id, input.profile_id),
      })
    },
  })
}

export const useUpdateDraftIssue = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateDraftIssue,
    onSuccess: async (draft) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'draft-issues', draft.organisation_id] }),
        queryClient.setQueryData(draftKeys.detail(draft.organisation_id, draft.id), draft),
      ])
    },
  })
}

export const useDeleteDraftIssue = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteDraftIssue,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ['open-kb', 'draft-issues', input.organisationId],
      })
    },
  })
}

export const usePublishDraftIssue = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: publishDraftIssue,
    onSuccess: async (issue, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'draft-issues', input.organisationId] }),
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId] }),
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'project-summary', input.organisationId] }),
        queryClient.setQueryData(['open-kb', 'issues', input.organisationId, 'detail', issue.id], issue),
      ])
    },
  })
}
