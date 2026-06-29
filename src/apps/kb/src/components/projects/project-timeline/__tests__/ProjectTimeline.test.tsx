import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProjectTimeline } from '../ProjectTimeline'
import type { Issue, IssueBlocker, ModuleIssueLink, ProjectModule } from '../../../../types'

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

  it('renders day headers, weekend cells, issue links, and visible blocker connectors', () => {
    const module = projectModule('module-1', 'Launch')
    render(
      <MemoryRouter>
        <ProjectTimeline
          projectId="project"
          issues={[
            issue('i1', { title: 'First task', start_date: '2026-06-24', target_date: '2026-06-26' }),
            issue('i2', { title: 'Second task', start_date: '2026-06-29', target_date: '2026-07-02' }),
          ]}
          modules={[module]}
          moduleIssueLinks={[moduleLink('i1', module), moduleLink('i2', module)]}
          blockers={[blocker('visible', 'i1', 'i2'), blocker('hidden', 'missing', 'i2')]}
          onCreateIssue={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Q2 2026')).toBeInTheDocument()
    expect(screen.getByText('Jun 2026')).toBeInTheDocument()
    expect(screen.getByText('Jul 2026')).toBeInTheDocument()
    expect(screen.getAllByTestId('project-timeline-weekend-cell').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'First task' })).toHaveAttribute('href', '/projects/project/issues/i1')
    expect(screen.getByRole('link', { name: 'Second task' })).toHaveAttribute('href', '/projects/project/issues/i2')

    const connectors = within(screen.getByTestId('project-timeline-connectors')).getAllByTestId('project-timeline-connector')
    expect(connectors).toHaveLength(1)
  })
})
