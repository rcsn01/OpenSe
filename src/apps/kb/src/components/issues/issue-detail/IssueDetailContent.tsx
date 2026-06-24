import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Input, Select, cn } from '@repo/ui'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Circle,
  ExternalLink,
  Link2,
  Maximize2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Share2,
  Star,
  ThumbsUp,
  X,
} from 'lucide-react'
import { useAuth } from '@repo/shared/auth/context'
import { toast } from 'sonner'
import { RichTextEditor, type RichTextEditorValue } from '../../editor'
import { IssueConnectionsSection } from '../IssueConnectionsSection'
import { IssuePropertiesSidebar } from '../IssuePropertiesSidebar'
import { ReactionBar } from '../IssueReactions'
import { getProjectIssuePath, getProjectListPath } from '../../../lib/projectRoutes'
import {
  useAddIssueBlocker,
  useAddIssueAssignee,
  useAddIssueLabelLink,
  useAddIssueLink,
  useAddIssueMention,
  useAddIssueReaction,
  useAddIssueRelation,
  useAddCommentReaction,
  useCreateIssueLabel,
  useCreateIssueComment,
  useCommentReactions,
  useIssueActivities,
  useIssueAttachments,
  useIssueAssignees,
  useIssueBlockers,
  useIssueComments,
  useIssueLabelLinks,
  useIssueLabels,
  useIssueLinks,
  useIssueMentions,
  useIssueReactions,
  useIssueRelations,
  useIssueStates,
  useIssueSubscribers,
  useIssueVotes,
  useIssues,
  useOrganisationMemberProfiles,
  useRemoveIssueAssignee,
  useRemoveIssueAttachment,
  useRemoveIssueBlocker,
  useRemoveCommentReaction,
  useRemoveIssueLabelLink,
  useRemoveIssueLink,
  useRemoveIssueMention,
  useRemoveIssueReaction,
  useRemoveIssueRelation,
  useRemoveIssueVote,
  useSubscribeToIssue,
  useUnsubscribeFromIssue,
  useUpdateIssue,
  useUploadIssueAttachment,
  useVoteForIssue,
} from '../../../hooks/queries/useIssues'
import {
  useAddIssueCycleLink,
  useAddIssueModuleLink,
  useCycles,
  useEstimatePoints,
  useIssueCycleLinks,
  useIssueModuleLinks,
  useModules,
  useRemoveIssueCycleLink,
  useRemoveIssueModuleLink,
} from '../../../hooks/queries/usePlanning'
import { useAddFavorite, useFavorites, useRecordRecentVisitOnce, useRemoveFavorite } from '../../../hooks/queries/usePersonal'
import type { Issue, IssueLinkType, IssuePriority, IssueRelationType } from '../../../types'
import {
  formatIssueKey,
  issuePriorityOptions as priorityOptions,
} from '../../../lib/issueFormatting'
import { formatShortDate } from '../../../lib/dateFormatting'
import { formatProfileName } from '../../../lib/profileFormatting'
import { deriveIssueDetailSelections } from './issueDetailDerived'

type IssueDetailMode = 'expanded' | 'pane'

const profileInitials = (profile: { full_name: string | null; username: string | null; email: string | null } | null | undefined) => {
  const name = formatProfileName(profile ?? null)
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'OK'
}

const IssueAvatar = ({
  profile,
  className,
}: {
  profile: { full_name: string | null; username: string | null; email: string | null } | null | undefined
  className?: string
}) => (
  <span className={cn('inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-xs font-semibold text-slate-900', className)}>
    {profileInitials(profile)}
  </span>
)

