import { describe, expect, it } from 'vitest'

import {
  getProjectIssuePath,
  getProjectListIssuePath,
  getTasksListIssuePath,
  getTasksPath,
} from '../projectRoutes'

describe('project and task routes', () => {
  it('builds project issue paths without changing existing project routes', () => {
    expect(getProjectIssuePath('project-1', 'issue-1')).toBe('/projects/project-1/issues/issue-1')
    expect(getProjectListIssuePath('project-1', 'issue-1')).toBe('/projects/project-1/list/issues/issue-1')
    expect(getProjectListIssuePath('project-1', 'issue-1', 'tab-1')).toBe('/projects/project-1/list/tab-1/issues/issue-1')
  })

  it('builds global task workspace paths', () => {
    expect(getTasksPath()).toBe('/tasks/list')
    expect(getTasksPath('overview')).toBe('/tasks/overview')
    expect(getTasksListIssuePath('issue-1')).toBe('/tasks/list/issues/issue-1')
  })
})
