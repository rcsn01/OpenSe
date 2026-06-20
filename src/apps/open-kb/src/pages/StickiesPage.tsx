import { useState } from 'react'
import type { FormEvent } from 'react'
import { Badge, Button, EmptyState, Input, Select } from '@repo/ui'
import { Pencil, Plus, Save, StickyNote, Trash2, X } from 'lucide-react'
import { useAuth } from '@repo/shared/auth/context'
import { toast } from 'sonner'
import { RichTextEditor, type RichTextEditorValue } from '../components/editor'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { useOrganisation } from '../contexts/OrganisationContext'
import { useMyPermissions } from '../hooks/queries/usePermissions'
import { useProjects } from '../hooks/queries/useProjects'
import {
  useCreateSticky,
  useDeleteSticky,
  useStickies,
  useUpdateSticky,
} from '../hooks/queries/useStickies'
import type { OpenKbSticky } from '../types'

const formatDateTime = (value: string | null) => {
  if (!value) return 'Unknown'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

const StickyEditor = ({
  sticky,
  onCancel,
}: {
  sticky: OpenKbSticky
  onCancel: () => void
}) => {
  const updateSticky = useUpdateSticky()
  const [title, setTitle] = useState(sticky.title ?? '')
  const [content, setContent] = useState<RichTextEditorValue>({
    json: sticky.description_json,
    html: sticky.description_html ?? '',
    text: sticky.description_text ?? '',
  })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !content.text.trim()) return

    try {
      await updateSticky.mutateAsync({
        id: sticky.id,
        organisation_id: sticky.organisation_id,
        title,
        description_json: content.json,
        description_html: content.html,
        description_text: content.text,
      })
      toast.success('Sticky updated')
      onCancel()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update sticky')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
      <RichTextEditor value={sticky.description_json} onChange={setContent} placeholder="Write a sticky note..." />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" loading={updateSticky.isPending}>
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>
    </form>
  )
}

export const StickiesPage = () => {
  const { user } = useAuth()
  const { organisationId } = useOrganisation()
  const { data: permissions = [] } = useMyPermissions(organisationId)
  const { data: projects = [], isLoading: projectsLoading } = useProjects(organisationId)
  const [projectId, setProjectId] = useState('')
  const { data: stickies = [], isLoading: stickiesLoading } = useStickies(organisationId, user?.id ?? null, projectId || null)
  const createSticky = useCreateSticky()
  const deleteSticky = useDeleteSticky()
  const [title, setTitle] = useState('')
  const [editorKey, setEditorKey] = useState(0)
  const [content, setContent] = useState<RichTextEditorValue | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const canManagePages = permissions.includes('pages.manage')

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!organisationId || !user || !title.trim() || !content?.text.trim()) return

    try {
      await createSticky.mutateAsync({
        organisation_id: organisationId,
        project_id: projectId || null,
        profile_id: user.id,
        title,
        description_json: content.json,
        description_html: content.html,
        description_text: content.text,
      })
      setTitle('')
      setContent(null)
      setEditorKey((current) => current + 1)
      toast.success('Sticky created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create sticky')
    }
  }

  const handleDelete = async (stickyId: string) => {
    if (!organisationId) return

    try {
      await deleteSticky.mutateAsync({ organisationId, stickyId })
      toast.success('Sticky deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete sticky')
    }
  }

  return (
    <OpenKbPageShell isLoading={projectsLoading || stickiesLoading}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Stickies</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Personal quick notes for organisation and project work.</p>
        </div>
        <Badge variant={canManagePages ? 'success' : 'neutral'}>{canManagePages ? 'Can edit' : 'Read only'}</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            <h2 className="text-sm font-semibold">New sticky</h2>
          </div>
          <Select
            aria-label="Sticky project"
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            options={[
              { value: '', label: 'Organisation stickies' },
              ...projects.map((project) => ({ value: project.id, label: `${project.identifier} · ${project.name}` })),
            ]}
          />
          <form onSubmit={handleCreate} className="space-y-3">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Sticky title"
              disabled={!canManagePages}
              required
            />
            <RichTextEditor
              key={editorKey}
              placeholder="Capture a note..."
              onChange={setContent}
              readOnly={!canManagePages}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={!canManagePages || !title.trim() || !content?.text.trim()}
              loading={createSticky.isPending}
            >
              <Plus className="h-4 w-4" />
              Create sticky
            </Button>
          </form>
        </aside>

        {stickies.length === 0 ? (
          <EmptyState title="No stickies yet" description="Create personal notes for quick context and follow-up." />
        ) : (
          <div className="grid content-start gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {stickies.map((sticky) => (
              <article key={sticky.id} className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                {editingId === sticky.id ? (
                  <StickyEditor sticky={sticky} onCancel={() => setEditingId(null)} />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{sticky.project?.identifier ?? 'ORG'}</Badge>
                          <time className="text-xs text-[var(--color-muted-foreground)]" dateTime={sticky.updated_at ?? sticky.created_at}>
                            {formatDateTime(sticky.updated_at ?? sticky.created_at)}
                          </time>
                        </div>
                        <h2 className="mt-3 line-clamp-2 text-base font-semibold">{sticky.title}</h2>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Edit sticky"
                          disabled={!canManagePages}
                          onClick={() => setEditingId(sticky.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Delete sticky"
                          disabled={!canManagePages}
                          loading={deleteSticky.isPending}
                          onClick={() => handleDelete(sticky.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <RichTextEditor value={sticky.description_json} readOnly />
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </OpenKbPageShell>
  )
}
