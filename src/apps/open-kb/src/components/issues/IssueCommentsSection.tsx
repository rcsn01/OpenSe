import type { FormEvent } from 'react'
import { Badge, Button } from '@repo/ui'
import { MessageSquare } from 'lucide-react'
import { RichTextEditor, type RichTextEditorValue } from '../editor'
import type { CommentReaction, IssueComment } from '../../types'
import { formatDateTime } from '../../lib/dateFormatting'
import { ReactionBar } from './IssueReactions'

export const IssueCommentsSection = ({
  comments,
  isLoading,
  commentReactions,
  currentProfileId,
  commentEditorKey,
  createPending,
  reactionPending,
  onCommentChange,
  onSubmit,
  onToggleReaction,
}: {
  comments: IssueComment[]
  isLoading: boolean
  commentReactions: CommentReaction[]
  currentProfileId: string | null
  commentEditorKey: number
  createPending: boolean
  reactionPending: boolean
  onCommentChange: (value: RichTextEditorValue) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onToggleReaction: (commentId: string, name: string, existingReactionId: string | null) => void
}) => (
  <section className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
    <div className="flex items-center justify-between gap-3">
      <div className="inline-flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        <h2 className="text-sm font-semibold">Comments</h2>
      </div>
      <Badge variant="neutral">{comments.length}</Badge>
    </div>

    {isLoading ? (
      <p className="text-sm text-[var(--color-muted-foreground)]">Loading comments...</p>
    ) : comments.length === 0 ? (
      <p className="text-sm text-[var(--color-muted-foreground)]">No comments yet.</p>
    ) : (
      <div className="space-y-3">
        {comments.map((item) => (
          <article key={item.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-3">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[var(--color-muted-foreground)]">
              <span>Comment</span>
              <time dateTime={item.created_at}>{formatDateTime(item.created_at)}</time>
            </div>
            <RichTextEditor value={item.description_json} readOnly />
            <div className="mt-3 border-t border-[var(--color-border)] pt-3">
              <ReactionBar
                reactions={commentReactions.filter((reaction) => reaction.comment_id === item.id)}
                currentProfileId={currentProfileId}
                disabled={!currentProfileId}
                pending={reactionPending}
                onToggle={(name, existingReactionId) => onToggleReaction(item.id, name, existingReactionId)}
              />
            </div>
          </article>
        ))}
      </div>
    )}

    <form onSubmit={onSubmit} className="space-y-3 border-t border-[var(--color-border)] pt-4">
      <RichTextEditor key={commentEditorKey} placeholder="Add a comment..." onChange={onCommentChange} />
      <div className="flex justify-end">
        <Button type="submit" loading={createPending}>Add comment</Button>
      </div>
    </form>
  </section>
)
