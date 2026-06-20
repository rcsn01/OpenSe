import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Input, Select } from '@repo/ui'
import { toast } from 'sonner'
import { buildPageSlug } from '../api/pages'
import { RichTextEditor, type RichTextEditorValue } from '../components/editor'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { useOrganisation } from '../contexts/OrganisationContext'
import { useCreatePage } from '../hooks/queries/usePages'
import { useProjects } from '../hooks/queries/useProjects'
import type { PageStatus } from '../types'

const statusOptions: Array<{ value: PageStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

export const NewPagePage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { organisationId } = useOrganisation()
  const { data: projects = [], isLoading } = useProjects(organisationId)
  const [projectId, setProjectId] = useState(searchParams.get('project') ?? '')
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [status, setStatus] = useState<PageStatus>('draft')
  const [content, setContent] = useState<RichTextEditorValue | null>(null)
  const createPage = useCreatePage()
  const suggestedSlug = useMemo(() => buildPageSlug(title), [title])
  const resolvedSlug = slug || suggestedSlug

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!organisationId || !title.trim()) return

    try {
      const page = await createPage.mutateAsync({
        organisation_id: organisationId,
        project_id: projectId || null,
        title,
        slug: resolvedSlug,
        status,
        content_json: content?.json ?? null,
        content_html: content?.html ?? null,
        content_text: content?.text ?? null,
      })
      toast.success('Page created')
      navigate(`/pages/${page.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create page')
    }
  }

  return (
    <OpenKbPageShell isLoading={isLoading}>
      <div>
        <h1 className="text-xl font-semibold tracking-normal">New page</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Create project notes or organisation-level knowledge.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Project</span>
            <Select
              className="border border-[var(--color-border)] bg-[var(--color-background)]"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              options={[
                { value: '', label: 'Organisation page' },
                ...projects.map((project) => ({ value: project.id, label: `${project.identifier} · ${project.name}` })),
              ]}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Status</span>
            <Select
              className="border border-[var(--color-border)] bg-[var(--color-background)]"
              value={status}
              onChange={(event) => setStatus(event.target.value as PageStatus)}
              options={statusOptions}
            />
          </label>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Title</span>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Release checklist" required />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Slug</span>
          <Input value={resolvedSlug} onChange={(event) => setSlug(event.target.value)} placeholder="release-checklist" />
        </label>
        <div className="space-y-2">
          <span className="text-sm font-medium">Content</span>
          <RichTextEditor placeholder="Write the page content..." onChange={setContent} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/pages')}>Cancel</Button>
          <Button type="submit" loading={createPage.isPending}>Create page</Button>
        </div>
      </form>
    </OpenKbPageShell>
  )
}
