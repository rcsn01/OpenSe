import { Link, useSearchParams } from 'react-router-dom'
import { Select } from '@repo/ui'
import { Plus } from 'lucide-react'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { ModulesView } from '../components/modules/ModulesView'
import { useOrganisation } from '../contexts/OrganisationContext'
import { useIssues } from '../hooks/queries/useIssues'
import { useModuleIssueLinks, useModules } from '../hooks/queries/usePlanning'
import { useProjects } from '../hooks/queries/useProjects'

export const ModulesPage = () => {
  const { organisationId } = useOrganisation()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedProjectId = searchParams.get('project')
  const { data: projects = [], isLoading: projectsLoading } = useProjects(organisationId)
  const { data: modules = [], isLoading: modulesLoading } = useModules(organisationId, selectedProjectId)
  const { data: issues = [], isLoading: issuesLoading } = useIssues(organisationId, { project_id: selectedProjectId })
  const { data: moduleIssueLinks = [], isLoading: moduleLinksLoading } = useModuleIssueLinks(organisationId, selectedProjectId)

  const updateProject = (projectId: string) => {
    const next = new URLSearchParams(searchParams)
    if (projectId) next.set('project', projectId)
    else next.delete('project')
    setSearchParams(next)
  }

  return (
    <OpenKbPageShell isLoading={projectsLoading || modulesLoading || issuesLoading || moduleLinksLoading}>
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

      <ModulesView
        modules={modules}
        issues={issues}
        moduleIssueLinks={moduleIssueLinks}
        newModuleHref={selectedProjectId ? `/modules/new?project=${selectedProjectId}` : '/modules/new'}
        className="min-h-[34rem] rounded-[var(--radius-md)] border border-[var(--color-border)]"
      />
    </OpenKbPageShell>
  )
}