const IssueInlineRow = ({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) => (
  <div className="grid gap-3 py-2 text-sm md:grid-cols-[8.5rem_minmax(0,1fr)]">
    <div className="font-medium text-[var(--color-muted-foreground)]">{label}</div>
    <div className="min-w-0">{children}</div>
  </div>
)

export const IssueDetailContent = ({
  issue,
  organisationId,
  mode = 'expanded',
  onClose,
  onExpand,
  backHref,
}: {
  issue: Issue
  organisationId: string
  mode?: IssueDetailMode
  onClose?: () => void
  onExpand?: () => void
  backHref?: string
}) => {
  const { user } = useAuth()
  const profileId = user?.id ?? null
  const { data: states = [] } = useIssueStates(organisationId, issue.project_id)
  const { data: labels = [] } = useIssueLabels(organisationId, issue.project_id)
  const { data: labelLinks = [] } = useIssueLabelLinks(organisationId, issue.id)
  const { data: memberProfiles = [] } = useOrganisationMemberProfiles(organisationId)
  const { data: assignees = [] } = useIssueAssignees(organisationId, issue.id)
  const { data: mentions = [] } = useIssueMentions(organisationId, issue.id)
  const { data: cycles = [] } = useCycles(organisationId, issue.project_id)
  const { data: modules = [] } = useModules(organisationId, issue.project_id)
  const { data: estimatePoints = [] } = useEstimatePoints(organisationId, issue.project_id)
  const { data: cycleLinks = [] } = useIssueCycleLinks(organisationId, issue.id)
  const { data: moduleLinks = [] } = useIssueModuleLinks(organisationId, issue.id)
  const { data: comments = [], isLoading: commentsLoading } = useIssueComments(organisationId, issue.id)
  const { data: attachments = [], isLoading: attachmentsLoading } = useIssueAttachments(organisationId, issue.id)
  const { data: projectIssues = [] } = useIssues(organisationId, { project_id: issue.project_id })
  const { data: blockers = [] } = useIssueBlockers(organisationId, issue.id)
  const { data: relations = [] } = useIssueRelations(organisationId, issue.id)
  const { data: issueLinks = [] } = useIssueLinks(organisationId, issue.id)
  const { data: subscribers = [] } = useIssueSubscribers(organisationId, issue.id)
  const { data: votes = [] } = useIssueVotes(organisationId, issue.id)
  const { data: issueReactions = [] } = useIssueReactions(organisationId, issue.id)
  const { data: commentReactions = [] } = useCommentReactions(organisationId, issue.id)
  const { data: activities = [], isLoading: activitiesLoading } = useIssueActivities(organisationId, issue.id)
  const { data: favorites = [] } = useFavorites(organisationId, profileId)
  const updateIssue = useUpdateIssue()
  const createComment = useCreateIssueComment()
  const uploadAttachment = useUploadIssueAttachment()
  const removeAttachment = useRemoveIssueAttachment()
  const addBlocker = useAddIssueBlocker()
  const removeBlocker = useRemoveIssueBlocker()
  const addRelation = useAddIssueRelation()
  const removeRelation = useRemoveIssueRelation()
  const addLink = useAddIssueLink()
  const removeLink = useRemoveIssueLink()
  const subscribeToIssue = useSubscribeToIssue()
  const unsubscribeFromIssue = useUnsubscribeFromIssue()
  const voteForIssue = useVoteForIssue()
  const removeIssueVote = useRemoveIssueVote()
  const addIssueReaction = useAddIssueReaction()
  const removeIssueReaction = useRemoveIssueReaction()
  const addCommentReaction = useAddCommentReaction()
  const removeCommentReaction = useRemoveCommentReaction()
  const addFavorite = useAddFavorite()
  const removeFavorite = useRemoveFavorite()
  const recordRecentVisitOnce = useRecordRecentVisitOnce()
  const createLabel = useCreateIssueLabel()
  const addLabelLink = useAddIssueLabelLink()
  const removeLabelLink = useRemoveIssueLabelLink()
  const addAssignee = useAddIssueAssignee()
  const removeAssignee = useRemoveIssueAssignee()
  const addMention = useAddIssueMention()
  const removeMention = useRemoveIssueMention()
  const addCycleLink = useAddIssueCycleLink()
  const removeCycleLink = useRemoveIssueCycleLink()
  const addModuleLink = useAddIssueModuleLink()
  const removeModuleLink = useRemoveIssueModuleLink()
  const [title, setTitle] = useState(issue.title)
  const [priority, setPriority] = useState<IssuePriority>(issue.priority)
  const [stateId, setStateId] = useState(issue.state_id ?? '')
  const [estimatePointId, setEstimatePointId] = useState(issue.estimate_point_id ?? '')
  const [description, setDescription] = useState<RichTextEditorValue>({
    json: issue.description_json,
    html: issue.description_html ?? '',
    text: issue.description_text ?? '',
  })
  const [comment, setComment] = useState<RichTextEditorValue | null>(null)
  const [commentEditorKey, setCommentEditorKey] = useState(0)
  const [selectedLabelId, setSelectedLabelId] = useState('')
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#64748b')
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('')
  const [selectedMentionId, setSelectedMentionId] = useState('')
  const [selectedCycleId, setSelectedCycleId] = useState('')
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [selectedBlockerIssueId, setSelectedBlockerIssueId] = useState('')
  const [selectedRelationIssueId, setSelectedRelationIssueId] = useState('')
  const [relationType, setRelationType] = useState<IssueRelationType>('related')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkType, setLinkType] = useState<IssueLinkType>('external')
  const [activityTab, setActivityTab] = useState<'comments' | 'activity'>('comments')

  const issueKey = useMemo(
    () => formatIssueKey(issue),
    [issue],
  )
  const {
    availableLabels,
    availableAssignees,
    availableMentions,
    availableCycles,
    availableModules,
    availableBlockerIssues,
    availableRelationIssues,
    currentSubscriber,
    currentVote,
    currentFavorite,
  } = useMemo(
    () => deriveIssueDetailSelections({
      issue,
      labels,
      labelLinks,
      memberProfiles,
      assignees,
      mentions,
      cycles,
      modules,
      cycleLinks,
      moduleLinks,
      blockers,
      relations,
      projectIssues,
      relationType,
      subscribers,
      votes,
      favorites,
      profileId,
    }),
    [assignees, blockers, cycleLinks, cycles, favorites, issue, labelLinks, labels, memberProfiles, mentions, moduleLinks, modules, profileId, projectIssues, relationType, relations, subscribers, votes],
  )
  const primaryAssignee = assignees[0]
  const completedState = useMemo(
    () => states.find((state) => state.group_key === 'completed') ?? null,
    [states],
  )
  const isComplete = Boolean(issue.completed_at || issue.state?.group_key === 'completed' || (stateId && states.find((state) => state.id === stateId)?.group_key === 'completed'))

  useEffect(() => {
    if (!organisationId || !profileId) return

    recordRecentVisitOnce({
      organisationId,
      profileId,
      kind: 'issue',
      projectId: issue.project_id,
      issueId: issue.id,
      title: issue.title,
      description: issue.description_text,
      status: issue.priority,
      route: getProjectIssuePath(issue.project_id, issue.id),
      identifier: issueKey,
    })
  }, [
    issue.description_text,
    issue.id,
    issue.priority,
    issue.project_id,
    issue.title,
    issueKey,
    organisationId,
    profileId,
    recordRecentVisitOnce,
  ])

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) return

    try {
      await updateIssue.mutateAsync({
        id: issue.id,
        organisation_id: organisationId,
        title,
        priority,
        state_id: stateId || null,
        estimate_point_id: estimatePointId || null,
        description_json: description.json,
        description_html: description.html,
        description_text: description.text,
      })
      toast.success('Issue updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update issue')
    }
  }

  const handleMarkComplete = async () => {
    if (!completedState) {
      toast.error('No completed state is configured for this project')
      return
    }

    try {
      await updateIssue.mutateAsync({
        id: issue.id,
        organisation_id: organisationId,
        state_id: completedState.id,
      })
      setStateId(completedState.id)
      toast.success('Task marked complete')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark task complete')
    }
  }

  const handleComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!comment?.text.trim()) return

    try {
      await createComment.mutateAsync({
        organisation_id: organisationId,
        project_id: issue.project_id,
        issue_id: issue.id,
        description_json: comment.json,
        description_html: comment.html,
        description_text: comment.text,
      })
      setComment(null)
      setCommentEditorKey((current) => current + 1)
      toast.success('Comment added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add comment')
    }
  }

  const handleAttachmentFile = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null)
  }

  const handleUploadAttachment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedFile) return

    await uploadSelectedAttachment()
  }

  const uploadSelectedAttachment = async () => {
    if (!selectedFile) return

    try {
      await uploadAttachment.mutateAsync({
        organisation_id: organisationId,
        project_id: issue.project_id,
        issue_id: issue.id,
        file: selectedFile,
      })
      setSelectedFile(null)
      setFileInputKey((current) => current + 1)
      toast.success('Attachment uploaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload attachment')
    }
  }

  const handleRemoveAttachment = async (attachmentId: string, storagePath?: string | null) => {
    try {
      await removeAttachment.mutateAsync({ organisationId, attachmentId, storagePath })
      toast.success('Attachment removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove attachment')
    }
  }

  const handleAddBlocker = async () => {
    if (!selectedBlockerIssueId) return

    try {
      await addBlocker.mutateAsync({
        organisationId,
        projectId: issue.project_id,
        issueId: issue.id,
        blockerIssueId: selectedBlockerIssueId,
      })
      setSelectedBlockerIssueId('')
      toast.success('Blocker added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add blocker')
    }
  }

  const handleRemoveBlocker = async (blockerId: string) => {
    try {
      await removeBlocker.mutateAsync({ organisationId, blockerId })
      toast.success('Blocker removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove blocker')
    }
  }

  const handleAddRelation = async () => {
    if (!selectedRelationIssueId) return

    try {
      await addRelation.mutateAsync({
        organisationId,
        projectId: issue.project_id,
        issueId: issue.id,
        relatedIssueId: selectedRelationIssueId,
        relationType,
      })
      setSelectedRelationIssueId('')
      toast.success('Relation added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add relation')
    }
  }

  const handleRemoveRelation = async (relationId: string) => {
    try {
      await removeRelation.mutateAsync({ organisationId, relationId })
      toast.success('Relation removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove relation')
    }
  }

  const handleAddLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!linkUrl.trim()) return

    try {
      await addLink.mutateAsync({
        organisationId,
        projectId: issue.project_id,
        issueId: issue.id,
        title: linkTitle,
        url: linkUrl,
        linkType,
      })
      setLinkTitle('')
      setLinkUrl('')
      setLinkType('external')
      toast.success('Link added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add link')
    }
  }

  const handleRemoveLink = async (linkId: string) => {
    try {
      await removeLink.mutateAsync({ organisationId, linkId })
      toast.success('Link removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove link')
    }
  }

  const handleToggleSubscribe = async () => {
    if (!profileId) return

    try {
      if (currentSubscriber) {
        await unsubscribeFromIssue.mutateAsync({ organisationId, subscriberId: currentSubscriber.id })
        toast.success('Unsubscribed from issue')
      } else {
        await subscribeToIssue.mutateAsync({
          organisationId,
          projectId: issue.project_id,
          issueId: issue.id,
          profileId,
        })
        toast.success('Subscribed to issue')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update subscription')
    }
  }

  const handleToggleVote = async () => {
    if (!profileId) return

    try {
      if (currentVote) {
        await removeIssueVote.mutateAsync({ organisationId, voteId: currentVote.id })
        toast.success('Vote removed')
      } else {
        await voteForIssue.mutateAsync({
          organisationId,
          projectId: issue.project_id,
          issueId: issue.id,
          profileId,
        })
        toast.success('Vote added')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update vote')
    }
  }

  const handleToggleFavorite = async () => {
    if (!profileId) return

    try {
      if (currentFavorite) {
        await removeFavorite.mutateAsync({ organisationId, favoriteId: currentFavorite.id })
        toast.success('Removed favorite')
      } else {
        await addFavorite.mutateAsync({
          organisationId,
          profileId,
          kind: 'issue',
          projectId: issue.project_id,
          issueId: issue.id,
          title: issue.title,
          description: issue.description_text,
          status: issue.priority,
          route: getProjectIssuePath(issue.project_id, issue.id),
          identifier: issueKey,
        })
        toast.success('Added favorite')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update favorite')
    }
  }

  const handleToggleIssueReaction = async (name: string, existingReactionId: string | null) => {
    if (!profileId) return

    try {
      if (existingReactionId) {
        await removeIssueReaction.mutateAsync({ organisationId, reactionId: existingReactionId })
      } else {
        await addIssueReaction.mutateAsync({
          organisationId,
          projectId: issue.project_id,
          issueId: issue.id,
          profileId,
          name,
        })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update reaction')
    }
  }

  const handleToggleCommentReaction = async (
    commentId: string,
    name: string,
    existingReactionId: string | null,
  ) => {
    if (!profileId) return

    try {
      if (existingReactionId) {
        await removeCommentReaction.mutateAsync({ organisationId, reactionId: existingReactionId })
      } else {
        await addCommentReaction.mutateAsync({
          organisationId,
          projectId: issue.project_id,
          issueId: issue.id,
          commentId,
          profileId,
          name,
        })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update comment reaction')
    }
  }

  const handleAddLabel = async () => {
    if (!selectedLabelId) return

    try {
      await addLabelLink.mutateAsync({
        organisationId,
        projectId: issue.project_id,
        issueId: issue.id,
        labelId: selectedLabelId,
      })
      setSelectedLabelId('')
      toast.success('Label added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add label')
    }
  }

  const handleCreateLabel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newLabelName.trim()) return

    try {
      const label = await createLabel.mutateAsync({
        organisation_id: organisationId,
        project_id: issue.project_id,
        name: newLabelName,
        color: newLabelColor,
      })
      await addLabelLink.mutateAsync({
        organisationId,
        projectId: issue.project_id,
        issueId: issue.id,
        labelId: label.id,
      })
      setNewLabelName('')
      toast.success('Label created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create label')
    }
  }

  const handleRemoveLabel = async (linkId: string) => {
    try {
      await removeLabelLink.mutateAsync({ organisationId, linkId })
      toast.success('Label removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove label')
    }
  }

  const handleAddAssignee = async () => {
    if (!selectedAssigneeId) return

    try {
      await addAssignee.mutateAsync({
        organisationId,
        projectId: issue.project_id,
        issueId: issue.id,
        profileId: selectedAssigneeId,
      })
      setSelectedAssigneeId('')
      toast.success('Assignee added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add assignee')
    }
  }

  const handleRemoveAssignee = async (assigneeId: string) => {
    try {
      await removeAssignee.mutateAsync({ organisationId, assigneeId })
      toast.success('Assignee removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove assignee')
    }
  }

  const handleAddMention = async () => {
    if (!selectedMentionId) return

    try {
      await addMention.mutateAsync({
        organisationId,
        projectId: issue.project_id,
        issueId: issue.id,
        profileId: selectedMentionId,
      })
      setSelectedMentionId('')
      toast.success('Mention added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add mention')
    }
  }

  const handleRemoveMention = async (mentionId: string) => {
    try {
      await removeMention.mutateAsync({ organisationId, mentionId })
      toast.success('Mention removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove mention')
    }
  }

  const handleAddCycle = async () => {
    if (!selectedCycleId) return

    try {
      await addCycleLink.mutateAsync({
        organisationId,
        projectId: issue.project_id,
        issueId: issue.id,
        cycleId: selectedCycleId,
      })
      setSelectedCycleId('')
      toast.success('Cycle added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add cycle')
    }
  }

  const handleRemoveCycle = async (linkId: string) => {
    try {
      await removeCycleLink.mutateAsync({ organisationId, linkId })
      toast.success('Cycle removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove cycle')
    }
  }

  const handleAddModule = async () => {
    if (!selectedModuleId) return

    try {
      await addModuleLink.mutateAsync({
        organisationId,
        projectId: issue.project_id,
        issueId: issue.id,
        moduleId: selectedModuleId,
      })
      setSelectedModuleId('')
      toast.success('Module added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add module')
    }
  }

  const handleRemoveModule = async (linkId: string) => {
    try {
      await removeModuleLink.mutateAsync({ organisationId, linkId })
      toast.success('Module removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove module')
    }
  }

  const toolbar = (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-background)] px-4">
      <div className="flex min-w-0 items-center gap-2">
        {mode === 'expanded' ? (
          <Link to={backHref ?? getProjectListPath(issue.project_id)} className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]" aria-label="Back to list">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={handleMarkComplete} loading={updateIssue.isPending} disabled={isComplete}>
          <Check className="h-4 w-4" />
          {isComplete ? 'Complete' : 'Mark complete'}
        </Button>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <IssueAvatar profile={primaryAssignee?.profile} />
        <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]" aria-label="Add assignee">
          <Plus className="h-4 w-4" />
        </button>
        <Button type="button" variant="outline" size="sm">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
        <span className="mx-1 h-6 w-px bg-[var(--color-border)]" />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleToggleVote} loading={voteForIssue.isPending || removeIssueVote.isPending} disabled={!profileId} aria-label="Vote for issue">
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleToggleFavorite} loading={addFavorite.isPending || removeFavorite.isPending} disabled={!profileId} aria-label={currentFavorite ? 'Remove favorite' : 'Add favorite'}>
          <Star className={cn('h-4 w-4', currentFavorite ? 'fill-current text-amber-500' : '')} />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Copy issue link" onClick={() => void navigator.clipboard?.writeText(window.location.href)}>
          <Link2 className="h-4 w-4" />
        </Button>
        {mode === 'pane' && onExpand ? (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Expand issue" onClick={onExpand}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="More issue actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        {onClose ? (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Close issue detail" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col bg-[var(--color-background)] text-[var(--color-foreground)]', mode === 'pane' ? 'h-full border-l border-[var(--color-border)]' : 'mx-auto h-full w-full max-w-[calc(100vw-4rem)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-[var(--shadow-sm)]')}>
      {toolbar}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <form onSubmit={handleSave} className={cn('mx-auto w-full space-y-6 px-6 py-5', mode === 'pane' ? 'max-w-none' : 'max-w-[82rem]')}>
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
              <span className="inline-flex h-4 w-4 rotate-45 rounded-[3px] border border-emerald-500" />
              <span>{issue.state?.name ?? 'Task'}</span>
              <Badge variant="outline">{issueKey}</Badge>
            </div>

            <Input
              aria-label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="h-auto border-0 bg-transparent px-0 py-1 text-2xl font-semibold shadow-none outline-none focus:border-transparent"
            />
          </div>

          <div className="space-y-1">
            <IssueInlineRow label="Assignee">
              <div className="flex flex-wrap items-center gap-2">
                {assignees.length === 0 ? (
                  <span className="text-[var(--color-muted-foreground)]">No assignee</span>
                ) : assignees.map((assignee) => (
                  <span key={assignee.id} className="inline-flex items-center gap-2">
                    <IssueAvatar profile={assignee.profile} />
                    <span className="font-medium">{formatProfileName(assignee.profile)}</span>
                    <button type="button" aria-label="Remove assignee" onClick={() => handleRemoveAssignee(assignee.id)} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                ))}
                {availableAssignees.length > 0 ? (
                  <div className="flex max-w-xs items-center gap-2">
                    <Select
                      className="h-8 border border-[var(--color-border)] bg-[var(--color-background)]"
                      value={selectedAssigneeId}
                      onChange={(event) => setSelectedAssigneeId(event.target.value)}
                      placeholder="Add assignee"
                      options={availableAssignees.map((member) => ({ value: member.profile_id, label: formatProfileName(member.profile) }))}
                    />
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8" aria-label="Add assignee" onClick={handleAddAssignee} disabled={!selectedAssigneeId}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </IssueInlineRow>

            <IssueInlineRow label="Due date">
              <div className="flex max-w-xs items-center gap-2">
                <CalendarDays className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                <Input
                  aria-label="Due date"
                  type="date"
                  value={issue.target_date ?? ''}
                  onChange={(event) => updateIssue.mutate({ id: issue.id, organisation_id: organisationId, target_date: event.target.value || null })}
                  className="h-8 border-0 bg-transparent px-0"
                />
                {issue.target_date ? <span className="text-xs text-[var(--color-muted-foreground)]">{formatShortDate(issue.target_date)}</span> : null}
              </div>
            </IssueInlineRow>

            <IssueInlineRow label="Status">
              <div className="grid max-w-xl gap-2 sm:grid-cols-2">
                <Select
                  aria-label="State"
                  className="h-8 border border-[var(--color-border)] bg-[var(--color-background)]"
                  value={stateId}
                  onChange={(event) => setStateId(event.target.value)}
                  options={states.map((state) => ({ value: state.id, label: state.name }))}
                  placeholder={states.length === 0 ? 'No states yet' : undefined}
                />
                <Select
                  aria-label="Priority"
                  className="h-8 border border-[var(--color-border)] bg-[var(--color-background)]"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as IssuePriority)}
                  options={priorityOptions}
                />
              </div>
            </IssueInlineRow>

            <IssueInlineRow label="Dependencies">
              <div className="space-y-2">
                {blockers.length === 0 ? (
                  <span className="text-[var(--color-muted-foreground)]">No dependencies</span>
                ) : blockers.map((blocker) => (
                  <div key={blocker.id} className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                    <span className="text-amber-700">Blocked by</span>
                    <span className="text-[var(--color-muted-foreground)]">·</span>
                    <Circle className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                    <Link to={blocker.blocker_issue ? getProjectIssuePath(blocker.blocker_issue.project_id, blocker.blocker_issue.id) : '#'} className="min-w-0 truncate font-medium hover:underline">
                      {blocker.blocker_issue?.title ?? 'Unknown issue'}
                    </Link>
                    <span className="text-[var(--color-muted-foreground)]">{blocker.blocker_issue?.target_date ? `· ${formatShortDate(blocker.blocker_issue.target_date)}` : null}</span>
                  </div>
                ))}
                <div className="flex max-w-xl gap-2 pt-1">
                  <Select
                    className="h-8 border border-[var(--color-border)] bg-[var(--color-background)]"
                    value={selectedBlockerIssueId}
                    onChange={(event) => setSelectedBlockerIssueId(event.target.value)}
                    placeholder={availableBlockerIssues.length === 0 ? 'No issues to add' : 'Add dependencies'}
                    options={availableBlockerIssues.map((item) => ({ value: item.id, label: `${formatIssueKey(item)} · ${item.title}` }))}
                  />
                  <Button type="button" size="icon" variant="outline" className="h-8 w-8" aria-label="Add dependency" onClick={handleAddBlocker} disabled={!selectedBlockerIssueId} loading={addBlocker.isPending}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </IssueInlineRow>
          </div>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Projects</h2>
              <Badge variant="neutral">1</Badge>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Add project metadata">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)] text-sm">
              <div className="flex min-h-10 items-center gap-2">
                <span className="h-3 w-3 rounded-[3px] bg-fuchsia-300" />
                <span className="font-medium">{issue.project?.name ?? 'Unknown project'}</span>
                <span className="text-[var(--color-muted-foreground)]">Project</span>
              </div>
              <div className="grid min-h-10 grid-cols-[minmax(8rem,0.35fr)_minmax(0,1fr)] items-center">
                <span className="text-[var(--color-muted-foreground)]">Modules</span>
                <div className="flex flex-wrap gap-2">
                  {moduleLinks.length === 0 ? <span className="text-[var(--color-muted-foreground)]">No module</span> : moduleLinks.map((link) => <Badge key={link.id} variant="outline">{link.module?.name ?? 'Unknown module'}</Badge>)}
                  {cycleLinks.map((link) => <Badge key={link.id} variant="outline">{link.cycle?.name ?? 'Unknown cycle'}</Badge>)}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Description</h2>
            <RichTextEditor value={issue.description_json} placeholder="What is this task about?" onChange={setDescription} />
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
            <ReactionBar
              reactions={issueReactions}
              currentProfileId={profileId}
              disabled={!profileId}
              pending={addIssueReaction.isPending || removeIssueReaction.isPending}
              onToggle={handleToggleIssueReaction}
            />
            <Button type="submit" size="sm" loading={updateIssue.isPending}>Save changes</Button>
          </div>
        </form>

        <div className={cn('mx-auto w-full space-y-8 px-6 pb-6', mode === 'pane' ? 'max-w-none' : 'max-w-[82rem]')}>
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold">Subtasks</h2>
              <button type="button" className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]" aria-label="Add subtask">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="border-y border-[var(--color-border)] py-3 text-sm text-[var(--color-muted-foreground)]">Type to add a subtask...</div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold">Attachments</h2>
              <label className="inline-flex cursor-pointer items-center text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]" aria-label="Choose attachment">
                <Plus className="h-4 w-4" />
                <input key={fileInputKey} type="file" className="sr-only" onChange={handleAttachmentFile} />
              </label>
              {selectedFile ? <Button type="button" size="sm" variant="outline" onClick={() => void uploadSelectedAttachment()} loading={uploadAttachment.isPending}>Upload</Button> : null}
            </div>
            {attachmentsLoading ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">Loading attachments...</p>
            ) : attachments.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">No attachments.</p>
            ) : (
              <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate">{attachment.name ?? attachment.metadata.file_name}</span>
                    <div className="flex shrink-0 items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                      <span>{attachment.metadata.size ? `${Math.ceil(attachment.metadata.size / 1024)} KB` : ''}</span>
                      {attachment.signed_url ? <a href={attachment.signed_url} target="_blank" rel="noreferrer" aria-label="Open attachment"><ExternalLink className="h-4 w-4" /></a> : null}
                      <button type="button" aria-label="Remove attachment" onClick={() => handleRemoveAttachment(attachment.id, attachment.metadata.storage_path)}><X className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <details className="rounded-[var(--radius-md)] border border-[var(--color-border)]">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Advanced properties and links</summary>
            <div className="grid gap-4 border-t border-[var(--color-border)] p-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
              <IssuePropertiesSidebar
                issue={issue}
                subscribers={subscribers}
                attachments={attachments}
                attachmentsLoading={attachmentsLoading}
                estimatePoints={estimatePoints}
                estimatePointId={estimatePointId}
                cycleLinks={cycleLinks}
                moduleLinks={moduleLinks}
                assignees={assignees}
                mentions={mentions}
                labelLinks={labelLinks}
                availableCycles={availableCycles}
                availableModules={availableModules}
                availableAssignees={availableAssignees}
                availableMentions={availableMentions}
                availableLabels={availableLabels}
                selectedCycleId={selectedCycleId}
                selectedModuleId={selectedModuleId}
                selectedAssigneeId={selectedAssigneeId}
                selectedMentionId={selectedMentionId}
                selectedLabelId={selectedLabelId}
                newLabelColor={newLabelColor}
                newLabelName={newLabelName}
                fileInputKey={fileInputKey}
                selectedFile={selectedFile}
                currentSubscriber={currentSubscriber}
                currentVote={currentVote}
                votes={votes}
                watchPending={subscribeToIssue.isPending || unsubscribeFromIssue.isPending}
                votePending={voteForIssue.isPending || removeIssueVote.isPending}
                uploadPending={uploadAttachment.isPending}
                removeAttachmentPending={removeAttachment.isPending}
                createLabelPending={createLabel.isPending}
                addLabelPending={addLabelLink.isPending}
                currentProfileId={profileId}
                onToggleSubscribe={handleToggleSubscribe}
                onToggleVote={handleToggleVote}
                onEstimatePointIdChange={setEstimatePointId}
                onAttachmentFile={handleAttachmentFile}
                onUploadAttachment={handleUploadAttachment}
                onRemoveAttachment={handleRemoveAttachment}
                onSelectedCycleIdChange={setSelectedCycleId}
                onSelectedModuleIdChange={setSelectedModuleId}
                onSelectedAssigneeIdChange={setSelectedAssigneeId}
                onSelectedMentionIdChange={setSelectedMentionId}
                onSelectedLabelIdChange={setSelectedLabelId}
                onNewLabelColorChange={setNewLabelColor}
                onNewLabelNameChange={setNewLabelName}
                onAddCycle={handleAddCycle}
                onRemoveCycle={handleRemoveCycle}
                onAddModule={handleAddModule}
                onRemoveModule={handleRemoveModule}
                onAddAssignee={handleAddAssignee}
                onRemoveAssignee={handleRemoveAssignee}
                onAddMention={handleAddMention}
                onRemoveMention={handleRemoveMention}
                onAddLabel={handleAddLabel}
                onCreateLabel={handleCreateLabel}
                onRemoveLabel={handleRemoveLabel}
              />
              <IssueConnectionsSection
                blockers={blockers}
                relations={relations}
                issueLinks={issueLinks}
                availableBlockerIssues={availableBlockerIssues}
                availableRelationIssues={availableRelationIssues}
                selectedBlockerIssueId={selectedBlockerIssueId}
                selectedRelationIssueId={selectedRelationIssueId}
                relationType={relationType}
                linkTitle={linkTitle}
                linkUrl={linkUrl}
                linkType={linkType}
                addBlockerPending={addBlocker.isPending}
                addRelationPending={addRelation.isPending}
                addLinkPending={addLink.isPending}
                onSelectedBlockerIssueChange={setSelectedBlockerIssueId}
                onSelectedRelationIssueChange={setSelectedRelationIssueId}
                onRelationTypeChange={setRelationType}
                onLinkTitleChange={setLinkTitle}
                onLinkUrlChange={setLinkUrl}
                onLinkTypeChange={setLinkType}
                onAddBlocker={handleAddBlocker}
                onRemoveBlocker={handleRemoveBlocker}
                onAddRelation={handleAddRelation}
                onRemoveRelation={handleRemoveRelation}
                onAddLink={handleAddLink}
                onRemoveLink={handleRemoveLink}
              />
            </div>
          </details>
        </div>
      </div>

      <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-muted)]/40">
        <div className={cn('mx-auto w-full px-6 py-4', mode === 'pane' ? 'max-w-none' : 'max-w-[82rem]')}>
          <div className="mb-3 flex items-center justify-between border-b border-[var(--color-border)]">
            <div className="flex items-center gap-6">
              <button type="button" onClick={() => setActivityTab('comments')} className={cn('border-b-2 px-0 pb-2 text-sm font-semibold', activityTab === 'comments' ? 'border-[var(--color-foreground)] text-[var(--color-foreground)]' : 'border-transparent text-[var(--color-muted-foreground)]')}>
                Comments
              </button>
              <button type="button" onClick={() => setActivityTab('activity')} className={cn('border-b-2 px-0 pb-2 text-sm font-semibold', activityTab === 'activity' ? 'border-[var(--color-foreground)] text-[var(--color-foreground)]' : 'border-transparent text-[var(--color-muted-foreground)]')}>
                All activity
              </button>
            </div>
            <span className="text-xs font-medium text-[var(--color-muted-foreground)]">Oldest</span>
          </div>

          {activityTab === 'comments' ? (
            <div className="space-y-3">
              {commentsLoading ? <p className="text-sm text-[var(--color-muted-foreground)]">Loading comments...</p> : null}
              {!commentsLoading && comments.length === 0 ? <p className="text-sm text-[var(--color-muted-foreground)]">No comments yet.</p> : null}
              {comments.map((item) => (
                <article key={item.id} className="space-y-2 text-sm">
                  <div className="text-xs text-[var(--color-muted-foreground)]">{formatShortDate(item.created_at.slice(0, 10))}</div>
                  <RichTextEditor value={item.description_json} readOnly />
                  <ReactionBar
                    reactions={commentReactions.filter((reaction) => reaction.comment_id === item.id)}
                    currentProfileId={profileId}
                    disabled={!profileId}
                    pending={addCommentReaction.isPending || removeCommentReaction.isPending}
                    onToggle={(name, existingReactionId) => handleToggleCommentReaction(item.id, name, existingReactionId)}
                  />
                </article>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {activitiesLoading ? <p className="text-sm text-[var(--color-muted-foreground)]">Loading activity...</p> : null}
              {!activitiesLoading && activities.length === 0 ? <p className="text-sm text-[var(--color-muted-foreground)]">No activity yet.</p> : null}
              {activities.map((activityItem) => (
                <article key={activityItem.id} className="flex items-center gap-3 text-sm">
                  <IssueAvatar profile={activityItem.actor_profile} />
                  <span className="font-medium">{formatProfileName(activityItem.actor_profile)}</span>
                  <span className="text-[var(--color-muted-foreground)]">{activityItem.title ?? activityItem.name ?? 'updated this task'}</span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">{formatShortDate(activityItem.created_at.slice(0, 10))}</span>
                </article>
              ))}
            </div>
          )}

          <form onSubmit={handleComment} className="mt-4 grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
            <IssueAvatar profile={user ? { full_name: null, username: null, email: user.email ?? null } : null} />
            <div className="space-y-2">
              <RichTextEditor key={commentEditorKey} placeholder="Add a comment" onChange={(value) => setComment(value)} />
              <div className="flex justify-end">
                <Button type="submit" size="sm" loading={createComment.isPending}>
                  <MessageSquare className="h-4 w-4" />
                  Add comment
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
