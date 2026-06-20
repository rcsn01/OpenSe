import { Link, useSearchParams } from 'react-router-dom'
import { Badge, EmptyState, Select } from '@repo/ui'
import { Plus } from 'lucide-react'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { useOrganisation } from '../contexts/OrganisationContext'
import { useCycles } from '../hooks/queries/usePlanning'
import { useProjects } from '../hooks/queries/useProjects'
import type { CycleStatus } from '../types'

const statusTone: Record<CycleStatus, 'neutral' | 'info' | 'success' | 'danger'> = {
  draft: 'neutral',
  active: 'info',
  completed: 'success',
  cancelled: 'danger',
}

const formatRange = (startsAt: string | null, endsAt: string | null) => {
  if (!startsAt && !endsAt) return 'No dates'
  return `${startsAt ?? 'No start'} - ${endsAt ?? 'No end'}`
}

export const CyclesPage = () => {
  const { organisationId } = useOrganisation()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedProjectId = searchParams.get('project')
  const { data: projects = [], isLoading: projectsLoading } = useProjects(organisationId)
  const { data: cycles = [], isLoading: cyclesLoading } = useCycles(organisationId, selectedProjectId)

  const updateProject = (projectId: string) => {
    const next = new URLSearchParams(searchParams)
    if (projectId) next.set('project', projectId)
    else next.delete('project')
    setSearchParams(next)
  }

  return (
    <OpenKbPageShell isLoading={projectsLoading || cyclesLoading}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Cycles</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Plan time-boxed project work inside the selected organisation.</p>
        </div>
        <Link
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-primary-hover)]"
          to={selectedProjectId ? `/cycles/new?project=${selectedProjectId}` : '/cycles/new'}
        >
          <Plus className="h-4 w-4" />
          New cycle
        </Link>
      </div>

      <div className="w-full max-w-xs rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <Select
          aria-label="Filter cycles by project"
          className="border border-[var(--color-border)] bg-[var(--color-background)]"
          value={selectedProjectId ?? ''}
          onChange={(event) => updateProject(event.target.value)}
          options={[
            { value: '', label: 'All projects' },
            ...projects.map((project) => ({ value: project.id, label: `${project.identifier} · ${project.name}` })),
          ]}
        />
      </div>

      {cycles.length === 0 ? (
        <EmptyState title="No cycles found" description="Create a cycle to time-box project work." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cycles.map((cycle) => (
            <article key={cycle.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline">{cycle.project?.identifier ?? 'Project'}</Badge>
                <Badge variant={statusTone[cycle.status]}>{cycle.status}</Badge>
              </div>
              <h2 className="mt-4 line-clamp-2 text-base font-semibold">{cycle.name}</h2>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{formatRange(cycle.starts_at, cycle.ends_at)}</p>
              <p className="mt-3 line-clamp-2 min-h-10 text-sm text-[var(--color-muted-foreground)]">
                {cycle.description_text || 'No cycle description yet.'}
              </p>
            </article>
          ))}
        </div>
      )}
    </OpenKbPageShell>
  )
}
