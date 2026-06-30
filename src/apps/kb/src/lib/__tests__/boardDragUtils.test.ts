import { describe, expect, it } from 'vitest'
import type { Issue } from '../../types'
import {
  applyBoardDrop,
  columnIdToStateId,
  getIssueColumnId,
  resolveBoardDrop,
} from '../boardDragUtils'

const issue = (id: string, stateId: string | null): Issue => ({
  id,
  organisation_id: 'org-1',
  project_id: 'project-1',
  sequence_id: 1,
  title: `Issue ${id}`,
  description_json: { type: 'doc', content: [] },
  description_html: null,
  description_text: null,
  priority: 'none',
  state_id: stateId,
  estimate_point_id: null,
  parent_issue_id: null,
  team_id: null,
  start_date: null,
  target_date: null,
  completed_at: null,
  archived_at: null,
  created_by: null,
  updated_by: null,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: null,
  deleted_at: null,
})

const columns = [
  { id: 'none', title: 'No state', color: '#64748b', issues: [issue('i1', null)] },
  { id: 'state-todo', title: 'Todo', color: '#fff', issues: [issue('i2', 'state-todo')] },
  { id: 'state-done', title: 'Done', color: '#000', issues: [issue('i3', 'state-done')] },
]

describe('boardDragUtils', () => {
  it('maps issue state to column id', () => {
    expect(getIssueColumnId(issue('i1', null))).toBe('none')
    expect(getIssueColumnId(issue('i2', 'state-todo'))).toBe('state-todo')
  })

  it('maps column id to state id', () => {
    expect(columnIdToStateId('none')).toBeNull()
    expect(columnIdToStateId('state-todo')).toBe('state-todo')
  })

  it('returns null when dropping in the same column', () => {
    expect(resolveBoardDrop({
      activeIssueId: 'i2',
      overColumnId: 'state-todo',
      columns,
    })).toBeNull()
  })

  it('resolves cross-column moves', () => {
    expect(resolveBoardDrop({
      activeIssueId: 'i2',
      overColumnId: 'state-done',
      columns,
    })).toEqual({
      issueId: 'i2',
      nextStateId: 'state-done',
    })
  })

  it('resolves dropping into the no-state column', () => {
    expect(resolveBoardDrop({
      activeIssueId: 'i2',
      overColumnId: 'none',
      columns,
    })).toEqual({
      issueId: 'i2',
      nextStateId: null,
    })
  })

  it('resolves dropping onto another card in a different column', () => {
    expect(resolveBoardDrop({
      activeIssueId: 'i2',
      overColumnId: 'i3',
      columns,
    })).toEqual({
      issueId: 'i2',
      nextStateId: 'state-done',
    })
  })

  it('returns null for unknown issue or missing target', () => {
    expect(resolveBoardDrop({
      activeIssueId: 'missing',
      overColumnId: 'state-done',
      columns,
    })).toBeNull()

    expect(resolveBoardDrop({
      activeIssueId: 'i2',
      overColumnId: null,
      columns,
    })).toBeNull()
  })

  it('applies optimistic column updates', () => {
    const next = applyBoardDrop(columns, 'i2', 'state-done')
    expect(next.find((column) => column.id === 'state-todo')?.issues).toHaveLength(0)
    expect(next.find((column) => column.id === 'state-done')?.issues.map((item) => item.id)).toEqual(['i3', 'i2'])
    expect(next.find((column) => column.id === 'state-done')?.issues[1]?.state_id).toBe('state-done')
  })
})
