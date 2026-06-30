import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { APP_PAGE_SHELL_CONTAINER_CLASS_NAME, Badge, Button, cn, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, EmptyState, Input } from '@repo/ui'
import { Download, ListFilter, Plus } from 'lucide-react'
import { useAuth } from '@repo/shared/auth/context'
import { OpenKbPageShell } from '../../components/OpenKbPageShell'
import { ProjectSettingsPanel } from '../../components/projects/ProjectSettingsPanel'
import { ProjectWorkflowPanel } from '../../components/projects/ProjectWorkflowPanel'
import { ProjectBoardView } from '../../components/projects/ProjectBoardView'
import { ProjectTabBar } from '../../components/projects/ProjectTabBar'
import { useOrganisation } from '../../contexts/OrganisationContext'
import { CreateIssueDialog } from '../../components/issues/CreateIssueDialog'
import {
  IssueCalendar,
  IssueGantt,
} from '../../components/issues/IssueViews'
import { buildBoardColumns } from '../../lib/issueViews'
import {
  useIssues,
  useIssueLabels,
  useIssueBlockersForIssues,
  useProjectIssueAssignees,
  useIssueStates,
  useOrganisationMemberProfiles,
  useProjectIssueAttachments,
} from '../../hooks/queries/useIssues'
import { useCycleIssueLinks, useCycles, useModuleIssueLinks, useModules } from '../../hooks/queries/usePlanning'
import {
  useProject,
  useProjectTabs,
} from '../../hooks/queries/useProjects'
import { useTeams } from '../../hooks/queries/useTeams'
import { defaultProjectTabsForProject } from '../../api/projects'
import { useMyPermissions } from '../../hooks/queries/usePermissions'
import { useRecordRecentVisitOnce } from '../../hooks/queries/usePersonal'
import type { Issue, ProjectTab } from '../../types'
import { formatFileSize } from '../../lib/fileFormatting'
import { formatIssueKey, issuePriorityTone as priorityTone } from '../../lib/issueFormatting'
import { startOfMonth, toDate } from '../../lib/dateFormatting'
import {
  getProjectTabDefinition,
  getProjectTabKeyFromSection,
  getProjectTabInstancePath,
  getProjectTabPath,
  isProjectTabKey,
  type ProjectTabKey,
} from '../../lib/projectTabs'
import {
  getProjectCyclePath,
  getProjectIssuePath,
  getProjectListCyclePath,
  getProjectTabIssuePath,
} from '../../lib/projectRoutes'
import {
  ProjectCyclePreviewPane,
  ProjectIssueListTable,
  ProjectIssuePreviewPane,
} from '../../components/projects/project-list/ProjectIssueListTable'
import {
  cx,
  readListViewConfig,
} from '../../components/projects/project-list/projectIssueListLogic'
import { useProjectTabActions } from '../../components/projects/useProjectTabActions'
import { ProjectTimeline } from '../../components/projects/project-timeline/ProjectTimeline'

const previewPaneTabs = ['list', 'board', 'calendar', 'overview'] as const satisfies readonly ProjectTabKey[]
type PreviewPaneTab = (typeof previewPaneTabs)[number]

const isPreviewPaneTab = (tab: ProjectTabKey): tab is PreviewPaneTab =>
  previewPaneTabs.includes(tab as PreviewPaneTab)

