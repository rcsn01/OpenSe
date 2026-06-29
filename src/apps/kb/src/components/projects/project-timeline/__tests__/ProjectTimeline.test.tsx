import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProjectTimeline } from '../ProjectTimeline'
import type { Issue, IssueAssignee, IssueBlocker, ModuleIssueLink, OpenKbTeam, ProjectModule } from '../../../../types'
import { getOpenKbProfileColor } from '../../../../lib/openKbColors'

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
  start_date: '2026-06-24',
  target_date: '2026-06-26',
  completed_at: null,
  archived_at: null,
  created_by: null,
  updated_by: null,
  created_at: '2026-06-20T00:00:00.000Z',
  updated_at: null,
  deleted_at: null,
  ...overrides,
})

const team = (id: string, color: string): OpenKbTeam => ({
  id,
  organisation_id: 'org',
  name: `Team ${id}`,
  slug: id,
  description_text: null,
  status: 'active',
  metadata: { color },
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

describe('ProjectTimeline', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders week headers, label positions, issue links, and visible blocker connectors', () => {
    const module = projectModule('module-1', 'Release Readiness')
    render(
      <MemoryRouter>
        <ProjectTimeline
          projectId="project"
          issues={[
            issue('i1', { title: 'Run billing dry run', start_date: '2026-06-29', target_date: '2026-06-29' }),
            issue('i2', { title: 'Publish operator runbook', start_date: '2026-06-30', target_date: '2026-07-03' }),
          ]}
          teams={[]}
          assignees={[]}
          modules={[module]}
          moduleIssueLinks={[moduleLink('i1', module), moduleLink('i2', module)]}
          blockers={[blocker('visible', 'i1', 'i2'), blocker('hidden', 'missing', 'i2')]}
          onCreateIssue={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Jun 2026')).toBeInTheDocument()
    expect(screen.getByText('Jul 2026')).toBeInTheDocument()
    expect(screen.getByText('W27')).toBeInTheDocument()
    expect(screen.getByText('28 Jun - 4')).toBeInTheDocument()
    expect(screen.getAllByTestId('project-timeline-weekend-cell').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Run billing dry run' })).toHaveAttribute('href', '/projects/project/issues/i1')
    expect(screen.getByRole('link', { name: 'Run billing dry run' })).toHaveAttribute('data-label-position', 'outside')
    expect(screen.getByRole('link', { name: 'Publish operator runbook' })).toHaveAttribute('href', '/projects/project/issues/i2')
    expect(screen.getByRole('link', { name: 'Publish operator runbook' })).toHaveAttribute('data-label-position', 'inside')

    const connectors = within(screen.getByTestId('project-timeline-connectors')).getAllByTestId('project-timeline-connector')
    expect(connectors).toHaveLength(1)
  })

  it('colors bars by team, then assignee, then fallback', () => {
    render(
      <MemoryRouter>
        <ProjectTimeline
          projectId="project"
          issues={[
            issue('i1', { title: 'Team issue', team_id: 'team-1', team: { id: 'team-1', name: 'Product', slug: 'product', status: 'active', metadata: { color: '#fed7aa' } } }),
            issue('i2', { title: 'Assigned issue' }),
            issue('i3', { title: 'Fallback issue' }),
          ]}
          teams={[team('team-1', '#fed7aa')]}
          assignees={[assignee('i2', 'profile-1')]}
          modules={[]}
          moduleIssueLinks={[]}
          blockers={[]}
          onCreateIssue={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Team issue' })).toHaveAttribute('data-bar-color', '#fed7aa')
    expect(screen.getByRole('link', { name: 'Assigned issue' })).toHaveAttribute('data-bar-color', getOpenKbProfileColor({
      id: 'profile-1',
      email: 'profile-1@example.com',
      full_name: 'User profile-1',
      username: 'profile-1',
      avatar_url: null,
    }))
    expect(screen.getByRole('link', { name: 'Fallback issue' })).toHaveAttribute('data-bar-color')
  })
})
