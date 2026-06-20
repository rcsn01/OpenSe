import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, Button, EmptyState, cn } from '@repo/ui'
import {
  ArrowLeft,
  FileText,
  GitPullRequestArrow,
  LayoutList,
  Plus,
  Settings,
  Star,
  Tags,
} from 'lucide-react'
import { useAuth } from '@repo/shared/auth/context'
import { toast } from 'sonner'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { ProjectSettingsPanel } from '../components/projects/ProjectSettingsPanel'
import { useOrganisation } from '../contexts/OrganisationContext'
import {
  useIssues,
  useIssueStates,
} from '../hooks/queries/useIssues'
import { usePages } from '../hooks/queries/usePages'
import { useCycles, useEstimates, useModules } from '../hooks/queries/usePlanning'
import {
  useProject,
  useProjectMembers,
} from '../hooks/queries/useProjects'
import { useMyPermissions } from '../hooks/queries/usePermissions'
import { useAddFavorite, useFavorites, useRecordRecentVisit, useRemoveFavorite } from '../hooks/queries/usePersonal'
import type { Issue } from '../types'
import { formatIssueKey, issuePriorityTone as priorityTone } from '../lib/issueFormatting'

type ProjectTab = 'overview' | 'issues' | 'planning' | 'pages' | 'settings'

