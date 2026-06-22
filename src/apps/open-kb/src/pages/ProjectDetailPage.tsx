import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Checkbox, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Dropdown, DropdownSeparator, EmptyState, Input, Radio } from '@repo/ui'
import { ArrowUpDown, Calendar, ChevronDown, Circle, Download, ListFilter, Plus, Search, SlidersHorizontal, TableProperties } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@repo/shared/auth/context'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { CyclesView } from '../components/cycles/CyclesView'
import { ProjectSettingsPanel } from '../components/projects/ProjectSettingsPanel'
import { ProjectTabBar } from '../components/projects/ProjectTabBar'
import { RichTextEditor, type RichTextEditorValue } from '../components/editor'
import { useOrganisation } from '../contexts/OrganisationContext'
import {
  IssueCalendar,
  IssueGantt,
} from '../components/issues/IssueViews'
import { buildBoardColumns } from '../lib/issueViews'
import {
  useIssues,
  useIssueLabels,
  useProjectIssueAssignees,
  useIssueStates,
  useOrganisationMemberProfiles,
  useProjectIssueAttachments,
} from '../hooks/queries/useIssues'
import { useCreatePage, usePages } from '../hooks/queries/usePages'
import { useCycleIssueLinks, useCycles, useEstimates, useModuleIssueLinks, useModules } from '../hooks/queries/usePlanning'
import {
  useAddProjectTab,
  useCreateProjectMessage,
  useProject,
  useProjectMessages,
  useProjectTabs,
  useRemoveProjectTab,
  useUpdateProjectTab,
} from '../hooks/queries/useProjects'
import { defaultProjectTabsForProject } from '../api/projects'
import { useMyPermissions } from '../hooks/queries/usePermissions'
import { useRecordRecentVisitOnce } from '../hooks/queries/usePersonal'
import type { Cycle, CycleIssueLink, Issue, IssueAssignee, IssuePriority, IssueState, ModuleIssueLink, OrganisationMemberProfile, ProjectModule, ProjectTab } from '../types'
import { formatFileSize } from '../lib/fileFormatting'
import { formatIssueKey, issuePriorityOptions, issuePriorityTone as priorityTone } from '../lib/issueFormatting'
import { dayKey, formatShortDate, startOfMonth, toDate } from '../lib/dateFormatting'
import {
  getProjectTabDefinition,
  getProjectTabKeyFromSection,
  getProjectTabInstancePath,
  getProjectTabPath,
  isProjectTabKey,
  projectTabDefinitionByKey,
  requiredProjectTabKey,
  type ProjectTabKey,
} from '../lib/projectTabs'

const emptyDocument = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
}
const timelineFallbackTime = new Date('2026-06-01T00:00:00.000Z').getTime()

const isRequiredProjectTab = (tab: ProjectTab) => tab.metadata?.required === true

const metadataWithoutRequired = (metadata: ProjectTab['metadata']) => {
  const rest = { ...(metadata ?? {}) }
  delete rest.required
  return rest
}

const getCopiedTabLabel = (label: string, tabs: ProjectTab[]) => {
  const baseLabel = `${label.trim() || 'Tab'} copy`
  const existingLabels = new Set(tabs.map((tab) => tab.label.trim().toLowerCase()))
  if (!existingLabels.has(baseLabel.toLowerCase())) return baseLabel

  let suffix = 2
  while (existingLabels.has(`${baseLabel} ${suffix}`.toLowerCase())) {
    suffix += 1
  }
  return `${baseLabel} ${suffix}`
}

