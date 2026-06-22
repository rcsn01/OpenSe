import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, EmptyState } from '@repo/ui'
import { ArrowUpDown, Calendar, ChevronDown, Circle, Download, FileText, ListFilter, Plus, Search, SlidersHorizontal, TableProperties } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@repo/shared/auth/context'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { ProjectSettingsPanel } from '../components/projects/ProjectSettingsPanel'
import { ProjectTabBar } from '../components/projects/ProjectTabBar'
import { RichTextEditor, type RichTextEditorValue } from '../components/editor'
import { useOrganisation } from '../contexts/OrganisationContext'
import {
  IssueCalendar,
  IssueCard,
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
import { useCycles, useEstimates, useModules } from '../hooks/queries/usePlanning'
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
    <section className="-mx-2 -mt-6 flex min-h-0 flex-1 flex-col bg-[var(--color-background)] text-sm">
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
  const needsIssues = ['overview', 'list', 'board', 'timeline', 'dashboard', 'calendar', 'gantt', 'workload'].includes(activeTab)
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
  const { data: modules = [] } = useModules(organisationId, projectId, needsModules)
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

  if (projectError) {
    return (
      <OpenKbPageShell topSlot={projectTabBar}>
        <EmptyState title="Project not found" description={projectError instanceof Error ? projectError.message : ''} />
      </OpenKbPageShell>
    )
  }

  if (!project) {
    return (
      <OpenKbPageShell topSlot={projectTabBar}>
        <EmptyState title={projectLoading ? 'Loading project...' : 'Project not found'} description="" />
      </OpenKbPageShell>
    )
  }

  return (
    <OpenKbPageShell topSlot={projectTabBar}>
      {activeTab !== 'list' ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">{project.identifier}</Badge>
              <Badge variant={project.status === 'active' ? 'success' : 'neutral'}>{project.status}</Badge>
              <Badge variant="neutral">{project.visibility}</Badge>
              {project.team ? <Badge variant="outline">{project.team.name}</Badge> : null}
            </div>
            {project.description_text ? (
              <p className="mt-3 max-w-3xl text-sm text-[var(--color-muted-foreground)]">{project.description_text}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium hover:bg-[var(--color-muted)]" to={`/pages/new?project=${project.id}`}>
              <FileText className="h-4 w-4" />
              Page
            </Link>
            <Link className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-primary-hover)]" to={`/issues/new?project=${project.id}`}>
              <Plus className="h-4 w-4" />
              Issue
            </Link>
          </div>
        </div>
      ) : null}

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
      ) : null}

      {activeTab === 'timeline' ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="grid grid-cols-[8rem_minmax(0,1fr)] border-b border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-2 text-xs font-medium uppercase text-[var(--color-muted-foreground)]">
            <span>Date</span>
            <span>Issue</span>
          </div>
          {datedIssues.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">No dated issues in this project.</div>
          ) : datedIssues.map((issue) => (
            <Link key={issue.id} to={`/issues/${issue.id}`} className="grid grid-cols-[8rem_minmax(0,1fr)] gap-4 border-b border-[var(--color-border)] px-4 py-3 text-sm hover:bg-[var(--color-muted)]">
              <span className="text-[var(--color-muted-foreground)]">{formatShortDate(issue.start_date ?? issue.target_date ?? issue.created_at.slice(0, 10))}</span>
              <span className="min-w-0">
                <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{formatIssueKey(issue)}</span>
                <span className="ml-3 font-medium">{issue.title}</span>
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      {activeTab === 'dashboard' ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Issues', issues.length],
            ['Completed', completedCount],
            ['Cycles', cycles.length],
            ['Modules', modules.length],
            ['Estimates', estimates.length],
            ['Pages', pages.length],
            ['States', states.length],
            ['Labels', labels.length],
          ].map(([label, value]) => (
            <section key={label} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">{label}</div>
              <div className="mt-2 text-2xl font-semibold">{value}</div>
            </section>
          ))}
        </div>
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
        <ProjectRecordSection title="Project cycles" emptyTitle="No cycles yet." newHref={`/cycles/new?project=${project.id}`} items={cycles} />
      ) : null}

      {activeTab === 'modules' ? (
        <ProjectRecordSection title="Project modules" emptyTitle="No modules yet." newHref={`/modules/new?project=${project.id}`} items={modules} />
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
