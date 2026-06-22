import { Link, useSearchParams } from 'react-router-dom'
import { Badge, Button, EmptyState, Input, Select, cn } from '@repo/ui'
import { BarChart3, CalendarDays, Download, LayoutGrid, List, Plus, Save, Search, Table2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { toast } from 'sonner'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { useOrganisation } from '../contexts/OrganisationContext'
import {
  useCreateIssueView,
  useCreateIssue,
  useIssues,
  useIssueLabels,
  useIssueStates,
  useIssueViews,
  useOrganisationMemberProfiles,
  useUpdateIssue,
} from '../hooks/queries/useIssues'
import { useCycles, useModules } from '../hooks/queries/usePlanning'
import { useProjects } from '../hooks/queries/useProjects'
import type { IssueFilters, IssuePriority, IssueViewLayout } from '../types'
import { downloadTextFile, escapeCsv, parseCsv } from '../lib/csv'
import { startOfMonth } from '../lib/dateFormatting'
import {
  IssueCalendar,
  IssueCard,
  IssueGantt,
  IssueRow,
  IssueTable,
} from '../components/issues/IssueViews'
import { buildBoardColumns } from '../lib/issueViews'
import {
  formatIssueKey,
  isIssuePriority,
  issuePriorityOptions as priorityOptions,
} from '../lib/issueFormatting'

const issueViewModes = ['list', 'board', 'table', 'calendar', 'gantt'] as const

const targetOptions: Array<{ value: NonNullable<IssueFilters['target']>; label: string }> = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'due_soon', label: 'Due in 7 days' },
  { value: 'no_target', label: 'No target date' },
]

const isTargetFilter = (value: string | null): value is NonNullable<IssueFilters['target']> =>
  Boolean(value && targetOptions.some((option) => option.value === value))

const isIssueViewMode = (value: string | null): value is IssueViewLayout =>
  Boolean(value && issueViewModes.includes(value as IssueViewLayout))

