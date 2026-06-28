import { describe, expect, it, vi } from 'vitest'

vi.mock('../../hooks/queries/useProjects', () => ({
  useAddProjectTab: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useRemoveProjectTab: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUpdateProjectTab: () => ({ isPending: false, mutateAsync: vi.fn() }),
}))

import {
  defaultProjectTabKeys,
  getProjectTabKeyFromSection,
  getProjectTabInstancePath,
  projectTabDefinitions,
  requiredProjectTabKey,
} from '../projectTabs'
import { getCopiedProjectTabLabel } from '../../components/projects/useProjectTabActions'
import type { ProjectTab } from '../../types'

const tab = (id: string, label: string): ProjectTab => ({
  id,
  organisation_id: 'org',
  project_id: 'project',
  tab_key: 'list',
  label,
  sort_order: 10,
  metadata: {},
  created_by: null,
  updated_by: null,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: null,
  deleted_at: null,
})

describe('project tab registry', () => {
  it('keeps List required', () => {
    expect(requiredProjectTabKey).toBe('list')
    expect(defaultProjectTabKeys).toContain('list')
    expect(defaultProjectTabKeys).not.toContain('cycles')
    expect(defaultProjectTabKeys).not.toContain('pages')
    expect(defaultProjectTabKeys).not.toContain('note')
    expect(getProjectTabKeyFromSection('unknown-section')).toBe('overview')
    expect(getProjectTabKeyFromSection('cycles')).toBe('overview')
    expect(getProjectTabKeyFromSection('pages')).toBe('overview')
    expect(getProjectTabKeyFromSection('note')).toBe('overview')
  })

  it('deduplicates tab keys and omits removed standalone tabs', () => {
    const keys = projectTabDefinitions.map((tab) => tab.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toEqual(expect.arrayContaining([
      'overview',
      'list',
      'board',
      'timeline',
      'dashboard',
      'calendar',
      'workflow',
      'messages',
      'gantt',
      'workload',
      'files',
      'settings',
    ]))
    expect(keys).not.toContain('cycles')
    expect(keys).not.toContain('pages')
    expect(keys).not.toContain('note')
  })

  it('generates copy labels without colliding with existing tabs', () => {
    expect(getCopiedProjectTabLabel('List', [tab('1', 'List')])).toBe('List copy')
    expect(getCopiedProjectTabLabel('List', [
      tab('1', 'List'),
      tab('2', 'List copy'),
      tab('3', 'list copy 2'),
    ])).toBe('List copy 3')
    expect(getCopiedProjectTabLabel('   ', [])).toBe('Tab copy')
  })

  it('generates tab instance paths for configurable tabs', () => {
    expect(getProjectTabInstancePath('project', 'list', 'tab-id')).toBe('/projects/project/list/tab-id')
  })
})
