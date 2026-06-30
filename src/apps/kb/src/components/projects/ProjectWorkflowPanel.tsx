import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Select,
  Textarea,
} from '@repo/ui'
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useOrganisationMemberProfiles } from '../../hooks/queries/useIssues'
import {
  useCreateWorkflowRule,
  useDeleteWorkflowRule,
  useProjectWorkflowRules,
  useUpdateWorkflowRule,
} from '../../hooks/queries/useWorkflows'
import { useTeams } from '../../hooks/queries/useTeams'
import type {
  IssueState,
  WorkflowActionType,
  WorkflowRule,
  WorkflowRuleActionInput,
  WorkflowTriggerEvent,
} from '../../types'
import { formatProfileName } from '../../lib/profileFormatting'
import {
  summarizeWorkflowAction,
  summarizeWorkflowTrigger,
  validateWorkflowRuleInput,
  workflowActionLabels,
  workflowTriggerLabels,
} from '../../lib/workflowUtils'

type DraftAction = WorkflowRuleActionInput & { key: string }

const actionTypeOptions = Object.entries(workflowActionLabels).map(([value, label]) => ({
  value,
  label,
}))

const triggerOptions = [
  { value: 'issue_created', label: workflowTriggerLabels.issue_created },
  { value: 'state_entered', label: 'When status becomes…' },
]

let draftActionKeyCounter = 0
const nextDraftActionKey = () => `draft-action-${++draftActionKeyCounter}`

const emptyAction = (type: WorkflowActionType = 'assign_users'): DraftAction => {
  switch (type) {
    case 'assign_team':
      return { key: nextDraftActionKey(), action_type: type, config: { team_id: '' } }
    case 'set_due_date':
      return { key: nextDraftActionKey(), action_type: type, config: { mode: 'relative', days: 7 } }
    case 'add_comment':
      return { key: nextDraftActionKey(), action_type: type, config: { text: '' } }
    case 'create_subtasks':
      return { key: nextDraftActionKey(), action_type: type, config: { items: [{ title: '' }] } }
    default:
      return { key: nextDraftActionKey(), action_type: 'assign_users', config: { profile_ids: [] } }
  }
}

const toDraftActions = (rule?: WorkflowRule | null): DraftAction[] =>
  rule?.actions.map((action) => ({
    key: action.id,
    action_type: action.action_type,
    config: action.config,
    sort_order: action.sort_order,
  })) ?? [emptyAction()]

