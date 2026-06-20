import { Link, useSearchParams } from 'react-router-dom'
import { Badge, EmptyState, Select } from '@repo/ui'
import { Plus } from 'lucide-react'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { useOrganisation } from '../contexts/OrganisationContext'
import { useModules } from '../hooks/queries/usePlanning'
import { useProjects } from '../hooks/queries/useProjects'
import type { ModuleStatus } from '../types'

const statusTone: Record<ModuleStatus, 'neutral' | 'info' | 'success' | 'danger' | 'warning'> = {
  backlog: 'neutral',
  planned: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
}

export const ModulesPage = () => {
  const { organisationId } = useOrganisation()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedProjectId = searchParams.get('project')
  const { data: projects = [], isLoading: projectsLoading } = useProjects(organisationId)
  const { data: modules = [], isLoading: modulesLoading } = useModules(organisationId, selectedProjectId)

  const updateProject = (projectId: string) => {
    const next = new URLSearchParams(searchParams)
    if (projectId) next.set('project', projectId)
    else next.delete('project')
    setSearchParams(next)
  }

  return (
    <OpenKbPageShell isLoading={projectsLoading || modulesLoading}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Modules</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Group related project work into shippable feature areas.</p>
        </div>
        <Link
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-primary-hover)]"
          to={selectedProjectId ? `/modules/new?project=${selectedProjectId}` : '/modules/new'}
        >
          <Plus className="h-4 w-4" />
          New module
        </Link>
      </div>

      <div className="w-full max-w-xs rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <Select
          aria-label="Filter modules by project"
          className="border border-[var(--color-border)] bg-[var(--color-background)]"
          value={selectedProjectId ?? ''}
          onChange={(event) => updateProject(event.target.value)}
          options={[
            { value: '', label: 'All projects' },
            ...projects.map((project) => ({ value: project.id, label: `${project.identifier} · ${project.name}` })),
          ]}
        />
      </div>

      {modules.length === 0 ? (
        <EmptyState title="No modules found" description="Create a module to group related project work." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <article key={module.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline">{module.project?.identifier ?? 'Project'}</Badge>
                <Badge variant={statusTone[module.status]}>{module.status}</Badge>
              </div>
              <h2 className="mt-4 line-clamp-2 text-base font-semibold">{module.name}</h2>
              <p className="mt-3 line-clamp-3 min-h-16 text-sm text-[var(--color-muted-foreground)]">
                {module.description_text || 'No module description yet.'}
              </p>
            </article>
          ))}
        </div>
      )}
    </OpenKbPageShell>
  )
}
