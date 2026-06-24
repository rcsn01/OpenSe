import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addCommentReaction,
  addIssueBlocker,
  addIssueLink,
  addIssueMention,
  addIssueReaction,
  addIssueRelation,
  addIssueAssignee,
  addIssueLabelLink,
  createIssue,
  createIssueComment,
  createIssueLabel,
  createIssueState,
  createIssueView,
  fetchIssue,
  fetchIssueActivities,
  fetchIssueAttachments,
  fetchIssueAssignees,
  fetchIssueBlockers,
  fetchIssueComments,
  fetchIssueLabelLinks,
  fetchIssueLabels,
  fetchIssueLinks,
  fetchIssueMentions,
  fetchCommentReactions,
  fetchIssueReactions,
  fetchIssueRelations,
  fetchIssueSubscribers,
  fetchIssueVotes,
  fetchIssueViews,
  fetchIssues,
  fetchIssueStates,
  fetchOrganisationMemberProfiles,
  fetchProjectIssueAssignees,
  fetchProjectIssueAttachments,
  removeIssueAssignee,
  removeIssueAttachment,
  removeIssueBlocker,
  removeCommentReaction,
  removeIssueLabelLink,
  removeIssueLink,
  removeIssueMention,
  removeIssueReaction,
  removeIssueRelation,
  removeIssueVote,
  subscribeToIssue,
  unsubscribeFromIssue,
  updateIssue,
  uploadIssueAttachment,
  voteForIssue,
} from '../../api/issues'
import type {
  IssueAttachmentInput,
  IssueCommentInput,
  IssueFilters,
  IssueInput,
  IssueLabelInput,
  IssueStateInput,
  IssueUpdateInput,
  SavedIssueViewInput,
} from '../../types'
import { enabledWhen, invalidateQueryKeys } from './queryHelpers'

export const issueKeys = {
  all: (organisationId: string | null) => ['open-kb', 'issues', organisationId] as const,
  list: (organisationId: string | null, filters?: IssueFilters) =>
    ['open-kb', 'issues', organisationId, 'list', filters ?? {}] as const,
  views: (organisationId: string | null) =>
    ['open-kb', 'issue-views', organisationId] as const,
  detail: (organisationId: string | null, issueId: string | null) =>
    ['open-kb', 'issues', organisationId, 'detail', issueId] as const,
  activities: (organisationId: string | null, issueId: string | null) =>
    ['open-kb', 'issues', organisationId, 'activities', issueId] as const,
  comments: (organisationId: string | null, issueId: string | null) =>
    ['open-kb', 'issues', organisationId, 'comments', issueId] as const,
  attachments: (organisationId: string | null, issueId: string | null) =>
    ['open-kb', 'issues', organisationId, 'attachments', issueId] as const,
  projectAttachments: (organisationId: string | null, projectId: string | null) =>
    ['open-kb', 'issues', organisationId, 'project-attachments', projectId] as const,
  blockers: (organisationId: string | null, issueId: string | null) =>
    ['open-kb', 'issues', organisationId, 'blockers', issueId] as const,
  relations: (organisationId: string | null, issueId: string | null) =>
    ['open-kb', 'issues', organisationId, 'relations', issueId] as const,
  links: (organisationId: string | null, issueId: string | null) =>
    ['open-kb', 'issues', organisationId, 'links', issueId] as const,
  subscribers: (organisationId: string | null, issueId: string | null) =>
    ['open-kb', 'issues', organisationId, 'subscribers', issueId] as const,
  votes: (organisationId: string | null, issueId: string | null) =>
    ['open-kb', 'issues', organisationId, 'votes', issueId] as const,
  reactions: (organisationId: string | null, issueId: string | null) =>
    ['open-kb', 'issues', organisationId, 'reactions', issueId] as const,
  commentReactions: (organisationId: string | null, issueId: string | null) =>
    ['open-kb', 'issues', organisationId, 'comment-reactions', issueId] as const,
  states: (organisationId: string | null, projectId?: string | null) =>
    ['open-kb', 'issue-states', organisationId, projectId ?? 'all'] as const,
  labels: (organisationId: string | null, projectId?: string | null) =>
    ['open-kb', 'issue-labels', organisationId, projectId ?? 'all'] as const,
  labelLinks: (organisationId: string | null, issueId: string | null) =>
    ['open-kb', 'issues', organisationId, 'label-links', issueId] as const,
  assignees: (organisationId: string | null, issueId: string | null) =>
    ['open-kb', 'issues', organisationId, 'assignees', issueId] as const,
  projectAssignees: (organisationId: string | null, projectId: string | null) =>
    ['open-kb', 'issues', organisationId, 'project-assignees', projectId] as const,
  mentions: (organisationId: string | null, issueId: string | null) =>
    ['open-kb', 'issues', organisationId, 'mentions', issueId] as const,
  memberProfiles: (organisationId: string | null) =>
    ['open-kb', 'member-profiles', organisationId] as const,
}

