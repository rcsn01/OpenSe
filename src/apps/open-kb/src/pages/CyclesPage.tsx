import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Select } from '@repo/ui'
import { Plus } from 'lucide-react'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { CyclesView } from '../components/cycles/CyclesView'
import { useOrganisation } from '../contexts/OrganisationContext'
import { useIssues } from '../hooks/queries/useIssues'
import { useCycleIssueLinks, useCycles } from '../hooks/queries/usePlanning'
import { useProjects } from '../hooks/queries/useProjects'
import { getProjectListPath } from '../lib/projectRoutes'

export const CyclesPage = () => {
  const navigate = useNavigate()
  const { organisationId } = useOrganisation()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedProjectId = searchParams.get('project')
  const { data: projects = [], isLoading: projectsLoading } = useProjects(organisationId)
  const { data: cycles = [], isLoading: cyclesLoading } = useCycles(organisationId, selectedProjectId)
  const { data: issues = [], isLoading: issuesLoading } = useIssues(organisationId, { project_id: selectedProjectId })
  const { data: cycleIssueLinks = [], isLoading: cycleLinksLoading } = useCycleIssueLinks(organisationId, selectedProjectId)

  const updateProject = (projectId: string) => {
    const next = new URLSearchParams(searchParams)
    if (projectId) next.set('project', projectId)
    else next.delete('project')
    setSearchParams(next)
  }

  return (
    <OpenKbPageShell isLoading={projectsLoading || cyclesLoading || issuesLoading || cycleLinksLoading}>
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

      <CyclesView
        cycles={cycles}
        issues={issues}
        cycleIssueLinks={cycleIssueLinks}
        newCycleHref={selectedProjectId ? `/cycles/new?project=${selectedProjectId}` : '/cycles/new'}
        onCreateIssue={selectedProjectId ? () => navigate(getProjectListPath(selectedProjectId)) : undefined}
        className="min-h-[34rem] rounded-[var(--radius-md)] border border-[var(--color-border)]"
      />
    </OpenKbPageShell>
  )
}
