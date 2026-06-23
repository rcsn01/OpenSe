import { describe, expect, it } from 'vitest'
import {
  defaultProjectTabKeys,
  getProjectTabKeyFromSection,
  projectTabDefinitions,
  requiredProjectTabKey,
} from '../projectTabs'

describe('project tab registry', () => {
  it('keeps List required', () => {
    expect(requiredProjectTabKey).toBe('list')
    expect(defaultProjectTabKeys).toContain('list')
    expect(getProjectTabKeyFromSection('unknown-section')).toBe('overview')
  })

  it('deduplicates tab keys from screenshot and existing Open-KB tabs', () => {
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
      'note',
      'gantt',
      'workload',
      'files',
      'cycles',
      'pages',
      'settings',
    ]))
  })
})
