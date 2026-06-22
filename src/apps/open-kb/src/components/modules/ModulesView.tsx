import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, EmptyState, cn } from '@repo/ui'
import { CalendarDays, ChevronDown, ChevronRight, Columns3, Grid2X2, LayoutList, ListFilter, MoreHorizontal, PanelRight, Plus, Search, Star, Tag, Users } from 'lucide-react'
import type { Issue, ModuleIssueLink, ProjectModule } from '../../types'
import { formatShortDate } from '../../lib/dateFormatting'
import { formatIssueKey } from '../../lib/issueFormatting'

type ModuleViewModel = {
  module: ProjectModule
  issues: Issue[]
  total: number
  completed: number
  progress: number
}

const statusLabel: Record<ProjectModule['status'], string> = {
  backlog: 'Backlog',
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const statusClass: Record<ProjectModule['status'], string> = {
  backlog: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
  planned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
}

const isIssueDone = (issue: Issue) => Boolean(issue.completed_at || issue.state?.group_key === 'completed' || issue.state?.name?.toLowerCase().includes('done') || issue.state?.name?.toLowerCase().includes('resolved'))

const progressStyle = (progress: number, size = 30) => ({
  width: size,
  height: size,
  background: `conic-gradient(#16a34a 0 ${progress}%, #e5e7eb ${progress}% 100%)`,
})

const ProgressRing = ({ progress, size = 30 }: { progress: number; size?: number }) => (
  <span className="inline-grid shrink-0 place-items-center rounded-full" style={progressStyle(progress, size)}>
    <span className="grid place-items-center rounded-full bg-[var(--color-background)] text-[10px] text-[var(--color-muted-foreground)]" style={{ width: Math.max(16, size - 6), height: Math.max(16, size - 6) }}>
      {progress}%
    </span>
  </span>
)

const buildModuleModels = (modules: ProjectModule[], issues: Issue[], moduleIssueLinks: ModuleIssueLink[]): ModuleViewModel[] => {
  const issueById = new Map(issues.map((issue) => [issue.id, issue]))
  const issueIdsByModule = new Map<string, Set<string>>()

  moduleIssueLinks.forEach((link) => {
    if (!link.module_id || !link.issue_id) return
    const set = issueIdsByModule.get(link.module_id) ?? new Set<string>()
    set.add(link.issue_id)
    issueIdsByModule.set(link.module_id, set)
  })

  return modules.map((module) => {
    const linkedIssues = [...(issueIdsByModule.get(module.id) ?? new Set<string>())]
      .map((issueId) => issueById.get(issueId))
      .filter((issue): issue is Issue => Boolean(issue))
    const completed = linkedIssues.filter(isIssueDone).length
    const total = linkedIssues.length

    return {
      module,
      issues: linkedIssues,
      total,
      completed,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  })
}

const ModuleRow = ({
  model,
  selected,
  onSelect,
}: {
  model: ModuleViewModel
  selected: boolean
  onSelect: () => void
}) => (
  <button
    type="button"
    className={cn(
      'grid h-[52px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--color-border)] px-6 text-left hover:bg-[var(--color-muted)]',
      selected && 'bg-[var(--color-muted)]',
    )}
    onClick={onSelect}
  >
    <span className="flex min-w-0 items-center gap-4">
      <ProgressRing progress={model.progress} />
      <span className="min-w-0 truncate text-sm font-medium">{model.module.name}</span>
    </span>
    <span className="flex items-center gap-4 text-xs text-[var(--color-muted-foreground)]">
      <span className="hidden h-7 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 md:inline-flex">
        {model.module.created_at ? `${formatShortDate(model.module.created_at.slice(0, 10))} - ${formatShortDate(model.module.updated_at?.slice(0, 10) ?? model.module.created_at.slice(0, 10))}` : 'No dates'}
      </span>
      <span className={cn('inline-flex h-7 items-center rounded-[var(--radius-sm)] px-5 text-xs font-medium', statusClass[model.module.status])}>
        {statusLabel[model.module.status]}
      </span>
      <LayoutList className="h-4 w-4" />
      <Star className="h-4 w-4" />
      <MoreHorizontal className="h-4 w-4" />
    </span>
  </button>
)

const WorkItemRow = ({ issue, moduleName }: { issue: Issue; moduleName: string }) => (
  <Link to={`/issues/${issue.id}`} className="grid min-h-12 grid-cols-[5.5rem_minmax(16rem,1fr)_auto] items-center gap-4 border-b border-[var(--color-border)] px-6 text-sm hover:bg-[var(--color-muted)]">
    <span className="text-xs text-[var(--color-muted-foreground)]">{formatIssueKey(issue)}</span>
    <span className="min-w-0 truncate font-medium">{issue.title}</span>
    <div className="flex min-w-0 items-center gap-2 overflow-hidden">
      <span className="inline-flex h-6 max-w-32 items-center gap-1 truncate rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 text-xs text-[var(--color-muted-foreground)]">
        <span className="h-3 w-3 rounded-full border" style={{ borderColor: issue.state?.color ?? '#64748b' }} />
        <span className="truncate">{issue.state?.name ?? 'No status'}</span>
      </span>
      <span className="hidden h-6 items-center gap-1 rounded-[var(--radius-sm)] border border-orange-300 px-2 text-xs text-orange-600 md:inline-flex">
        <Columns3 className="h-3 w-3" />
      </span>
      <span className="hidden h-6 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 text-xs text-[var(--color-muted-foreground)] lg:inline-flex">
        <CalendarDays className="h-3 w-3" />
      </span>
      <span className="hidden h-6 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 text-xs text-[var(--color-muted-foreground)] lg:inline-flex">
        <Users className="h-3 w-3" />
      </span>
      <span className="hidden h-6 max-w-44 items-center gap-1 truncate rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 text-xs text-[var(--color-muted-foreground)] xl:inline-flex">
        <LayoutList className="h-3 w-3" />
        <span className="truncate">{moduleName}</span>
      </span>
      <span className="hidden h-6 max-w-40 items-center gap-1 truncate rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 text-xs text-[var(--color-muted-foreground)] xl:inline-flex">
        <span className="h-2 w-2 rounded-full bg-violet-600" />
        concepts
      </span>
      <Tag className="h-4 w-4 text-[var(--color-muted-foreground)]" />
      <MoreHorizontal className="h-4 w-4 text-[var(--color-muted-foreground)]" />
    </div>
  </Link>
)

const ModuleDetail = ({ model }: { model: ModuleViewModel }) => (
  <section className="min-h-0 flex-1 overflow-auto">
    <div className="flex h-11 items-center justify-between border-b border-[var(--color-border)] px-6">
      <div className="flex min-w-0 items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
        <span>👇 Test2rcns1</span>
        <ChevronRight className="h-4 w-4" />
        <span>Modules</span>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate">{model.module.name}</span>
        <ChevronDown className="h-4 w-4" />
        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">{model.total}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 bg-[var(--color-muted)]"><LayoutList className="h-4 w-4" /></Button>
        <Button type="button" variant="outline" size="sm" className="h-8">Display</Button>
        <Button type="button" variant="outline" size="sm" className="h-8">Analytics</Button>
        <Link to={`/issues/new?project=${model.module.project_id}`} className="inline-flex h-8 items-center rounded-[var(--radius-md)] bg-[#006aa6] px-3 text-sm font-medium text-white hover:bg-[#005b8f]">
          Add work item
        </Link>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 bg-[var(--color-muted)]"><PanelRight className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 bg-[var(--color-muted)]"><MoreHorizontal className="h-4 w-4" /></Button>
      </div>
    </div>
    <div className="flex h-12 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-muted)] px-6">
      <div className="inline-flex items-center gap-2 text-base font-semibold">
        <ProgressRing progress={model.progress} size={16} />
        All work items
        <span className="text-[var(--color-muted-foreground)]">{model.total}</span>
      </div>
      <Plus className="h-4 w-4 text-[var(--color-muted-foreground)]" />
    </div>
    <div>
      {model.issues.map((issue) => (
        <WorkItemRow key={issue.id} issue={issue} moduleName={model.module.name} />
      ))}
      <Link to={`/issues/new?project=${model.module.project_id}`} className="flex h-12 items-center gap-2 border-b border-[var(--color-border)] px-6 text-sm hover:bg-[var(--color-muted)]">
        <Plus className="h-4 w-4" />
        New work item
      </Link>
    </div>
  </section>
)

export const ModulesView = ({
  modules,
  issues,
  moduleIssueLinks,
  newModuleHref,
  className,
}: {
  modules: ProjectModule[]
  issues: Issue[]
  moduleIssueLinks: ModuleIssueLink[]
  newModuleHref: string
  className?: string
}) => {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const models = useMemo(() => buildModuleModels(modules, issues, moduleIssueLinks), [issues, moduleIssueLinks, modules])
  const selectedModel = models.find((model) => model.module.id === selectedModuleId) ?? null

  if (models.length === 0) {
    return <EmptyState title="No modules found" description="Create a module to group related project work." />
  }

  return (
    <section className={cn('flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-background)]', className)}>
      {selectedModel ? (
        <ModuleDetail model={selectedModel} />
      ) : (
        <>
          <div className="flex h-11 items-center justify-between border-b border-[var(--color-border)] px-6">
            <div className="flex items-center gap-3 text-sm">
              <span>👇 Test2rcns1</span>
              <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <span className="font-medium">Modules</span>
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <Button type="button" variant="outline" size="sm" className="h-8">Name</Button>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-2"><ListFilter className="h-4 w-4" />Filters</Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 bg-[var(--color-muted)]"><LayoutList className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8"><Grid2X2 className="h-4 w-4" /></Button>
              <Link to={newModuleHref} className="inline-flex h-8 items-center rounded-[var(--radius-md)] bg-[#006aa6] px-3 text-sm font-medium text-white hover:bg-[#005b8f]">
                Add Module
              </Link>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {models.map((model) => (
              <ModuleRow
                key={model.module.id}
                model={model}
                selected={selectedModuleId === model.module.id}
                onSelect={() => setSelectedModuleId(model.module.id)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
