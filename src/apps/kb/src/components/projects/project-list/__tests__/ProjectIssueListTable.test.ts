import { describe, expect, it } from 'vitest'

import {
  buildCycleLinkByIssueId,
  buildIssueAssigneesByIssueId,
  buildModuleLinksByIssueId,
  defaultProjectIssueListFilters,
  defaultProjectIssueListOptions,
  defaultProjectIssueListSort,
  defaultProjectIssueListViewConfig,
  filterProjectIssues,
  getAssignableMembers,
  getDueBucket,
  groupProjectIssues,
  isProjectIssueComplete,
  readListViewConfig,
  serializeListViewConfig,
  sortProjectIssues,
} from '../projectIssueListLogic'
import type { Cycle, CycleIssueLink, Issue, IssueAssignee, IssueState, ModuleIssueLink, OpenKbTeam, OrganisationMemberProfile, ProjectModule } from '../../../../types'

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
  team_id: null,
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

const assignee = (
  issueId: string | null,
  profileId: string | null,
  profile: IssueAssignee['profile'] = profileId
    ? {
      id: profileId,
      email: `${profileId}@example.com`,
      full_name: profileId,
      username: profileId,
      avatar_url: null,
    }
    : null,
): IssueAssignee => ({
  id: `${issueId ?? 'missing-issue'}-${profileId ?? 'missing-profile'}`,
  organisation_id: 'org',
  project_id: 'project',
  issue_id: issueId,
  profile_id: profileId,
  profile,
})

const member = (profileId: string, fullName: string): OrganisationMemberProfile => ({
  profile_id: profileId,
  role: 'member',
  profile: {
    id: profileId,
    email: `${profileId}@example.com`,
    full_name: fullName,
    username: profileId,
    avatar_url: null,
  },
})

const team = (id: string, name: string): OpenKbTeam => ({
  id,
  organisation_id: 'org',
  name,
  slug: id,
  description_text: null,
  status: 'active',
  metadata: {},
  created_by: null,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: null,
  deleted_at: null,
})

const projectModule = (id: string, name: string): ProjectModule => ({
  id,
  organisation_id: 'org',
  project_id: 'project',
  name,
  description_text: null,
  lead_profile_id: null,
  status: 'in_progress',
  created_by: null,
  updated_by: null,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: null,
  deleted_at: null,
})

const cycle = (id: string, name: string): Cycle => ({
  id,
  organisation_id: 'org',
  project_id: 'project',
  name,
  description_text: null,
  starts_at: null,
  ends_at: null,
  status: 'active',
  created_by: null,
  updated_by: null,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: null,
  deleted_at: null,
})

const moduleLink = (
  id: string,
  issueId: string | null,
  moduleId: string | null,
  linkedModule: ProjectModule | null = null,
): ModuleIssueLink => ({
  id,
  organisation_id: 'org',
  project_id: 'project',
  issue_id: issueId,
  module_id: moduleId,
  module: linkedModule,
})

const cycleLink = (
  id: string,
  issueId: string | null,
  cycleId: string | null,
  linkedCycle: Cycle | null = null,
): CycleIssueLink => ({
  id,
  organisation_id: 'org',
  project_id: 'project',
  issue_id: issueId,
  cycle_id: cycleId,
  cycle: linkedCycle,
})

type GroupProjectIssuesInput = Parameters<typeof groupProjectIssues>[0]

const groupIssues = (
  input: Pick<GroupProjectIssuesInput, 'issues' | 'groupBy'> & Partial<Omit<GroupProjectIssuesInput, 'issues' | 'groupBy'>>,
) => groupProjectIssues({
  issues: input.issues,
  groupBy: input.groupBy,
  options: input.options ?? defaultProjectIssueListOptions,
  sortedStates: input.sortedStates ?? [],
  assignableMembers: input.assignableMembers ?? [],
  assigneesByIssueId: input.assigneesByIssueId ?? buildIssueAssigneesByIssueId([]),
  cycles: input.cycles ?? [],
  cycleLinkByIssueId: input.cycleLinkByIssueId ?? buildCycleLinkByIssueId([]),
  modules: input.modules ?? [],
  moduleLinksByIssueId: input.moduleLinksByIssueId ?? buildModuleLinksByIssueId([]),
  moduleById: input.moduleById ?? new Map(),
  teams: input.teams ?? [],
})

