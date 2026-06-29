import { describe, expect, it, vi } from 'vitest'

import {
  getOpenKbItemColor,
  getOpenKbProfileColor,
  getRandomOpenKbLightColor,
  normalizeHexColor,
  openKbLightPalette,
  resolveTimelineIssueColor,
} from '../openKbColors'
import type { Issue, IssueAssignee, OpenKbTeam } from '../../types'

const issue = (id: string, overrides: Partial<Issue> = {}): Issue => ({
  id,
  organisation_id: 'org',
  project_id: 'project',
  team_id: null,
  sequence_id: null,
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
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: null,
  deleted_at: null,
  ...overrides,
})

const team = (id: string, color?: string): OpenKbTeam => ({
  id,
  organisation_id: 'org',
  name: id,
  slug: id,
  description_text: null,
  status: 'active',
  metadata: color ? { color } : {},
  created_by: null,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: null,
  deleted_at: null,
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
    full_name: `User ${profileId}`,
    username: profileId,
    avatar_url: null,
  },
})

const luminance = (color: string) => {
  const red = Number.parseInt(color.slice(1, 3), 16)
  const green = Number.parseInt(color.slice(3, 5), 16)
  const blue = Number.parseInt(color.slice(5, 7), 16)
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
}

describe('OpenKB colors', () => {
  it('normalizes supported hex values and rejects invalid colors', () => {
    expect(normalizeHexColor('abc')).toBe('#aabbcc')
    expect(normalizeHexColor('#ABCDEF')).toBe('#abcdef')
    expect(normalizeHexColor('not-a-color')).toBeNull()
  })

  it('uses a light shared palette', () => {
    expect(openKbLightPalette.every((color) => luminance(color) > 0.72)).toBe(true)
  })

  it('returns stable colors for profiles and items', () => {
    const profile = { id: 'profile-1', email: null, full_name: 'Jane Doe', username: null, avatar_url: null }
    expect(getOpenKbProfileColor(profile)).toBe(getOpenKbProfileColor(profile))
    expect(getOpenKbItemColor('issue-1')).toBe(getOpenKbItemColor('issue-1'))
  })

  it('can select a random light palette color for new teams', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(getRandomOpenKbLightColor()).toBe(openKbLightPalette[0])
    vi.restoreAllMocks()
  })

  it('resolves timeline colors by team, then assignee, then issue fallback', () => {
    const teams = [team('team-1', '#ABC')]
    const assignedIssue = issue('i1', { team_id: 'team-1', team: { id: 'team-1', name: 'Product', slug: 'product', status: 'active', metadata: { color: '#fed7aa' } } })
    const unteamedIssue = issue('i2')
    const fallbackIssue = issue('i3')
    const issueAssignee = assignee('i2', 'profile-1')

    expect(resolveTimelineIssueColor({ issue: assignedIssue, assignees: [issueAssignee], teams })).toBe('#fed7aa')
    expect(resolveTimelineIssueColor({ issue: unteamedIssue, assignees: [issueAssignee], teams })).toBe(getOpenKbProfileColor(issueAssignee.profile))
    expect(resolveTimelineIssueColor({ issue: fallbackIssue, assignees: [], teams })).toBe(getOpenKbItemColor('i3'))
  })
})
