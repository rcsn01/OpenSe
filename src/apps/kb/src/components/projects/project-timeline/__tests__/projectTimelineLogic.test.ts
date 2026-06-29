import { describe, expect, it } from 'vitest'

import {
  buildIssueRanges,
  buildModuleTimelineGroups,
  buildMonthSpans,
  buildQuarterSpans,
  buildTimelineDays,
  buildTimelineRows,
  buildVisibleBlockerConnectors,
  buildWeekSpans,
  formatWeekRangeLabel,
  getWeekLabel,
  getQuarterLabel,
  isWeekend,
} from '../projectTimelineLogic'
import type { Issue, IssueBlocker, ModuleIssueLink, ProjectModule } from '../../../../types'

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
  state_id: null,
  estimate_point_id: null,
  parent_issue_id: null,
  start_date: null,
  target_date: null,
  completed_at: null,
  archived_at: null,
  created_by: null,
  updated_by: null,
  created_at: '2026-06-10T00:00:00.000Z',
  updated_at: null,
  deleted_at: null,
  ...overrides,
})

const projectModule = (id: string, name: string): ProjectModule => ({
  id,
  organisation_id: 'org',
  project_id: 'project',
  name,
  description_text: null,
  lead_profile_id: null,
  status: 'planned',
  created_by: null,
  updated_by: null,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: null,
  deleted_at: null,
})

const moduleLink = (issueId: string, module: ProjectModule): ModuleIssueLink => ({
  id: `${issueId}-${module.id}`,
  organisation_id: 'org',
  project_id: 'project',
  issue_id: issueId,
  module_id: module.id,
  module,
})

const blocker = (id: string, blockerIssueId: string, blockedIssueId: string): IssueBlocker => ({
  id,
  organisation_id: 'org',
  project_id: 'project',
  issue_id: blockedIssueId,
  blocker_issue_id: blockerIssueId,
  created_by: null,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: null,
  deleted_at: null,
  blocker_issue: null,
})

describe('project timeline date math', () => {
  it('identifies weekdays and weekends', () => {
    expect(isWeekend(new Date('2026-06-26T00:00:00'))).toBe(false)
    expect(isWeekend(new Date('2026-06-27T00:00:00'))).toBe(true)
    expect(isWeekend(new Date('2026-06-28T00:00:00'))).toBe(true)
  })

  it('builds month spans on real visible day boundaries', () => {
    const days = buildTimelineDays(new Date('2026-05-30T00:00:00'), new Date('2026-07-02T00:00:00'))
    const spans = buildMonthSpans(days)

    expect(spans.map((span) => ({ label: span.label, startIndex: span.startIndex, dayCount: span.dayCount }))).toEqual([
      { label: 'May 2026', startIndex: 0, dayCount: 2 },
      { label: 'Jun 2026', startIndex: 2, dayCount: 30 },
      { label: 'Jul 2026', startIndex: 32, dayCount: 2 },
    ])
  })

  it('builds quarter spans with Q1-Q4 labels', () => {
    expect(getQuarterLabel(new Date('2026-01-15T00:00:00'))).toBe('Q1 2026')
    expect(getQuarterLabel(new Date('2026-06-15T00:00:00'))).toBe('Q2 2026')
    expect(getQuarterLabel(new Date('2026-10-15T00:00:00'))).toBe('Q4 2026')

    const days = buildTimelineDays(new Date('2026-03-30T00:00:00'), new Date('2026-04-02T00:00:00'))
    expect(buildQuarterSpans(days).map((span) => ({ label: span.label, startIndex: span.startIndex, dayCount: span.dayCount }))).toEqual([
      { label: 'Q1 2026', startIndex: 0, dayCount: 2 },
      { label: 'Q2 2026', startIndex: 2, dayCount: 2 },
    ])
  })

  it('builds week spans with week numbers and compact date ranges', () => {
    expect(getWeekLabel(new Date('2026-07-19T00:00:00'))).toBe('W30')
    expect(formatWeekRangeLabel(new Date('2026-07-26T00:00:00'), new Date('2026-08-01T00:00:00'))).toBe('26 Jul - 1')

    const days = buildTimelineDays(new Date('2026-07-26T00:00:00'), new Date('2026-08-08T00:00:00'))
    expect(buildWeekSpans(days).map((span) => ({ label: span.label, rangeLabel: span.rangeLabel, startIndex: span.startIndex, dayCount: span.dayCount }))).toEqual([
      { label: 'W31', rangeLabel: '26 Jul - 1', startIndex: 0, dayCount: 7 },
      { label: 'W32', rangeLabel: '2 - 8', startIndex: 7, dayCount: 7 },
    ])
  })
})

describe('project timeline module grouping', () => {
  it('groups linked issues under modules, unlinked issues under No module, and duplicates multi-module issues', () => {
    const alpha = projectModule('module-alpha', 'Alpha')
    const beta = projectModule('module-beta', 'Beta')
    const gamma = projectModule('module-gamma', 'Gamma')
    const issues = [issue('i1'), issue('i2'), issue('i3')]
    const groups = buildModuleTimelineGroups({
      ranges: buildIssueRanges(issues),
      modules: [gamma, beta, alpha],
      moduleIssueLinks: [
        moduleLink('i1', beta),
        moduleLink('i2', alpha),
        moduleLink('i2', beta),
      ],
    })

    expect(groups.map((group) => group.name)).toEqual(['Alpha', 'Beta', 'Gamma', 'No module'])
    expect(groups[0].ranges.map((range) => range.issue.id)).toEqual(['i2'])
    expect(groups[1].ranges.map((range) => range.issue.id)).toEqual(['i1', 'i2'])
    expect(groups[2].ranges).toEqual([])
    expect(groups[3].ranges.map((range) => range.issue.id)).toEqual(['i3'])
  })
})

describe('project timeline blocker connectors', () => {
  it('keeps blockers only when both issues are visible on the timeline', () => {
    const module = projectModule('module', 'Module')
    const groups = buildModuleTimelineGroups({
      ranges: buildIssueRanges([issue('i1'), issue('i2')]),
      modules: [module],
      moduleIssueLinks: [moduleLink('i1', module), moduleLink('i2', module)],
    })
    const connectors = buildVisibleBlockerConnectors([
      blocker('visible', 'i1', 'i2'),
      blocker('hidden-source', 'i3', 'i2'),
      blocker('hidden-target', 'i1', 'i4'),
    ], buildTimelineRows(groups))

    expect(connectors).toEqual([
      {
        id: 'visible',
        blockerIssueId: 'i1',
        blockedIssueId: 'i2',
        sourceRowId: 'module:i1',
        targetRowId: 'module:i2',
      },
    ])
  })
})
