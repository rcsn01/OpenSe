import { describe, expect, it } from 'vitest'
import { formatIssueKey, isIssuePriority, issuePriorityTone } from '../issueFormatting'

describe('issue formatting', () => {
  it('formats issue keys with a project identifier fallback', () => {
    expect(formatIssueKey({ sequence_id: 42, project: { id: 'project-1', name: 'Launch', identifier: 'OKB' } })).toBe('OKB-42')
    expect(formatIssueKey({ sequence_id: null, project: null })).toBe('KB-?')
  })

  it('validates priorities and exposes tones', () => {
    expect(isIssuePriority('urgent')).toBe(true)
    expect(isIssuePriority('blocked')).toBe(false)
    expect(issuePriorityTone.high).toBe('danger')
  })
})