export const useIssues = (organisationId: string | null, filters?: IssueFilters, enabled = true) =>
  useQuery({
    queryKey: issueKeys.list(organisationId, filters),
    queryFn: () => fetchIssues({ organisationId: organisationId ?? '', filters }),
    enabled: Boolean(enabled && organisationId),
  })

export const useIssueViews = (organisationId: string | null) =>
  useQuery({
    queryKey: issueKeys.views(organisationId),
    queryFn: () => fetchIssueViews(organisationId ?? ''),
    enabled: enabledWhen(organisationId),
  })

export const useIssue = (organisationId: string | null, issueId: string | null) =>
  useQuery({
    queryKey: issueKeys.detail(organisationId, issueId),
    queryFn: () => fetchIssue(organisationId ?? '', issueId ?? ''),
    enabled: enabledWhen(organisationId, issueId),
  })

export const useIssueActivities = (organisationId: string | null, issueId: string | null) =>
  useQuery({
    queryKey: issueKeys.activities(organisationId, issueId),
    queryFn: () => fetchIssueActivities(organisationId ?? '', issueId ?? ''),
    enabled: enabledWhen(organisationId, issueId),
  })

export const useIssueStates = (organisationId: string | null, projectId?: string | null, enabled = true) =>
  useQuery({
    queryKey: issueKeys.states(organisationId, projectId),
    queryFn: () => fetchIssueStates(organisationId ?? '', projectId),
    enabled: Boolean(enabled && organisationId),
  })

export const useIssueLabels = (organisationId: string | null, projectId?: string | null, enabled = true) =>
  useQuery({
    queryKey: issueKeys.labels(organisationId, projectId),
    queryFn: () => fetchIssueLabels(organisationId ?? '', projectId),
    enabled: Boolean(enabled && organisationId),
  })

export const useIssueComments = (organisationId: string | null, issueId: string | null) =>
  useQuery({
    queryKey: issueKeys.comments(organisationId, issueId),
    queryFn: () => fetchIssueComments(organisationId ?? '', issueId ?? ''),
    enabled: enabledWhen(organisationId, issueId),
  })

export const useIssueAttachments = (organisationId: string | null, issueId: string | null) =>
  useQuery({
    queryKey: issueKeys.attachments(organisationId, issueId),
    queryFn: () => fetchIssueAttachments(organisationId ?? '', issueId ?? ''),
    enabled: enabledWhen(organisationId, issueId),
  })

export const useProjectIssueAttachments = (organisationId: string | null, projectId: string | null, enabled = true) =>
  useQuery({
    queryKey: issueKeys.projectAttachments(organisationId, projectId),
    queryFn: () => fetchProjectIssueAttachments(organisationId ?? '', projectId ?? ''),
    enabled: Boolean(enabled && organisationId && projectId),
  })

export const useIssueBlockers = (organisationId: string | null, issueId: string | null) =>
  useQuery({
    queryKey: issueKeys.blockers(organisationId, issueId),
    queryFn: () => fetchIssueBlockers(organisationId ?? '', issueId ?? ''),
    enabled: enabledWhen(organisationId, issueId),
  })

export const useIssueRelations = (organisationId: string | null, issueId: string | null) =>
  useQuery({
    queryKey: issueKeys.relations(organisationId, issueId),
    queryFn: () => fetchIssueRelations(organisationId ?? '', issueId ?? ''),
    enabled: enabledWhen(organisationId, issueId),
  })

export const useIssueLinks = (organisationId: string | null, issueId: string | null) =>
  useQuery({
    queryKey: issueKeys.links(organisationId, issueId),
    queryFn: () => fetchIssueLinks(organisationId ?? '', issueId ?? ''),
    enabled: enabledWhen(organisationId, issueId),
  })

export const useIssueSubscribers = (organisationId: string | null, issueId: string | null) =>
  useQuery({
    queryKey: issueKeys.subscribers(organisationId, issueId),
    queryFn: () => fetchIssueSubscribers(organisationId ?? '', issueId ?? ''),
    enabled: enabledWhen(organisationId, issueId),
  })

export const useIssueVotes = (organisationId: string | null, issueId: string | null) =>
  useQuery({
    queryKey: issueKeys.votes(organisationId, issueId),
    queryFn: () => fetchIssueVotes(organisationId ?? '', issueId ?? ''),
    enabled: enabledWhen(organisationId, issueId),
  })

