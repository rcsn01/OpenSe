import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, EmptyState } from '@repo/ui'
import { ArrowUpDown, Calendar, ChevronDown, Circle, Download, ListFilter, Plus, Search, SlidersHorizontal, TableProperties } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@repo/shared/auth/context'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { CyclesView } from '../components/cycles/CyclesView'
import { ModulesView } from '../components/modules/ModulesView'
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
  useIssueStates,
  useOrganisationMemberProfiles,
  useProjectIssueAttachments,
} from '../hooks/queries/useIssues'
import { useDraftIssues } from '../hooks/queries/useDrafts'
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
import type { Issue, IssueState, OrganisationMemberProfile, ProjectTab } from '../types'
import { formatFileSize } from '../lib/fileFormatting'
import { formatIssueKey, issuePriorityTone as priorityTone } from '../lib/issueFormatting'
import { dayKey, formatShortDate, startOfMonth, toDate } from '../lib/dateFormatting'
import {
  getProjectTabDefinition,
  getProjectTabKeyFromSection,
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

const AssigneeCell = ({
  issue,
  members,
}: {
  issue: Issue
  members: OrganisationMemberProfile[]
}) => {
  const member = members.find((item) => item.profile_id === (issue.updated_by ?? issue.created_by))
  if (!member) return <EmptyAssignee />

  const displayName = member.profile.full_name || member.profile.username || member.profile.email || 'User'
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-semibold text-white">
        {initials || 'U'}
      </span>
      <span className="truncate text-xs text-[var(--color-foreground)]">{displayName}</span>
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

const ProjectIssueListTable = ({
  projectId,
  issues,
  states,
  members,
}: {
  projectId: string
  issues: Issue[]
  states: IssueState[]
  members: OrganisationMemberProfile[]
}) => {
  const groups = states
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    .map((state) => ({
      id: state.id,
      title: state.name,
      issues: issues.filter((issue) => issue.state_id === state.id),
    }))
  const uncategorised = issues.filter((issue) => !issue.state_id)

  if (uncategorised.length > 0) {
    groups.unshift({ id: 'none', title: 'No status', issues: uncategorised })
  }

  if (groups.length === 0) {
    groups.push({ id: 'empty', title: 'Todo', issues: [] })
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

      <div className="grid h-9 shrink-0 grid-cols-[minmax(26rem,1fr)_7.5rem_7.5rem_7.5rem_7.5rem_7.5rem_3.5rem] border-b border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)]">
        {['Name', 'Assignee', 'Due date', 'Effort', 'Priority', 'Status'].map((label) => (
          <div key={label} className="flex items-center border-r border-[var(--color-border)] px-2.5">{label}</div>
        ))}
        <div className="flex items-center justify-center">
          <Plus className="h-4 w-4" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {groups.map((group) => (
          <div key={group.id}>
            <div className="flex h-14 items-center gap-2 border-b border-[var(--color-border)] px-2.5">
              <ChevronDown className="h-4 w-4 fill-current text-[var(--color-muted-foreground)]" />
              <h2 className="text-base font-semibold">{group.title}</h2>
            </div>

            {group.issues.map((issue) => (
              <div key={issue.id} className="grid min-h-9 grid-cols-[minmax(26rem,1fr)_7.5rem_7.5rem_7.5rem_7.5rem_7.5rem_3.5rem] border-b border-[var(--color-border)] hover:bg-[var(--color-muted)]/60">
                <Link to={`/issues/${issue.id}`} className="flex min-w-0 items-center gap-2 border-r border-[var(--color-border)] px-7">
                  <Circle className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  <span className="truncate text-sm text-[var(--color-foreground)]">{issue.title}</span>
                </Link>
                <div className="flex min-w-0 items-center border-r border-[var(--color-border)] px-2.5">
                  <AssigneeCell issue={issue} members={members} />
                </div>
                <div className="flex items-center border-r border-[var(--color-border)] px-2.5">
                  {issue.target_date ? (
                    <span className="text-xs text-[var(--color-muted-foreground)]">{formatShortDate(issue.target_date)}</span>
                  ) : (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[var(--color-muted-foreground)] text-[var(--color-muted-foreground)]">
                      <Calendar className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <div className="border-r border-[var(--color-border)]" />
                <div className="flex items-center border-r border-[var(--color-border)] px-2.5">
                  {issue.priority !== 'none' ? <Badge variant={priorityTone[issue.priority]}>{issue.priority}</Badge> : null}
                </div>
                <div className="flex items-center border-r border-[var(--color-border)] px-2.5 text-xs text-[var(--color-muted-foreground)]">
                  {issue.state?.name ?? ''}
                </div>
                <div />
              </div>
            ))}

            <Link
              to={`/issues/new?project=${projectId}`}
              className="grid h-9 grid-cols-[minmax(26rem,1fr)_7.5rem_7.5rem_7.5rem_7.5rem_7.5rem_3.5rem] border-b border-[var(--color-border)] text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/50"
            >
              <span className="flex items-center border-r border-[var(--color-border)] pl-14">Add task...</span>
              <span className="border-r border-[var(--color-border)]" />
              <span className="border-r border-[var(--color-border)]" />
              <span className="border-r border-[var(--color-border)]" />
              <span className="border-r border-[var(--color-border)]" />
              <span className="border-r border-[var(--color-border)]" />
              <span />
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

export const ProjectDetailPage = () => {
  const { user } = useAuth()
  const profileId = user?.id ?? null
  const navigate = useNavigate()
  const { projectId = null, section } = useParams()
  const { organisationId } = useOrganisation()
  const activeTab = getProjectTabKeyFromSection(section)
  const needsIssues = ['overview', 'list', 'board', 'timeline', 'dashboard', 'calendar', 'gantt', 'workload', 'cycles', 'modules'].includes(activeTab)
  const needsStates = activeTab === 'overview' || activeTab === 'list' || activeTab === 'board' || activeTab === 'dashboard' || activeTab === 'workflow'
  const needsLabels = activeTab === 'dashboard' || activeTab === 'workflow'
  const needsMembers = activeTab === 'list' || activeTab === 'workload'
  const needsCycles = activeTab === 'dashboard' || activeTab === 'cycles'
  const needsModules = activeTab === 'dashboard' || activeTab === 'modules'
  const needsEstimates = activeTab === 'dashboard' || activeTab === 'estimates'
  const needsPages = activeTab === 'dashboard' || activeTab === 'note' || activeTab === 'pages'
  const needsDrafts = activeTab === 'drafts'
  const needsMessages = activeTab === 'messages'
  const needsAttachments = activeTab === 'files'
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()))
  const [messageValue, setMessageValue] = useState<RichTextEditorValue>({
    json: emptyDocument,
    html: '',
    text: '',
  })
  const { data: permissions = [] } = useMyPermissions(organisationId)
  const { data: project, isLoading: projectLoading, error: projectError } = useProject(organisationId, projectId)
  const { data: projectTabs = [], error: projectTabsError } = useProjectTabs(organisationId, projectId)
  const { data: issues = [] } = useIssues(organisationId, { project_id: projectId }, needsIssues)
  const { data: drafts = [] } = useDraftIssues(organisationId, profileId, needsDrafts)
  const { data: states = [] } = useIssueStates(organisationId, projectId, needsStates)
  const { data: labels = [] } = useIssueLabels(organisationId, projectId, needsLabels)
  const { data: members = [] } = useOrganisationMemberProfiles(organisationId, needsMembers)
  const { data: cycles = [] } = useCycles(organisationId, projectId, needsCycles)
  const { data: cycleIssueLinks = [] } = useCycleIssueLinks(organisationId, projectId, activeTab === 'cycles')
  const { data: modules = [] } = useModules(organisationId, projectId, needsModules)
  const { data: moduleIssueLinks = [] } = useModuleIssueLinks(organisationId, projectId, activeTab === 'modules')
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

  const stateCounts = useMemo(() => {
    if (activeTab !== 'overview') return []
    return states.map((state) => ({
      state,
      count: issues.filter((issue) => issue.state_id === state.id).length,
    }))
  }, [activeTab, issues, states])
  const recentIssues = useMemo(() => activeTab === 'overview' ? issues.slice(0, 8) : [], [activeTab, issues])
  const projectDrafts = useMemo(
    () => activeTab === 'drafts' ? drafts.filter((draft) => draft.project_id === projectId) : [],
    [activeTab, drafts, projectId],
  )
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
    if (!projectId || section !== 'issues') return
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

  const handleTabChange = (tabKey: ProjectTabKey) => {
    if (!projectId) return
    navigate(getProjectTabPath(projectId, tabKey))
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
    if (!organisationId || tab.tab_key === requiredProjectTabKey) return

    try {
      await removeProjectTab.mutateAsync({
        id: tab.id,
        organisation_id: organisationId,
        project_id: tab.project_id,
      })
      if (activeTab === tab.tab_key && projectId) {
        navigate(getProjectTabPath(projectId, requiredProjectTabKey), { replace: true })
      }
      toast.success(`${tab.label} tab removed`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove tab')
    }
  }

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
      activeTab={activeTab}
      canEdit={canEditProjectTabs}
      onNavigate={handleTabChange}
      onAddTab={handleAddTab}
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
        <ProjectIssueListTable projectId={project.id} issues={issues} states={states} members={members} />
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

      {activeTab === 'drafts' ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-4">
            <h2 className="text-sm font-semibold">Project drafts</h2>
            <Link className="inline-flex h-8 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-2 text-xs font-medium hover:bg-[var(--color-muted)]" to={`/issues/new?project=${project.id}`}>
              <Plus className="h-3.5 w-3.5" />
              New
            </Link>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {projectDrafts.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">No draft issues for this project.</div>
            ) : projectDrafts.map((draft) => (
              <Link key={draft.id} to={`/issues/new?draft=${draft.id}`} className="block px-4 py-3 hover:bg-[var(--color-muted)]">
                <div className="truncate text-sm font-medium">{draft.title || 'Untitled draft'}</div>
                <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">{draft.status ?? 'draft'}</div>
              </Link>
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

      {activeTab === 'modules' ? (
        <ModulesView
          modules={modules}
          issues={issues}
          moduleIssueLinks={moduleIssueLinks}
          newModuleHref={`/modules/new?project=${project.id}`}
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
