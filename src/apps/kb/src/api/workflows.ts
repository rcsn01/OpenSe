import { db } from '../supabaseClient'
import type {
  IssueState,
  WorkflowRule,
  WorkflowRuleAction,
  WorkflowRuleInput,
  WorkflowRuleUpdateInput,
} from '../types'

const workflowRuleSelect = `
  id,
  organisation_id,
  project_id,
  name,
  trigger_event,
  state_id,
  enabled,
  sort_order,
  created_at,
  updated_at,
  deleted_at,
  state:states(id, organisation_id, project_id, name, group_key, color, sort_order, is_default)
`

const workflowRuleActionSelect = `
  id,
  organisation_id,
  project_id,
  rule_id,
  action_type,
  config,
  sort_order,
  created_at,
  updated_at,
  deleted_at
`

const normalizeSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

type WorkflowRuleRow = Omit<WorkflowRule, 'state' | 'actions'> & {
  state?: IssueState | IssueState[] | null
}

const normalizeWorkflowRule = (row: WorkflowRuleRow, actions: WorkflowRuleAction[]): WorkflowRule => ({
  ...row,
  state: normalizeSingle(row.state),
  actions,
})

export const fetchProjectWorkflowRules = async (
  organisationId: string,
  projectId: string,
): Promise<WorkflowRule[]> => {
  const { data: rules, error: rulesError } = await db
    .from('workflow_rules')
    .select(workflowRuleSelect)
    .eq('organisation_id', organisationId)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (rulesError) throw rulesError

  const ruleRows = (rules ?? []) as unknown as WorkflowRuleRow[]
  if (ruleRows.length === 0) return []

  const ruleIds = ruleRows.map((rule) => rule.id)
  const { data: actions, error: actionsError } = await db
    .from('workflow_rule_actions')
    .select(workflowRuleActionSelect)
    .eq('organisation_id', organisationId)
    .eq('project_id', projectId)
    .in('rule_id', ruleIds)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (actionsError) throw actionsError

  const actionsByRuleId = new Map<string, WorkflowRuleAction[]>()
  ;((actions ?? []) as WorkflowRuleAction[]).forEach((action) => {
    const existing = actionsByRuleId.get(action.rule_id) ?? []
    existing.push(action)
    actionsByRuleId.set(action.rule_id, existing)
  })

  return ruleRows.map((rule) => normalizeWorkflowRule(rule, actionsByRuleId.get(rule.id) ?? []))
}

const replaceWorkflowRuleActions = async ({
  organisationId,
  projectId,
  ruleId,
  actions,
}: {
  organisationId: string
  projectId: string
  ruleId: string
  actions: WorkflowRuleInput['actions']
}) => {
  const now = new Date().toISOString()
  const { error: softDeleteError } = await db
    .from('workflow_rule_actions')
    .update({ deleted_at: now })
    .eq('organisation_id', organisationId)
    .eq('project_id', projectId)
    .eq('rule_id', ruleId)
    .is('deleted_at', null)

  if (softDeleteError) throw softDeleteError
  if (actions.length === 0) return

  const payload = actions.map((action, index) => ({
    organisation_id: organisationId,
    project_id: projectId,
    rule_id: ruleId,
    action_type: action.action_type,
    config: action.config,
    sort_order: action.sort_order ?? (index + 1) * 10,
  }))

  const { error: insertError } = await db.from('workflow_rule_actions').insert(payload)
  if (insertError) throw insertError
}

export const createWorkflowRule = async (input: WorkflowRuleInput): Promise<WorkflowRule> => {
  const { data, error } = await db
    .from('workflow_rules')
    .insert({
      organisation_id: input.organisation_id,
      project_id: input.project_id,
      name: input.name.trim(),
      trigger_event: input.trigger_event,
      state_id: input.state_id ?? null,
      enabled: input.enabled ?? true,
      sort_order: input.sort_order ?? 0,
    })
    .select(workflowRuleSelect)
    .single()

  if (error) throw error

  const rule = data as unknown as WorkflowRuleRow
  await replaceWorkflowRuleActions({
    organisationId: input.organisation_id,
    projectId: input.project_id,
    ruleId: rule.id,
    actions: input.actions,
  })

  const created = await fetchProjectWorkflowRules(input.organisation_id, input.project_id)
  return created.find((item) => item.id === rule.id) ?? normalizeWorkflowRule(rule, [])
}

export const updateWorkflowRule = async ({
  id,
  organisation_id,
  project_id,
  actions,
  ...input
}: WorkflowRuleUpdateInput): Promise<WorkflowRule> => {
  const payload = {
    ...input,
    name: input.name?.trim(),
    state_id: input.state_id === undefined ? undefined : input.state_id || null,
  }

  const { error } = await db
    .from('workflow_rules')
    .update(payload)
    .eq('organisation_id', organisation_id)
    .eq('project_id', project_id)
    .eq('id', id)

  if (error) throw error

  if (actions) {
    await replaceWorkflowRuleActions({
      organisationId: organisation_id,
      projectId: project_id,
      ruleId: id,
      actions,
    })
  }

  const rules = await fetchProjectWorkflowRules(organisation_id, project_id)
  const updated = rules.find((rule) => rule.id === id)
  if (!updated) throw new Error('Workflow rule not found after update')
  return updated
}

export const deleteWorkflowRule = async ({
  organisationId,
  projectId,
  ruleId,
}: {
  organisationId: string
  projectId: string
  ruleId: string
}) => {
  const now = new Date().toISOString()
  const { error: actionsError } = await db
    .from('workflow_rule_actions')
    .update({ deleted_at: now })
    .eq('organisation_id', organisationId)
    .eq('project_id', projectId)
    .eq('rule_id', ruleId)
    .is('deleted_at', null)

  if (actionsError) throw actionsError

  const { error } = await db
    .from('workflow_rules')
    .update({ deleted_at: now })
    .eq('organisation_id', organisationId)
    .eq('project_id', projectId)
    .eq('id', ruleId)

  if (error) throw error
}
