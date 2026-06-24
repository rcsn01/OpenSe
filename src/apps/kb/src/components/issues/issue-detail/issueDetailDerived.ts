import type {
  Cycle,
  CycleIssueLink,
  Issue,
  IssueAssignee,
  IssueBlocker,
  IssueLabel,
  IssueLabelLink,
  IssueMention,
  IssueRelation,
  IssueRelationType,
  IssueSubscriber,
  IssueVote,
  ModuleIssueLink,
  OpenKbPersonalItem,
  OrganisationMemberProfile,
  ProjectModule,
} from '../../../types'

export const deriveIssueDetailSelections = ({
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
}: {
  issue: Pick<Issue, 'id'>
  labels: IssueLabel[]
  labelLinks: IssueLabelLink[]
  memberProfiles: OrganisationMemberProfile[]
  assignees: IssueAssignee[]
  mentions: IssueMention[]
  cycles: Cycle[]
  modules: ProjectModule[]
  cycleLinks: CycleIssueLink[]
  moduleLinks: ModuleIssueLink[]
  blockers: IssueBlocker[]
  relations: IssueRelation[]
  projectIssues: Issue[]
  relationType: IssueRelationType
  subscribers: IssueSubscriber[]
  votes: IssueVote[]
  favorites: OpenKbPersonalItem[]
  profileId: string | null
}) => {
  const assignedLabelIds = new Set(labelLinks.map((link) => link.label_id).filter((id): id is string => Boolean(id)))
  const assignedProfileIds = new Set(assignees.map((assignee) => assignee.profile_id).filter((id): id is string => Boolean(id)))
  const mentionedProfileIds = new Set(mentions.map((mention) => mention.profile_id).filter((id): id is string => Boolean(id)))
  const assignedCycleIds = new Set(cycleLinks.map((link) => link.cycle_id).filter((id): id is string => Boolean(id)))
  const assignedModuleIds = new Set(moduleLinks.map((link) => link.module_id).filter((id): id is string => Boolean(id)))
  const blockerIssueIds = new Set(blockers.map((blocker) => blocker.blocker_issue_id).filter((id): id is string => Boolean(id)))
  const relationIssueKeys = new Set(relations.map((relation) => `${relation.related_issue_id}:${relation.relation_type}`))

  return {
    assignedLabelIds,
    assignedProfileIds,
    mentionedProfileIds,
    assignedCycleIds,
    assignedModuleIds,
    blockerIssueIds,
    relationIssueKeys,
    availableLabels: labels.filter((label) => !assignedLabelIds.has(label.id)),
    availableAssignees: memberProfiles.filter((member) => !assignedProfileIds.has(member.profile_id)),
    availableMentions: memberProfiles.filter((member) => !mentionedProfileIds.has(member.profile_id)),
    availableCycles: cycles.filter((cycle) => !assignedCycleIds.has(cycle.id)),
    availableModules: modules.filter((projectModule) => !assignedModuleIds.has(projectModule.id)),
    availableBlockerIssues: projectIssues.filter((item) => item.id !== issue.id && !blockerIssueIds.has(item.id)),
    availableRelationIssues: projectIssues.filter((item) => item.id !== issue.id && !relationIssueKeys.has(`${item.id}:${relationType}`)),
    currentSubscriber: subscribers.find((subscriber) => subscriber.profile_id === profileId),
    currentVote: votes.find((vote) => vote.profile_id === profileId),
    currentFavorite: favorites.find((favorite) => favorite.name === 'issue' && favorite.issue_id === issue.id),
  }
}