const IssueList = ({
  issues,
  emptyTitle,
  onOpenIssue,
  selectedIssueId,
}: {
  issues: Issue[]
  emptyTitle: string
  onOpenIssue: (issue: Issue) => void
  selectedIssueId?: string | null
}) => {
  if (issues.length === 0) {
    return <EmptyState title={emptyTitle} description="" />
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="divide-y divide-[var(--color-border)]">
        {issues.map((issue) => (
          <button
            key={issue.id}
            type="button"
            onClick={() => onOpenIssue(issue)}
            className={cx(
              'grid w-full gap-2 px-4 py-3 text-left text-sm hover:bg-[var(--color-muted)] md:grid-cols-[7rem_minmax(0,1fr)_8rem_10rem] md:items-center',
              selectedIssueId === issue.id && 'bg-blue-50',
            )}
          >
            <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{formatIssueKey(issue)}</span>
            <span className="min-w-0 truncate font-medium">{issue.title}</span>
            <Badge variant={priorityTone[issue.priority]}>{issue.priority}</Badge>
            <span className="inline-flex min-w-0 items-center gap-2 text-[var(--color-muted-foreground)]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: issue.state?.color ?? '#64748b' }} />
              <span className="truncate">{issue.state?.name ?? 'No state'}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

const ProjectTabIssueSplitLayout = ({
  selectedIssueId,
  organisationId,
  projectId,
  tabBaseHref,
  onClose,
  shrinkMain,
  children,
  preview,
}: {
  selectedIssueId?: string | null
  organisationId: string | null
  projectId: string
  tabBaseHref: string
  onClose: () => void
  shrinkMain?: boolean
  children: ReactNode
  preview?: ReactNode
}) => (
  <div className="-mx-2 flex min-h-0 flex-1 overflow-hidden bg-[var(--color-background)]">
    <div className={cx('flex min-h-0 min-w-0 flex-col transition-[width] duration-150', shrinkMain ? 'w-[48%]' : 'w-full')}>
      {children}
    </div>
    {((selectedIssueId && organisationId) || preview) ? (
      <div className="min-h-0 min-w-0 flex-1">
        {preview ?? (
          selectedIssueId && organisationId ? (
            <ProjectIssuePreviewPane
              organisationId={organisationId}
              projectId={projectId}
              issueId={selectedIssueId}
              listHref={tabBaseHref}
              expandedHref={getProjectIssuePath(projectId, selectedIssueId)}
              onClose={onClose}
            />
          ) : null
        )}
      </div>
    ) : null}
  </div>
)

const projectPageContainerClassName = cn(APP_PAGE_SHELL_CONTAINER_CLASS_NAME, 'gap-0')

const ProjectTopSlot = ({ children }: { children: ReactNode }) => (
  <div className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
    {children}
  </div>
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

export const ProjectDetailPage = () => {
  const { user } = useAuth()
  const profileId = user?.id ?? null
  const navigate = useNavigate()
  const { projectId = null, section, tabId = null, issueId = null, cycleId = null } = useParams()
  const { organisationId } = useOrganisation()
  const routeTabKey = getProjectTabKeyFromSection(section)
  const needsIssues = ['overview', 'list', 'board', 'timeline', 'dashboard', 'calendar', 'gantt', 'workload'].includes(routeTabKey)
  const needsStates = routeTabKey === 'overview' || routeTabKey === 'list' || routeTabKey === 'board' || routeTabKey === 'dashboard' || routeTabKey === 'workflow'
  const needsLabels = routeTabKey === 'dashboard'
  const needsMembers = routeTabKey === 'list' || routeTabKey === 'workload'
  const needsCycles = routeTabKey === 'dashboard' || routeTabKey === 'list'
  const needsModules = routeTabKey === 'dashboard' || routeTabKey === 'list' || routeTabKey === 'timeline'
  const needsAttachments = routeTabKey === 'files'
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()))
  const [createIssueOpen, setCreateIssueOpen] = useState(false)
  const { data: permissions = [] } = useMyPermissions(organisationId)
  const { data: project, isLoading: projectLoading, error: projectError } = useProject(organisationId, projectId)
  const { data: projectTabs = [], error: projectTabsError } = useProjectTabs(organisationId, projectId)
  const { data: issues = [] } = useIssues(organisationId, { project_id: projectId }, needsIssues)
  const issueIds = useMemo(() => issues.map((issue) => issue.id).sort(), [issues])
  const { data: states = [] } = useIssueStates(organisationId, projectId, needsStates)
  const { data: teams = [] } = useTeams(needsIssues ? organisationId : null)
  const { data: labels = [] } = useIssueLabels(organisationId, projectId, needsLabels)
  const { data: members = [] } = useOrganisationMemberProfiles(organisationId, needsMembers)
  const { data: projectIssueAssignees = [] } = useProjectIssueAssignees(organisationId, projectId, routeTabKey === 'list' || routeTabKey === 'timeline')
  const { data: cycles = [] } = useCycles(organisationId, projectId, needsCycles)
  const { data: cycleIssueLinks = [] } = useCycleIssueLinks(organisationId, projectId, routeTabKey === 'list')
  const { data: modules = [] } = useModules(organisationId, projectId, needsModules)
  const { data: moduleIssueLinks = [] } = useModuleIssueLinks(organisationId, projectId, routeTabKey === 'list' || routeTabKey === 'timeline')
  const { data: blockers = [] } = useIssueBlockersForIssues(organisationId, issueIds, routeTabKey === 'timeline')
  const { data: attachments = [] } = useProjectIssueAttachments(organisationId, projectId, needsAttachments)
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
  const selectedPreviewIssueId = isPreviewPaneTab(activeTab) ? issueId ?? null : null
  const selectedListCycleId = activeTab === 'list' ? cycleId : null
  const activeListViewConfig = useMemo(
    () => readListViewConfig(activeTabInstance?.metadata),
    [activeTabInstance?.metadata],
  )
  const {
    renameTab,
    renameValue,
    setRenameTab,
    setRenameValue,
    tabMutationBusy,
    handleTabChange,
    handleAddTab,
    handleRemoveTab,
    handleOpenRenameTab,
    handleRenameTab,
    handleCopyTab,
    handleListViewChange,
    handleMoveTab,
  } = useProjectTabActions({
    organisationId,
    projectId,
    visibleTabs,
    activeTab,
    activeTabId,
    activeTabInstance,
  })
  const tabBaseHref = projectId
    ? activeTabId && tabId
      ? getProjectTabInstancePath(projectId, activeTab, activeTabId)
      : getProjectTabPath(projectId, activeTab)
    : '/projects'
  const listHref = projectId
    ? activeTabId && tabId
      ? getProjectTabInstancePath(projectId, 'list', activeTabId)
      : getProjectTabPath(projectId, 'list')
    : '/projects'
  const handleOpenPreviewIssue = (issue: Issue) => {
    if (!projectId) return
    navigate(getProjectTabIssuePath(projectId, activeTab, issue.id, activeTabId))
  }
  const handleOpenListCycle = (cycle: { id: string }) => {
    if (!projectId) return
    navigate(selectedListCycleId === cycle.id ? listHref : getProjectListCyclePath(projectId, cycle.id, activeTabId))
  }

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
  const boardColumns = useMemo(() => activeTab === 'board' ? buildBoardColumns(states, issues) : [], [activeTab, issues, states])
  const completedCount = useMemo(
    () => activeTab === 'dashboard' ? issues.filter((issue) => issue.completed_at || issue.state?.group_key === 'completed').length : 0,
    [activeTab, issues],
  )
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
      <OpenKbPageShell containerClassName={projectPageContainerClassName}>
        {projectTopSlot}
        <div className="p-1">
          <EmptyState title="Project not found" description={projectError instanceof Error ? projectError.message : ''} />
        </div>
      </OpenKbPageShell>
    )
  }

  if (!project) {
    return (
      <OpenKbPageShell containerClassName={projectPageContainerClassName}>
        {projectTopSlot}
        <div className="p-1">
          <EmptyState title={projectLoading ? 'Loading project...' : 'Project not found'} description="" />
        </div>
      </OpenKbPageShell>
    )
  }

  return (
    <OpenKbPageShell containerClassName={projectPageContainerClassName}>
      {projectTopSlot}
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
        <ProjectTabIssueSplitLayout
          selectedIssueId={selectedPreviewIssueId}
          organisationId={organisationId}
          projectId={project.id}
          tabBaseHref={tabBaseHref}
          onClose={() => navigate(tabBaseHref)}
          shrinkMain={Boolean(selectedPreviewIssueId)}
        >
          <div className="grid gap-4 p-1 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Recent issues</h2>
                <Link className="text-sm font-medium text-[var(--color-primary)] hover:underline" to={`/projects/${project.id}/list`}>All issues</Link>
              </div>
              <IssueList
                issues={recentIssues}
                emptyTitle="No issues in this project"
                onOpenIssue={handleOpenPreviewIssue}
                selectedIssueId={selectedPreviewIssueId}
              />
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
        </ProjectTabIssueSplitLayout>
      ) : null}

      {activeTab === 'list' ? (
        <ProjectTabIssueSplitLayout
          selectedIssueId={selectedPreviewIssueId}
          organisationId={organisationId}
          projectId={project.id}
          tabBaseHref={tabBaseHref}
          onClose={() => navigate(tabBaseHref)}
          shrinkMain={Boolean(selectedPreviewIssueId || selectedListCycleId)}
          preview={
            !selectedPreviewIssueId && selectedListCycleId ? (
              <ProjectCyclePreviewPane
                cycleId={selectedListCycleId}
                cycles={cycles}
                issues={issues}
                cycleIssueLinks={cycleIssueLinks}
                onExpand={() => navigate(getProjectCyclePath(project.id, selectedListCycleId))}
                onClose={() => navigate(listHref)}
              />
            ) : undefined
          }
        >
          <ProjectIssueListTable
            key={activeTabId ?? 'list'}
            tabId={activeTabId}
            issues={issues}
            states={states}
            members={members}
            assignees={projectIssueAssignees}
            cycles={cycles}
            cycleIssueLinks={cycleIssueLinks}
            modules={modules}
            moduleIssueLinks={moduleIssueLinks}
            teams={teams}
            listViewConfig={activeListViewConfig}
            selectedIssueId={selectedPreviewIssueId}
            selectedCycleId={selectedListCycleId}
            onOpenIssue={handleOpenPreviewIssue}
            onOpenCycle={handleOpenListCycle}
            onListViewChange={canEditProjectTabs ? handleListViewChange : undefined}
            onCreateIssue={() => setCreateIssueOpen(true)}
          />
        </ProjectTabIssueSplitLayout>
      ) : null}

      {activeTab === 'board' && project && organisationId ? (
        <ProjectTabIssueSplitLayout
          selectedIssueId={selectedPreviewIssueId}
          organisationId={organisationId}
          projectId={project.id}
          tabBaseHref={tabBaseHref}
          onClose={() => navigate(tabBaseHref)}
          shrinkMain={Boolean(selectedPreviewIssueId)}
        >
          <ProjectBoardView
            organisationId={organisationId}
            columns={boardColumns}
            canEdit={canEditProject}
            onCreateIssue={() => setCreateIssueOpen(true)}
            onOpenIssue={handleOpenPreviewIssue}
            selectedIssueId={selectedPreviewIssueId}
          />
        </ProjectTabIssueSplitLayout>
      ) : null}

      {activeTab === 'timeline' ? (
        <ProjectTimeline
          projectId={project.id}
          issues={datedIssues.length > 0 ? datedIssues : issues}
          teams={teams}
          assignees={projectIssueAssignees}
          modules={modules}
          moduleIssueLinks={moduleIssueLinks}
          blockers={blockers}
          onCreateIssue={() => setCreateIssueOpen(true)}
        />
      ) : null}

      {activeTab === 'dashboard' ? (
        <section className="-mx-2 min-h-0 flex-1 overflow-auto bg-[var(--color-background)]">
          <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
            <button
              type="button"
              onClick={() => setCreateIssueOpen(true)}
              className="inline-flex h-8 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-[var(--color-muted)]"
            >
              <Plus className="h-4 w-4" />
              Add widget
            </button>
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
        <ProjectTabIssueSplitLayout
          selectedIssueId={selectedPreviewIssueId}
          organisationId={organisationId}
          projectId={project.id}
          tabBaseHref={tabBaseHref}
          onClose={() => navigate(tabBaseHref)}
          shrinkMain={Boolean(selectedPreviewIssueId)}
        >
          <div className="p-1">
            <IssueCalendar
              issues={issues}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              onOpenIssue={handleOpenPreviewIssue}
              selectedIssueId={selectedPreviewIssueId}
            />
          </div>
        </ProjectTabIssueSplitLayout>
      ) : null}

      {activeTab === 'workflow' && project && organisationId ? (
        <div className="p-1">
          <ProjectWorkflowPanel
            organisationId={organisationId}
            projectId={project.id}
            states={states}
            canEdit={canEditProject}
          />
        </div>
      ) : null}

      {activeTab === 'gantt' ? (
        <div className="p-1">
          <IssueGantt issues={issues} />
        </div>
      ) : null}

      {activeTab === 'workload' ? (
        <div className="p-1">
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
        </div>
      ) : null}

      {activeTab === 'files' ? (
        <div className="p-1">
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
        </div>
      ) : null}

      {activeTab === 'settings' ? (
        <div className="p-1">
          <ProjectSettingsPanel
            project={project}
            organisationId={organisationId ?? ''}
            canEditProject={canEditProject}
            canManageMembers={canManageMembers}
          />
        </div>
      ) : null}

      {organisationId && project ? (
        <CreateIssueDialog
          open={createIssueOpen}
          onClose={() => setCreateIssueOpen(false)}
          organisationId={organisationId}
          projectId={project.id}
        />
      ) : null}
    </OpenKbPageShell>
  )
}
