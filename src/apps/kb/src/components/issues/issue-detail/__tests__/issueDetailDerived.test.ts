import { describe, expect, it } from 'vitest'
import { deriveIssueDetailSelections } from '../issueDetailDerived'
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
  IssueSubscriber,
  IssueVote,
  ModuleIssueLink,
  OpenKbPersonalItem,
  OpenKbProfile,
  OrganisationMemberProfile,
  ProjectModule,
} from '../../../../types'

const profile = (id: string): OpenKbProfile => ({
  id,
  email: `${id}@example.com`,
  full_name: id,
  username: id,
  avatar_url: null,
})

const member = (id: string): OrganisationMemberProfile => ({
  profile_id: id,
  role: 'member',
  profile: profile(id),
})

const issue = (id: string): Issue => ({
  id,
  organisation_id: 'org',
  project_id: 'project',
  sequence_id: 1,
  title: id,
  description_json: { type: 'doc' },
  description_html: null,
  description_text: null,
  priority: 'medium',
  state_id: null,
  estimate_point_id: null,
  parent_issue_id: null,
  start_date: null,
  target_date: null,
  completed_at: null,
  archived_at: null,
  created_by: null,
  updated_by: null,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: null,
  deleted_at: null,
})

describe('issue detail derived selections', () => {
  it('builds assigned sets and available add targets', () => {
    const labels: IssueLabel[] = [
      { id: 'label-1', organisation_id: 'org', project_id: 'project', name: 'A', color: '#000', parent_id: null },
      { id: 'label-2', organisation_id: 'org', project_id: 'project', name: 'B', color: '#000', parent_id: null },
    ]
    const cycles: Cycle[] = [
      { id: 'cycle-1', organisation_id: 'org', project_id: 'project', name: 'Cycle 1', description_text: null, starts_at: null, ends_at: null, status: 'active', created_by: null, updated_by: null, created_at: '2026-06-01T00:00:00.000Z', updated_at: null, deleted_at: null },
      { id: 'cycle-2', organisation_id: 'org', project_id: 'project', name: 'Cycle 2', description_text: null, starts_at: null, ends_at: null, status: 'active', created_by: null, updated_by: null, created_at: '2026-06-01T00:00:00.000Z', updated_at: null, deleted_at: null },
    ]
    const modules: ProjectModule[] = [
      { id: 'module-1', organisation_id: 'org', project_id: 'project', name: 'Module 1', description_text: null, lead_profile_id: null, status: 'planned', created_by: null, updated_by: null, created_at: '2026-06-01T00:00:00.000Z', updated_at: null, deleted_at: null },
      { id: 'module-2', organisation_id: 'org', project_id: 'project', name: 'Module 2', description_text: null, lead_profile_id: null, status: 'planned', created_by: null, updated_by: null, created_at: '2026-06-01T00:00:00.000Z', updated_at: null, deleted_at: null },
    ]
    const issues = [issue('current'), issue('candidate'), issue('blocked'), issue('related')]
    const assignees: IssueAssignee[] = [{ id: 'a1', organisation_id: 'org', project_id: 'project', issue_id: 'current', profile_id: 'p1', profile: profile('p1') }]
    const mentions: IssueMention[] = [{ id: 'm1', organisation_id: 'org', project_id: 'project', issue_id: 'current', profile_id: 'p2', created_by: null, created_at: '2026-06-01T00:00:00.000Z', updated_at: null, deleted_at: null, profile: profile('p2') }]
    const labelLinks: IssueLabelLink[] = [{ id: 'll1', organisation_id: 'org', project_id: 'project', issue_id: 'current', label_id: 'label-1', label: labels[0] }]
    const cycleLinks: CycleIssueLink[] = [{ id: 'cl1', organisation_id: 'org', project_id: 'project', issue_id: 'current', cycle_id: 'cycle-1', cycle: cycles[0] }]
    const moduleLinks: ModuleIssueLink[] = [{ id: 'ml1', organisation_id: 'org', project_id: 'project', issue_id: 'current', module_id: 'module-1', module: modules[0] }]
    const blockers: IssueBlocker[] = [{ id: 'b1', organisation_id: 'org', project_id: 'project', issue_id: 'current', blocker_issue_id: 'blocked', created_by: null, created_at: '2026-06-01T00:00:00.000Z', updated_at: null, deleted_at: null, blocker_issue: issues[2] }]
    const relations: IssueRelation[] = [{ id: 'r1', organisation_id: 'org', project_id: 'project', issue_id: 'current', related_issue_id: 'related', relation_type: 'related', created_by: null, created_at: '2026-06-01T00:00:00.000Z', updated_at: null, deleted_at: null, related_issue: issues[3] }]
    const subscribers: IssueSubscriber[] = [{ id: 's1', organisation_id: 'org', project_id: 'project', issue_id: 'current', profile_id: 'p1', created_by: null, created_at: '2026-06-01T00:00:00.000Z', updated_at: null, deleted_at: null, profile: profile('p1') }]
    const votes: IssueVote[] = [{ id: 'v1', organisation_id: 'org', project_id: 'project', issue_id: 'current', profile_id: 'p1', created_by: null, created_at: '2026-06-01T00:00:00.000Z', updated_at: null, deleted_at: null }]
    const favorites: OpenKbPersonalItem[] = [{ id: 'f1', organisation_id: 'org', project_id: 'project', issue_id: 'current', page_id: null, profile_id: 'p1', name: 'issue', title: 'current', description_text: null, status: null, payload: {}, created_by: null, created_at: '2026-06-01T00:00:00.000Z', updated_at: null, deleted_at: null }]

    const result = deriveIssueDetailSelections({
      issue: issues[0],
      labels,
      labelLinks,
      memberProfiles: [member('p1'), member('p2'), member('p3')],
      assignees,
      mentions,
      cycles,
      modules,
      cycleLinks,
      moduleLinks,
      blockers,
      relations,
      projectIssues: issues,
      relationType: 'related',
      subscribers,
      votes,
      favorites,
      profileId: 'p1',
    })

    expect([...result.assignedLabelIds]).toEqual(['label-1'])
    expect(result.availableLabels.map((item) => item.id)).toEqual(['label-2'])
    expect(result.availableAssignees.map((item) => item.profile_id)).toEqual(['p2', 'p3'])
    expect(result.availableMentions.map((item) => item.profile_id)).toEqual(['p1', 'p3'])
    expect(result.availableCycles.map((item) => item.id)).toEqual(['cycle-2'])
    expect(result.availableModules.map((item) => item.id)).toEqual(['module-2'])
    expect(result.availableBlockerIssues.map((item) => item.id)).toEqual(['candidate', 'related'])
    expect(result.availableRelationIssues.map((item) => item.id)).toEqual(['candidate', 'blocked'])
    expect(result.currentSubscriber?.id).toBe('s1')
    expect(result.currentVote?.id).toBe('v1')
    expect(result.currentFavorite?.id).toBe('f1')
  })
})
