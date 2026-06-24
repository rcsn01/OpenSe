import { describe, expect, it } from 'vitest'

import {
  buildCycleLinkByIssueId,
  buildIssueAssigneesByIssueId,
  buildModuleLinksByIssueId,
  defaultProjectIssueListOptions,
  filterProjectIssues,
  groupProjectIssues,
  readListViewConfig,
  serializeListViewConfig,
  sortProjectIssues,
} from '../projectIssueListLogic'
import type { Cycle, CycleIssueLink, Issue, IssueAssignee, IssueState, ModuleIssueLink, ProjectModule } from '../../../../types'

const state = (id: string, name: string, sortOrder: number, groupKey = 'started'): IssueState => ({
  id,
  organisation_id: 'org',
  project_id: 'project',
  name,
  group_key: groupKey,
  color: '#64748b',
  sort_order: sortOrder,
  is_default: false,
})

const issue = (id: string, overrides: Partial<Issue> = {}): Issue => ({
  id,
  organisation_id: 'org',
  project_id: 'project',
  sequence_id: Number(id.replace(/\D/g, '')) || null,
  title: `Issue ${id}`,
  description_json: { type: 'doc' },
  description_html: null,
  description_text: null,
  priority: 'medium',
  state_id: 'todo',
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
  state: state('todo', 'Todo', 1),
  ...overrides,
})

const assignee = (issueId: string, profileId: string): IssueAssignee => ({
  id: `${issueId}-${profileId}`,
  organisation_id: 'org',
  project_id: 'project',
  issue_id: issueId,
  profile_id: profileId,
  profile: {
    id: profileId,
    email: `${profileId}@example.com`,
    full_name: profileId,
    username: profileId,
    avatar_url: null,
  },
})

describe('project issue list config', () => {
  it('hydrates valid metadata and drops invalid enum values', () => {
    const config = readListViewConfig({
      listView: {
        filters: {
          query: 'quality',
          priorities: ['urgent', 'invalid'],
          dueBuckets: ['today', 'bad'],
          showCompleted: false,
        },
        sort: { field: 'priority', direction: 'desc' },
        groupBy: 'module',
        options: {
          columns: { assignee: false },
          compactRows: true,
        },
      },
    })

    expect(config.filters.query).toBe('quality')
    expect(config.filters.priorities).toEqual(['urgent'])
    expect(config.filters.dueBuckets).toEqual(['today'])
    expect(config.filters.showCompleted).toBe(false)
    expect(config.sort).toEqual({ field: 'priority', direction: 'desc' })
    expect(config.groupBy).toBe('module')
    expect(config.options.columns.assignee).toBe(false)
    expect(config.options.columns.status).toBe(true)
    expect(config.options.compactRows).toBe(true)
    expect(JSON.parse(serializeListViewConfig(config))).toEqual(config)
  })
})

describe('project issue list filtering and sorting', () => {
  it('filters by query, assignee, priority, due bucket, and completion state', () => {
    const issues = [
      issue('i1', { title: 'Quality review', priority: 'high', target_date: '2026-06-24' }),
      issue('i2', { title: 'Done work', priority: 'high', completed_at: '2026-06-20T00:00:00.000Z', target_date: '2026-06-24' }),
      issue('i3', { title: 'Other task', priority: 'low', target_date: '2026-07-10' }),
    ]
    const assigneesByIssueId = buildIssueAssigneesByIssueId([assignee('i1', 'p1'), assignee('i3', 'p2')])

    const filtered = filterProjectIssues({
      issues,
      assigneesByIssueId,
      now: new Date('2026-06-24T12:00:00.000Z'),
      filters: {
        query: 'quality',
        stateIds: [],
        assigneeIds: ['p1'],
        priorities: ['high'],
        dueBuckets: ['today'],
        showCompleted: false,
      },
    })

    expect(filtered.map((item) => item.id)).toEqual(['i1'])
  })

  it('sorts by priority rank and status order', () => {
    const todo = state('todo', 'Todo', 2)
    const doing = state('doing', 'Doing', 1)
    const issues = [
      issue('i1', { priority: 'low', state_id: todo.id, state: todo }),
      issue('i2', { priority: 'urgent', state_id: doing.id, state: doing }),
      issue('i3', { priority: 'high', state_id: todo.id, state: todo }),
    ]
    const assigneesByIssueId = buildIssueAssigneesByIssueId([])

    expect(sortProjectIssues({
      issues,
      sort: { field: 'priority', direction: 'desc' },
      assigneesByIssueId,
      stateById: new Map(),
    }).map((item) => item.id)).toEqual(['i2', 'i3', 'i1'])

    expect(sortProjectIssues({
      issues,
      sort: { field: 'status', direction: 'asc' },
      assigneesByIssueId,
      stateById: new Map([[todo.id, todo], [doing.id, doing]]),
    }).map((item) => item.id)).toEqual(['i2', 'i1', 'i3'])
  })
})

describe('project issue list grouping', () => {
  it('groups by module and cycle including unassigned issues', () => {
    const projectModule: ProjectModule = {
      id: 'module-1',
      organisation_id: 'org',
      project_id: 'project',
      name: 'Validation',
      description_text: null,
      lead_profile_id: null,
      status: 'in_progress',
      created_by: null,
      updated_by: null,
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: null,
      deleted_at: null,
    }
    const cycle: Cycle = {
      id: 'cycle-1',
      organisation_id: 'org',
      project_id: 'project',
      name: 'June cycle',
      description_text: null,
      starts_at: null,
      ends_at: null,
      status: 'active',
      created_by: null,
      updated_by: null,
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: null,
      deleted_at: null,
    }
    const issues = [issue('i1'), issue('i2')]
    const moduleLinks: ModuleIssueLink[] = [{ id: 'ml1', organisation_id: 'org', project_id: 'project', issue_id: 'i1', module_id: projectModule.id, module: projectModule }]
    const cycleLinks: CycleIssueLink[] = [{ id: 'cl1', organisation_id: 'org', project_id: 'project', issue_id: 'i1', cycle_id: cycle.id, cycle }]

    const moduleGroups = groupProjectIssues({
      issues,
      groupBy: 'module',
      options: { ...defaultProjectIssueListOptions, showEmptyGroups: false },
      sortedStates: [],
      assignableMembers: [],
      assigneesByIssueId: buildIssueAssigneesByIssueId([]),
      cycles: [],
      cycleLinkByIssueId: buildCycleLinkByIssueId([]),
      modules: [projectModule],
      moduleLinksByIssueId: buildModuleLinksByIssueId(moduleLinks),
      moduleById: new Map([[projectModule.id, projectModule]]),
    })
    expect(moduleGroups.map((group) => [group.id, group.issues.map((item) => item.id)])).toEqual([
      [projectModule.id, ['i1']],
      ['none', ['i2']],
    ])

    const cycleGroups = groupProjectIssues({
      issues,
      groupBy: 'cycle',
      options: { ...defaultProjectIssueListOptions, showEmptyGroups: false },
      sortedStates: [],
      assignableMembers: [],
      assigneesByIssueId: buildIssueAssigneesByIssueId([]),
      cycles: [cycle],
      cycleLinkByIssueId: buildCycleLinkByIssueId(cycleLinks),
      modules: [],
      moduleLinksByIssueId: buildModuleLinksByIssueId([]),
      moduleById: new Map(),
    })
    expect(cycleGroups.map((group) => [group.id, group.issues.map((item) => item.id)])).toEqual([
      [cycle.id, ['i1']],
      ['none', ['i2']],
    ])
  })
})
