import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Badge, EmptyState } from '@repo/ui'
import { Clock3, Plus, Star } from 'lucide-react'
import { useAuth } from '@repo/shared/auth/context'
import { OpenKbPageShell } from '../../components/OpenKbPageShell'
import { useOrganisation } from '../../contexts/OrganisationContext'
import { useFavorites, useRecentVisits } from '../../hooks/queries/usePersonal'
import { useProjectSummary, useProjects } from '../../hooks/queries/useProjects'
import type { OpenKbPersonalItem } from '../../types'

const summaryItems = [
  ['Projects', 'project_count'],
  ['Issues', 'issue_count'],
  ['Cycles', 'cycle_count'],
  ['Modules', 'module_count'],
] as const

const itemKindLabel = (item: OpenKbPersonalItem) =>
  item.name === 'project' ? 'Project' : 'Issue'

const PersonalList = ({
  title,
  icon,
  items,
  emptyTitle,
}: {
  title: string
  icon: ReactNode
  items: OpenKbPersonalItem[]
  emptyTitle: string
}) => (
  <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
    <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3 text-sm font-semibold">
      {icon}
      {title}
    </div>
    {items.length === 0 ? (
      <div className="p-4 text-sm text-[var(--color-muted-foreground)]">{emptyTitle}</div>
    ) : (
      <div className="divide-y divide-[var(--color-border)]">
        {items.slice(0, 8).map((item) => (
          <Link
            key={item.id}
            to={item.payload.route ?? '/home'}
            className="grid gap-1 px-4 py-3 hover:bg-[var(--color-muted)]"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Badge variant="outline">{itemKindLabel(item)}</Badge>
              {item.payload.identifier ? <Badge variant="neutral">{item.payload.identifier}</Badge> : null}
              <span className="truncate text-sm font-medium">{item.title ?? 'Untitled'}</span>
            </div>
            {item.description_text ? (
              <p className="line-clamp-1 text-xs text-[var(--color-muted-foreground)]">{item.description_text}</p>
            ) : null}
          </Link>
        ))}
      </div>
    )}
  </section>
)

export const HomePage = () => {
  const { user } = useAuth()
  const { organisationId, organisationName } = useOrganisation()
  const { data: summary, isLoading: summaryLoading } = useProjectSummary(organisationId)
  const { data: projects = [], isLoading: projectsLoading } = useProjects(organisationId)
  const { data: favorites = [], isLoading: favoritesLoading } = useFavorites(organisationId, user?.id ?? null)
  const { data: recentVisits = [], isLoading: recentLoading } = useRecentVisits(organisationId, user?.id ?? null)

  return (
    <OpenKbPageShell isLoading={summaryLoading || projectsLoading || favoritesLoading || recentLoading}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Open-KB</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {organisationName ?? 'Organisation'} project work, issues, and planning.
          </p>
        </div>
        <Link
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-primary-hover)]"
          to="/projects/new"
        >
          <Plus className="h-4 w-4" />
          New project
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {summaryItems.map(([label, key]) => (
          <div key={key} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">{label}</div>
            <div className="mt-2 text-2xl font-semibold">{summary?.[key] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PersonalList
          title="Favorites"
          icon={<Star className="h-4 w-4 text-[var(--color-muted-foreground)]" />}
          items={favorites}
          emptyTitle="Star projects or issues to keep them here."
        />
        <PersonalList
          title="Recent visits"
          icon={<Clock3 className="h-4 w-4 text-[var(--color-muted-foreground)]" />}
          items={recentVisits}
          emptyTitle="Open a project or issue to build your history."
        />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create the first organisation-scoped project to start adding issues, cycles, and modules."
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-semibold">Recent projects</div>
          <div className="divide-y divide-[var(--color-border)]">
            {projects.slice(0, 6).map((project) => (
              <Link key={project.id} to={`/projects/${project.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-[var(--color-muted)]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{project.identifier}</Badge>
                    <span className="truncate text-sm font-medium">{project.name}</span>
                  </div>
                  {project.description_text ? (
                    <p className="mt-1 line-clamp-1 text-xs text-[var(--color-muted-foreground)]">{project.description_text}</p>
                  ) : null}
                </div>
                <Badge variant={project.status === 'active' ? 'success' : 'neutral'}>{project.status}</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </OpenKbPageShell>
  )
}
