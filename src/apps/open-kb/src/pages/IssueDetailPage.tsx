import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, EmptyState, Input, Select } from '@repo/ui'
import { ArrowLeft, Star } from 'lucide-react'
import { useAuth } from '@repo/shared/auth/context'
import { toast } from 'sonner'
import { RichTextEditor, type RichTextEditorValue } from '../components/editor'
import { IssueActivitySection } from '../components/issues/IssueActivitySection'
import { IssueCommentsSection } from '../components/issues/IssueCommentsSection'
import { IssueConnectionsSection } from '../components/issues/IssueConnectionsSection'
import { IssuePropertiesSidebar } from '../components/issues/IssuePropertiesSidebar'
import { ReactionBar } from '../components/issues/IssueReactions'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { useOrganisation } from '../contexts/OrganisationContext'
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
  useIssue,
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
} from '../hooks/queries/useIssues'
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
} from '../hooks/queries/usePlanning'
import { useAddFavorite, useFavorites, useRecordRecentVisit, useRemoveFavorite } from '../hooks/queries/usePersonal'
import type { Issue, IssueLinkType, IssuePriority, IssueRelationType } from '../types'
import {
  formatIssueKey,
  issuePriorityOptions as priorityOptions,
  issuePriorityTone as priorityTone,
} from '../lib/issueFormatting'

