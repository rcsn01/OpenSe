import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '@repo/ui'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { OpenKbPageShell } from '../../../components/OpenKbPageShell'
import { CycleDetailContent, CycleProgressRing } from '../../../components/cycles/CycleDetailContent'
import { buildCycleDetailModel, formatCycleDateRange } from '../../../components/cycles/cycleDetailModel'
import { useOrganisation } from '../../../contexts/OrganisationContext'
import { useIssues } from '../../../hooks/queries/useIssues'
import { useCycleIssueLinks, useCycles } from '../../../hooks/queries/usePlanning'
import { useProject } from '../../../hooks/queries/useProjects'
import { getProjectListPath } from '../../../lib/projectRoutes'

export const CycleDetailPage = () => {
  const { projectId = null, cycleId = null } = useParams()
  const { organisationId } = useOrganisation()
  const { data: project, isLoading: projectLoading, error: projectError } = useProject(organisationId, projectId)
  const enabled = Boolean(project)
  const { data: cycles = [], isLoading: cyclesLoading } = useCycles(organisationId, projectId, enabled)
  const { data: issues = [], isLoading: issuesLoading } = useIssues(organisationId, { project_id: projectId }, enabled)
  const { data: cycleIssueLinks = [], isLoading: linksLoading } = useCycleIssueLinks(organisationId, projectId, enabled)
  const cycle = cycles.find((item) => item.id === cycleId) ?? null
  const model = cycle ? buildCycleDetailModel(cycle, issues, cycleIssueLinks) : null
  const isLoading = projectLoading || cyclesLoading || issuesLoading || linksLoading

  if (projectError || (!projectLoading && !project)) {
    return (
      <OpenKbPageShell>
        <EmptyState title="Project not found" description={projectError instanceof Error ? projectError.message : 'The project was deleted or is outside your Open-KB access.'} />
      </OpenKbPageShell>
    )
  }

  if (!isLoading && !model) {
    return (
      <OpenKbPageShell>
        <EmptyState title="Cycle not found" description="The cycle was deleted or is outside this project." />
      </OpenKbPageShell>
    )
  }

  return (
    <OpenKbPageShell isLoading={isLoading}>
      {model ? (
        <article className="mx-auto flex h-full w-full max-w-[calc(100vw-4rem)] flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[var(--shadow-sm)]">
          <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[var(--color-border)] px-5">
            <div className="flex min-w-0 items-center gap-4">
              <Link to={getProjectListPath(model.cycle.project_id)} className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]" aria-label="Back to list">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <CycleProgressRing progress={model.progress} size={40} />
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-normal">{model.cycle.name}</h1>
                <p className="mt-1 truncate text-sm text-[var(--color-muted-foreground)]">{project?.identifier} · {project?.name}</p>
              </div>
            </div>
            <div className="hidden shrink-0 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-muted-foreground)] md:inline-flex">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatCycleDateRange(model.cycle)}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <CycleDetailContent model={model} />
          </div>
        </article>
      ) : null}
    </OpenKbPageShell>
  )
}
