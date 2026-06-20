import { Link, useSearchParams } from 'react-router-dom'
import { Badge, EmptyState, Select } from '@repo/ui'
import { Plus } from 'lucide-react'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { useOrganisation } from '../contexts/OrganisationContext'
import { useEstimates } from '../hooks/queries/usePlanning'
import { useProjects } from '../hooks/queries/useProjects'

export const EstimatesPage = () => {
  const { organisationId } = useOrganisation()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedProjectId = searchParams.get('project')
  const { data: projects = [], isLoading: projectsLoading } = useProjects(organisationId)
  const { data: estimates = [], isLoading: estimatesLoading } = useEstimates(organisationId, selectedProjectId)

  const updateProject = (projectId: string) => {
    const next = new URLSearchParams(searchParams)
    if (projectId) next.set('project', projectId)
    else next.delete('project')
    setSearchParams(next)
  }

  return (
    <OpenKbPageShell isLoading={projectsLoading || estimatesLoading}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Estimates</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Manage issue sizing scales for organisation projects.</p>
        </div>
        <Link
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-primary-hover)]"
          to={selectedProjectId ? `/estimates/new?project=${selectedProjectId}` : '/estimates/new'}
        >
          <Plus className="h-4 w-4" />
          New estimate
        </Link>
      </div>

      <div className="w-full max-w-xs rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <Select
          aria-label="Filter estimates by project"
          className="border border-[var(--color-border)] bg-[var(--color-background)]"
          value={selectedProjectId ?? ''}
          onChange={(event) => updateProject(event.target.value)}
          options={[
            { value: '', label: 'All projects' },
            ...projects.map((project) => ({ value: project.id, label: `${project.identifier} · ${project.name}` })),
          ]}
        />
      </div>

      {estimates.length === 0 ? (
        <EmptyState title="No estimate scales found" description="Create an estimate scale to size issues." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {estimates.map((estimate) => (
            <article key={estimate.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline">{estimate.project?.identifier ?? 'Project'}</Badge>
                <Badge variant="neutral">{estimate.points.length} points</Badge>
              </div>
              <h2 className="mt-4 line-clamp-2 text-base font-semibold">{estimate.name}</h2>
              <p className="mt-2 line-clamp-2 min-h-10 text-sm text-[var(--color-muted-foreground)]">
                {estimate.description_text || 'No estimate description yet.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {estimate.points.map((point) => (
                  <span key={point.id} className="rounded-full bg-[var(--color-muted)] px-2 py-1 text-xs font-medium">
                    {point.name ?? point.value}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </OpenKbPageShell>
  )
}