const WorkflowActionEditor = ({
  action,
  canEdit,
  states,
  members,
  teams,
  onChange,
  onRemove,
}: {
  action: DraftAction
  canEdit: boolean
  states: IssueState[]
  members: Array<{ profile_id: string; profile: { full_name: string | null; username: string | null; email: string | null } }>
  teams: Array<{ id: string; name: string }>
  onChange: (next: DraftAction) => void
  onRemove: () => void
}) => {
  const memberOptions = members.map((member) => ({
    value: member.profile_id,
    label: formatProfileName(member.profile),
  }))

  const selectedProfileIds = Array.isArray(action.config.profile_ids)
    ? (action.config.profile_ids as string[])
    : []

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
      <div className="mb-3 flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        <Select
          className="min-w-0 flex-1 border border-[var(--color-border)] bg-[var(--color-background)]"
          value={action.action_type}
          onChange={(event) => onChange(emptyAction(event.target.value as WorkflowActionType))}
          disabled={!canEdit}
          options={actionTypeOptions}
        />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove} disabled={!canEdit} aria-label="Remove action">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {action.action_type === 'assign_users' ? (
        <div className="space-y-2">
          <p className="text-xs text-[var(--color-muted-foreground)]">Select one or more users.</p>
          <div className="flex flex-wrap gap-2">
            {memberOptions.map((option) => {
              const selected = selectedProfileIds.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => {
                    const nextIds = selected
                      ? selectedProfileIds.filter((id) => id !== option.value)
                      : [...selectedProfileIds, option.value]
                    onChange({ ...action, config: { profile_ids: nextIds } })
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    selected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {action.action_type === 'assign_team' ? (
        <Select
          className="border border-[var(--color-border)] bg-[var(--color-background)]"
          value={String(action.config.team_id ?? '')}
          onChange={(event) => onChange({ ...action, config: { team_id: event.target.value } })}
          disabled={!canEdit}
          options={[
            { value: '', label: 'Select team' },
            ...teams.map((team) => ({ value: team.id, label: team.name })),
          ]}
        />
      ) : null}

      {action.action_type === 'set_due_date' ? (
        <div className="grid gap-2 md:grid-cols-[9rem_minmax(0,1fr)]">
          <Select
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={String(action.config.mode ?? 'relative')}
            onChange={(event) => {
              const mode = event.target.value
              onChange({
                ...action,
                config: mode === 'absolute'
                  ? { mode: 'absolute', date: '' }
                  : { mode: 'relative', days: 7 },
              })
            }}
            disabled={!canEdit}
            options={[
              { value: 'relative', label: 'Relative' },
              { value: 'absolute', label: 'Absolute' },
            ]}
          />
          {action.config.mode === 'absolute' ? (
            <Input
              type="date"
              value={String(action.config.date ?? '')}
              onChange={(event) => onChange({ ...action, config: { mode: 'absolute', date: event.target.value } })}
              disabled={!canEdit}
            />
          ) : (
            <Input
              type="number"
              min={0}
              value={String(action.config.days ?? 7)}
              onChange={(event) => onChange({
                ...action,
                config: { mode: 'relative', days: Number(event.target.value || 0) },
              })}
              disabled={!canEdit}
              placeholder="Days from today"
            />
          )}
        </div>
      ) : null}

      {action.action_type === 'add_comment' ? (
        <Textarea
          value={String(action.config.text ?? '')}
          onChange={(event) => onChange({ ...action, config: { text: event.target.value } })}
          disabled={!canEdit}
          placeholder="Workflow comment text"
        />
      ) : null}

      {action.action_type === 'create_subtasks' ? (
        <div className="space-y-2">
          {(Array.isArray(action.config.items) ? action.config.items as Array<{ title?: string; state_id?: string; priority?: string }> : [{ title: '' }]).map((item, index) => (
            <div key={`${action.key}-${index}`} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_9rem_auto]">
              <Input
                value={item.title ?? ''}
                onChange={(event) => {
                  const items = [...(Array.isArray(action.config.items) ? action.config.items as Array<Record<string, unknown>> : [])]
                  items[index] = { ...items[index], title: event.target.value }
                  onChange({ ...action, config: { items } })
                }}
                disabled={!canEdit}
                placeholder="Subtask title"
              />
              <Select
                className="border border-[var(--color-border)] bg-[var(--color-background)]"
                value={String(item.state_id ?? '')}
                onChange={(event) => {
                  const items = [...(Array.isArray(action.config.items) ? action.config.items as Array<Record<string, unknown>> : [])]
                  items[index] = { ...items[index], state_id: event.target.value || null }
                  onChange({ ...action, config: { items } })
                }}
                disabled={!canEdit}
                options={[
                  { value: '', label: 'Default state' },
                  ...states.map((state) => ({ value: state.id, label: state.name })),
                ]}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!canEdit}
                aria-label="Remove subtask"
                onClick={() => {
                  const items = [...(Array.isArray(action.config.items) ? action.config.items as Array<Record<string, unknown>> : [])]
                  items.splice(index, 1)
                  onChange({ ...action, config: { items: items.length > 0 ? items : [{ title: '' }] } })
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canEdit}
            onClick={() => {
              const items = [...(Array.isArray(action.config.items) ? action.config.items as Array<Record<string, unknown>> : [])]
              items.push({ title: '' })
              onChange({ ...action, config: { items } })
            }}
          >
            <Plus className="h-4 w-4" />
            Subtask
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export const ProjectWorkflowPanel = ({
  organisationId,
  projectId,
  states,
  canEdit,
}: {
  organisationId: string
  projectId: string
  states: IssueState[]
  canEdit: boolean
}) => {
  const { data: rules = [], isLoading } = useProjectWorkflowRules(organisationId, projectId)
  const { data: members = [] } = useOrganisationMemberProfiles(organisationId)
  const { data: teams = [] } = useTeams(organisationId)
  const createRule = useCreateWorkflowRule()
  const updateRule = useUpdateWorkflowRule()
  const deleteRule = useDeleteWorkflowRule()

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null)
  const [name, setName] = useState('')
  const [triggerEvent, setTriggerEvent] = useState<WorkflowTriggerEvent>('state_entered')
  const [stateId, setStateId] = useState('')
  const [actions, setActions] = useState<DraftAction[]>([emptyAction()])

  const statesById = useMemo(() => new Map(states.map((state) => [state.id, state])), [states])
  const projectStates = useMemo(
    () => states.filter((state) => state.project_id === projectId),
    [projectId, states],
  )

  const resetEditor = () => {
    setEditingRule(null)
    setName('')
    setTriggerEvent('state_entered')
    setStateId(projectStates[0]?.id ?? '')
    setActions([emptyAction()])
  }

  const openCreate = () => {
    resetEditor()
    setEditorOpen(true)
  }

  const openEdit = (rule: WorkflowRule) => {
    setEditingRule(rule)
    setName(rule.name)
    setTriggerEvent(rule.trigger_event)
    setStateId(rule.state_id ?? '')
    setActions(toDraftActions(rule))
    setEditorOpen(true)
  }

  const handleSave = async () => {
    const payloadActions: WorkflowRuleActionInput[] = actions.map((action, index) => ({
      action_type: action.action_type,
      config: action.config,
      sort_order: (index + 1) * 10,
    }))

    const validationError = validateWorkflowRuleInput({
      name,
      trigger_event: triggerEvent,
      state_id: triggerEvent === 'state_entered' ? stateId || null : stateId || null,
      actions: payloadActions,
    })

    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      if (editingRule) {
        await updateRule.mutateAsync({
          id: editingRule.id,
          organisation_id: organisationId,
          project_id: projectId,
          name,
          trigger_event: triggerEvent,
          state_id: triggerEvent === 'state_entered' ? stateId : stateId || null,
          actions: payloadActions,
        })
        toast.success('Workflow rule updated')
      } else {
        await createRule.mutateAsync({
          organisation_id: organisationId,
          project_id: projectId,
          name,
          trigger_event: triggerEvent,
          state_id: triggerEvent === 'state_entered' ? stateId : stateId || null,
          actions: payloadActions,
        })
        toast.success('Workflow rule created')
      }
      setEditorOpen(false)
      resetEditor()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save workflow rule')
    }
  }

  const handleToggleEnabled = async (rule: WorkflowRule) => {
    try {
      await updateRule.mutateAsync({
        id: rule.id,
        organisation_id: organisationId,
        project_id: projectId,
        enabled: !rule.enabled,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update workflow rule')
    }
  }

  const handleDelete = async (rule: WorkflowRule) => {
    try {
      await deleteRule.mutateAsync({ organisationId, projectId, ruleId: rule.id })
      toast.success('Workflow rule deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete workflow rule')
    }
  }

  const saving = createRule.isPending || updateRule.isPending

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Workflow rules</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Automate assignments, due dates, comments, and subtasks when items are created or enter a status.
          </p>
        </div>
        {canEdit ? (
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add rule
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-semibold">Rules</div>
          {isLoading ? (
            <div className="px-4 py-8 text-sm text-[var(--color-muted-foreground)]">Loading workflow rules…</div>
          ) : rules.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No workflow rules yet"
                description={canEdit ? 'Create a rule to automate work when items change status.' : 'No workflow rules have been configured for this project.'}
              />
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {rules.map((rule) => (
                <div key={rule.id} className="space-y-3 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{rule.name}</span>
                        <Badge variant={rule.enabled ? 'success' : 'neutral'}>{rule.enabled ? 'Enabled' : 'Disabled'}</Badge>
                      </div>
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        {summarizeWorkflowTrigger(rule, statesById)}
                      </p>
                    </div>
                    {canEdit ? (
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rule)} aria-label="Edit rule">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDelete(rule)}
                          aria-label="Delete rule"
                          loading={deleteRule.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rule.actions.map((action) => (
                      <Badge key={action.id} variant="outline">{summarizeWorkflowAction(action)}</Badge>
                    ))}
                  </div>
                  {canEdit ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => handleToggleEnabled(rule)}>
                      {rule.enabled ? 'Disable rule' : 'Enable rule'}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-semibold">Statuses</div>
          <div className="divide-y divide-[var(--color-border)]">
            {projectStates.map((state) => (
              <div key={state.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: state.color }} />
                  {state.name}
                </span>
                <Badge variant="neutral">{state.group_key}</Badge>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Dialog open={editorOpen} onOpenChange={(open) => {
        setEditorOpen(open)
        if (!open) resetEditor()
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit workflow rule' : 'Create workflow rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Rule name</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Triage handoff" disabled={!canEdit} />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Trigger</span>
                <Select
                  className="border border-[var(--color-border)] bg-[var(--color-background)]"
                  value={triggerEvent}
                  onChange={(event) => setTriggerEvent(event.target.value as WorkflowTriggerEvent)}
                  disabled={!canEdit}
                  options={triggerOptions}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  {triggerEvent === 'issue_created' ? 'Only when created in status (optional)' : 'Status'}
                </span>
                <Select
                  className="border border-[var(--color-border)] bg-[var(--color-background)]"
                  value={stateId}
                  onChange={(event) => setStateId(event.target.value)}
                  disabled={!canEdit}
                  options={triggerEvent === 'issue_created'
                    ? [{ value: '', label: 'Any status' }, ...projectStates.map((state) => ({ value: state.id, label: state.name }))]
                    : projectStates.map((state) => ({ value: state.id, label: state.name }))}
                />
              </label>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Actions</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canEdit}
                  onClick={() => setActions((current) => [...current, emptyAction()])}
                >
                  <Plus className="h-4 w-4" />
                  Action
                </Button>
              </div>
              {actions.map((action) => (
                <WorkflowActionEditor
                  key={action.key}
                  action={action}
                  canEdit={canEdit}
                  states={projectStates}
                  members={members}
                  teams={teams}
                  onChange={(next) => setActions((current) => current.map((item) => (item.key === action.key ? next : item)))}
                  onRemove={() => setActions((current) => (current.length === 1 ? current : current.filter((item) => item.key !== action.key)))}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSave} loading={saving} disabled={!canEdit}>Save rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
