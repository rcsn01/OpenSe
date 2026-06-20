import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, EmptyState } from '@repo/ui'
import { FilePenLine, Plus, Send, Trash2 } from 'lucide-react'
import { useAuth } from '@repo/shared/auth/context'
import { toast } from 'sonner'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { useOrganisation } from '../contexts/OrganisationContext'
import { useDeleteDraftIssue, useDraftIssues, usePublishDraftIssue } from '../hooks/queries/useDrafts'
import type { DraftIssue } from '../types'

const formatDateTime = (value: string | null) => {
  if (!value) return 'Unknown'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

const DraftCard = ({
  draft,
  onPublish,
  onDelete,
  publishing,
  deleting,
}: {
  draft: DraftIssue
  onPublish: (draftId: string) => void
  onDelete: (draftId: string) => void
  publishing: boolean
  deleting: boolean
}) => (
  <article className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{draft.project?.identifier ?? 'Project'}</Badge>
          <Badge variant="neutral">{draft.payload.priority ?? 'none'}</Badge>
          <time className="text-xs text-[var(--color-muted-foreground)]" dateTime={draft.updated_at ?? draft.created_at}>
            {formatDateTime(draft.updated_at ?? draft.created_at)}
          </time>
        </div>
        <h2 className="mt-3 line-clamp-2 text-base font-semibold">{draft.title ?? 'Untitled draft'}</h2>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm text-[var(--color-muted-foreground)]">
          {draft.description_text || 'No description yet.'}
        </p>
      </div>
      <FilePenLine className="h-5 w-5 shrink-0 text-[var(--color-muted-foreground)]" />
    </div>
    <div className="mt-4 flex flex-wrap justify-end gap-2">
      <Button type="button" variant="ghost" onClick={() => onDelete(draft.id)} loading={deleting}>
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
      <Button type="button" variant="outline" onClick={() => onPublish(draft.id)} loading={publishing}>
        <Send className="h-4 w-4" />
        Publish
      </Button>
      <Link
        to={`/issues/new?draft=${draft.id}`}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]"
      >
        Resume
      </Link>
    </div>
  </article>
)

export const DraftIssuesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { organisationId } = useOrganisation()
  const { data: drafts = [], isLoading } = useDraftIssues(organisationId, user?.id ?? null)
  const publishDraft = usePublishDraftIssue()
  const deleteDraft = useDeleteDraftIssue()

  const handlePublish = async (draftId: string) => {
    if (!organisationId) return

    try {
      const issue = await publishDraft.mutateAsync({ organisationId, draftId })
      toast.success('Draft published')
      navigate(`/issues/${issue.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish draft')
    }
  }

  const handleDelete = async (draftId: string) => {
    if (!organisationId) return

    try {
      await deleteDraft.mutateAsync({ organisationId, draftId })
      toast.success('Draft deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete draft')
    }
  }

  return (
    <OpenKbPageShell isLoading={isLoading}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Draft issues</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Private issue drafts for work that is not ready to publish.</p>
        </div>
        <Link
          to="/issues/new"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]"
        >
          <Plus className="h-4 w-4" />
          New issue
        </Link>
      </div>

      {drafts.length === 0 ? (
        <EmptyState title="No draft issues" description="Save an issue draft from the new issue form before publishing it." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onPublish={handlePublish}
              onDelete={handleDelete}
              publishing={publishDraft.isPending}
              deleting={deleteDraft.isPending}
            />
          ))}
        </div>
      )}
    </OpenKbPageShell>
  )
}