const IssueList = ({ issues, emptyTitle }: { issues: Issue[]; emptyTitle: string }) => {
  if (issues.length === 0) {
    return <EmptyState title={emptyTitle} description="" />
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="divide-y divide-[var(--color-border)]">
        {issues.map((issue) => (
          <Link key={issue.id} to={`/issues/${issue.id}`} className="grid gap-2 px-4 py-3 text-sm hover:bg-[var(--color-muted)] md:grid-cols-[7rem_minmax(0,1fr)_8rem_10rem] md:items-center">
            <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{formatIssueKey(issue)}</span>
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

const ProjectRecordSection = ({
  title,
  emptyTitle,
  newHref,
  items,
}: {
  title: string
  emptyTitle: string
  newHref: string
  items: Array<{ id: string; name: string; description_text?: string | null; status?: string | null }>
}) => (
  <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
    <div className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <Link className="inline-flex h-8 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-2 text-xs font-medium hover:bg-[var(--color-muted)]" to={newHref}>
        <Plus className="h-3.5 w-3.5" />
        New
      </Link>
    </div>
    <div className="divide-y divide-[var(--color-border)]">
      {items.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">{emptyTitle}</div>
      ) : items.map((item) => (
        <div key={item.id} className="px-4 py-3">
          <div className="truncate text-sm font-medium">{item.name}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--color-muted-foreground)]">
            {item.status ? <Badge variant="neutral">{item.status}</Badge> : null}
            {item.description_text ? <span className="truncate">{item.description_text}</span> : null}
          </div>
        </div>
      ))}
    </div>
  </section>
)

const EmptyAssignee = () => (
  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[var(--color-muted-foreground)] text-[var(--color-muted-foreground)]">
    <span className="h-2 w-2 rounded-full border border-current" />
  </span>
)

const getProfileDisplayName = (profile: IssueAssignee['profile'] | OrganisationMemberProfile['profile'] | null | undefined) =>
  profile?.full_name || profile?.username || profile?.email || 'User'

const getInitials = (displayName: string) =>
  displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

const AssigneeCell = ({
  assignees,
}: {
  assignees: IssueAssignee[]
}) => {
  const assignee = assignees[0]
  if (!assignee) return <EmptyAssignee />

  const displayName = getProfileDisplayName(assignee.profile)
  const initials = getInitials(displayName)

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-semibold text-white">
        {initials || 'U'}
      </span>
      <span className="truncate text-xs text-[var(--color-foreground)]">{displayName}</span>
      {assignees.length > 1 ? <span className="text-xs text-[var(--color-muted-foreground)]">+{assignees.length - 1}</span> : null}
    </span>
  )
}

const ProjectTopSlot = ({ children }: { children: ReactNode }) => (
  <div className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
    {children}
  </div>
)

const ProjectTaskToolbar = ({
  projectId,
  label = 'Add task',
}: {
  projectId: string
  label?: string
}) => (
  <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
    <div className="flex items-center gap-0">
      <Link
        to={`/issues/new?project=${projectId}`}
        className="inline-flex h-8 items-center gap-2 rounded-l-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-[var(--color-muted)]"
      >
        <Plus className="h-4 w-4" />
        {label}
      </Link>
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

const labelPalette = ['#bfdbfe', '#bbf7d0', '#fecaca', '#fed7aa', '#fde68a']

const issueLabel = (issue: Issue, index: number) => issue.project?.name || ['Project Management', 'Design Transfer', 'Manufacturing', 'Validation', 'QA/RA'][index % 5]

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

const ProjectBoardCard = ({ issue, index }: { issue: Issue; index: number }) => {
  const label = issueLabel(issue, index)
  const range = issue.start_date || issue.target_date
    ? `${formatShortDate(issue.start_date ?? issue.created_at.slice(0, 10))}${issue.target_date ? ` - ${formatShortDate(issue.target_date)}` : ''}`
    : formatShortDate(issue.created_at.slice(0, 10))

  return (
    <Link
      to={`/issues/${issue.id}`}
      className="block rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:border-[#7aa7ff]"
    >
      <div className="flex items-start gap-2">
        <Circle className="mt-0.5 h-4 w-4 text-[#96a09d]" />
        <h3 className="line-clamp-2 text-sm font-semibold leading-5">{issue.title}</h3>
      </div>
      <div className="mt-4">
        <span className="inline-flex rounded-[4px] px-1.5 py-0.5 text-xs font-medium text-slate-700" style={{ backgroundColor: labelPalette[index % labelPalette.length] }}>
          {label}
        </span>
      </div>
      <div className="mt-5 flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
        <CompactAvatar value={issue.updated_by || issue.created_by || 'User'} tone={index % 3 === 0 ? '#58c4d8' : index % 3 === 1 ? '#f8c04a' : '#c4b5fd'} />
        <span className={issue.priority === 'urgent' || issue.priority === 'high' ? 'font-medium text-rose-600' : ''}>{range}</span>
      </div>
    </Link>
  )
}

const ProjectBoardView = ({
  projectId,
  columns,
}: {
  projectId: string
  columns: ReturnType<typeof buildBoardColumns>
}) => (
  <section className="-mx-2 flex min-h-0 flex-1 flex-col bg-[var(--color-background)]">
    <ProjectTaskToolbar projectId={projectId} />
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
                <Link to={`/issues/new?project=${projectId}`} className="flex h-14 items-center rounded-[var(--radius-md)] bg-[#eef0f2] px-4 text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[#e7e9ec]">
                  <Plus className="mr-2 h-4 w-4" />
                  Add task
                </Link>
              ) : column.issues.map((issue, index) => <ProjectBoardCard key={issue.id} issue={issue} index={index} />)}
              {column.issues.length > 0 ? (
                <Link to={`/issues/new?project=${projectId}`} className="mt-1 px-4 py-2 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                  + Add task
                </Link>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  </section>
)

const DashboardMetric = ({ label, value, filters }: { label: string; value: number; filters: number }) => (
  <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
    <h3 className="text-base font-semibold">{label}</h3>
    <div className="mt-8 text-center text-5xl font-normal tracking-normal">{value}</div>
    <div className="mt-7 flex items-center justify-center gap-1 text-xs font-medium text-[var(--color-muted-foreground)]">
      <ListFilter className="h-3.5 w-3.5" />
      {filters} Filters
    </div>
  </section>
)

const DonutWidget = ({ title, completed, total }: { title: string; completed: number; total: number }) => {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex h-12 items-center justify-between px-4">
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <div className="flex min-h-72 items-center justify-center gap-12 px-6 py-8">
        <div
          className="grid h-44 w-44 place-items-center rounded-full"
          style={{ background: `conic-gradient(#d09200 0 ${percent}%, #fee4b6 ${percent}% 100%)` }}
        >
          <div className="grid h-28 w-28 place-items-center rounded-full bg-[var(--color-surface)] text-3xl font-semibold">{total}</div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2"><span className="h-3 w-3 bg-[#d09200]" />Completed</div>
          <div className="flex items-center gap-2"><span className="h-3 w-3 bg-[#fee4b6]" />Incomplete</div>
        </div>
      </div>
      <div className="flex h-12 items-center justify-between border-t border-[var(--color-border)] px-4 text-xs font-medium text-[var(--color-muted-foreground)]">
        <span className="inline-flex items-center gap-1"><ListFilter className="h-3.5 w-3.5" />2 Filters</span>
        <Button type="button" variant="outline" size="sm" className="h-8">See all</Button>
      </div>
    </section>
  )
}

const BarWidget = ({ title, columns }: { title: string; columns: Array<{ label: string; value: number }> }) => {
  const max = Math.max(1, ...columns.map((item) => item.value))
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex h-12 items-center px-4">
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <div className="flex h-72 items-end gap-8 px-10 pb-10 pt-6">
        {columns.map((item) => (
          <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="text-xs font-semibold">{item.value}</span>
            <div className="w-full max-w-12 rounded-t bg-[#f7bf4b]" style={{ height: `${Math.max(3, (item.value / max) * 150)}px` }} />
            <span className="max-w-20 rotate-[-45deg] truncate text-xs text-[var(--color-muted-foreground)]">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="flex h-12 items-center justify-between border-t border-[var(--color-border)] px-4 text-xs font-medium text-[var(--color-muted-foreground)]">
        <span className="inline-flex items-center gap-1"><ListFilter className="h-3.5 w-3.5" />2 Filters</span>
        <Button type="button" variant="outline" size="sm" className="h-8">See all</Button>
      </div>
    </section>
  )
}

const ProjectTimelineView = ({
  projectId,
  issues,
  states,
}: {
  projectId: string
  issues: Issue[]
  states: IssueState[]
}) => {
  const ranges = issues.map((issue) => {
    const start = toDate(issue.start_date) ?? toDate(issue.created_at.slice(0, 10)) ?? new Date()
    const end = toDate(issue.target_date) ?? new Date(start.getTime() + 6 * 86_400_000)
    return { issue, start, end: end < start ? start : end }
  })
  const anchorTime = ranges[0]?.start.getTime() ?? timelineFallbackTime
  const minTime = Math.min(...ranges.map((range) => range.start.getTime()), anchorTime - 21 * 86_400_000)
  const maxTime = Math.max(...ranges.map((range) => range.end.getTime()), anchorTime + 70 * 86_400_000)
  const totalDays = Math.max(1, Math.ceil((maxTime - minTime) / 86_400_000) + 1)
  const weekCount = Math.max(8, Math.ceil(totalDays / 7))
  const weeks = Array.from({ length: weekCount }, (_, index) => new Date(minTime + index * 7 * 86_400_000))
  const groups: IssueState[] = states.length > 0
    ? states
    : [{ id: 'none', name: 'No state', color: '#64748b', sort_order: 0, organisation_id: '', project_id: projectId, group_key: 'backlog', is_default: false }]

  return (
    <section className="-mx-2 flex min-h-0 flex-1 flex-col bg-[var(--color-background)]">
      <ProjectTaskToolbar projectId={projectId} />
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 text-xs font-semibold text-[var(--color-muted-foreground)]">
        <div className="flex items-center gap-4">
          <button type="button" className="text-lg leading-none">&lt;</button>
          <span>Today</span>
          <button type="button" className="text-lg leading-none">&gt;</button>
        </div>
        <div className="flex items-center gap-4">
          <span>Weeks</span>
          <span className="text-lg leading-none">-</span>
          <span className="text-lg leading-none">+</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid min-w-[1600px] grid-cols-[14rem_minmax(1200px,1fr)]">
          <div className="sticky left-0 z-20 border-r border-[var(--color-border)] bg-[var(--color-background)]" />
          <div className="grid h-12 border-b border-[var(--color-border)]" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(9rem, 1fr))` }}>
            {weeks.map((week) => (
              <div key={week.toISOString()} className="border-r border-[var(--color-border)] px-2 py-1">
                <div className="text-xs font-semibold text-[var(--color-muted-foreground)]">
                  {new Intl.DateTimeFormat(undefined, { month: 'short' }).format(week)}
                </div>
                <div className="text-xs">{formatShortDate(dayKey(week))}</div>
              </div>
            ))}
          </div>

          {groups.map((state) => {
            const stateRanges = ranges.filter((range) => range.issue.state_id === state.id)
            return (
              <div key={state.id} className="contents">
                <div className="sticky left-0 z-20 flex h-36 items-start gap-2 border-b border-r border-[var(--color-border)] bg-[var(--color-background)] px-4 py-5">
                  <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  <span className="font-semibold">{state.name}</span>
                </div>
                <div className="relative h-36 border-b border-[var(--color-border)] bg-[repeating-linear-gradient(90deg,#f3f4f6_0,#f3f4f6_4.5rem,#fff_4.5rem,#fff_9rem)]">
                  {stateRanges.map(({ issue, start, end }, index) => {
                    const left = Math.max(0, ((start.getTime() - minTime) / 86_400_000 / totalDays) * 100)
                    const width = Math.max(7, ((end.getTime() - start.getTime()) / 86_400_000 + 1) / totalDays * 100)
                    const top = 18 + (index % 4) * 30
                    const color = ['#6fd0e3', '#b9e96b', '#ffbf4b', '#ff9864'][index % 4]
                    return (
                      <Link
                        key={issue.id}
                        to={`/issues/${issue.id}`}
                        className="absolute flex h-7 items-center gap-2 rounded-[4px] px-3 text-xs font-medium text-slate-800 shadow-sm"
                        style={{ left: `${left}%`, width: `${width}%`, top, backgroundColor: color }}
                      >
                        <CompactAvatar value={issue.updated_by || issue.created_by || 'U'} tone="rgba(255,255,255,0.45)" />
                        <span className="truncate">{issue.title}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

type ProjectIssueListDueBucket = 'overdue' | 'today' | 'this_week' | 'later' | 'no_due'
type ProjectIssueListSortField = 'manual' | 'title' | 'due_date' | 'priority' | 'status' | 'assignee' | 'created_at' | 'updated_at'
type ProjectIssueListSortDirection = 'asc' | 'desc'
type ProjectIssueListGroupKey = 'status' | 'assignee' | 'priority' | 'due_date' | 'module' | 'cycle' | 'none'

type ProjectIssueListFilters = {
  query: string
  stateIds: string[]
  assigneeIds: string[]
  priorities: IssuePriority[]
  dueBuckets: ProjectIssueListDueBucket[]
  showCompleted: boolean
}

type ProjectIssueListSort = {
  field: ProjectIssueListSortField
  direction: ProjectIssueListSortDirection
}

type ProjectIssueListOptions = {
  columns: {
    assignee: boolean
    dueDate: boolean
    effort: boolean
    priority: boolean
    status: boolean
  }
  compactRows: boolean
  wrapTitles: boolean
  showIssueKeys: boolean
  showEmptyGroups: boolean
}

type ProjectIssueListViewConfig = {
  filters: ProjectIssueListFilters
  sort: ProjectIssueListSort
  groupBy: ProjectIssueListGroupKey
  options: ProjectIssueListOptions
}

type ProjectIssueListGroup = {
  id: string
  title: string
  issues: Issue[]
  module?: ProjectModule | null
}

const defaultProjectIssueListFilters: ProjectIssueListFilters = {
  query: '',
  stateIds: [],
  assigneeIds: [],
  priorities: [],
  dueBuckets: [],
  showCompleted: true,
}

const defaultProjectIssueListSort: ProjectIssueListSort = {
  field: 'manual',
  direction: 'asc',
}

const defaultProjectIssueListOptions: ProjectIssueListOptions = {
  columns: {
    assignee: true,
    dueDate: true,
    effort: true,
    priority: true,
    status: true,
  },
  compactRows: false,
  wrapTitles: false,
  showIssueKeys: false,
  showEmptyGroups: true,
}

const defaultProjectIssueListViewConfig: ProjectIssueListViewConfig = {
  filters: defaultProjectIssueListFilters,
  sort: defaultProjectIssueListSort,
  groupBy: 'status',
  options: defaultProjectIssueListOptions,
}

const dueBucketLabels: Record<ProjectIssueListDueBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  this_week: 'Next 7 days',
  later: 'Later',
  no_due: 'No due date',
}

const sortFieldLabels: Record<ProjectIssueListSortField, string> = {
  manual: 'Manual',
  title: 'Title',
  due_date: 'Due date',
  priority: 'Priority',
  status: 'Status',
  assignee: 'Assignee',
  created_at: 'Created',
  updated_at: 'Updated',
}

const groupLabels: Record<ProjectIssueListGroupKey, string> = {
  status: 'Status',
  assignee: 'Assignee',
  priority: 'Priority',
  due_date: 'Due date',
  module: 'Module',
  cycle: 'Cycle',
  none: 'No grouping',
}

const moduleStatusLabel: Record<ProjectModule['status'], string> = {
  backlog: 'Backlog',
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const moduleStatusClass: Record<ProjectModule['status'], string> = {
  backlog: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
  planned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
}

const priorityRank: Record<IssuePriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
}

const projectIssueListSortFields = new Set<ProjectIssueListSortField>(Object.keys(sortFieldLabels) as ProjectIssueListSortField[])
const projectIssueListGroupKeys = new Set<ProjectIssueListGroupKey>(Object.keys(groupLabels) as ProjectIssueListGroupKey[])
const projectIssueListDueBuckets = new Set<ProjectIssueListDueBucket>(Object.keys(dueBucketLabels) as ProjectIssueListDueBucket[])
const projectIssueListPriorities = new Set<IssuePriority>(issuePriorityOptions.map((priority) => priority.value))

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const readStringArray = <TValue extends string>(value: unknown, allowed?: Set<TValue>): TValue[] => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is TValue =>
    typeof item === 'string' && (!allowed || allowed.has(item as TValue)),
  )
}

const readBoolean = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback

const readListViewConfig = (metadata: ProjectTab['metadata'] | null | undefined): ProjectIssueListViewConfig => {
  const listView = isRecord(metadata?.listView) ? metadata.listView : {}
  const filters = isRecord(listView.filters) ? listView.filters : {}
  const sort = isRecord(listView.sort) ? listView.sort : {}
  const options = isRecord(listView.options) ? listView.options : {}
  const columns = isRecord(options.columns) ? options.columns : {}
  const sortField = typeof sort.field === 'string' && projectIssueListSortFields.has(sort.field as ProjectIssueListSortField)
    ? sort.field as ProjectIssueListSortField
    : defaultProjectIssueListSort.field
  const sortDirection = sort.direction === 'desc' || sort.direction === 'asc'
    ? sort.direction
    : defaultProjectIssueListSort.direction
  const groupBy = typeof listView.groupBy === 'string' && projectIssueListGroupKeys.has(listView.groupBy as ProjectIssueListGroupKey)
    ? listView.groupBy as ProjectIssueListGroupKey
    : defaultProjectIssueListViewConfig.groupBy

  return {
    filters: {
      query: typeof filters.query === 'string' ? filters.query : defaultProjectIssueListFilters.query,
      stateIds: readStringArray(filters.stateIds),
      assigneeIds: readStringArray(filters.assigneeIds),
      priorities: readStringArray(filters.priorities, projectIssueListPriorities),
      dueBuckets: readStringArray(filters.dueBuckets, projectIssueListDueBuckets),
      showCompleted: readBoolean(filters.showCompleted, defaultProjectIssueListFilters.showCompleted),
    },
    sort: {
      field: sortField,
      direction: sortDirection,
    },
    groupBy,
    options: {
      columns: {
        assignee: readBoolean(columns.assignee, defaultProjectIssueListOptions.columns.assignee),
        dueDate: readBoolean(columns.dueDate, defaultProjectIssueListOptions.columns.dueDate),
        effort: readBoolean(columns.effort, defaultProjectIssueListOptions.columns.effort),
        priority: readBoolean(columns.priority, defaultProjectIssueListOptions.columns.priority),
        status: readBoolean(columns.status, defaultProjectIssueListOptions.columns.status),
      },
      compactRows: readBoolean(options.compactRows, defaultProjectIssueListOptions.compactRows),
      wrapTitles: readBoolean(options.wrapTitles, defaultProjectIssueListOptions.wrapTitles),
      showIssueKeys: readBoolean(options.showIssueKeys, defaultProjectIssueListOptions.showIssueKeys),
      showEmptyGroups: readBoolean(options.showEmptyGroups, defaultProjectIssueListOptions.showEmptyGroups),
    },
  }
}

const serializeListViewConfig = (config: ProjectIssueListViewConfig) => JSON.stringify(config)

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')

const getDateKey = (date: Date) => date.toISOString().slice(0, 10)

const getDueBucket = (issue: Issue, now = new Date()): ProjectIssueListDueBucket => {
  if (!issue.target_date) return 'no_due'
  const target = toDate(issue.target_date)
  if (!target) return 'no_due'

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const targetDay = new Date(target)
  targetDay.setHours(0, 0, 0, 0)
  const sevenDays = new Date(today)
  sevenDays.setDate(today.getDate() + 7)

  if (targetDay < today) return 'overdue'
  if (getDateKey(targetDay) === getDateKey(today)) return 'today'
  if (targetDay <= sevenDays) return 'this_week'
  return 'later'
}

const getAssigneeName = (assignees: IssueAssignee[]) => assignees[0] ? getProfileDisplayName(assignees[0].profile) : 'Unassigned'

const createToggle = <TValue extends string>(value: TValue, values: TValue[]) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value]

const isProjectIssueComplete = (issue: Issue) =>
  Boolean(issue.completed_at || issue.state?.group_key === 'completed' || issue.state?.name?.toLowerCase().includes('done') || issue.state?.name?.toLowerCase().includes('resolved'))

const compareValues = (left: string | number, right: string | number, direction: ProjectIssueListSortDirection) => {
  const comparison = typeof left === 'number' && typeof right === 'number'
    ? left - right
    : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })
  return direction === 'asc' ? comparison : -comparison
}

const ListToolbarButton = ({
  children,
  active,
}: {
  children: ReactNode
  active?: boolean
}) => (
  <button
    type="button"
    className={cx(
      'inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
      active && 'text-[var(--color-foreground)]',
    )}
  >
    {children}
  </button>
)

const DropdownPanel = ({ children }: { children: ReactNode }) => (
  <div className="w-64 space-y-3 p-1" onClick={(event) => event.stopPropagation()}>
    {children}
  </div>
)

const DropdownSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-2">
    <div className="px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">{title}</div>
    <div className="space-y-1">{children}</div>
  </div>
)

const DropdownRadio = ({
  name,
  label,
  checked,
  onChange,
}: {
  name: string
  label: string
  checked: boolean
  onChange: () => void
}) => (
  <div className="rounded-[var(--radius-md)] px-2 py-1.5 text-sm hover:bg-[var(--color-muted)]">
    <Radio name={name} label={label} checked={checked} onChange={onChange} />
  </div>
)

const ModuleProgressRing = ({ progress }: { progress: number }) => (
  <span
    className="inline-grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full"
    style={{ background: `conic-gradient(#16a34a 0 ${progress}%, #e5e7eb ${progress}% 100%)` }}
  >
    <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-background)] text-[10px] text-[var(--color-muted-foreground)]">
      {progress}%
    </span>
  </span>
)

const getModuleDateRangeLabel = (module: ProjectModule) =>
  module.created_at
    ? `${formatShortDate(module.created_at.slice(0, 10))} - ${formatShortDate((module.updated_at ?? module.created_at).slice(0, 10))}`
    : 'No dates'

const ProjectIssueListGroupHeader = ({
  group,
  groupBy,
}: {
  group: ProjectIssueListGroup
  groupBy: ProjectIssueListGroupKey
}) => {
  if (groupBy === 'module' && group.module) {
    const total = group.issues.length
    const completed = group.issues.filter(isProjectIssueComplete).length
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0

    return (
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--color-border)] px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <ChevronDown className="h-4 w-4 shrink-0 fill-current text-[var(--color-muted-foreground)]" />
          <ModuleProgressRing progress={progress} />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-[var(--color-foreground)]">{group.title}</h2>
              <span className="shrink-0 text-sm text-[var(--color-muted-foreground)]">{total}</span>
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
              <span className="truncate">{getModuleDateRangeLabel(group.module)}</span>
              <span className="shrink-0">/</span>
              <span className="shrink-0">{completed}/{total} completed</span>
            </div>
          </div>
        </div>
        <span className={cx('inline-flex h-7 shrink-0 items-center rounded-[var(--radius-sm)] px-4 text-xs font-medium', moduleStatusClass[group.module.status])}>
          {moduleStatusLabel[group.module.status]}
        </span>
      </div>
    )
  }

  return (
    <div className="flex h-14 items-center gap-2 border-b border-[var(--color-border)] px-2.5">
      <ChevronDown className="h-4 w-4 fill-current text-[var(--color-muted-foreground)]" />
      <h2 className="text-base font-semibold">{group.title}</h2>
      <span className="text-sm text-[var(--color-muted-foreground)]">{group.issues.length}</span>
    </div>
  )
}

const ProjectIssueListTable = ({
  tabId,
  projectId,
  issues,
  states,
  members,
  assignees,
  cycles,
  cycleIssueLinks,
  modules,
  moduleIssueLinks,
  listViewConfig,
  onListViewChange,
}: {
  tabId: string | null
  projectId: string
  issues: Issue[]
  states: IssueState[]
  members: OrganisationMemberProfile[]
  assignees: IssueAssignee[]
  cycles: Cycle[]
  cycleIssueLinks: CycleIssueLink[]
  modules: ProjectModule[]
  moduleIssueLinks: ModuleIssueLink[]
  listViewConfig: ProjectIssueListViewConfig
  onListViewChange?: (config: ProjectIssueListViewConfig) => void
}) => {
  const [filters, setFilters] = useState<ProjectIssueListFilters>(listViewConfig.filters)
  const [sort, setSort] = useState<ProjectIssueListSort>(listViewConfig.sort)
  const [groupBy, setGroupBy] = useState<ProjectIssueListGroupKey>(listViewConfig.groupBy)
  const [options, setOptions] = useState<ProjectIssueListOptions>(listViewConfig.options)
  const [searchOpen, setSearchOpen] = useState(false)
  const lastPersistedConfigRef = useRef(serializeListViewConfig(listViewConfig))
  const currentListViewConfig = useMemo<ProjectIssueListViewConfig>(
    () => ({ filters, sort, groupBy, options }),
    [filters, groupBy, options, sort],
  )
  const currentListViewConfigKey = useMemo(() => serializeListViewConfig(currentListViewConfig), [currentListViewConfig])

  useEffect(() => {
    if (!tabId || !onListViewChange) return
    if (currentListViewConfigKey === lastPersistedConfigRef.current) return

    const timeout = window.setTimeout(() => {
      lastPersistedConfigRef.current = currentListViewConfigKey
      onListViewChange(currentListViewConfig)
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [currentListViewConfig, currentListViewConfigKey, onListViewChange, tabId])

  const sortedStates = useMemo(
    () => states.slice().sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [states],
  )
  const stateById = useMemo(() => new Map(states.map((state) => [state.id, state])), [states])
  const assigneesByIssueId = useMemo(() => {
    const map = new Map<string, IssueAssignee[]>()
    assignees.forEach((assignee) => {
      if (!assignee.issue_id) return
      const issueAssignees = map.get(assignee.issue_id) ?? []
      issueAssignees.push(assignee)
      map.set(assignee.issue_id, issueAssignees)
    })
    return map
  }, [assignees])
  const moduleLinksByIssueId = useMemo(() => {
    const map = new Map<string, ModuleIssueLink[]>()
    moduleIssueLinks.forEach((link) => {
      if (!link.issue_id) return
      const issueLinks = map.get(link.issue_id) ?? []
      issueLinks.push(link)
      map.set(link.issue_id, issueLinks)
    })
    return map
  }, [moduleIssueLinks])
  const moduleById = useMemo(() => new Map(modules.map((projectModule) => [projectModule.id, projectModule])), [modules])
  const cycleLinkByIssueId = useMemo(() => {
    const map = new Map<string, CycleIssueLink>()
    cycleIssueLinks.forEach((link) => {
      if (!link.issue_id || map.has(link.issue_id)) return
      map.set(link.issue_id, link)
    })
    return map
  }, [cycleIssueLinks])
  const assignableMembers = useMemo(() => {
    const memberById = new Map(members.map((member) => [member.profile_id, member]))
    assignees.forEach((assignee) => {
      if (!assignee.profile_id || memberById.has(assignee.profile_id) || !assignee.profile) return
      memberById.set(assignee.profile_id, {
        profile_id: assignee.profile_id,
        role: 'member',
        profile: assignee.profile,
      })
    })
    return Array.from(memberById.values()).sort((a, b) => getProfileDisplayName(a.profile).localeCompare(getProfileDisplayName(b.profile)))
  }, [assignees, members])
  const activeFilterCount = filters.stateIds.length + filters.assigneeIds.length + filters.priorities.length + filters.dueBuckets.length + (filters.query.trim() ? 1 : 0) + (filters.showCompleted ? 0 : 1)
  const visibleColumns = [
    options.columns.assignee ? '7.5rem' : null,
    options.columns.dueDate ? '7.5rem' : null,
    options.columns.effort ? '7.5rem' : null,
    options.columns.priority ? '7.5rem' : null,
    options.columns.status ? '7.5rem' : null,
  ].filter(Boolean)
  const gridTemplateColumns = `minmax(26rem,1fr)${visibleColumns.length > 0 ? ` ${visibleColumns.join(' ')}` : ''} 3.5rem`
  const rowHeightClassName = options.compactRows ? 'min-h-8' : 'min-h-9'

  const filteredIssues = useMemo(() => {
    const query = filters.query.trim().toLowerCase()
    return issues.filter((issue) => {
      const issueAssignees = assigneesByIssueId.get(issue.id) ?? []
      const isCompleted = Boolean(issue.completed_at || issue.state?.group_key === 'completed')
      if (!filters.showCompleted && isCompleted) return false
      if (query && !`${formatIssueKey(issue)} ${issue.title} ${issue.description_text ?? ''}`.toLowerCase().includes(query)) return false
      if (filters.stateIds.length > 0 && (!issue.state_id || !filters.stateIds.includes(issue.state_id))) return false
      if (filters.assigneeIds.length > 0 && !issueAssignees.some((assignee) => assignee.profile_id && filters.assigneeIds.includes(assignee.profile_id))) return false
      if (filters.priorities.length > 0 && !filters.priorities.includes(issue.priority)) return false
      if (filters.dueBuckets.length > 0 && !filters.dueBuckets.includes(getDueBucket(issue))) return false
      return true
    })
  }, [assigneesByIssueId, filters, issues])

  const sortedIssues = useMemo(() => {
    if (sort.field === 'manual') return filteredIssues
    return filteredIssues.slice().sort((left, right) => {
      const leftAssignees = assigneesByIssueId.get(left.id) ?? []
      const rightAssignees = assigneesByIssueId.get(right.id) ?? []
      switch (sort.field) {
        case 'title':
          return compareValues(left.title, right.title, sort.direction)
        case 'due_date':
          return compareValues(left.target_date ? toDate(left.target_date)?.getTime() ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER, right.target_date ? toDate(right.target_date)?.getTime() ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER, sort.direction)
        case 'priority':
          return compareValues(priorityRank[left.priority], priorityRank[right.priority], sort.direction)
        case 'status':
          return compareValues(stateById.get(left.state_id ?? '')?.sort_order ?? Number.MAX_SAFE_INTEGER, stateById.get(right.state_id ?? '')?.sort_order ?? Number.MAX_SAFE_INTEGER, sort.direction)
        case 'assignee':
          return compareValues(getAssigneeName(leftAssignees), getAssigneeName(rightAssignees), sort.direction)
        case 'created_at':
          return compareValues(toDate(left.created_at)?.getTime() ?? 0, toDate(right.created_at)?.getTime() ?? 0, sort.direction)
        case 'updated_at':
          return compareValues(toDate(left.updated_at ?? left.created_at)?.getTime() ?? 0, toDate(right.updated_at ?? right.created_at)?.getTime() ?? 0, sort.direction)
        default:
          return 0
      }
    })
  }, [assigneesByIssueId, filteredIssues, sort.direction, sort.field, stateById])

  const groups = useMemo<ProjectIssueListGroup[]>(() => {
    if (groupBy === 'none') return [{ id: 'all', title: 'All tasks', issues: sortedIssues }]

    if (groupBy === 'status') {
      const grouped = sortedStates.map((state) => ({
        id: state.id,
        title: state.name,
        issues: sortedIssues.filter((issue) => issue.state_id === state.id),
      }))
      const uncategorised = sortedIssues.filter((issue) => !issue.state_id)
      if (uncategorised.length > 0) grouped.unshift({ id: 'none', title: 'No status', issues: uncategorised })
      return options.showEmptyGroups ? grouped : grouped.filter((group) => group.issues.length > 0)
    }

    if (groupBy === 'assignee') {
      const groupsById = new Map<string, ProjectIssueListGroup>()
      if (options.showEmptyGroups) {
        assignableMembers.forEach((member) => {
          groupsById.set(member.profile_id, {
            id: member.profile_id,
            title: getProfileDisplayName(member.profile),
            issues: [],
          })
        })
      }
      sortedIssues.forEach((issue) => {
        const issueAssignees = assigneesByIssueId.get(issue.id) ?? []
        const assignee = issueAssignees[0]
        const id = assignee?.profile_id ?? 'unassigned'
        const title = assignee ? getProfileDisplayName(assignee.profile) : 'Unassigned'
        const existing = groupsById.get(id) ?? { id, title, issues: [] }
        existing.issues.push(issue)
        groupsById.set(id, existing)
      })
      return Array.from(groupsById.values())
        .filter((group) => options.showEmptyGroups || group.issues.length > 0)
        .sort((a, b) => a.title.localeCompare(b.title))
    }

    if (groupBy === 'priority') {
      return issuePriorityOptions
        .map((priority) => ({
          id: priority.value,
          title: priority.label,
          issues: sortedIssues.filter((issue) => issue.priority === priority.value),
        }))
        .filter((group) => options.showEmptyGroups || group.issues.length > 0)
    }

    if (groupBy === 'module') {
      const groupsById = new Map<string, ProjectIssueListGroup>()
      if (options.showEmptyGroups) {
        modules.forEach((projectModule) => {
          groupsById.set(projectModule.id, {
            id: projectModule.id,
            title: projectModule.name,
            issues: [],
            module: projectModule,
          })
        })
      }
      sortedIssues.forEach((issue) => {
        const issueModuleLinks = moduleLinksByIssueId.get(issue.id) ?? []
        if (issueModuleLinks.length === 0) {
          const existing = groupsById.get('none') ?? { id: 'none', title: 'No module', issues: [] }
          existing.issues.push(issue)
          groupsById.set('none', existing)
          return
        }
        issueModuleLinks.forEach((link) => {
          const id = link.module_id ?? 'none'
          const module = id === 'none' ? null : link.module ?? moduleById.get(id) ?? null
          const title = module?.name ?? 'No module'
          const existing = groupsById.get(id) ?? { id, title, issues: [], module }
          existing.issues.push(issue)
          groupsById.set(id, existing)
        })
      })
      return Array.from(groupsById.values())
        .filter((group) => options.showEmptyGroups || group.issues.length > 0)
        .sort((a, b) => {
          if (a.id === 'none') return 1
          if (b.id === 'none') return -1
          return a.title.localeCompare(b.title)
        })
    }

    if (groupBy === 'cycle') {
      const groupsById = new Map<string, ProjectIssueListGroup>()
      if (options.showEmptyGroups) {
        cycles.forEach((cycle) => {
          groupsById.set(cycle.id, {
            id: cycle.id,
            title: cycle.name,
            issues: [],
          })
        })
      }
      sortedIssues.forEach((issue) => {
        const link = cycleLinkByIssueId.get(issue.id)
        const id = link?.cycle_id ?? 'none'
        const title = link?.cycle?.name ?? 'No cycle'
        const existing = groupsById.get(id) ?? { id, title, issues: [] }
        existing.issues.push(issue)
        groupsById.set(id, existing)
      })
      return Array.from(groupsById.values())
        .filter((group) => options.showEmptyGroups || group.issues.length > 0)
        .sort((a, b) => {
          if (a.id === 'none') return 1
          if (b.id === 'none') return -1
          return a.title.localeCompare(b.title)
        })
    }

    return (Object.keys(dueBucketLabels) as ProjectIssueListDueBucket[])
      .map((bucket) => ({
        id: bucket,
        title: dueBucketLabels[bucket],
        issues: sortedIssues.filter((issue) => getDueBucket(issue) === bucket),
      }))
      .filter((group) => options.showEmptyGroups || group.issues.length > 0)
  }, [assigneesByIssueId, assignableMembers, cycleLinkByIssueId, cycles, groupBy, moduleById, moduleLinksByIssueId, modules, options.showEmptyGroups, sortedIssues, sortedStates])

  const resetView = () => {
    setFilters(defaultProjectIssueListFilters)
    setSort(defaultProjectIssueListSort)
    setGroupBy('status')
    setOptions(defaultProjectIssueListOptions)
    setSearchOpen(false)
  }

  const toggleColumn = (column: keyof ProjectIssueListOptions['columns']) => {
    setOptions((current) => ({
      ...current,
      columns: {
        ...current.columns,
        [column]: !current.columns[column],
      },
    }))
  }

  return (
    <section className="-mx-2 flex min-h-0 flex-1 flex-col bg-[var(--color-background)] text-sm">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
        <div className="flex items-center gap-0">
          <Link
            to={`/issues/new?project=${projectId}`}
            className="inline-flex h-8 items-center gap-2 rounded-l-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-[var(--color-muted)]"
          >
            <Plus className="h-4 w-4" />
            Add task
          </Link>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-r-[var(--radius-md)] border border-l-0 border-[var(--color-border)] hover:bg-[var(--color-muted)]"
            aria-label="Add task options"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
        <div className="flex min-w-0 items-center gap-4 text-xs font-medium text-[var(--color-muted-foreground)]">
          {searchOpen ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <input
                aria-label="Search tasks"
                className="h-8 w-52 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] pl-7 pr-2 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-border-hover)]"
                value={filters.query}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                placeholder="Search tasks..."
              />
            </div>
          ) : null}

          <Dropdown
            align="right"
            trigger={<ListToolbarButton active={activeFilterCount > 0}><ListFilter className="h-3.5 w-3.5" />{activeFilterCount > 0 ? `${activeFilterCount} Filters` : 'Filter'}</ListToolbarButton>}
            className="min-w-72"
          >
            <DropdownPanel>
              <DropdownSection title="Status">
                {sortedStates.map((state) => (
                  <Checkbox
                    key={state.id}
                    label={state.name}
                    checked={filters.stateIds.includes(state.id)}
                    onChange={() => setFilters((current) => ({ ...current, stateIds: createToggle(state.id, current.stateIds) }))}
                  />
                ))}
              </DropdownSection>
              <DropdownSeparator />
              <DropdownSection title="Assignee">
                {assignableMembers.map((member) => (
                  <Checkbox
                    key={member.profile_id}
                    label={getProfileDisplayName(member.profile)}
                    checked={filters.assigneeIds.includes(member.profile_id)}
                    onChange={() => setFilters((current) => ({ ...current, assigneeIds: createToggle(member.profile_id, current.assigneeIds) }))}
                  />
                ))}
                {assignableMembers.length === 0 ? <div className="px-2 py-1 text-sm text-[var(--color-muted-foreground)]">No assignees</div> : null}
              </DropdownSection>
              <DropdownSeparator />
              <DropdownSection title="Priority">
                {issuePriorityOptions.map((priority) => (
                  <Checkbox
                    key={priority.value}
                    label={priority.label}
                    checked={filters.priorities.includes(priority.value)}
                    onChange={() => setFilters((current) => ({ ...current, priorities: createToggle(priority.value, current.priorities) }))}
                  />
                ))}
              </DropdownSection>
              <DropdownSeparator />
              <DropdownSection title="Due date">
                {(Object.keys(dueBucketLabels) as ProjectIssueListDueBucket[]).map((bucket) => (
                  <Checkbox
                    key={bucket}
                    label={dueBucketLabels[bucket]}
                    checked={filters.dueBuckets.includes(bucket)}
                    onChange={() => setFilters((current) => ({ ...current, dueBuckets: createToggle(bucket, current.dueBuckets) }))}
                  />
                ))}
              </DropdownSection>
              <DropdownSeparator />
              <Checkbox
                label="Show completed"
                checked={filters.showCompleted}
                onChange={(event) => setFilters((current) => ({ ...current, showCompleted: event.target.checked }))}
              />
            </DropdownPanel>
          </Dropdown>

          <Dropdown
            align="right"
            trigger={<ListToolbarButton active={sort.field !== 'manual'}><ArrowUpDown className="h-3.5 w-3.5" />{sort.field === 'manual' ? 'Sort' : sortFieldLabels[sort.field]}</ListToolbarButton>}
          >
            <DropdownPanel>
              <DropdownSection title="Sort by">
                {(Object.keys(sortFieldLabels) as ProjectIssueListSortField[]).map((field) => (
                  <DropdownRadio
                    key={field}
                    name="project-list-sort-field"
                    label={sortFieldLabels[field]}
                    checked={sort.field === field}
                    onChange={() => setSort((current) => ({ ...current, field }))}
                  />
                ))}
              </DropdownSection>
              <DropdownSeparator />
              <DropdownSection title="Direction">
                <DropdownRadio name="project-list-sort-direction" label="Ascending" checked={sort.direction === 'asc'} onChange={() => setSort((current) => ({ ...current, direction: 'asc' }))} />
                <DropdownRadio name="project-list-sort-direction" label="Descending" checked={sort.direction === 'desc'} onChange={() => setSort((current) => ({ ...current, direction: 'desc' }))} />
              </DropdownSection>
            </DropdownPanel>
          </Dropdown>

          <Dropdown
            align="right"
            trigger={<ListToolbarButton active={groupBy !== 'status'}><TableProperties className="h-3.5 w-3.5" />{groupBy === 'status' ? 'Group' : groupLabels[groupBy]}</ListToolbarButton>}
          >
            <DropdownPanel>
              <DropdownSection title="Group by">
                {(Object.keys(groupLabels) as ProjectIssueListGroupKey[]).map((groupKey) => (
                  <DropdownRadio
                    key={groupKey}
                    name="project-list-group"
                    label={groupLabels[groupKey]}
                    checked={groupBy === groupKey}
                    onChange={() => setGroupBy(groupKey)}
                  />
                ))}
              </DropdownSection>
            </DropdownPanel>
          </Dropdown>

          <Dropdown
            align="right"
            trigger={<ListToolbarButton><SlidersHorizontal className="h-3.5 w-3.5" />Options</ListToolbarButton>}
          >
            <DropdownPanel>
              <DropdownSection title="Columns">
                <Checkbox label="Assignee" checked={options.columns.assignee} onChange={() => toggleColumn('assignee')} />
                <Checkbox label="Due date" checked={options.columns.dueDate} onChange={() => toggleColumn('dueDate')} />
                <Checkbox label="Effort" checked={options.columns.effort} onChange={() => toggleColumn('effort')} />
                <Checkbox label="Priority" checked={options.columns.priority} onChange={() => toggleColumn('priority')} />
                <Checkbox label="Status" checked={options.columns.status} onChange={() => toggleColumn('status')} />
              </DropdownSection>
              <DropdownSeparator />
              <DropdownSection title="Display">
                <Checkbox label="Compact rows" checked={options.compactRows} onChange={(event) => setOptions((current) => ({ ...current, compactRows: event.target.checked }))} />
                <Checkbox label="Wrap task titles" checked={options.wrapTitles} onChange={(event) => setOptions((current) => ({ ...current, wrapTitles: event.target.checked }))} />
                <Checkbox label="Show issue keys" checked={options.showIssueKeys} onChange={(event) => setOptions((current) => ({ ...current, showIssueKeys: event.target.checked }))} />
                <Checkbox label="Show empty groups" checked={options.showEmptyGroups} onChange={(event) => setOptions((current) => ({ ...current, showEmptyGroups: event.target.checked }))} />
              </DropdownSection>
              <DropdownSeparator />
              <Button type="button" variant="outline" size="sm" className="w-full justify-center" onClick={resetView}>Reset view</Button>
            </DropdownPanel>
          </Dropdown>

          <button type="button" className="inline-flex items-center hover:text-[var(--color-foreground)]" aria-label="Search tasks" onClick={() => setSearchOpen((current) => !current)}>
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid h-9 shrink-0 border-b border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)]" style={{ gridTemplateColumns }}>
        <div className="flex items-center border-r border-[var(--color-border)] px-2.5">Name</div>
        {options.columns.assignee ? <div className="flex items-center border-r border-[var(--color-border)] px-2.5">Assignee</div> : null}
        {options.columns.dueDate ? <div className="flex items-center border-r border-[var(--color-border)] px-2.5">Due date</div> : null}
        {options.columns.effort ? <div className="flex items-center border-r border-[var(--color-border)] px-2.5">Effort</div> : null}
        {options.columns.priority ? <div className="flex items-center border-r border-[var(--color-border)] px-2.5">Priority</div> : null}
        {options.columns.status ? <div className="flex items-center border-r border-[var(--color-border)] px-2.5">Status</div> : null}
        <div className="flex items-center justify-center">
          <Plus className="h-4 w-4" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {groups.map((group) => (
          <div key={group.id}>
            <ProjectIssueListGroupHeader group={group} groupBy={groupBy} />

            {group.issues.map((issue) => (
              <div key={issue.id} className={cx('grid border-b border-[var(--color-border)] hover:bg-[var(--color-muted)]/60', rowHeightClassName)} style={{ gridTemplateColumns }}>
                <Link to={`/issues/${issue.id}`} className="flex min-w-0 items-center gap-2 border-r border-[var(--color-border)] px-7">
                  <Circle className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  <span className={cx('min-w-0 text-sm text-[var(--color-foreground)]', options.wrapTitles ? 'whitespace-normal py-2' : 'truncate')}>
                    {options.showIssueKeys ? <span className="mr-2 font-mono text-xs text-[var(--color-muted-foreground)]">{formatIssueKey(issue)}</span> : null}
                    {issue.title}
                  </span>
                </Link>
                {options.columns.assignee ? (
                  <div className="flex min-w-0 items-center border-r border-[var(--color-border)] px-2.5">
                    <AssigneeCell assignees={assigneesByIssueId.get(issue.id) ?? []} />
                  </div>
                ) : null}
                {options.columns.dueDate ? (
                  <div className="flex items-center border-r border-[var(--color-border)] px-2.5">
                    {issue.target_date ? (
                      <span className="text-xs text-[var(--color-muted-foreground)]">{formatShortDate(issue.target_date)}</span>
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[var(--color-muted-foreground)] text-[var(--color-muted-foreground)]">
                        <Calendar className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                ) : null}
                {options.columns.effort ? <div className="border-r border-[var(--color-border)]" /> : null}
                {options.columns.priority ? (
                  <div className="flex items-center border-r border-[var(--color-border)] px-2.5">
                    {issue.priority !== 'none' ? <Badge variant={priorityTone[issue.priority]}>{issue.priority}</Badge> : null}
                  </div>
                ) : null}
                {options.columns.status ? (
                  <div className="flex items-center border-r border-[var(--color-border)] px-2.5 text-xs text-[var(--color-muted-foreground)]">
                    {issue.state?.name ?? ''}
                  </div>
                ) : null}
                <div />
              </div>
            ))}

            <Link
              to={`/issues/new?project=${projectId}`}
              className="grid h-9 border-b border-[var(--color-border)] text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/50"
              style={{ gridTemplateColumns }}
            >
              <span className="flex items-center border-r border-[var(--color-border)] pl-14">Add task...</span>
              {options.columns.assignee ? <span className="border-r border-[var(--color-border)]" /> : null}
              {options.columns.dueDate ? <span className="border-r border-[var(--color-border)]" /> : null}
              {options.columns.effort ? <span className="border-r border-[var(--color-border)]" /> : null}
              {options.columns.priority ? <span className="border-r border-[var(--color-border)]" /> : null}
              {options.columns.status ? <span className="border-r border-[var(--color-border)]" /> : null}
              <span />
            </Link>
          </div>
        ))}
        {groups.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[var(--color-muted-foreground)]">No tasks match this view.</div>
        ) : null}
      </div>
    </section>
  )
}

export const ProjectDetailPage = () => {
  const { user } = useAuth()
  const profileId = user?.id ?? null
  const navigate = useNavigate()
  const { projectId = null, section, tabId = null } = useParams()
  const { organisationId } = useOrganisation()
  const routeTabKey = getProjectTabKeyFromSection(section)
  const needsIssues = ['overview', 'list', 'board', 'timeline', 'dashboard', 'calendar', 'gantt', 'workload', 'cycles'].includes(routeTabKey)
  const needsStates = routeTabKey === 'overview' || routeTabKey === 'list' || routeTabKey === 'board' || routeTabKey === 'dashboard' || routeTabKey === 'workflow'
  const needsLabels = routeTabKey === 'dashboard' || routeTabKey === 'workflow'
  const needsMembers = routeTabKey === 'list' || routeTabKey === 'workload'
  const needsCycles = routeTabKey === 'dashboard' || routeTabKey === 'cycles' || routeTabKey === 'list'
  const needsModules = routeTabKey === 'dashboard' || routeTabKey === 'list'
  const needsEstimates = routeTabKey === 'dashboard' || routeTabKey === 'estimates'
  const needsPages = routeTabKey === 'dashboard' || routeTabKey === 'note' || routeTabKey === 'pages'
  const needsMessages = routeTabKey === 'messages'
  const needsAttachments = routeTabKey === 'files'
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()))
  const [messageValue, setMessageValue] = useState<RichTextEditorValue>({
    json: emptyDocument,
    html: '',
    text: '',
  })
  const [renameTab, setRenameTab] = useState<ProjectTab | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const { data: permissions = [] } = useMyPermissions(organisationId)
  const { data: project, isLoading: projectLoading, error: projectError } = useProject(organisationId, projectId)
  const { data: projectTabs = [], error: projectTabsError } = useProjectTabs(organisationId, projectId)
  const { data: issues = [] } = useIssues(organisationId, { project_id: projectId }, needsIssues)
  const { data: states = [] } = useIssueStates(organisationId, projectId, needsStates)
  const { data: labels = [] } = useIssueLabels(organisationId, projectId, needsLabels)
  const { data: members = [] } = useOrganisationMemberProfiles(organisationId, needsMembers)
  const { data: projectIssueAssignees = [] } = useProjectIssueAssignees(organisationId, projectId, routeTabKey === 'list')
  const { data: cycles = [] } = useCycles(organisationId, projectId, needsCycles)
  const { data: cycleIssueLinks = [] } = useCycleIssueLinks(organisationId, projectId, routeTabKey === 'cycles' || routeTabKey === 'list')
  const { data: modules = [] } = useModules(organisationId, projectId, needsModules)
  const { data: moduleIssueLinks = [] } = useModuleIssueLinks(organisationId, projectId, routeTabKey === 'list')
  const { data: estimates = [] } = useEstimates(organisationId, projectId, needsEstimates)
  const { data: pages = [] } = usePages(organisationId, projectId, needsPages)
  const { data: messages = [] } = useProjectMessages(organisationId, projectId, needsMessages)
  const { data: attachments = [] } = useProjectIssueAttachments(organisationId, projectId, needsAttachments)
  const addProjectTab = useAddProjectTab()
  const updateProjectTab = useUpdateProjectTab()
  const removeProjectTab = useRemoveProjectTab()
  const createProjectMessage = useCreateProjectMessage()
  const createPage = useCreatePage()
  const recordRecentVisitOnce = useRecordRecentVisitOnce()

  const visibleTabs = useMemo(() => {
    const sourceTabs: ProjectTab[] = projectTabs.length === 0 && organisationId && projectId
      ? defaultProjectTabsForProject(organisationId, projectId)
      : projectTabs

    return sourceTabs
      .filter((tab) => isProjectTabKey(tab.tab_key) && getProjectTabDefinition(tab.tab_key))
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
  }, [organisationId, projectId, projectTabs])
  const activeTabInstance = useMemo(() => {
    const instanceMatch = tabId ? visibleTabs.find((tab) => tab.id === tabId && tab.tab_key === routeTabKey) : null
    return instanceMatch ?? visibleTabs.find((tab) => tab.tab_key === routeTabKey) ?? null
  }, [routeTabKey, tabId, visibleTabs])
  const activeTab = (activeTabInstance?.tab_key as ProjectTabKey | undefined) ?? routeTabKey
  const activeTabId = activeTabInstance?.id ?? null
  const activeListViewConfig = useMemo(
    () => readListViewConfig(activeTabInstance?.metadata),
    [activeTabInstance?.metadata],
  )

  const stateCounts = useMemo(() => {
    if (activeTab !== 'overview') return []
    return states.map((state) => ({
      state,
      count: issues.filter((issue) => issue.state_id === state.id).length,
    }))
  }, [activeTab, issues, states])
  const recentIssues = useMemo(() => activeTab === 'overview' ? issues.slice(0, 8) : [], [activeTab, issues])
  const canEditProject = permissions.includes('projects.edit')
  const canManageMembers = permissions.includes('projects.members.manage')
  const canEditProjectTabs = canEditProject && !projectTabsError
  const tabMutationBusy = addProjectTab.isPending || updateProjectTab.isPending || removeProjectTab.isPending
  const boardColumns = useMemo(() => activeTab === 'board' ? buildBoardColumns(states, issues) : [], [activeTab, issues, states])
  const completedCount = useMemo(
    () => activeTab === 'dashboard' ? issues.filter((issue) => issue.completed_at || issue.state?.group_key === 'completed').length : 0,
    [activeTab, issues],
  )
  const projectNote = useMemo(() => {
    if (activeTab !== 'note') return null
    return pages.find((page) => page.metadata?.project_note === true) ?? pages.find((page) => page.title.toLowerCase() === 'project note') ?? null
  }, [activeTab, pages])
  const datedIssues = useMemo(() => {
    if (activeTab !== 'timeline') return []
    return [...issues].sort((a, b) => {
      const left = toDate(a.start_date ?? a.target_date ?? a.created_at.slice(0, 10))?.getTime() ?? 0
      const right = toDate(b.start_date ?? b.target_date ?? b.created_at.slice(0, 10))?.getTime() ?? 0
      return left - right
    })
  }, [activeTab, issues])
  const workload = useMemo(() => {
    if (activeTab !== 'workload') return []
    const countsByProfileId = new Map<string, number>()
    issues.forEach((issue) => {
      const profileId = issue.updated_by ?? issue.created_by
      if (!profileId) return
      countsByProfileId.set(profileId, (countsByProfileId.get(profileId) ?? 0) + 1)
    })
    return members
      .map((member) => ({
        member,
        count: countsByProfileId.get(member.profile_id) ?? 0,
      }))
      .filter((item) => item.count > 0)
  }, [activeTab, issues, members])
  const projectVisit = useMemo(() => project ? {
    id: project.id,
    name: project.name,
    description: project.description_text,
    status: project.status,
    identifier: project.identifier,
  } : null, [project])

  useEffect(() => {
    if (!projectId || (section !== 'issues' && section !== 'modules' && section !== 'drafts')) return
    navigate(`/projects/${projectId}/list`, { replace: true })
  }, [navigate, projectId, section])

  useEffect(() => {
    if (!organisationId || !profileId || !projectVisit) return

    recordRecentVisitOnce({
      organisationId,
      profileId,
      kind: 'project',
      projectId: projectVisit.id,
      title: projectVisit.name,
      description: projectVisit.description,
      status: projectVisit.status,
      route: `/projects/${projectVisit.id}`,
      identifier: projectVisit.identifier,
    })
  }, [organisationId, profileId, projectVisit, recordRecentVisitOnce])

  const handleTabChange = (tab: ProjectTab) => {
    if (!projectId) return
    navigate(getProjectTabInstancePath(projectId, tab.tab_key as ProjectTabKey, tab.id))
  }

  const handleAddTab = async (tabKey: ProjectTabKey) => {
    if (!organisationId || !projectId) return
    const definition = projectTabDefinitionByKey.get(tabKey)
    if (!definition) return

    try {
      await addProjectTab.mutateAsync({
        organisation_id: organisationId,
        project_id: projectId,
        tab_key: tabKey,
        label: definition.label,
        sort_order: Math.max(0, ...visibleTabs.map((tab) => tab.sort_order)) + 10,
      })
      toast.success(`${definition.label} tab added`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add tab')
    }
  }

  const handleRemoveTab = async (tab: ProjectTab) => {
    if (!organisationId || isRequiredProjectTab(tab)) return

    try {
      await removeProjectTab.mutateAsync({
        id: tab.id,
        organisation_id: organisationId,
        project_id: tab.project_id,
      })
      if (activeTabId === tab.id && projectId) {
        navigate(getProjectTabPath(projectId, requiredProjectTabKey), { replace: true })
      }
      toast.success(`${tab.label} tab removed`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove tab')
    }
  }

  const handleOpenRenameTab = (tab: ProjectTab) => {
    setRenameTab(tab)
    setRenameValue(tab.label)
  }

  const handleRenameTab = async () => {
    if (!organisationId || !renameTab) return
    const label = renameValue.trim()
    if (!label) {
      toast.error('Tab name is required')
      return
    }

    try {
      await updateProjectTab.mutateAsync({
        id: renameTab.id,
        organisation_id: organisationId,
        project_id: renameTab.project_id,
        label,
      })
      setRenameTab(null)
      setRenameValue('')
      toast.success('Tab renamed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to rename tab')
    }
  }

  const handleCopyTab = async (tab: ProjectTab) => {
    if (!organisationId || !projectId || !isProjectTabKey(tab.tab_key)) return
    const tabIndex = visibleTabs.findIndex((item) => item.id === tab.id)
    const followingTabs = tabIndex >= 0 ? visibleTabs.slice(tabIndex + 1) : []
    const nextSortOrder = followingTabs.length > 0
      ? Math.min(...followingTabs.map((item) => item.sort_order))
      : tab.sort_order + 20
    const hasSortGap = nextSortOrder > tab.sort_order + 1
    const sortOrder = hasSortGap
      ? Math.floor((tab.sort_order + nextSortOrder) / 2)
      : tab.sort_order + 10

    try {
      if (!hasSortGap) {
        await Promise.all(followingTabs.map((item) => updateProjectTab.mutateAsync({
          id: item.id,
          organisation_id: organisationId,
          project_id: item.project_id,
          sort_order: item.sort_order + 10,
        })))
      }
      const copiedTab = await addProjectTab.mutateAsync({
        organisation_id: organisationId,
        project_id: projectId,
        tab_key: tab.tab_key,
        label: getCopiedTabLabel(tab.label, visibleTabs),
        sort_order: sortOrder,
        metadata: metadataWithoutRequired(tab.metadata),
      })
      navigate(getProjectTabInstancePath(projectId, copiedTab.tab_key as ProjectTabKey, copiedTab.id))
      toast.success(`${copiedTab.label} tab created`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to copy tab')
    }
  }

  const handleListViewChange = useCallback(async (config: ProjectIssueListViewConfig) => {
    if (!organisationId || !activeTabInstance || activeTab !== 'list') return

    try {
      await updateProjectTab.mutateAsync({
        id: activeTabInstance.id,
        organisation_id: organisationId,
        project_id: activeTabInstance.project_id,
        metadata: {
          ...(activeTabInstance.metadata ?? {}),
          listView: config,
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save list view')
    }
  }, [activeTab, activeTabInstance, organisationId, updateProjectTab])

  const handleMoveTab = async (tab: ProjectTab, direction: 'left' | 'right') => {
    if (!organisationId) return
    const index = visibleTabs.findIndex((item) => item.id === tab.id)
    const swapWith = visibleTabs[direction === 'left' ? index - 1 : index + 1]
    if (!swapWith) return

    try {
      await Promise.all([
        updateProjectTab.mutateAsync({
          id: tab.id,
          organisation_id: organisationId,
          project_id: tab.project_id,
          sort_order: swapWith.sort_order,
        }),
        updateProjectTab.mutateAsync({
          id: swapWith.id,
          organisation_id: organisationId,
          project_id: swapWith.project_id,
          sort_order: tab.sort_order,
        }),
      ])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to move tab')
    }
  }

  const handleCreateMessage = async () => {
    if (!organisationId || !projectId || !messageValue.text.trim()) return

    try {
      await createProjectMessage.mutateAsync({
        organisation_id: organisationId,
        project_id: projectId,
        description_json: messageValue.json,
        description_html: messageValue.html,
        description_text: messageValue.text,
      })
      setMessageValue({ json: emptyDocument, html: '', text: '' })
      toast.success('Message posted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to post message')
    }
  }

  const handleCreateNote = async () => {
    if (!organisationId || !projectId) return

    try {
      const note = await createPage.mutateAsync({
        organisation_id: organisationId,
        project_id: projectId,
        title: 'Project note',
        status: 'published',
        metadata: { project_note: true },
      })
      navigate(`/pages/${note.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create project note')
    }
  }

  const projectTabBar = projectId ? (
    <ProjectTabBar
      tabs={visibleTabs}
      activeTabId={activeTabId}
      canEdit={canEditProjectTabs}
      onNavigate={handleTabChange}
      onAddTab={handleAddTab}
      onRenameTab={handleOpenRenameTab}
      onCopyTab={handleCopyTab}
      onRemoveTab={handleRemoveTab}
      onMoveTab={handleMoveTab}
      busy={tabMutationBusy}
    />
  ) : null
  const projectTopSlot = project ? (
    <ProjectTopSlot>
      {projectTabBar}
    </ProjectTopSlot>
  ) : projectTabBar

  if (projectError) {
    return (
      <OpenKbPageShell topSlot={projectTopSlot}>
        <EmptyState title="Project not found" description={projectError instanceof Error ? projectError.message : ''} />
      </OpenKbPageShell>
    )
  }

  if (!project) {
    return (
      <OpenKbPageShell topSlot={projectTopSlot}>
        <EmptyState title={projectLoading ? 'Loading project...' : 'Project not found'} description="" />
      </OpenKbPageShell>
    )
  }

  return (
    <OpenKbPageShell topSlot={projectTopSlot}>
      <Dialog open={Boolean(renameTab)} onClose={() => setRenameTab(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename tab</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              void handleRenameTab()
            }}
          >
            <Input
              autoFocus
              aria-label="Tab name"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              placeholder="Tab name"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenameTab(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={tabMutationBusy || !renameValue.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {activeTab === 'overview' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Recent issues</h2>
              <Link className="text-sm font-medium text-[var(--color-primary)] hover:underline" to={`/projects/${project.id}/list`}>All issues</Link>
            </div>
            <IssueList issues={recentIssues} emptyTitle="No issues in this project" />
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
        <ProjectIssueListTable
          key={activeTabId ?? 'list'}
          tabId={activeTabId}
          projectId={project.id}
          issues={issues}
          states={states}
          members={members}
          assignees={projectIssueAssignees}
          cycles={cycles}
          cycleIssueLinks={cycleIssueLinks}
          modules={modules}
          moduleIssueLinks={moduleIssueLinks}
          listViewConfig={activeListViewConfig}
          onListViewChange={canEditProjectTabs ? handleListViewChange : undefined}
        />
      ) : null}

      {activeTab === 'board' ? (
        <ProjectBoardView projectId={project.id} columns={boardColumns} />
      ) : null}

      {activeTab === 'timeline' ? (
        <ProjectTimelineView projectId={project.id} issues={datedIssues.length > 0 ? datedIssues : issues} states={states} />
      ) : null}

      {activeTab === 'dashboard' ? (
        <section className="-mx-2 min-h-0 flex-1 overflow-auto bg-[var(--color-background)]">
          <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
            <Link
              to={`/issues/new?project=${project.id}`}
              className="inline-flex h-8 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-[var(--color-muted)]"
            >
              <Plus className="h-4 w-4" />
              Add widget
            </Link>
            <button type="button" className="text-xs font-medium text-[var(--color-muted-foreground)] underline">Send feedback</button>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            <DashboardMetric label="Total completed tasks" value={completedCount} filters={2} />
            <DashboardMetric label="Total incomplete tasks" value={Math.max(0, issues.length - completedCount)} filters={2} />
            <DashboardMetric label="Total overdue tasks" value={issues.filter((issue) => issue.target_date && !issue.completed_at && toDate(issue.target_date)! < new Date()).length} filters={2} />
            <DashboardMetric label="Total tasks" value={issues.length} filters={1} />
          </div>
          <div className="grid gap-3 px-4 pb-4 xl:grid-cols-2">
            <BarWidget
              title="Total incomplete tasks by section"
              columns={boardColumns.map((column) => ({
                label: column.title,
                value: column.issues.filter((issue) => !issue.completed_at && issue.state?.group_key !== 'completed').length,
              }))}
            />
            <DonutWidget title="Overall Project Status" completed={completedCount} total={issues.length} />
            {boardColumns.slice(0, 4).map((column) => {
              const columnCompleted = column.issues.filter((issue) => issue.completed_at || issue.state?.group_key === 'completed').length
              return <DonutWidget key={column.id} title={`${column.title} Progress`} completed={columnCompleted} total={column.issues.length} />
            })}
          </div>
        </section>
      ) : null}

      {activeTab === 'calendar' ? (
        <IssueCalendar issues={issues} month={calendarMonth} onMonthChange={setCalendarMonth} />
      ) : null}

      {activeTab === 'workflow' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-semibold">States</div>
            <div className="divide-y divide-[var(--color-border)]">
              {states.map((state) => (
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
          <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-semibold">Labels</div>
            <div className="flex flex-wrap gap-2 p-4">
              {labels.length === 0 ? <span className="text-sm text-[var(--color-muted-foreground)]">No project labels.</span> : labels.map((label) => (
                <Badge key={label.id} variant="outline">{label.name}</Badge>
              ))}
            </div>
            <div className="border-t border-[var(--color-border)] px-4 py-3">
              <Button type="button" variant="outline" onClick={() => navigate(`/projects/${project.id}/settings`)}>
                Workflow settings
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === 'messages' ? (
        <section className="space-y-4">
          {canEditProject ? (
            <div className="space-y-3">
              <RichTextEditor value={messageValue.json} placeholder="Write a project update..." onChange={setMessageValue} />
              <Button type="button" onClick={handleCreateMessage} disabled={!messageValue.text.trim()} loading={createProjectMessage.isPending}>
                Post message
              </Button>
            </div>
          ) : null}
          <div className="space-y-3">
            {messages.length === 0 ? <EmptyState title="No project messages" description="" /> : messages.map((message) => (
              <article key={message.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="mb-3 text-xs text-[var(--color-muted-foreground)]">
                  {message.profile?.full_name || message.profile?.email || 'Open-KB user'} · {formatShortDate(dayKey(new Date(message.created_at)))}
                </div>
                <RichTextEditor value={message.description_json} readOnly />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === 'note' ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          {projectNote ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">{projectNote.title}</h2>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{projectNote.content_text || 'Project note page'}</p>
              </div>
              <Link className="inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-[var(--color-muted)]" to={`/pages/${projectNote.id}`}>Open note</Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--color-muted-foreground)]">No project note exists yet.</p>
              <Button type="button" variant="outline" onClick={handleCreateNote} loading={createPage.isPending}>Create note</Button>
            </div>
          )}
        </section>
      ) : null}

      {activeTab === 'gantt' ? <IssueGantt issues={issues} /> : null}

      {activeTab === 'workload' ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-semibold">Workload</div>
          <div className="divide-y divide-[var(--color-border)]">
            {workload.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">No member workload yet.</div>
            ) : workload.map(({ member, count }) => (
              <div key={member.profile_id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{member.profile.full_name || member.profile.username || member.profile.email || 'Unknown user'}</span>
                <Badge variant="neutral">{count}</Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === 'files' ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-semibold">Project files</div>
          <div className="divide-y divide-[var(--color-border)]">
            {attachments.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">No issue attachments in this project.</div>
            ) : attachments.map((attachment) => (
              <div key={attachment.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_8rem_auto] md:items-center">
                <span className="min-w-0 truncate font-medium">{attachment.name ?? attachment.metadata.file_name}</span>
                <span className="text-[var(--color-muted-foreground)]">{formatFileSize(attachment.metadata.size)}</span>
                {attachment.signed_url ? (
                  <a className="inline-flex h-8 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-2 text-xs font-medium hover:bg-[var(--color-muted)]" href={attachment.signed_url}>
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === 'cycles' ? (
        <CyclesView
          cycles={cycles}
          issues={issues}
          cycleIssueLinks={cycleIssueLinks}
          newCycleHref={`/cycles/new?project=${project.id}`}
          className="-mx-2"
        />
      ) : null}

      {activeTab === 'estimates' ? (
        <ProjectRecordSection title="Project estimates" emptyTitle="No estimates yet." newHref={`/estimates/new?project=${project.id}`} items={estimates} />
      ) : null}

      {activeTab === 'pages' ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-4">
            <h2 className="text-sm font-semibold">Project pages</h2>
            <Link className="inline-flex h-8 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-2 text-xs font-medium hover:bg-[var(--color-muted)]" to={`/pages/new?project=${project.id}`}>
              <Plus className="h-3.5 w-3.5" />
              New
            </Link>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {pages.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">No project pages yet.</div>
            ) : pages.map((page) => (
              <Link key={page.id} to={`/pages/${page.id}`} className="block px-4 py-3 hover:bg-[var(--color-muted)]">
                <div className="truncate text-sm font-medium">{page.title}</div>
                <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">{page.status}</div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === 'settings' ? (
        <ProjectSettingsPanel
          project={project}
          organisationId={organisationId ?? ''}
          canEditProject={canEditProject}
          canManageMembers={canManageMembers}
        />
      ) : null}
    </OpenKbPageShell>
  )
}
