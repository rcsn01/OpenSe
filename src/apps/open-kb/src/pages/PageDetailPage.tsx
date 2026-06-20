import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, Button, EmptyState, Input, Select } from '@repo/ui'
import { ArrowLeft, Clock3, RotateCcw, Star } from 'lucide-react'
import { useAuth } from '@repo/shared/auth/context'
import { toast } from 'sonner'
import { RichTextEditor, type RichTextEditorValue } from '../components/editor'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { useOrganisation } from '../contexts/OrganisationContext'
import { usePage, usePageVersions, useUpdatePage } from '../hooks/queries/usePages'
import { useAddFavorite, useFavorites, useRecordRecentVisit, useRemoveFavorite } from '../hooks/queries/usePersonal'
import { useProjects } from '../hooks/queries/useProjects'
import type { KnowledgePage, PageStatus, PageVersion } from '../types'

const statusOptions: Array<{ value: PageStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

const statusTone: Record<PageStatus, 'neutral' | 'success' | 'warning'> = {
  draft: 'neutral',
  published: 'success',
  archived: 'warning',
}

const formatDateTime = (value: string | null) => {
  if (!value) return 'Unknown'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

const isPageStatus = (value: string | null | undefined): value is PageStatus =>
  value === 'draft' || value === 'published' || value === 'archived'

const PageDetailContent = ({
  page,
  organisationId,
}: {
  page: KnowledgePage
  organisationId: string
}) => {
  const { user } = useAuth()
  const { data: projects = [] } = useProjects(organisationId)
  const { data: versions = [], isLoading: versionsLoading } = usePageVersions(organisationId, page.id)
  const { data: favorites = [] } = useFavorites(organisationId, user?.id ?? null)
  const updatePage = useUpdatePage()
  const addFavorite = useAddFavorite()
  const removeFavorite = useRemoveFavorite()
  const recordRecentVisit = useRecordRecentVisit()
  const [projectId, setProjectId] = useState(page.project_id ?? '')
  const [title, setTitle] = useState(page.title)
  const [slug, setSlug] = useState(page.slug ?? '')
  const [status, setStatus] = useState<PageStatus>(page.status)
  const [editorKey, setEditorKey] = useState(0)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [content, setContent] = useState<RichTextEditorValue>({
    json: page.content_json,
    html: page.content_html ?? '',
    text: page.content_text ?? '',
  })
  const currentFavorite = favorites.find((favorite) => favorite.name === 'page' && favorite.page_id === page.id)

  useEffect(() => {
    if (!organisationId || !user) return

    recordRecentVisit.mutate({
      organisationId,
      profileId: user.id,
      kind: 'page',
      projectId: page.project_id,
      pageId: page.id,
      title: page.title,
      description: page.content_text,
      status: page.status,
      route: `/pages/${page.id}`,
      identifier: page.project?.identifier ?? 'ORG',
    })
  }, [organisationId, page, recordRecentVisit, user])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) return

    try {
      await updatePage.mutateAsync({
        id: page.id,
        organisation_id: organisationId,
        project_id: projectId || null,
        title,
        slug,
        status,
        content_json: content.json,
        content_html: content.html,
        content_text: content.text,
      })
      toast.success('Page updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update page')
    }
  }

  const handleToggleFavorite = async () => {
    if (!organisationId || !user) return

    try {
      if (currentFavorite) {
        await removeFavorite.mutateAsync({ organisationId, favoriteId: currentFavorite.id })
        toast.success('Removed favorite')
      } else {
        await addFavorite.mutateAsync({
          organisationId,
          profileId: user.id,
          kind: 'page',
          projectId: page.project_id,
          pageId: page.id,
          title: page.title,
          description: page.content_text,
          status: page.status,
          route: `/pages/${page.id}`,
          identifier: page.project?.identifier ?? 'ORG',
        })
        toast.success('Added favorite')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update favorite')
    }
  }

  const selectedVersion = versions.find((version) => version.id === selectedVersionId) ?? versions[0] ?? null

  const handleRestore = async (version: PageVersion) => {
    const nextStatus = isPageStatus(version.status) ? version.status : 'draft'

    try {
      await updatePage.mutateAsync({
        id: page.id,
        organisation_id: organisationId,
        project_id: version.project_id,
        title: version.title ?? page.title,
        slug: version.slug,
        status: nextStatus,
        content_json: version.description_json,
        content_html: version.description_html,
        content_text: version.description_text,
      })
      setProjectId(version.project_id ?? '')
      setTitle(version.title ?? page.title)
      setSlug(version.slug ?? '')
      setStatus(nextStatus)
      setContent({
        json: version.description_json,
        html: version.description_html ?? '',
        text: version.description_text ?? '',
      })
      setEditorKey((current) => current + 1)
      toast.success('Page version restored')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore page version')
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Link to="/pages" className="inline-flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
            <ArrowLeft className="h-4 w-4" />
            Pages
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{page.project?.identifier ?? 'ORG'}</Badge>
            <Badge variant={statusTone[status]}>{status}</Badge>
          </div>
        </div>
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
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
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
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Slug</span>
            <Input value={slug} onChange={(event) => setSlug(event.target.value)} />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-medium">Content</span>
            <RichTextEditor key={editorKey} value={content.json} placeholder="Write the page content..." onChange={setContent} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={updatePage.isPending}>Save page</Button>
          </div>
        </form>

        <aside className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <h2 className="text-sm font-semibold">History</h2>
            </div>
            <Badge variant="neutral">{versions.length}</Badge>
          </div>

          {versionsLoading ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Loading versions...</p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No saved versions yet.</p>
          ) : (
            <>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {versions.map((version, index) => (
                  <button
                    key={version.id}
                    type="button"
                    className="grid w-full gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-left hover:border-[var(--color-border-hover)] data-[active=true]:border-[var(--color-primary)]"
                    data-active={selectedVersion?.id === version.id}
                    onClick={() => setSelectedVersionId(version.id)}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">Version {versions.length - index}</span>
                      <Badge variant={isPageStatus(version.status) ? statusTone[version.status] : 'neutral'}>
                        {version.status ?? 'draft'}
                      </Badge>
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">{formatDateTime(version.created_at)}</span>
                    <span className="line-clamp-1 text-xs text-[var(--color-muted-foreground)]">{version.title}</span>
                  </button>
                ))}
              </div>

              {selectedVersion ? (
                <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
                  <div>
                    <p className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">Preview</p>
                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold">{selectedVersion.title}</h3>
                  </div>
                  <RichTextEditor value={selectedVersion.description_json} readOnly />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleRestore(selectedVersion)}
                    loading={updatePage.isPending}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restore
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </aside>
      </div>
    </>
  )
}

export const PageDetailPage = () => {
  const { pageId } = useParams()
  const { organisationId } = useOrganisation()
  const { data: page, isLoading } = usePage(organisationId, pageId ?? null)

  if (!isLoading && !page) {
    return (
      <OpenKbPageShell>
        <EmptyState title="Page not found" description="The page was deleted or is outside your Open-KB access." />
      </OpenKbPageShell>
    )
  }

  return (
    <OpenKbPageShell isLoading={isLoading}>
      {page && organisationId ? (
        <PageDetailContent key={page.id} page={page} organisationId={organisationId} />
      ) : null}
    </OpenKbPageShell>
  )
}