export const useIssueReactions = (organisationId: string | null, issueId: string | null) =>
  useQuery({
    queryKey: issueKeys.reactions(organisationId, issueId),
    queryFn: () => fetchIssueReactions(organisationId ?? '', issueId ?? ''),
    enabled: enabledWhen(organisationId, issueId),
  })

export const useCommentReactions = (organisationId: string | null, issueId: string | null) =>
  useQuery({
    queryKey: issueKeys.commentReactions(organisationId, issueId),
    queryFn: () => fetchCommentReactions(organisationId ?? '', issueId ?? ''),
    enabled: enabledWhen(organisationId, issueId),
  })

export const useIssueLabelLinks = (organisationId: string | null, issueId: string | null) =>
  useQuery({
    queryKey: issueKeys.labelLinks(organisationId, issueId),
    queryFn: () => fetchIssueLabelLinks(organisationId ?? '', issueId ?? ''),
    enabled: enabledWhen(organisationId, issueId),
  })

export const useIssueAssignees = (organisationId: string | null, issueId: string | null) =>
  useQuery({
    queryKey: issueKeys.assignees(organisationId, issueId),
    queryFn: () => fetchIssueAssignees(organisationId ?? '', issueId ?? ''),
    enabled: enabledWhen(organisationId, issueId),
  })

export const useProjectIssueAssignees = (organisationId: string | null, projectId: string | null, enabled = true) =>
  useQuery({
    queryKey: issueKeys.projectAssignees(organisationId, projectId),
    queryFn: () => fetchProjectIssueAssignees(organisationId ?? '', projectId ?? ''),
    enabled: Boolean(enabled && organisationId && projectId),
  })

export const useIssueMentions = (organisationId: string | null, issueId: string | null) =>
  useQuery({
    queryKey: issueKeys.mentions(organisationId, issueId),
    queryFn: () => fetchIssueMentions(organisationId ?? '', issueId ?? ''),
    enabled: enabledWhen(organisationId, issueId),
  })

export const useOrganisationMemberProfiles = (organisationId: string | null, enabled = true) =>
  useQuery({
    queryKey: issueKeys.memberProfiles(organisationId),
    queryFn: () => fetchOrganisationMemberProfiles(organisationId ?? ''),
    enabled: Boolean(enabled && organisationId),
  })

export const useCreateIssue = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: IssueInput) => createIssue(input),
    onSuccess: async (issue, input) => {
      queryClient.setQueryData(issueKeys.detail(input.organisation_id, issue.id), issue)
      await invalidateQueryKeys(queryClient, [
        issueKeys.all(input.organisation_id),
        issueKeys.activities(input.organisation_id, issue.id),
        ['open-kb', 'project-summary', input.organisation_id],
      ])
    },
  })
}

export const useUpdateIssue = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: IssueUpdateInput) => updateIssue(input),
    onSuccess: async (issue, input) => {
      queryClient.setQueryData(issueKeys.detail(input.organisation_id, issue.id), issue)
      await invalidateQueryKeys(queryClient, [
        issueKeys.all(input.organisation_id),
        issueKeys.activities(input.organisation_id, issue.id),
      ])
    },
  })
}

export const useCreateIssueComment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: IssueCommentInput) => createIssueComment(input),
    onSuccess: async (_comment, input) => {
      await invalidateQueryKeys(queryClient, [
        issueKeys.comments(input.organisation_id, input.issue_id),
        issueKeys.activities(input.organisation_id, input.issue_id),
      ])
    },
  })
}

export const useUploadIssueAttachment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: IssueAttachmentInput) => uploadIssueAttachment(input),
    onSuccess: async (_attachment, input) => {
      await invalidateQueryKeys(queryClient, [
        issueKeys.attachments(input.organisation_id, input.issue_id),
        issueKeys.activities(input.organisation_id, input.issue_id),
      ])
    },
  })
}

export const useRemoveIssueAttachment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeIssueAttachment,
    onSuccess: async (_result, input) => {
      await invalidateQueryKeys(queryClient, [
        ['open-kb', 'issues', input.organisationId, 'attachments'],
        ['open-kb', 'issues', input.organisationId, 'activities'],
      ])
    },
  })
}

export const useAddIssueBlocker = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addIssueBlocker,
    onSuccess: async (_blocker, input) => {
      await invalidateQueryKeys(queryClient, [
        issueKeys.blockers(input.organisationId, input.issueId),
        issueKeys.activities(input.organisationId, input.issueId),
      ])
    },
  })
}

export const useRemoveIssueBlocker = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeIssueBlocker,
    onSuccess: async (_result, input) => {
      await invalidateQueryKeys(queryClient, [
        ['open-kb', 'issues', input.organisationId, 'blockers'],
        ['open-kb', 'issues', input.organisationId, 'activities'],
      ])
    },
  })
}