const groupIssueIds = (groups: ReturnType<typeof groupProjectIssues>) =>
  groups.map((group) => [group.id, group.issues.map((item) => item.id)])

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

  it('falls back for malformed list metadata and field values', () => {
    expect(readListViewConfig(null)).toEqual(defaultProjectIssueListViewConfig)
    expect(readListViewConfig(null).filters).toEqual(defaultProjectIssueListFilters)
    expect(readListViewConfig({ listView: [] })).toEqual(defaultProjectIssueListViewConfig)

    const config = readListViewConfig({
      listView: {
        filters: {
          query: 42,
          stateIds: 'todo',
          assigneeIds: [null, 'p1', 3],
          teamIds: {},
          priorities: ['invalid', 'urgent'],
          dueBuckets: 'today',
          showCompleted: 'false',
        },
        sort: { field: 'unknown', direction: 'sideways' },
        groupBy: 'unknown',
        options: {
          columns: [],
          compactRows: 'false',
          wrapTitles: 1,
          showIssueKeys: null,
          showEmptyGroups: 'true',
        },
      },
    })

    expect(config.filters).toEqual({
      query: '',
      stateIds: [],
      assigneeIds: ['p1'],
      teamIds: [],
      priorities: ['urgent'],
      dueBuckets: [],
      showCompleted: true,
    })
    expect(config.sort).toEqual(defaultProjectIssueListSort)
    expect(config.groupBy).toBe('status')
    expect(config.options).toEqual(defaultProjectIssueListOptions)
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
        teamIds: [],
        priorities: ['high'],
        dueBuckets: ['today'],
        showCompleted: false,
      },
    })

    expect(filtered.map((item) => item.id)).toEqual(['i1'])
  })

  it('filters by formatted issue key, description, state, and team ID', () => {
    const issues = [
      issue('i1', {
        sequence_id: 17,
        project: { id: 'project', name: 'Operations', identifier: 'OPS' },
        title: 'Unrelated title',
        description_text: 'Needle in the details',
        state_id: 'doing',
        team_id: 'team-1',
      }),
      issue('i2', { sequence_id: 18, state_id: 'todo', team_id: 'team-1' }),
      issue('i3', { sequence_id: 19, state_id: 'doing', team_id: 'team-2' }),
      issue('i4', { sequence_id: null, project: null, state_id: null, team_id: 'team-1' }),
    ]
    const assigneesByIssueId = buildIssueAssigneesByIssueId([])
    const baseFilters = {
      query: '',
      stateIds: ['doing'],
      assigneeIds: [],
      teamIds: ['team-1'],
      priorities: [],
      dueBuckets: [],
      showCompleted: true,
    }

    const keyMatches = filterProjectIssues({
      issues,
      assigneesByIssueId,
      filters: { ...baseFilters, query: '  ops-17  ' },
    })
    expect(keyMatches.map((item) => item.id)).toEqual(['i1'])

    const descriptionMatches = filterProjectIssues({
      issues,
      assigneesByIssueId,
      filters: { ...baseFilters, query: '  NEEDLE ' },
    })
    expect(descriptionMatches.map((item) => item.id)).toEqual(['i1'])

    const fallbackKeyMatches = filterProjectIssues({
      issues,
      assigneesByIssueId,
      filters: { ...baseFilters, stateIds: [], teamIds: [], query: 'KB-?' },
    })
    expect(fallbackKeyMatches.map((item) => item.id)).toEqual(['i4'])
  })

  it('keeps filtering completion rules distinct from the completion display predicate', () => {
    const issues = [
      issue('with-date', { completed_at: '2026-06-20T00:00:00.000Z' }),
      issue('completed-group', {
        state_id: 'closed',
        state: state('closed', 'Closed', 3, 'completed'),
      }),
      issue('not-done', { state: state('started', 'Not done', 1) }),
      issue('not-resolved', { state: state('started', 'Not resolved', 1) }),
    ]

    expect(issues.slice(2).every(isProjectIssueComplete)).toBe(true)
    const assigneesByIssueId = buildIssueAssigneesByIssueId([])
    const filterValues = {
      query: '',
      stateIds: [],
      assigneeIds: [],
      teamIds: [],
      priorities: [],
      dueBuckets: [],
    }
    expect(filterProjectIssues({
      issues,
      assigneesByIssueId,
      filters: { ...filterValues, showCompleted: false },
    }).map((item) => item.id)).toEqual(['not-done', 'not-resolved'])
    expect(filterProjectIssues({
      issues,
      assigneesByIssueId,
      filters: { ...filterValues, showCompleted: true },
    }).map((item) => item.id)).toEqual(['with-date', 'completed-group', 'not-done', 'not-resolved'])
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

  it('covers every sort field and preserves missing-value behavior', () => {
    const noAssignees = buildIssueAssigneesByIssueId([])
    const manualIssues = [
      issue('late', { title: 'Task 10', target_date: '2026-06-25' }),
      issue('early', { title: 'task 2', target_date: '2026-06-23' }),
      issue('missing-date', { title: 'Alpha', target_date: null }),
    ]
    const sortIds = (
      issues: Issue[],
      field: 'manual' | 'title' | 'due_date' | 'priority' | 'status' | 'assignee' | 'team' | 'created_at' | 'updated_at',
      direction: 'asc' | 'desc' = 'asc',
      assigneesByIssueId = noAssignees,
      stateById = new Map<string, IssueState>(),
    ) => sortProjectIssues({
      issues,
      sort: { field, direction },
      assigneesByIssueId,
      stateById,
    }).map((item) => item.id)

    expect(sortIds(manualIssues, 'manual', 'desc')).toEqual(['late', 'early', 'missing-date'])
    expect(sortIds(manualIssues, 'title')).toEqual(['missing-date', 'early', 'late'])
    expect(sortIds(manualIssues, 'due_date')).toEqual(['early', 'late', 'missing-date'])
    expect(sortIds(manualIssues, 'due_date', 'desc')).toEqual(['missing-date', 'late', 'early'])

    const priorities = (['none', 'low', 'medium', 'high', 'urgent'] as const).map((priority, index) =>
      issue(`priority-${index}`, { priority }),
    )
    expect(sortIds(priorities, 'priority')).toEqual(['priority-0', 'priority-1', 'priority-2', 'priority-3', 'priority-4'])
    expect(sortIds(priorities, 'priority', 'desc')).toEqual(['priority-4', 'priority-3', 'priority-2', 'priority-1', 'priority-0'])

    const todo = state('todo', 'Todo', 1)
    const doing = state('doing', 'Doing', 2)
    const statuses = [
      issue('missing-state', { state_id: null, state: null }),
      issue('doing-state', { state_id: doing.id, state: doing }),
      issue('todo-state', { state_id: todo.id, state: todo }),
    ]
    const stateById = new Map([[todo.id, todo], [doing.id, doing]])
    expect(sortIds(statuses, 'status', 'asc', noAssignees, stateById)).toEqual(['todo-state', 'doing-state', 'missing-state'])
    expect(sortIds(statuses, 'status', 'desc', noAssignees, stateById)).toEqual(['missing-state', 'doing-state', 'todo-state'])

    const assigneeIssues = [issue('beta'), issue('alpha'), issue('unassigned')]
    const assigneesByIssueId = buildIssueAssigneesByIssueId([
      assignee('beta', 'p2'),
      assignee('beta', 'p1'),
      assignee('alpha', 'p1'),
    ])
    expect(sortIds(assigneeIssues, 'assignee', 'asc', assigneesByIssueId)).toEqual(['alpha', 'beta', 'unassigned'])
    expect(sortIds(assigneeIssues, 'assignee', 'desc', assigneesByIssueId)).toEqual(['unassigned', 'beta', 'alpha'])
    const fallbackAssigneeIssues = [issue('unassigned'), issue('unknown-profile'), issue('named')]
    const fallbackAssignees = buildIssueAssigneesByIssueId([
      assignee('unknown-profile', null, null),
      assignee('named', 'p1', {
        id: 'p1',
        email: 'p1@example.com',
        full_name: 'Alice',
        username: 'p1',
        avatar_url: null,
      }),
    ])
    expect(sortIds(fallbackAssigneeIssues, 'assignee', 'asc', fallbackAssignees)).toEqual([
      'named',
      'unassigned',
      'unknown-profile',
    ])

    const teamIssues = [
      issue('product', { team_id: 'product', team: team('product', 'Product') }),
      issue('no-team', { team_id: null, team: null }),
      issue('engineering', { team_id: 'engineering', team: team('engineering', 'Engineering') }),
    ]
    expect(sortIds(teamIssues, 'team')).toEqual(['engineering', 'no-team', 'product'])
    expect(sortIds(teamIssues, 'team', 'desc')).toEqual(['product', 'no-team', 'engineering'])

    const timestampIssues = [
      issue('later', {
        created_at: '2026-06-02T00:00:00.000Z',
        updated_at: '2026-06-03T00:00:00.000Z',
      }),
      issue('earlier', {
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-06-01T00:00:00.000Z',
      }),
      issue('null-updated', {
        created_at: '2026-06-03T00:00:00.000Z',
        updated_at: null,
      }),
    ]
    expect(sortIds(timestampIssues, 'created_at')).toEqual(['later', 'earlier', 'null-updated'])
    expect(sortIds(timestampIssues, 'created_at', 'desc')).toEqual(['later', 'earlier', 'null-updated'])
    expect(sortIds(timestampIssues, 'updated_at')).toEqual(['later', 'earlier', 'null-updated'])
    expect(sortIds(timestampIssues, 'updated_at', 'desc')).toEqual(['later', 'earlier', 'null-updated'])
  })

  it('classifies due dates at each local-calendar boundary with a fixed clock', () => {
    const now = new Date(2026, 5, 24, 12)
    const issues = [
      issue('yesterday', { target_date: '2026-06-23' }),
      issue('today', { target_date: '2026-06-24' }),
      issue('tomorrow', { target_date: '2026-06-25' }),
      issue('seven-days', { target_date: '2026-07-01' }),
      issue('eight-days', { target_date: '2026-07-02' }),
      issue('no-date', { target_date: null }),
    ]

    expect(issues.map((item) => getDueBucket(item, now))).toEqual([
      'overdue',
      'today',
      'this_week',
      'this_week',
      'later',
      'no_due',
    ])

    expect(filterProjectIssues({
      issues,
      assigneesByIssueId: buildIssueAssigneesByIssueId([]),
      now,
      filters: {
        query: '',
        stateIds: [],
        assigneeIds: [],
        teamIds: [],
        priorities: [],
        dueBuckets: ['this_week'],
        showCompleted: true,
      },
    }).map((item) => item.id)).toEqual(['tomorrow', 'seven-days'])
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
    const teams: OpenKbTeam[] = [
      {
        id: 'team-1',
        organisation_id: 'org',
        name: 'Product',
        slug: 'product',
        description_text: null,
        status: 'active',
        metadata: {},
        created_by: null,
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: null,
        deleted_at: null,
      },
    ]
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
      teams,
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
      teams,
    })
    expect(cycleGroups.map((group) => [group.id, group.issues.map((item) => item.id)])).toEqual([
      [cycle.id, ['i1']],
      ['none', ['i2']],
    ])
  })

  it('filters and groups by issue team including unassigned issues', () => {
    const teams: OpenKbTeam[] = [
      {
        id: 'team-1',
        organisation_id: 'org',
        name: 'Product',
        slug: 'product',
        description_text: null,
        status: 'active',
        metadata: {},
        created_by: null,
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: null,
        deleted_at: null,
      },
    ]
    const issues = [
      issue('i1', { team_id: 'team-1', team: { id: 'team-1', name: 'Product', slug: 'product', status: 'active', metadata: {} } }),
      issue('i2'),
    ]
    const assigneesByIssueId = buildIssueAssigneesByIssueId([])

    expect(filterProjectIssues({
      issues,
      assigneesByIssueId,
      filters: {
        query: '',
        stateIds: [],
        assigneeIds: [],
        teamIds: ['none'],
        priorities: [],
        dueBuckets: [],
        showCompleted: true,
      },
    }).map((item) => item.id)).toEqual(['i2'])

    const groups = groupProjectIssues({
      issues,
      groupBy: 'team',
      options: { ...defaultProjectIssueListOptions, showEmptyGroups: false },
      sortedStates: [],
      assignableMembers: [],
      assigneesByIssueId,
      cycles: [],
      cycleLinkByIssueId: buildCycleLinkByIssueId([]),
      modules: [],
      moduleLinksByIssueId: buildModuleLinksByIssueId([]),
      moduleById: new Map(),
      teams,
    })

    expect(groups.map((group) => [group.id, group.issues.map((item) => item.id)])).toEqual([
      ['team-1', ['i1']],
      ['none', ['i2']],
    ])
  })

  it('keeps status, priority, due-date, and ungrouped behavior with empty groups on and off', () => {
    const todo = state('todo', 'Todo', 1)
    const doing = state('doing', 'Doing', 2)
    const statusIssues = [
      issue('todo-issue', { state_id: todo.id, state: todo }),
      issue('no-state', { state_id: null, state: null }),
      issue('unknown-state', { state_id: 'removed-state', state: null }),
    ]
    const statusWithEmpty = groupIssues({
      issues: statusIssues,
      groupBy: 'status',
      sortedStates: [todo, doing],
    })
    expect(statusWithEmpty.map((group) => [group.id, group.title, group.issues.map((item) => item.id)])).toEqual([
      ['none', 'No status', ['no-state']],
      ['todo', 'Todo', ['todo-issue']],
      ['doing', 'Doing', []],
    ])
    expect(groupIssueIds(groupIssues({
      issues: statusIssues,
      groupBy: 'status',
      sortedStates: [todo, doing],
      options: { ...defaultProjectIssueListOptions, showEmptyGroups: false },
    }))).toEqual([
      ['none', ['no-state']],
      ['todo', ['todo-issue']],
    ])

    const priorityIssues = [
      issue('none-priority', { priority: 'none' }),
      issue('high-priority', { priority: 'high' }),
    ]
    const priorityWithEmpty = groupIssues({ issues: priorityIssues, groupBy: 'priority' })
    expect(priorityWithEmpty.map((group) => [group.id, group.title, group.issues.map((item) => item.id)])).toEqual([
      ['none', 'None', ['none-priority']],
      ['low', 'Low', []],
      ['medium', 'Medium', []],
      ['high', 'High', ['high-priority']],
      ['urgent', 'Urgent', []],
    ])
    expect(groupIssueIds(groupIssues({
      issues: priorityIssues,
      groupBy: 'priority',
      options: { ...defaultProjectIssueListOptions, showEmptyGroups: false },
    }))).toEqual([
      ['none', ['none-priority']],
      ['high', ['high-priority']],
    ])

    const dueIssues = [issue('no-due', { target_date: null })]
    const dueWithEmpty = groupIssues({ issues: dueIssues, groupBy: 'due_date' })
    expect(dueWithEmpty.map((group) => group.id)).toEqual(['overdue', 'today', 'this_week', 'later', 'no_due'])
    expect(groupIssueIds(dueWithEmpty).filter(([, issueIds]) => issueIds.length > 0)).toEqual([['no_due', ['no-due']]])
    expect(groupIssueIds(groupIssues({
      issues: dueIssues,
      groupBy: 'due_date',
      options: { ...defaultProjectIssueListOptions, showEmptyGroups: false },
    }))).toEqual([['no_due', ['no-due']]])

    expect(groupIssues({ issues: [], groupBy: 'none' }).map((group) => [group.id, group.title, group.issues])).toEqual([
      ['all', 'All tasks', []],
    ])
    expect(groupIssues({
      issues: [],
      groupBy: 'none',
      options: { ...defaultProjectIssueListOptions, showEmptyGroups: false },
    }).map((group) => [group.id, group.title, group.issues])).toEqual([
      ['all', 'All tasks', []],
    ])
  })

  it('groups assignees by the first link and preserves empty and unassigned groups', () => {
    const alice = member('p1', 'Alice')
    const bob = member('p2', 'Bob')
    const guestProfile = {
      id: 'guest',
      email: 'guest@example.com',
      full_name: 'Guest',
      username: 'guest',
      avatar_url: null,
    }
    const assigneesByIssueId = buildIssueAssigneesByIssueId([
      assignee(null, 'ignored'),
      assignee('', 'ignored-empty'),
      assignee('guest', null, guestProfile),
      assignee('no-profile', null, null),
      assignee('bob', 'p2'),
      assignee('bob', 'p1'),
    ])
    const issues = [issue('guest'), issue('no-profile'), issue('unassigned'), issue(''), issue('bob')]

    const withEmptyGroups = groupIssues({
      issues,
      groupBy: 'assignee',
      assignableMembers: [alice, bob],
      assigneesByIssueId,
    })
    expect(withEmptyGroups.map((group) => [group.id, group.title, group.issues.map((item) => item.id)])).toEqual([
      ['p1', 'Alice', []],
      ['p2', 'Bob', ['bob']],
      ['unassigned', 'Guest', ['guest', 'no-profile', 'unassigned', '']],
    ])

    const withoutEmptyGroups = groupIssues({
      issues,
      groupBy: 'assignee',
      assignableMembers: [alice, bob],
      assigneesByIssueId,
      options: { ...defaultProjectIssueListOptions, showEmptyGroups: false },
    })
    expect(withoutEmptyGroups.map((group) => [group.id, group.title, group.issues.map((item) => item.id)])).toEqual([
      ['unassigned', 'Guest', ['guest', 'no-profile', 'unassigned', '']],
      ['p2', 'p2', ['bob']],
    ])

    const firstMissingProfile = groupIssues({
      issues: [issue('no-profile')],
      groupBy: 'assignee',
      assigneesByIssueId: buildIssueAssigneesByIssueId([assignee('no-profile', null, null)]),
      options: { ...defaultProjectIssueListOptions, showEmptyGroups: false },
    })
    expect(firstMissingProfile.map((group) => [group.id, group.title])).toEqual([['unassigned', 'User']])

    expect(filterProjectIssues({
      issues: [issue('bob')],
      assigneesByIssueId,
      filters: {
        query: '',
        stateIds: [],
        assigneeIds: ['p1'],
        teamIds: [],
        priorities: [],
        dueBuckets: [],
        showCompleted: true,
      },
    }).map((item) => item.id)).toEqual(['bob'])
  })

  it('uses team names, seeds only real teams, and never seeds an empty none group', () => {
    const alpha = team('team-alpha', 'Alpha')
    const zulu = team('team-zulu', 'Zulu')
    const issues = [
      issue('zulu-issue', { team_id: zulu.id, team: null }),
      issue('no-team', { team_id: null, team: null }),
    ]

    const withEmptyGroups = groupIssues({ issues, groupBy: 'team', teams: [zulu, alpha] })
    expect(withEmptyGroups.map((group) => [group.id, group.title, group.issues.map((item) => item.id)])).toEqual([
      [alpha.id, 'Alpha', []],
      [zulu.id, 'Zulu', ['zulu-issue']],
      ['none', 'No team', ['no-team']],
    ])

    const withoutEmptyGroups = groupIssues({
      issues,
      groupBy: 'team',
      teams: [zulu, alpha],
      options: { ...defaultProjectIssueListOptions, showEmptyGroups: false },
    })
    expect(withoutEmptyGroups.map((group) => [group.id, group.title, group.issues.map((item) => item.id)])).toEqual([
      [zulu.id, 'No team', ['zulu-issue']],
      ['none', 'No team', ['no-team']],
    ])
    expect(groupIssues({ issues: [], groupBy: 'team', teams: [alpha] }).map((group) => group.id)).toEqual([alpha.id])
  })

  it('groups multiple module links, resolves module fallbacks, and handles missing links', () => {
    const alpha = projectModule('module-alpha', 'Alpha')
    const beta = projectModule('module-beta', 'Beta')
    const gamma = projectModule('module-gamma', 'Gamma')
    const issues = [issue('both'), issue('unlinked'), issue('null-module'), issue('unknown-module'), issue('')]
    const links = [
      moduleLink('link-alpha', 'both', alpha.id, alpha),
      moduleLink('link-beta', 'both', beta.id),
      moduleLink('link-null', 'null-module', null, alpha),
      moduleLink('link-unknown', 'unknown-module', 'missing-module'),
      moduleLink('link-with-empty-issue', '', alpha.id, alpha),
      moduleLink('link-without-issue', null, alpha.id, alpha),
    ]
    const args = {
      issues,
      groupBy: 'module' as const,
      modules: [alpha, beta, gamma],
      moduleLinksByIssueId: buildModuleLinksByIssueId(links),
      moduleById: new Map([[alpha.id, alpha], [beta.id, beta], [gamma.id, gamma]]),
    }

    const withEmptyGroups = groupIssues(args)
    expect(withEmptyGroups.map((group) => [group.id, group.title, group.issues.map((item) => item.id)])).toEqual([
      [alpha.id, 'Alpha', ['both']],
      [beta.id, 'Beta', ['both']],
      [gamma.id, 'Gamma', []],
      ['missing-module', 'No module', ['unknown-module']],
      ['none', 'No module', ['unlinked', 'null-module', '']],
    ])

    expect(groupIssueIds(groupIssues({
      ...args,
      options: { ...defaultProjectIssueListOptions, showEmptyGroups: false },
    }))).toEqual([
      [alpha.id, ['both']],
      [beta.id, ['both']],
      ['missing-module', ['unknown-module']],
      ['none', ['unlinked', 'null-module', '']],
    ])
    expect(groupIssues({ ...args, issues: [] }).map((group) => group.id)).toEqual([alpha.id, beta.id, gamma.id])
    expect(groupIssues({
      ...args,
      issues: [],
      options: { ...defaultProjectIssueListOptions, showEmptyGroups: false },
    })).toEqual([])
  })

  it('uses the first cycle link, resolves cycle fallbacks, and handles missing links', () => {
    const alpha = cycle('cycle-alpha', 'Alpha cycle')
    const beta = cycle('cycle-beta', 'Beta cycle')
    const gamma = cycle('cycle-gamma', 'Gamma cycle')
    const issues = [issue('first-cycle'), issue('embedded-cycle'), issue('null-cycle'), issue('no-cycle'), issue('unknown-cycle'), issue('')]
    const links = [
      cycleLink('without-issue', null, alpha.id, alpha),
      cycleLink('first-link', 'first-cycle', beta.id),
      cycleLink('later-link', 'first-cycle', alpha.id, alpha),
      cycleLink('embedded-link', 'embedded-cycle', alpha.id, alpha),
      cycleLink('null-id', 'null-cycle', null, alpha),
      cycleLink('later-valid-id', 'null-cycle', alpha.id, alpha),
      cycleLink('unknown-id', 'unknown-cycle', 'missing-cycle'),
      cycleLink('empty-issue-id', '', alpha.id, alpha),
    ]
    const args = {
      issues,
      groupBy: 'cycle' as const,
      cycles: [alpha, beta, gamma],
      cycleLinkByIssueId: buildCycleLinkByIssueId(links),
    }

    const withEmptyGroups = groupIssues(args)
    expect(withEmptyGroups.map((group) => [group.id, group.title, group.issues.map((item) => item.id)])).toEqual([
      [alpha.id, 'Alpha cycle', ['embedded-cycle']],
      [beta.id, 'Beta cycle', ['first-cycle']],
      [gamma.id, 'Gamma cycle', []],
      ['missing-cycle', 'No cycle', ['unknown-cycle']],
      ['none', 'No cycle', ['null-cycle', 'no-cycle', '']],
    ])

    expect(groupIssueIds(groupIssues({
      ...args,
      options: { ...defaultProjectIssueListOptions, showEmptyGroups: false },
    }))).toEqual([
      [alpha.id, ['embedded-cycle']],
      [beta.id, ['first-cycle']],
      ['missing-cycle', ['unknown-cycle']],
      ['none', ['null-cycle', 'no-cycle', '']],
    ])
    expect(groupIssues({ ...args, issues: [] }).map((group) => group.id)).toEqual([alpha.id, beta.id, gamma.id])
    expect(groupIssues({
      ...args,
      issues: [],
      options: { ...defaultProjectIssueListOptions, showEmptyGroups: false },
    })).toEqual([])
  })

  it('adds only missing assignee profiles to assignable members and sorts by fallback name', () => {
    const assignees = [
      assignee('i1', 'p1', {
        id: 'p1',
        email: 'p1@example.com',
        full_name: 'Wrong replacement',
        username: 'p1',
        avatar_url: null,
      }),
      assignee('i1', 'p2', {
        id: 'p2',
        email: 'p2@example.com',
        full_name: null,
        username: 'Alpha',
        avatar_url: null,
      }),
      assignee('i2', 'p2', {
        id: 'p2',
        email: 'p2@example.com',
        full_name: 'Duplicate',
        username: 'p2',
        avatar_url: null,
      }),
      assignee('i2', 'p3', {
        id: 'p3',
        email: 'beta@example.com',
        full_name: null,
        username: null,
        avatar_url: null,
      }),
      assignee('i2', 'p4', {
        id: 'p4',
        email: null,
        full_name: null,
        username: null,
        avatar_url: null,
      }),
      assignee('i2', null, {
        id: 'missing-id',
        email: 'ignored@example.com',
        full_name: 'Ignored missing ID',
        username: 'ignored',
        avatar_url: null,
      }),
      assignee('i2', 'missing-profile', null),
    ]

    expect(getAssignableMembers([member('p1', 'Zoe'), member('p1', 'Zoe')], assignees).map((item) => [item.profile_id, item.profile.full_name, item.profile.username, item.profile.email])).toEqual([
      ['p2', null, 'Alpha', 'p2@example.com'],
      ['p3', null, null, 'beta@example.com'],
      ['p4', null, null, null],
      ['p1', 'Zoe', 'p1', 'p1@example.com'],
    ])
  })
})