export const IssuesPage = () => {
  const { organisationId } = useOrganisation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [savedViewName, setSavedViewName] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()))
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set())
  const [bulkPriority, setBulkPriority] = useState('')
  const [bulkStateId, setBulkStateId] = useState('')
  const selectedProjectId = searchParams.get('project')
  const selectedStateId = searchParams.get('state')
  const selectedAssigneeId = searchParams.get('assignee')
  const selectedLabelId = searchParams.get('label')
  const selectedCycleId = searchParams.get('cycle')
  const selectedModuleId = searchParams.get('module')
  const targetParam = searchParams.get('target')
  const selectedTarget = isTargetFilter(targetParam) ? targetParam : null
  const priorityParam = searchParams.get('priority')
  const selectedPriority = isIssuePriority(priorityParam) ? priorityParam : null
  const query = searchParams.get('q') ?? ''
  const viewParam = searchParams.get('view')
  const view: IssueViewLayout = isIssueViewMode(viewParam) ? viewParam : 'list'
  const activeFilters: IssueFilters = {
    project_id: selectedProjectId,
    state_id: selectedStateId,
    priority: selectedPriority,
    assignee_id: selectedAssigneeId,
    label_id: selectedLabelId,
    cycle_id: selectedCycleId,
    module_id: selectedModuleId,
    target: selectedTarget,
    query,
  }
  const { data: projects = [], isLoading: projectsLoading } = useProjects(organisationId)
  const { data: issueViews = [] } = useIssueViews(organisationId)
  const { data: issues = [], isLoading: issuesLoading } = useIssues(organisationId, activeFilters)
  const { data: states = [] } = useIssueStates(organisationId, selectedProjectId)
  const { data: labels = [] } = useIssueLabels(organisationId, selectedProjectId)
  const { data: members = [] } = useOrganisationMemberProfiles(organisationId)
  const { data: cycles = [] } = useCycles(organisationId, selectedProjectId)
  const { data: modules = [] } = useModules(organisationId, selectedProjectId)
  const createIssueView = useCreateIssueView()
  const updateIssue = useUpdateIssue()
  const createIssue = useCreateIssue()

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  const updateProjectFilter = (projectId: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (projectId) next.set('project', projectId)
    else {
      next.delete('project')
      next.delete('state')
      next.delete('label')
      next.delete('cycle')
      next.delete('module')
    }
    setSearchParams(next)
  }

  const clearFilters = () => {
    const next = new URLSearchParams()
    if (view !== 'list') next.set('view', view)
    setSearchParams(next)
  }

  const applySavedView = (viewId: string) => {
    const savedView = issueViews.find((item) => item.id === viewId)
    if (!savedView) return

    const next = new URLSearchParams()
    const filters = savedView.payload?.filters ?? {}
    if (filters.project_id) next.set('project', filters.project_id)
    if (filters.state_id) next.set('state', filters.state_id)
    if (filters.priority) next.set('priority', filters.priority)
    if (filters.assignee_id) next.set('assignee', filters.assignee_id)
    if (filters.label_id) next.set('label', filters.label_id)
    if (filters.cycle_id) next.set('cycle', filters.cycle_id)
    if (filters.module_id) next.set('module', filters.module_id)
    if (filters.target) next.set('target', filters.target)
    if (filters.query) next.set('q', filters.query)
    const savedViewMode = savedView.payload?.view ?? null
    if (isIssueViewMode(savedViewMode) && savedViewMode !== 'list') {
      next.set('view', savedViewMode)
    }
    setSearchParams(next)
  }

  const saveCurrentView = async () => {
    if (!organisationId || !savedViewName.trim()) return

    try {
      await createIssueView.mutateAsync({
        organisation_id: organisationId,
        project_id: selectedProjectId,
        name: savedViewName,
        filters: activeFilters,
        view,
      })
      setSavedViewName('')
      toast.success('Issue view saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save issue view')
    }
  }

  const toggleIssueSelection = (issueId: string) => {
    setSelectedIssueIds((current) => {
      const next = new Set(current)
      if (next.has(issueId)) next.delete(issueId)
      else next.add(issueId)
      return next
    })
  }

  const toggleAllIssues = () => {
    const visibleSelectedCount = issues.filter((issue) => selectedIssueIds.has(issue.id)).length
    setSelectedIssueIds(visibleSelectedCount === issues.length ? new Set() : new Set(issues.map((issue) => issue.id)))
  }

  const exportIssues = () => {
    const rows = [
      ['key', 'project_identifier', 'title', 'priority', 'state', 'start_date', 'target_date', 'description'],
      ...issues.map((issue) => [
        formatIssueKey(issue),
        issue.project?.identifier ?? '',
        issue.title,
        issue.priority,
        issue.state?.name ?? '',
        issue.start_date ?? '',
        issue.target_date ?? '',
        issue.description_text ?? '',
      ]),
    ]
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n')
    downloadTextFile(`open-kb-issues-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  const applyBulkEdit = async () => {
    const selectedIssues = issues.filter((issue) => selectedIssueIds.has(issue.id))
    if (!organisationId || selectedIssues.length === 0) return
    if (!bulkPriority && !bulkStateId) {
      toast.error('Choose a bulk value first')
      return
    }

    try {
      await Promise.all(selectedIssues.map((issue) => updateIssue.mutateAsync({
        id: issue.id,
        organisation_id: organisationId,
        priority: bulkPriority ? bulkPriority as IssuePriority : undefined,
        state_id: bulkStateId || undefined,
      })))
      setSelectedIssueIds(new Set())
      setBulkPriority('')
      setBulkStateId('')
      toast.success(`Updated ${selectedIssues.length} issue${selectedIssues.length === 1 ? '' : 's'}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update selected issues')
    }
  }

  const importIssues = async (file: File) => {
    if (!organisationId || !selectedProjectId) {
      toast.error('Select a project before importing issues')
      return
    }

    const text = await file.text()
    const [headers = [], ...rows] = parseCsv(text)
    const headerIndex = new Map(headers.map((header, index) => [header.trim().toLowerCase(), index]))
    const findValue = (row: string[], keys: string[]) => {
      const key = keys.find((candidate) => headerIndex.has(candidate))
      return key ? row[headerIndex.get(key) ?? -1]?.trim() ?? '' : ''
    }

    const importedRows = rows
      .map((row) => {
        const title = findValue(row, ['title', 'name'])
        if (!title) return null
        const priority = findValue(row, ['priority'])
        const stateName = findValue(row, ['state', 'state_name'])
        return {
          title,
          description_text: findValue(row, ['description', 'description_text']),
          priority: isIssuePriority(priority) ? priority : 'none',
          state_id: states.find((state) => state.name.toLowerCase() === stateName.toLowerCase())?.id ?? null,
          start_date: findValue(row, ['start_date', 'start']) || null,
          target_date: findValue(row, ['target_date', 'target', 'due_date']) || null,
        }
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))

    if (importedRows.length === 0) {
      toast.error('No importable issue rows found')
      return
    }

    try {
      await Promise.all(importedRows.map((row) => createIssue.mutateAsync({
        organisation_id: organisationId,
        project_id: selectedProjectId,
        title: row.title,
        description_text: row.description_text,
        priority: row.priority,
        state_id: row.state_id,
        start_date: row.start_date,
        target_date: row.target_date,
      })))
      toast.success(`Imported ${importedRows.length} issue${importedRows.length === 1 ? '' : 's'}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import issues')
    }
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) await importIssues(file)
  }

  const boardColumns = buildBoardColumns(states, issues)
  const selectedCount = issues.filter((issue) => selectedIssueIds.has(issue.id)).length

  return (
    <OpenKbPageShell isLoading={projectsLoading || issuesLoading}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Issues</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Track project work across organisation-scoped Open-KB projects.</p>
        </div>
        <Link
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-primary-hover)]"
          to={selectedProjectId ? `/issues/new?project=${selectedProjectId}` : '/issues/new'}
        >
          <Plus className="h-4 w-4" />
          New issue
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="grid w-full gap-2 lg:grid-cols-[repeat(4,minmax(9rem,1fr))] xl:grid-cols-[repeat(8,minmax(8rem,1fr))]">
          <Select
            aria-label="Filter by project"
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={selectedProjectId ?? ''}
            onChange={(event) => updateProjectFilter(event.target.value || null)}
            options={[
              { value: '', label: 'All projects' },
              ...projects.map((project) => ({ value: project.id, label: `${project.identifier} · ${project.name}` })),
            ]}
          />
          <Select
            aria-label="Filter by state"
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={selectedStateId ?? ''}
            onChange={(event) => updateParam('state', event.target.value || null)}
            options={[
              { value: '', label: 'All states' },
              ...states.map((state) => ({ value: state.id, label: state.name })),
            ]}
          />
          <Select
            aria-label="Filter by priority"
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={selectedPriority ?? ''}
            onChange={(event) => updateParam('priority', event.target.value || null)}
            options={[
              { value: '', label: 'All priorities' },
              ...priorityOptions.map((priority) => ({ value: priority.value, label: priority.label })),
            ]}
          />
          <Select
            aria-label="Filter by assignee"
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={selectedAssigneeId ?? ''}
            onChange={(event) => updateParam('assignee', event.target.value || null)}
            options={[
              { value: '', label: 'All assignees' },
              ...members.map((member) => ({
                value: member.profile_id,
                label: member.profile.full_name || member.profile.username || member.profile.email || 'Unknown user',
              })),
            ]}
          />
          <Select
            aria-label="Filter by label"
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={selectedLabelId ?? ''}
            onChange={(event) => updateParam('label', event.target.value || null)}
            options={[
              { value: '', label: 'All labels' },
              ...labels.map((label) => ({ value: label.id, label: label.name })),
            ]}
          />
          <Select
            aria-label="Filter by cycle"
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={selectedCycleId ?? ''}
            onChange={(event) => updateParam('cycle', event.target.value || null)}
            options={[
              { value: '', label: 'All cycles' },
              ...cycles.map((cycle) => ({ value: cycle.id, label: cycle.name })),
            ]}
          />
          <Select
            aria-label="Filter by module"
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={selectedModuleId ?? ''}
            onChange={(event) => updateParam('module', event.target.value || null)}
            options={[
              { value: '', label: 'All modules' },
              ...modules.map((projectModule) => ({ value: projectModule.id, label: projectModule.name })),
            ]}
          />
          <Select
            aria-label="Filter by target date"
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={selectedTarget ?? ''}
            onChange={(event) => updateParam('target', event.target.value || null)}
            options={[
              { value: '', label: 'Any target' },
              ...targetOptions,
            ]}
          />
          <Input
            aria-label="Search issues"
            prefix={<Search className="h-4 w-4" />}
            value={query}
            onChange={(event) => updateParam('q', event.target.value || null)}
            placeholder="Search title"
          />
        </div>
        <div className="inline-flex h-9 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
          <Button
            type="button"
            variant="ghost"
            className={cn('rounded-none border-r border-[var(--color-border)]', view === 'list' && 'bg-[var(--color-muted)]')}
            onClick={() => updateParam('view', null)}
          >
            <List className="h-4 w-4" />
            List
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={cn('rounded-none border-r border-[var(--color-border)]', view === 'board' && 'bg-[var(--color-muted)]')}
            onClick={() => updateParam('view', 'board')}
          >
            <LayoutGrid className="h-4 w-4" />
            Board
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={cn('rounded-none border-r border-[var(--color-border)]', view === 'table' && 'bg-[var(--color-muted)]')}
            onClick={() => updateParam('view', 'table')}
          >
            <Table2 className="h-4 w-4" />
            Table
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={cn('rounded-none border-r border-[var(--color-border)]', view === 'calendar' && 'bg-[var(--color-muted)]')}
            onClick={() => updateParam('view', 'calendar')}
          >
            <CalendarDays className="h-4 w-4" />
            Calendar
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={cn('rounded-none', view === 'gantt' && 'bg-[var(--color-muted)]')}
            onClick={() => updateParam('view', 'gantt')}
          >
            <BarChart3 className="h-4 w-4" />
            Gantt
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[var(--color-muted-foreground)]">
          {issues.length} issue{issues.length === 1 ? '' : 's'} match the current filters.
        </div>
        <Button type="button" variant="ghost" onClick={clearFilters}>
          <X className="h-4 w-4" />
          Clear filters
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={toggleAllIssues} disabled={issues.length === 0}>
            {selectedCount === issues.length ? 'Clear selection' : 'Select filtered'}
          </Button>
          <span className="text-sm text-[var(--color-muted-foreground)]">{selectedCount} selected</span>
          <Select
            aria-label="Bulk priority"
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            containerClassName="w-40"
            value={bulkPriority}
            onChange={(event) => setBulkPriority(event.target.value)}
            options={[
              { value: '', label: 'Keep priority' },
              ...priorityOptions,
            ]}
          />
          <Select
            aria-label="Bulk state"
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            containerClassName="w-44"
            value={bulkStateId}
            onChange={(event) => setBulkStateId(event.target.value)}
            options={[
              { value: '', label: 'Keep state' },
              ...states.map((state) => ({ value: state.id, label: state.name })),
            ]}
          />
          <Button type="button" onClick={applyBulkEdit} disabled={selectedCount === 0 || (!bulkPriority && !bulkStateId)} loading={updateIssue.isPending}>
            Apply
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={importInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportFile} />
          <Button type="button" variant="outline" onClick={exportIssues} disabled={issues.length === 0}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button type="button" variant="outline" onClick={() => importInputRef.current?.click()} disabled={!selectedProjectId || createIssue.isPending}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="w-full max-w-xs">
          <Select
            aria-label="Apply saved issue view"
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value=""
            onChange={(event) => applySavedView(event.target.value)}
            options={[
              { value: '', label: 'Saved views' },
              ...issueViews.map((item) => ({ value: item.id, label: item.name ?? item.title ?? 'Untitled view' })),
            ]}
          />
        </div>
        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          <Input
            aria-label="Saved view name"
            className="min-w-56"
            value={savedViewName}
            onChange={(event) => setSavedViewName(event.target.value)}
            placeholder="View name"
          />
          <Button type="button" variant="outline" onClick={saveCurrentView} loading={createIssueView.isPending} disabled={!savedViewName.trim()}>
            <Save className="h-4 w-4" />
            Save view
          </Button>
        </div>
      </div>

      {issues.length === 0 ? (
        <EmptyState title="No issues found" description="Create an issue to start tracking work in Open-KB." />
      ) : view === 'board' ? (
        <div className="grid min-h-[28rem] gap-3 overflow-x-auto pb-2 md:grid-flow-col md:auto-cols-[20rem] md:grid-cols-none">
          {boardColumns.map((column) => (
            <section key={column.id} className="flex min-h-0 flex-col rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="flex h-11 items-center justify-between border-b border-[var(--color-border)] px-3">
                <div className="inline-flex min-w-0 items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
                  <h2 className="truncate text-sm font-semibold">{column.title}</h2>
                </div>
                <Badge variant="neutral">{column.issues.length}</Badge>
              </div>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                {column.issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)}
              </div>
            </section>
          ))}
        </div>
      ) : view === 'table' ? (
        <IssueTable issues={issues} selectedIssueIds={selectedIssueIds} onToggle={toggleIssueSelection} />
      ) : view === 'calendar' ? (
        <IssueCalendar issues={issues} month={calendarMonth} onMonthChange={setCalendarMonth} />
      ) : view === 'gantt' ? (
        <IssueGantt issues={issues} />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="grid h-10 grid-cols-[2rem_minmax(96px,0.35fr)_minmax(220px,1.5fr)_minmax(120px,0.5fr)_minmax(120px,0.5fr)_minmax(140px,0.6fr)] items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-muted)] px-3 text-xs font-medium uppercase text-[var(--color-muted-foreground)]">
            <span></span>
            <span>Key</span>
            <span>Title</span>
            <span>Project</span>
            <span>Priority</span>
            <span>State</span>
          </div>
          <div>{issues.map((issue) => <IssueRow key={issue.id} issue={issue} selected={selectedIssueIds.has(issue.id)} onToggle={toggleIssueSelection} />)}</div>
        </div>
      )}
    </OpenKbPageShell>
  )
}
