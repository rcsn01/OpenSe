import { describe, expect, it } from 'vitest'
import {
  summarizeWorkflowAction,
  summarizeWorkflowTrigger,
  validateWorkflowRuleInput,
} from '../workflowUtils'
import type { IssueState, WorkflowRule, WorkflowRuleAction } from '../../types'

const state = (id: string, name: string): IssueState => ({
  id,
  organisation_id: 'org',
  project_id: 'project',
  name,
  group_key: 'started',
  color: '#2563eb',
  sort_order: 10,
  is_default: false,
})

const action = (overrides: Partial<WorkflowRuleAction>): WorkflowRuleAction => ({
  id: 'action-1',
  organisation_id: 'org',
  project_id: 'project',
  rule_id: 'rule-1',
  action_type: 'assign_users',
  config: { profile_ids: ['user-1'] },
  sort_order: 10,
  created_at: '2026-06-20T00:00:00.000Z',
  updated_at: null,
  deleted_at: null,
  ...overrides,
})

const rule = (overrides: Partial<WorkflowRule>): WorkflowRule => ({
  id: 'rule-1',
  organisation_id: 'org',
  project_id: 'project',
  name: 'Triage',
  trigger_event: 'state_entered',
  state_id: 'state-1',
  enabled: true,
  sort_order: 10,
  created_at: '2026-06-20T00:00:00.000Z',
  updated_at: null,
  deleted_at: null,
  actions: [],
  ...overrides,
})

describe('workflowUtils', () => {
  it('summarizes workflow triggers', () => {
    const statesById = new Map([['state-1', state('state-1', 'In Progress')]])

    expect(summarizeWorkflowTrigger(rule({ trigger_event: 'issue_created', state_id: null }), statesById)).toBe('New item')
    expect(summarizeWorkflowTrigger(rule({ trigger_event: 'issue_created', state_id: 'state-1' }), statesById)).toBe('New item in In Progress')
    expect(summarizeWorkflowTrigger(rule({ trigger_event: 'state_entered', state_id: 'state-1' }), statesById)).toBe('When status becomes In Progress')
  })

  it('summarizes workflow actions', () => {
    expect(summarizeWorkflowAction(action({ action_type: 'assign_users', config: { profile_ids: ['a', 'b'] } }))).toBe('Assign users (2)')
    expect(summarizeWorkflowAction(action({ action_type: 'set_due_date', config: { mode: 'relative', days: 5 } }))).toBe('Due in 5 days')
    expect(summarizeWorkflowAction(action({ action_type: 'create_subtasks', config: { items: [{ title: 'One' }, { title: 'Two' }] } }))).toBe('Create subtasks (2)')
  })

  it('validates workflow rule input', () => {
    expect(validateWorkflowRuleInput({
      name: '',
      trigger_event: 'state_entered',
      state_id: 'state-1',
      actions: [{ action_type: 'add_comment', config: { text: 'Hello' } }],
    })).toBe('Rule name is required')

    expect(validateWorkflowRuleInput({
      name: 'Rule',
      trigger_event: 'state_entered',
      state_id: null,
      actions: [{ action_type: 'add_comment', config: { text: 'Hello' } }],
    })).toBe('Select a status for this trigger')

    expect(validateWorkflowRuleInput({
      name: 'Rule',
      trigger_event: 'state_entered',
      state_id: 'state-1',
      actions: [],
    })).toBe('Add at least one action')

    expect(validateWorkflowRuleInput({
      name: 'Rule',
      trigger_event: 'state_entered',
      state_id: 'state-1',
      actions: [{ action_type: 'add_comment', config: { text: 'Ready for review' } }],
    })).toBeNull()
  })
})