const IssueDetailContent = ({
  issue,
  organisationId,
}: {
  issue: Issue
  organisationId: string
}) => {
  const navigate = useNavigate()
  const { user } = useAuth()
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
  const { data: favorites = [] } = useFavorites(organisationId, user?.id ?? null)
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
  const { mutate: recordRecentVisit } = useRecordRecentVisit()
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

  const issueKey = useMemo(
    () => formatIssueKey(issue),
    [issue.project?.identifier, issue.sequence_id],
  )
  const assignedLabelIds = new Set(labelLinks.map((link) => link.label_id).filter(Boolean))
  const assignedProfileIds = new Set(assignees.map((assignee) => assignee.profile_id).filter(Boolean))
  const mentionedProfileIds = new Set(mentions.map((mention) => mention.profile_id).filter(Boolean))
  const assignedCycleIds = new Set(cycleLinks.map((link) => link.cycle_id).filter(Boolean))
  const assignedModuleIds = new Set(moduleLinks.map((link) => link.module_id).filter(Boolean))
  const availableLabels = labels.filter((label) => !assignedLabelIds.has(label.id))
  const availableAssignees = memberProfiles.filter((member) => !assignedProfileIds.has(member.profile_id))
  const availableMentions = memberProfiles.filter((member) => !mentionedProfileIds.has(member.profile_id))
  const availableCycles = cycles.filter((cycle) => !assignedCycleIds.has(cycle.id))
  const availableModules = modules.filter((projectModule) => !assignedModuleIds.has(projectModule.id))
  const blockerIssueIds = new Set(blockers.map((blocker) => blocker.blocker_issue_id).filter(Boolean))
  const relationIssueKeys = new Set(relations.map((relation) => `${relation.related_issue_id}:${relation.relation_type}`))
  const availableBlockerIssues = projectIssues.filter((item) => item.id !== issue.id && !blockerIssueIds.has(item.id))
  const availableRelationIssues = projectIssues.filter((item) => item.id !== issue.id && !relationIssueKeys.has(`${item.id}:${relationType}`))
  const currentSubscriber = subscribers.find((subscriber) => subscriber.profile_id === user?.id)
  const currentVote = votes.find((vote) => vote.profile_id === user?.id)
  const currentFavorite = favorites.find((favorite) => favorite.name === 'issue' && favorite.issue_id === issue.id)

  useEffect(() => {
    if (!organisationId || !user) return

    recordRecentVisit({
      organisationId,
      profileId: user.id,
      kind: 'issue',
      projectId: issue.project_id,
      issueId: issue.id,
      title: issue.title,
      description: issue.description_text,
      status: issue.priority,
      route: `/issues/${issue.id}`,
      identifier: issueKey,
    })
  }, [issue, issueKey, organisationId, recordRecentVisit, user])

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
    if (!user) return

    try {
      if (currentSubscriber) {
        await unsubscribeFromIssue.mutateAsync({ organisationId, subscriberId: currentSubscriber.id })
        toast.success('Unsubscribed from issue')
      } else {
        await subscribeToIssue.mutateAsync({
          organisationId,
          projectId: issue.project_id,
          issueId: issue.id,
          profileId: user.id,
        })
        toast.success('Subscribed to issue')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update subscription')
    }
  }

  const handleToggleVote = async () => {
    if (!user) return

    try {
      if (currentVote) {
        await removeIssueVote.mutateAsync({ organisationId, voteId: currentVote.id })
        toast.success('Vote removed')
      } else {
        await voteForIssue.mutateAsync({
          organisationId,
          projectId: issue.project_id,
          issueId: issue.id,
          profileId: user.id,
        })
        toast.success('Vote added')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update vote')
    }
  }

  const handleToggleFavorite = async () => {
    if (!user) return

    try {
      if (currentFavorite) {
        await removeFavorite.mutateAsync({ organisationId, favoriteId: currentFavorite.id })
        toast.success('Removed favorite')
      } else {
        await addFavorite.mutateAsync({
          organisationId,
          profileId: user.id,
          kind: 'issue',
          projectId: issue.project_id,
          issueId: issue.id,
          title: issue.title,
          description: issue.description_text,
          status: issue.priority,
          route: `/issues/${issue.id}`,
          identifier: issueKey,
        })
        toast.success('Added favorite')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update favorite')
    }
  }

  const handleToggleIssueReaction = async (name: string, existingReactionId: string | null) => {
    if (!user) return

    try {
      if (existingReactionId) {
        await removeIssueReaction.mutateAsync({ organisationId, reactionId: existingReactionId })
      } else {
        await addIssueReaction.mutateAsync({
          organisationId,
          projectId: issue.project_id,
          issueId: issue.id,
          profileId: user.id,
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
    if (!user) return

    try {
      if (existingReactionId) {
        await removeCommentReaction.mutateAsync({ organisationId, reactionId: existingReactionId })
      } else {
        await addCommentReaction.mutateAsync({
          organisationId,
          projectId: issue.project_id,
          issueId: issue.id,
          commentId,
          profileId: user.id,
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

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Link to="/issues" className="inline-flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
            <ArrowLeft className="h-4 w-4" />
            Issues
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{issueKey}</Badge>
            <Badge variant={priorityTone[priority]}>{priority}</Badge>
            {issue.state ? (
              <span className="inline-flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: issue.state.color }} />
                {issue.state.name}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={currentFavorite ? 'primary' : 'outline'}
            onClick={handleToggleFavorite}
            loading={addFavorite.isPending || removeFavorite.isPending}
            disabled={!user}
          >
            <Star className="h-4 w-4" />
            {currentFavorite ? 'Starred' : 'Star'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(`/issues/new?project=${issue.project_id}`)}>
            New issue
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <form onSubmit={handleSave} className="space-y-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Title</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium">State</span>
              <Select
                className="border border-[var(--color-border)] bg-[var(--color-background)]"
                value={stateId}
                onChange={(event) => setStateId(event.target.value)}
                options={states.map((state) => ({ value: state.id, label: state.name }))}
                placeholder={states.length === 0 ? 'No states yet' : undefined}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Priority</span>
              <Select
                className="border border-[var(--color-border)] bg-[var(--color-background)]"
                value={priority}
                onChange={(event) => setPriority(event.target.value as IssuePriority)}
                options={priorityOptions}
              />
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Description</span>
            <RichTextEditor
              value={issue.description_json}
              placeholder="Describe the work..."
              onChange={setDescription}
            />
          </div>

          <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
            <span className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">Reactions</span>
            <ReactionBar
              reactions={issueReactions}
              currentProfileId={user?.id ?? null}
              disabled={!user}
              pending={addIssueReaction.isPending || removeIssueReaction.isPending}
              onToggle={handleToggleIssueReaction}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={updateIssue.isPending}>Save changes</Button>
          </div>
        </form>

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
          currentProfileId={user?.id ?? null}
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
      </div>

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

      <IssueActivitySection activities={activities} isLoading={activitiesLoading} />

      <IssueCommentsSection
        comments={comments}
        isLoading={commentsLoading}
        commentReactions={commentReactions}
        currentProfileId={user?.id ?? null}
        commentEditorKey={commentEditorKey}
        createPending={createComment.isPending}
        reactionPending={addCommentReaction.isPending || removeCommentReaction.isPending}
        onCommentChange={(value) => setComment(value)}
        onSubmit={handleComment}
        onToggleReaction={handleToggleCommentReaction}
      />
    </>
  )
}

export const IssueDetailPage = () => {
  const { issueId } = useParams()
  const { organisationId } = useOrganisation()
  const { data: issue, isLoading } = useIssue(organisationId, issueId ?? null)

  if (!isLoading && !issue) {
    return (
      <OpenKbPageShell>
        <EmptyState title="Issue not found" description="The issue was deleted or is outside your Open-KB access." />
      </OpenKbPageShell>
    )
  }

  return (
    <OpenKbPageShell isLoading={isLoading}>
      {issue && organisationId ? (
        <IssueDetailContent key={issue.id} issue={issue} organisationId={organisationId} />
      ) : null}
    </OpenKbPageShell>
  )
}