export const useAddIssueRelation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addIssueRelation,
    onSuccess: async (_relation, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: issueKeys.relations(input.organisationId, input.issueId) }),
        queryClient.invalidateQueries({ queryKey: issueKeys.activities(input.organisationId, input.issueId) }),
      ])
    },
  })
}

export const useRemoveIssueRelation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeIssueRelation,
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'relations'] }),
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'activities'] }),
      ])
    },
  })
}

export const useAddIssueLink = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addIssueLink,
    onSuccess: async (_link, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: issueKeys.links(input.organisationId, input.issueId) }),
        queryClient.invalidateQueries({ queryKey: issueKeys.activities(input.organisationId, input.issueId) }),
      ])
    },
  })
}

export const useRemoveIssueLink = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeIssueLink,
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'links'] }),
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'activities'] }),
      ])
    },
  })
}

export const useSubscribeToIssue = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: subscribeToIssue,
    onSuccess: async (_subscriber, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: issueKeys.subscribers(input.organisationId, input.issueId) }),
        queryClient.invalidateQueries({ queryKey: issueKeys.activities(input.organisationId, input.issueId) }),
      ])
    },
  })
}

export const useUnsubscribeFromIssue = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: unsubscribeFromIssue,
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'subscribers'] }),
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'activities'] }),
      ])
    },
  })
}

export const useVoteForIssue = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: voteForIssue,
    onSuccess: async (_vote, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: issueKeys.votes(input.organisationId, input.issueId) }),
        queryClient.invalidateQueries({ queryKey: issueKeys.activities(input.organisationId, input.issueId) }),
      ])
    },
  })
}

export const useRemoveIssueVote = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeIssueVote,
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'votes'] }),
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'activities'] }),
      ])
    },
  })
}

export const useAddIssueReaction = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addIssueReaction,
    onSuccess: async (_reaction, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: issueKeys.reactions(input.organisationId, input.issueId) }),
        queryClient.invalidateQueries({ queryKey: issueKeys.activities(input.organisationId, input.issueId) }),
      ])
    },
  })
}

export const useRemoveIssueReaction = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeIssueReaction,
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'reactions'] }),
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'activities'] }),
      ])
    },
  })
}

export const useAddCommentReaction = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addCommentReaction,
    onSuccess: async (_reaction, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: issueKeys.commentReactions(input.organisationId, input.issueId) }),
        queryClient.invalidateQueries({ queryKey: issueKeys.activities(input.organisationId, input.issueId) }),
      ])
    },
  })
}

export const useRemoveCommentReaction = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeCommentReaction,
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'comment-reactions'] }),
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'activities'] }),
      ])
    },
  })
}

export const useCreateIssueLabel = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: IssueLabelInput) => createIssueLabel(input),
    onSuccess: async (_label, input) => {
      await queryClient.invalidateQueries({ queryKey: issueKeys.labels(input.organisation_id, input.project_id) })
    },
  })
}

export const useCreateIssueState = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: IssueStateInput) => createIssueState(input),
    onSuccess: async (_state, input) => {
      await queryClient.invalidateQueries({ queryKey: issueKeys.states(input.organisation_id, input.project_id) })
    },
  })
}

export const useCreateIssueView = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SavedIssueViewInput) => createIssueView(input),
    onSuccess: async (_view, input) => {
      await queryClient.invalidateQueries({ queryKey: issueKeys.views(input.organisation_id) })
    },
  })
}

export const useAddIssueLabelLink = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addIssueLabelLink,
    onSuccess: async (_link, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: issueKeys.labelLinks(input.organisationId, input.issueId) }),
        queryClient.invalidateQueries({ queryKey: issueKeys.activities(input.organisationId, input.issueId) }),
      ])
    },
  })
}

export const useRemoveIssueLabelLink = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeIssueLabelLink,
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'label-links'] }),
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'activities'] }),
      ])
    },
  })
}

export const useAddIssueAssignee = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addIssueAssignee,
    onSuccess: async (_assignee, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: issueKeys.assignees(input.organisationId, input.issueId) }),
        queryClient.invalidateQueries({ queryKey: issueKeys.activities(input.organisationId, input.issueId) }),
      ])
    },
  })
}

export const useRemoveIssueAssignee = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeIssueAssignee,
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'assignees'] }),
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'activities'] }),
      ])
    },
  })
}

export const useAddIssueMention = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addIssueMention,
    onSuccess: async (_mention, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: issueKeys.mentions(input.organisationId, input.issueId) }),
        queryClient.invalidateQueries({ queryKey: issueKeys.activities(input.organisationId, input.issueId) }),
      ])
    },
  })
}

export const useRemoveIssueMention = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeIssueMention,
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'mentions'] }),
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'issues', input.organisationId, 'activities'] }),
      ])
    },
  })
}
