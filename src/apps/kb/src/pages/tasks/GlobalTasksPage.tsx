import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Badge, EmptyState, cn, tabBarActiveItemClassName, tabBarClassName, tabBarInactiveItemClassName, tabBarItemClassName } from '@repo/ui'
import { ArrowUpDown, ChevronDown, Circle, ListFilter, Plus, Search, SlidersHorizontal, TableProperties } from 'lucide-react'
import { useAuth } from '@repo/shared/auth/context'
import { OpenKbPageShell } from '../../components/OpenKbPageShell'
import { CreateIssueDialog } from '../../components/issues/CreateIssueDialog'
import { IssueCalendar, IssueGantt } from '../../components/issues/IssueViews'
import {
  ProjectIssueListTable,
  ProjectIssuePreviewPane,
} from '../../components/projects/project-list/ProjectIssueListTable'
import { cx, defaultProjectIssueListViewConfig } from '../../components/projects/project-list/projectIssueListLogic'
import { useOrganisation } from '../../contexts/OrganisationContext'
import {
  useIssueAssigneesForIssues,
  useIssues,
  useIssueStates,
  useOrganisationMemberProfiles,
} from '../../hooks/queries/useIssues'
import { useCycleIssueLinks, useCycles, useModuleIssueLinks, useModules } from '../../hooks/queries/usePlanning'
import { useTeams } from '../../hooks/queries/useTeams'
import { buildBoardColumns } from '../../lib/issueViews'
import { formatShortDate, startOfMonth, toDate } from '../../lib/dateFormatting'
import { formatIssueKey, issuePriorityTone as priorityTone } from '../../lib/issueFormatting'
import { getProjectIssuePath, getTasksListIssuePath, getTasksPath, type TaskSectionKey } from '../../lib/projectRoutes'
import type { Issue } from '../../types'

const taskSections = ['overview', 'list', 'board', 'dashboard', 'calendar', 'gantt', 'workload'] as const

const taskTabs: Array<{ key: TaskSectionKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'list', label: 'List' },
  { key: 'board', label: 'Board' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'gantt', label: 'Gantt' },
  { key: 'workload', label: 'Workload' },
]

const labelPalette = ['#bfdbfe', '#bbf7d0', '#fecaca', '#fed7aa', '#fde68a']

const getIssueProjectLabel = (issue: Issue) => issue.project?.identifier || issue.project?.name || 'Project'

