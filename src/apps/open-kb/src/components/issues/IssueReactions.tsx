import type { CommentReaction, IssueReaction } from '../../types'

const reactionOptions = ['👍', '❤️', '🎉', '👀', '🚀']

type ReactionRecord = IssueReaction | CommentReaction

const groupReactions = (reactions: ReactionRecord[]) =>
  reactions.reduce<Record<string, ReactionRecord[]>>((acc, reaction) => {
    if (!reaction.name) return acc
    acc[reaction.name] = [...(acc[reaction.name] ?? []), reaction]
    return acc
  }, {})

export const ReactionBar = ({
  reactions,
  currentProfileId,
  disabled,
  pending,
  onToggle,
}: {
  reactions: ReactionRecord[]
  currentProfileId: string | null
  disabled?: boolean
  pending?: boolean
  onToggle: (name: string, existingReactionId: string | null) => void
}) => {
  const grouped = groupReactions(reactions)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {reactionOptions.map((name) => {
        const entries = grouped[name] ?? []
        const mine = entries.find((reaction) => reaction.profile_id === currentProfileId)
        const active = Boolean(mine)
        return (
          <button
            key={name}
            type="button"
            className={[
              'inline-flex h-8 min-w-10 items-center justify-center gap-1 rounded-[var(--radius-md)] border px-2 text-sm',
              active
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                : 'border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-border-hover)]',
              disabled || pending ? 'cursor-not-allowed opacity-60' : '',
            ].join(' ')}
            disabled={disabled || pending}
            aria-pressed={active}
            aria-label={`${active ? 'Remove' : 'Add'} ${name} reaction`}
            onClick={() => onToggle(name, mine?.id ?? null)}
          >
            <span>{name}</span>
            {entries.length > 0 ? <span className="text-xs">{entries.length}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
