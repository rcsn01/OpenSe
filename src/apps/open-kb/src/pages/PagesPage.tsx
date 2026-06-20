import { Link, useSearchParams } from 'react-router-dom'
import { Badge, EmptyState, Select } from '@repo/ui'
import { Plus } from 'lucide-react'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { useOrganisation } from '../contexts/OrganisationContext'
import { usePages } from '../hooks/queries/usePages'
import { useProjects } from '../hooks/queries/useProjects'
import type { PageStatus } from '../types'

const statusTone: Record<PageStatus, 'neutral' | 'success' | 'warning'> = {
  draft: 'neutral',
  published: 'success',
  archived: 'warning',
}

export const PagesPage = () => {
  const { organisationId } = useOrganisation()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedProjectId = searchParams.get('project')
  const { data: projects = [], isLoading: projectsLoading } = useProjects(organisationId)
  const { data: pages = [], isLoading: pagesLoading } = usePages(organisationId, selectedProjectId)

  const updateProject = (projectId: string) => {
    const next = new URLSearchParams(searchParams)
    if (projectId) next.set('project', projectId)
    else next.delete('project')
    setSearchParams(next)
  }

  return (
    <OpenKbPageShell isLoading={projectsLoading || pagesLoading}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Pages</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Write project and organisation knowledge with the Open-KB editor.</p>
        </div>
        <Link
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-primary-hover)]"
          to={selectedProjectId ? `/pages/new?project=${selectedProjectId}` : '/pages/new'}
        >
          <Plus className="h-4 w-4" />
          New page
        </Link>
      </div>

      <div className="w-full max-w-xs rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <Select
          aria-label="Filter pages by project"
          className="border border-[var(--color-border)] bg-[var(--color-background)]"
          value={selectedProjectId ?? ''}
          onChange={(event) => updateProject(event.target.value)}
          options={[
            { value: '', label: 'All pages' },
            ...projects.map((project) => ({ value: project.id, label: `${project.identifier} · ${project.name}` })),
          ]}
        />
      </div>

      {pages.length === 0 ? (
        <EmptyState title="No pages found" description="Create a page to document project decisions and knowledge." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page) => (
            <Link key={page.id} to={`/pages/${page.id}`} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-border-hover)]">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline">{page.project?.identifier ?? 'ORG'}</Badge>
                <Badge variant={statusTone[page.status]}>{page.status}</Badge>
              </div>
              <h2 className="mt-4 line-clamp-2 text-base font-semibold">{page.title}</h2>
              <p className="mt-3 line-clamp-3 min-h-16 text-sm text-[var(--color-muted-foreground)]">
                {page.content_text || page.slug || 'No page content yet.'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </OpenKbPageShell>
  )
}