const GlobalTasksTabBar = ({ activeTab }: { activeTab: TaskSectionKey }) => (
  <div className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
    <div data-testid="open-kb-global-task-tab-nav" className="flex h-10 items-center gap-2">
      <nav className={cn(tabBarClassName, 'flex-1')} role="tablist" aria-label="Task tabs">
        {taskTabs.map((tab) => (
          <Link
            key={tab.key}
            to={getTasksPath(tab.key)}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={cn(
              tabBarItemClassName,
              activeTab === tab.key ? tabBarActiveItemClassName : tabBarInactiveItemClassName,
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  </div>
)

const TaskToolbar = ({ label = 'Add task', onCreateIssue }: { label?: string; onCreateIssue: () => void }) => (
  <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
    <div className="flex items-center gap-0">
      <button
        type="button"
        onClick={onCreateIssue}
        className="inline-flex h-8 items-center gap-2 rounded-l-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-[var(--color-muted)]"
      >
        <Plus className="h-4 w-4" />
        {label}
      </button>
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-r-[var(--radius-md)] border border-l-0 border-[var(--color-border)] hover:bg-[var(--color-muted)]"
        aria-label={`${label} options`}
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
    <div className="flex items-center gap-5 text-xs font-medium text-[var(--color-muted-foreground)]">
      <button type="button" className="inline-flex items-center gap-1.5 hover:text-[var(--color-foreground)]">
        <ListFilter className="h-3.5 w-3.5" />
        Filter
      </button>
      <button type="button" className="inline-flex items-center gap-1.5 hover:text-[var(--color-foreground)]">
        <ArrowUpDown className="h-3.5 w-3.5" />
        Sort
      </button>
      <button type="button" className="inline-flex items-center gap-1.5 hover:text-[var(--color-foreground)]">
        <TableProperties className="h-3.5 w-3.5" />
        Group
      </button>
      <button type="button" className="inline-flex items-center gap-1.5 hover:text-[var(--color-foreground)]">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Options
      </button>
      <button type="button" className="inline-flex items-center hover:text-[var(--color-foreground)]" aria-label="Search tasks">
        <Search className="h-4 w-4" />
      </button>
    </div>
  </div>
)

const CompactAvatar = ({ value, tone = '#58c4d8' }: { value: string; tone?: string }) => (
  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-slate-800" style={{ backgroundColor: tone }}>
    {value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'U'}
  </span>
)

const GlobalIssueList = ({ issues, emptyTitle }: { issues: Issue[]; emptyTitle: string }) => {
  if (issues.length === 0) {
    return <EmptyState title={emptyTitle} description="" />
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="divide-y divide-[var(--color-border)]">
        {issues.map((issue) => (
          <Link key={issue.id} to={getProjectIssuePath(issue.project_id, issue.id)} className="grid gap-2 px-4 py-3 text-sm hover:bg-[var(--color-muted)] md:grid-cols-[7rem_8rem_minmax(0,1fr)_8rem_10rem] md:items-center">
            <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{formatIssueKey(issue)}</span>
            <span className="min-w-0 truncate rounded-[var(--radius-sm)] bg-[var(--color-muted)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted-foreground)]">{getIssueProjectLabel(issue)}</span>
            <span className="min-w-0 truncate font-medium">{issue.title}</span>
            <Badge variant={priorityTone[issue.priority]}>{issue.priority}</Badge>
            <span className="inline-flex min-w-0 items-center gap-2 text-[var(--color-muted-foreground)]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: issue.state?.color ?? '#64748b' }} />
              <span className="truncate">{issue.state?.name ?? 'No state'}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

const BoardCard = ({ issue, index }: { issue: Issue; index: number }) => {
  const range = issue.start_date || issue.target_date
    ? `${formatShortDate(issue.start_date ?? issue.created_at.slice(0, 10))}${issue.target_date ? ` - ${formatShortDate(issue.target_date)}` : ''}`
    : formatShortDate(issue.created_at.slice(0, 10))

  return (
    <Link
      to={getProjectIssuePath(issue.project_id, issue.id)}
      className="block rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:border-[#7aa7ff]"
    >
      <div className="flex items-start gap-2">
        <Circle className="mt-0.5 h-4 w-4 text-[#96a09d]" />
        <h3 className="line-clamp-2 text-sm font-semibold leading-5">{issue.title}</h3>
      </div>
      <div className="mt-4">
        <span className="inline-flex rounded-[4px] px-1.5 py-0.5 text-xs font-medium text-slate-700" style={{ backgroundColor: labelPalette[index % labelPalette.length] }}>
          {getIssueProjectLabel(issue)}
        </span>
      </div>
      <div className="mt-5 flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
        <CompactAvatar value={issue.updated_by || issue.created_by || 'User'} tone={index % 3 === 0 ? '#58c4d8' : index % 3 === 1 ? '#f8c04a' : '#c4b5fd'} />
        <span className={issue.priority === 'urgent' || issue.priority === 'high' ? 'font-medium text-rose-600' : ''}>{range}</span>
      </div>
    </Link>
  )
}

const BoardView = ({ columns, onCreateIssue }: { columns: ReturnType<typeof buildBoardColumns>; onCreateIssue: () => void }) => (
  <section className="-mx-2 flex min-h-0 flex-1 flex-col bg-[var(--color-background)]">
    <TaskToolbar onCreateIssue={onCreateIssue} />
    <div className="min-h-0 flex-1 overflow-auto p-4">
      <div className="grid min-h-full grid-flow-col auto-cols-[19rem] gap-4">
        {columns.map((column) => (
          <section key={column.id} className="flex min-h-[32rem] flex-col rounded-[var(--radius-md)] bg-[#f4f5f6]">
            <div className="flex h-12 shrink-0 items-center gap-3 rounded-t-[var(--radius-md)] bg-[#eef0f2] px-3">
              <h2 className="truncate text-base font-semibold">{column.title}</h2>
              <span className="text-sm font-semibold text-[var(--color-muted-foreground)]">{column.issues.length}</span>
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
              {column.issues.length === 0 ? (
                <button type="button" onClick={onCreateIssue} className="flex h-14 items-center rounded-[var(--radius-md)] bg-[#eef0f2] px-4 text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[#e7e9ec]">
                  <Plus className="mr-2 h-4 w-4" />
                  Add task
                </button>
              ) : column.issues.map((issue, index) => <BoardCard key={issue.id} issue={issue} index={index} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  </section>
)

const DashboardMetric = ({ label, value }: { label: string; value: number }) => (
  <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
    <h3 className="text-base font-semibold">{label}</h3>
    <div className="mt-8 text-center text-5xl font-normal tracking-normal">{value}</div>
  </section>
)

export const GlobalTasksPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { section, issueId = null } = useParams()
  const { organisationId } = useOrganisation()
  const activeTab = taskSections.includes(section as TaskSectionKey) ? section as TaskSectionKey : null
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()))
  const [createIssueOpen, setCreateIssueOpen] = useState(false)

  const needsIssues = Boolean(activeTab)
  const needsStates = activeTab === 'overview' || activeTab === 'list' || activeTab === 'board' || activeTab === 'dashboard'
  const needsMembers = activeTab === 'list' || activeTab === 'workload'
  const needsPlanning = activeTab === 'dashboard' || activeTab === 'list'

  const { data: issues = [], isLoading: issuesLoading } = useIssues(organisationId, { assignee_id: user?.id ?? null }, Boolean(needsIssues && user?.id))
  const issueIds = useMemo(() => issues.map((issue) => issue.id), [issues])
  const { data: assignees = [] } = useIssueAssigneesForIssues(organisationId, issueIds, activeTab === 'list')
  const { data: states = [] } = useIssueStates(organisationId, null, needsStates)
  const { data: teams = [] } = useTeams(needsIssues ? organisationId : null)
  const { data: members = [] } = useOrganisationMemberProfiles(organisationId, needsMembers)
  const { data: cycles = [] } = useCycles(organisationId, null, needsPlanning)
  const { data: cycleIssueLinks = [] } = useCycleIssueLinks(organisationId, null, activeTab === 'list')
  const { data: modules = [] } = useModules(organisationId, null, needsPlanning)
  const { data: moduleIssueLinks = [] } = useModuleIssueLinks(organisationId, null, activeTab === 'list')

  const selectedIssue = issueId ? issues.find((issue) => issue.id === issueId) ?? null : null
  const listHref = getTasksPath('list')
  const boardColumns = useMemo(() => activeTab === 'board' || activeTab === 'dashboard' ? buildBoardColumns(states, issues) : [], [activeTab, issues, states])
  const completedCount = useMemo(
    () => issues.filter((issue) => issue.completed_at || issue.state?.group_key === 'completed').length,
    [issues],
  )
  const stateCounts = useMemo(() => states.map((state) => ({
    state,
    count: issues.filter((issue) => issue.state_id === state.id).length,
  })), [issues, states])
  const workload = useMemo(() => {
    const countsByProfileId = new Map<string, { count: number; projects: Set<string> }>()
    issues.forEach((issue) => {
      const profileId = issue.updated_by ?? issue.created_by
      if (!profileId) return
      const current = countsByProfileId.get(profileId) ?? { count: 0, projects: new Set<string>() }
      current.count += 1
      current.projects.add(getIssueProjectLabel(issue))
      countsByProfileId.set(profileId, current)
    })
    return members
      .map((member) => ({ member, workload: countsByProfileId.get(member.profile_id) }))
      .filter((item): item is { member: typeof members[number]; workload: { count: number; projects: Set<string> } } => Boolean(item.workload?.count))
  }, [issues, members])

  if (!activeTab) {
    return <Navigate to={getTasksPath('list')} replace />
  }

  return (
    <OpenKbPageShell>
      <GlobalTasksTabBar activeTab={activeTab} />
      {activeTab === 'overview' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">My recent tasks</h2>
              <Link className="text-sm font-medium text-[var(--color-primary)] hover:underline" to={getTasksPath('list')}>All tasks</Link>
            </div>
            <GlobalIssueList issues={issues.slice(0, 8)} emptyTitle="No assigned tasks" />
          </section>
          <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <h2 className="text-sm font-semibold">State breakdown</h2>
            <div className="mt-3 space-y-3">
              {stateCounts.map(({ state, count }) => (
                <div key={state.id} className="flex items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-2 text-sm">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: state.color }} />
                    <span className="truncate">{state.name}</span>
                  </span>
                  <Badge variant="neutral">{count}</Badge>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === 'list' ? (
        <div className="-mx-2 flex min-h-0 flex-1 overflow-hidden bg-[var(--color-background)]">
          <div className={cx('flex min-h-0 min-w-0 flex-col transition-[width] duration-150', issueId ? 'w-[48%]' : 'w-full')}>
            <ProjectIssueListTable
              tabId={null}
              issues={issues}
              states={states}
              members={members}
              assignees={assignees}
              cycles={cycles}
              cycleIssueLinks={cycleIssueLinks}
              modules={modules}
              moduleIssueLinks={moduleIssueLinks}
              teams={teams}
              listViewConfig={defaultProjectIssueListViewConfig}
              selectedIssueId={issueId}
              onOpenIssue={(issue) => navigate(getTasksListIssuePath(issue.id))}
              onCreateIssue={() => setCreateIssueOpen(true)}
              showProjectColumn
            />
          </div>
          {issueId && organisationId && (!issuesLoading || selectedIssue) ? (
            <div className="min-h-0 min-w-0 flex-1">
              <ProjectIssuePreviewPane
                organisationId={organisationId}
                projectId={selectedIssue?.project_id ?? 'global-task-selection-missing'}
                issueId={issueId}
                listHref={listHref}
                expandedHref={selectedIssue ? getProjectIssuePath(selectedIssue.project_id, selectedIssue.id) : listHref}
                onClose={() => navigate(listHref)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'board' ? <BoardView columns={boardColumns} onCreateIssue={() => setCreateIssueOpen(true)} /> : null}

      {activeTab === 'dashboard' ? (
        <section className="-mx-2 min-h-0 flex-1 overflow-auto bg-[var(--color-background)]">
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            <DashboardMetric label="Completed assigned tasks" value={completedCount} />
            <DashboardMetric label="Incomplete assigned tasks" value={Math.max(0, issues.length - completedCount)} />
            <DashboardMetric label="Overdue assigned tasks" value={issues.filter((issue) => issue.target_date && !issue.completed_at && toDate(issue.target_date)! < new Date()).length} />
            <DashboardMetric label="Assigned tasks" value={issues.length} />
          </div>
          <div className="grid gap-3 px-4 pb-4 xl:grid-cols-2">
            <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="flex h-12 items-center px-4">
                <h3 className="text-base font-semibold">Assigned tasks by project</h3>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {Array.from(new Map(issues.map((issue) => [getIssueProjectLabel(issue), issues.filter((item) => getIssueProjectLabel(item) === getIssueProjectLabel(issue)).length]))).map(([project, count]) => (
                  <div key={project} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="truncate">{project}</span>
                    <Badge variant="neutral">{count}</Badge>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="flex h-12 items-center px-4">
                <h3 className="text-base font-semibold">Assigned tasks by section</h3>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {boardColumns.map((column) => (
                  <div key={column.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="truncate">{column.title}</span>
                    <Badge variant="neutral">{column.issues.length}</Badge>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      ) : null}

      {activeTab === 'calendar' ? <IssueCalendar issues={issues} month={calendarMonth} onMonthChange={setCalendarMonth} /> : null}
      {activeTab === 'gantt' ? <IssueGantt issues={issues} /> : null}
      {activeTab === 'workload' ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-semibold">Workload</div>
          <div className="divide-y divide-[var(--color-border)]">
            {workload.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">No workload yet.</div>
            ) : workload.map(({ member, workload }) => (
              <div key={member.profile_id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">{member.profile.full_name || member.profile.username || member.profile.email || 'Unknown user'}</span>
                  <span className="block truncate text-xs text-[var(--color-muted-foreground)]">{Array.from(workload.projects).join(', ')}</span>
                </span>
                <Badge variant="neutral">{workload.count}</Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {organisationId ? (
        <CreateIssueDialog
          open={createIssueOpen}
          onClose={() => setCreateIssueOpen(false)}
          organisationId={organisationId}
          globalMode
        />
      ) : null}
    </OpenKbPageShell>
  )
}
