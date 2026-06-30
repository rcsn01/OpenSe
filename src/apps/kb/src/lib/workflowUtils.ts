import type {
  IssueState,
  WorkflowActionType,
  WorkflowRule,
  WorkflowRuleAction,
  WorkflowTriggerEvent,
} from '../types'

export const workflowActionLabels: Record<WorkflowActionType, string> = {
  assign_users: 'Assign users',
  assign_team: 'Assign team',
  set_due_date: 'Set due date',
  add_comment: 'Add comment',
  create_subtasks: 'Create subtasks',
}

export const workflowTriggerLabels: Record<WorkflowTriggerEvent, string> = {
  issue_created: 'New item',
  state_entered: 'Status entered',
}

export const summarizeWorkflowAction = (action: WorkflowRuleAction) => {
  switch (action.action_type) {
    case 'assign_users': {
      const count = Array.isArray(action.config.profile_ids) ? action.config.profile_ids.length : 0
      return `${workflowActionLabels.assign_users} (${count})`
    }
    case 'assign_team':
      return workflowActionLabels.assign_team
    case 'set_due_date':
      return action.config.mode === 'relative'
        ? `Due in ${action.config.days} days`
        : `Due on ${action.config.date}`
    case 'add_comment':
      return workflowActionLabels.add_comment
    case 'create_subtasks': {
      const count = Array.isArray(action.config.items) ? action.config.items.length : 0
      return `${workflowActionLabels.create_subtasks} (${count})`
    }
    default:
      return action.action_type
  }
}

export const summarizeWorkflowTrigger = (rule: WorkflowRule, statesById: Map<string, IssueState>) => {
  if (rule.trigger_event === 'issue_created') {
    if (!rule.state_id) return workflowTriggerLabels.issue_created
    const state = statesById.get(rule.state_id)
    return state ? `New item in ${state.name}` : workflowTriggerLabels.issue_created
  }

  const state = rule.state_id ? statesById.get(rule.state_id) : rule.state
  return state ? `When status becomes ${state.name}` : 'When status changes'
}

export const validateWorkflowRuleInput = ({
  name,
  trigger_event,
  state_id,
  actions,
}: {
  name: string
  trigger_event: WorkflowTriggerEvent
  state_id: string | null
  actions: Array<{ action_type: WorkflowActionType; config: Record<string, unknown> }>
}) => {
  if (!name.trim()) return 'Rule name is required'
  if (trigger_event === 'state_entered' && !state_id) return 'Select a status for this trigger'
  if (actions.length === 0) return 'Add at least one action'

  for (const action of actions) {
    switch (action.action_type) {
      case 'assign_users':
        if (!Array.isArray(action.config.profile_ids) || action.config.profile_ids.length === 0) {
          return 'Select at least one user to assign'
        }
        break
      case 'assign_team':
        if (!action.config.team_id) return 'Select a team to assign'
        break
      case 'set_due_date':
        if (action.config.mode === 'absolute' && !action.config.date) return 'Select a due date'
        if (action.config.mode === 'relative' && typeof action.config.days !== 'number') return 'Enter a due date offset'
        break
      case 'add_comment':
        if (!String(action.config.text ?? '').trim()) return 'Comment text is required'
        break
      case 'create_subtasks': {
        const items = Array.isArray(action.config.items) ? action.config.items : []
        if (items.length === 0 || !items.some((item) => String((item as { title?: string }).title ?? '').trim())) {
          return 'Add at least one subtask title'
        }
        break
      }
      default:
        break
    }
  }

  return null
}