const tabs: Array<{ id: ProjectTab; label: string; icon: typeof LayoutList }> = [
  { id: 'overview', label: 'Overview', icon: LayoutList },
  { id: 'issues', label: 'Issues', icon: Tags },
  { id: 'planning', label: 'Planning', icon: GitPullRequestArrow },
  { id: 'pages', label: 'Pages', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const ProjectMetric = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
    <div className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">{label}</div>
    <div className="mt-2 text-2xl font-semibold">{value}</div>
  </div>
)

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

export const ProjectDetailPage = () => {
  const { user } = useAuth()
  const { projectId = null } = useParams()
  const { organisationId } = useOrganisation()
  const [activeTab, setActiveTab] = useState<ProjectTab>('overview')
  const { data: permissions = [] } = useMyPermissions(organisationId)
  const { data: project, isLoading: projectLoading, error: projectError } = useProject(organisationId, projectId)
  const { data: issues = [], isLoading: issuesLoading } = useIssues(organisationId, { project_id: projectId })
  const { data: states = [] } = useIssueStates(organisationId, projectId)
  const { data: cycles = [] } = useCycles(organisationId, projectId)
  const { data: modules = [] } = useModules(organisationId, projectId)
  const { data: estimates = [] } = useEstimates(organisationId, projectId)
  const { data: pages = [] } = usePages(organisationId, projectId)
  const { data: projectMembers = [] } = useProjectMembers(organisationId, projectId)
  const { data: favorites = [] } = useFavorites(organisationId, user?.id ?? null)
  const addFavorite = useAddFavorite()
  const removeFavorite = useRemoveFavorite()
  const recordRecentVisit = useRecordRecentVisit()

  const metrics = useMemo(() => {
    const completed = issues.filter((issue) => issue.completed_at || issue.state?.group_key === 'completed').length
    const open = issues.length - completed
    return { open, completed }
  }, [issues])

  const stateCounts = states.map((state) => ({
    state,
    count: issues.filter((issue) => issue.state_id === state.id).length,
  }))
  const recentIssues = issues.slice(0, 8)
  const canEditProject = permissions.includes('projects.edit')
  const canManageMembers = permissions.includes('projects.members.manage')
  const currentFavorite = favorites.find((favorite) => favorite.name === 'project' && favorite.project_id === project?.id)

  useEffect(() => {
    if (!organisationId || !user || !project) return

    recordRecentVisit.mutate({
      organisationId,
      profileId: user.id,
      kind: 'project',
      projectId: project.id,
      title: project.name,
      description: project.description_text,
      status: project.status,
      route: `/projects/${project.id}`,
      identifier: project.identifier,
    })
  }, [organisationId, project, recordRecentVisit, user])

  const handleToggleFavorite = async () => {
    if (!organisationId || !user || !project) return

    try {
      if (currentFavorite) {
        await removeFavorite.mutateAsync({ organisationId, favoriteId: currentFavorite.id })
        toast.success('Removed favorite')
      } else {
        await addFavorite.mutateAsync({
          organisationId,
          profileId: user.id,
          kind: 'project',
          projectId: project.id,
          title: project.name,
          description: project.description_text,
          status: project.status,
          route: `/projects/${project.id}`,
          identifier: project.identifier,
        })
        toast.success('Added favorite')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update favorite')
    }
  }

  if (projectError) {
    return (
      <OpenKbPageShell>
        <EmptyState title="Project not found" description={projectError instanceof Error ? projectError.message : ''} />
      </OpenKbPageShell>
    )
  }

  if (!project) {
    return (
      <OpenKbPageShell isLoading={projectLoading || issuesLoading}>
        <EmptyState title="Project not found" description="" />
      </OpenKbPageShell>
    )
  }

  return (
    <OpenKbPageShell isLoading={projectLoading || issuesLoading}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Link to="/projects" className="mb-3 inline-flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
            <ArrowLeft className="h-4 w-4" />
            Projects
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">{project.identifier}</Badge>
            <Badge variant={project.status === 'active' ? 'success' : 'neutral'}>{project.status}</Badge>
            <Badge variant="neutral">{project.visibility}</Badge>
            {project.team ? <Badge variant="outline">{project.team.name}</Badge> : null}
          </div>
          <h1 className="mt-3 truncate text-2xl font-semibold tracking-normal">{project.name}</h1>
          {project.description_text ? (
            <p className="mt-1 max-w-3xl text-sm text-[var(--color-muted-foreground)]">{project.description_text}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={currentFavorite ? 'primary' : 'outline'}
            onClick={handleToggleFavorite}
            loading={addFavorite.isPending || removeFavorite.isPending}
            disabled={!user}
          >
            <Star className="h-4 w-4" />
            {currentFavorite ? 'Starred' : 'Star'}
          </Button>
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <ProjectMetric label="Open issues" value={metrics.open} />
        <ProjectMetric label="Completed" value={metrics.completed} />
        <ProjectMetric label="States" value={states.filter((state) => state.project_id === project.id).length} />
        <ProjectMetric label="Cycles" value={cycles.length} />
        <ProjectMetric label="Modules" value={modules.length} />
        <ProjectMetric label="Members" value={projectMembers.length} />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)]">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              className={cn(
                'inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium text-[var(--color-muted-foreground)]',
                activeTab === tab.id ? 'border-[var(--color-primary)] text-[var(--color-foreground)]' : 'border-transparent hover:text-[var(--color-foreground)]',
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'overview' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Recent issues</h2>
              <Link className="text-sm font-medium text-[var(--color-primary)] hover:underline" to={`/issues?project=${project.id}`}>All issues</Link>
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

      {activeTab === 'issues' ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Project issues</h2>
            <Link className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium hover:bg-[var(--color-muted)]" to={`/issues?project=${project.id}&view=board`}>
              <LayoutList className="h-4 w-4" />
              Board
            </Link>
          </div>
          <IssueList issues={issues} emptyTitle="No issues in this project" />
        </section>
      ) : null}

      {activeTab === 'planning' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { title: 'Cycles', items: cycles, href: `/cycles/new?project=${project.id}` },
            { title: 'Modules', items: modules, href: `/modules/new?project=${project.id}` },
            { title: 'Estimates', items: estimates, href: `/estimates/new?project=${project.id}` },
          ].map((group) => (
            <section key={group.title} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-4">
                <h2 className="text-sm font-semibold">{group.title}</h2>
                <Link className="inline-flex h-8 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-2 text-xs font-medium hover:bg-[var(--color-muted)]" to={group.href}>
                  <Plus className="h-3.5 w-3.5" />
                  New
                </Link>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {group.items.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">No records yet.</div>
                ) : group.items.slice(0, 8).map((item) => (
                  <div key={item.id} className="px-4 py-3">
                    <div className="truncate text-sm font-medium">{item.name}</div>
                    {'status' in item ? <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">{item.status}</div> : null}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
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
