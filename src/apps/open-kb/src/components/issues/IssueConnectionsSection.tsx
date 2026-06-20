import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Input, Select } from '@repo/ui'
import { Link2, Plus, X } from 'lucide-react'
import type { Issue, IssueBlocker, IssueExternalLink, IssueLinkType, IssueRelation, IssueRelationType } from '../../types'
import { formatIssueKey } from '../../lib/issueFormatting'

const relationTypeOptions: Array<{ value: IssueRelationType; label: string }> = [
  { value: 'related', label: 'Related' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'blocked_by', label: 'Blocked by' },
  { value: 'blocks', label: 'Blocks' },
]

const linkTypeOptions: Array<{ value: IssueLinkType; label: string }> = [
  { value: 'external', label: 'External' },
  { value: 'repository', label: 'Repository' },
  { value: 'document', label: 'Document' },
  { value: 'support', label: 'Support' },
]

export const IssueConnectionsSection = ({
  blockers,
  relations,
  issueLinks,
  availableBlockerIssues,
  availableRelationIssues,
  selectedBlockerIssueId,
  selectedRelationIssueId,
  relationType,
  linkTitle,
  linkUrl,
  linkType,
  addBlockerPending,
  addRelationPending,
  addLinkPending,
  onSelectedBlockerIssueChange,
  onSelectedRelationIssueChange,
  onRelationTypeChange,
  onLinkTitleChange,
  onLinkUrlChange,
  onLinkTypeChange,
  onAddBlocker,
  onRemoveBlocker,
  onAddRelation,
  onRemoveRelation,
  onAddLink,
  onRemoveLink,
}: {
  blockers: IssueBlocker[]
  relations: IssueRelation[]
  issueLinks: IssueExternalLink[]
  availableBlockerIssues: Issue[]
  availableRelationIssues: Issue[]
  selectedBlockerIssueId: string
  selectedRelationIssueId: string
  relationType: IssueRelationType
  linkTitle: string
  linkUrl: string
  linkType: IssueLinkType
  addBlockerPending: boolean
  addRelationPending: boolean
  addLinkPending: boolean
  onSelectedBlockerIssueChange: (value: string) => void
  onSelectedRelationIssueChange: (value: string) => void
  onRelationTypeChange: (value: IssueRelationType) => void
  onLinkTitleChange: (value: string) => void
  onLinkUrlChange: (value: string) => void
  onLinkTypeChange: (value: IssueLinkType) => void
  onAddBlocker: () => void
  onRemoveBlocker: (blockerId: string) => void
  onAddRelation: () => void
  onRemoveRelation: (relationId: string) => void
  onAddLink: (event: FormEvent<HTMLFormElement>) => void
  onRemoveLink: (linkId: string) => void
}) => (
  <section className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
    <div className="flex items-center justify-between gap-3">
      <div className="inline-flex items-center gap-2">
        <Link2 className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        <h2 className="text-sm font-semibold">Connections</h2>
      </div>
      <Badge variant="neutral">{blockers.length + relations.length + issueLinks.length}</Badge>
    </div>

    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
        <h3 className="text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">Blockers</h3>
        <div className="space-y-2">
          {blockers.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No blockers.</p>
          ) : blockers.map((blocker) => (
            <div key={blocker.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-2">
              <Link to={blocker.blocker_issue ? `/issues/${blocker.blocker_issue.id}` : '#'} className="min-w-0">
                <div className="font-mono text-xs text-[var(--color-muted-foreground)]">{formatIssueKey(blocker.blocker_issue)}</div>
                <div className="truncate text-sm font-medium">{blocker.blocker_issue?.title ?? 'Unknown issue'}</div>
              </Link>
              <Button type="button" size="icon" variant="ghost" aria-label="Remove blocker" onClick={() => onRemoveBlocker(blocker.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Select
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={selectedBlockerIssueId}
            onChange={(event) => onSelectedBlockerIssueChange(event.target.value)}
            placeholder={availableBlockerIssues.length === 0 ? 'No issues' : 'Select issue'}
            options={availableBlockerIssues.map((item) => ({
              value: item.id,
              label: `${formatIssueKey(item)} · ${item.title}`,
            }))}
          />
          <Button type="button" size="icon" variant="outline" aria-label="Add blocker" onClick={onAddBlocker} disabled={!selectedBlockerIssueId} loading={addBlockerPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
        <h3 className="text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">Related issues</h3>
        <div className="space-y-2">
          {relations.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No relations.</p>
          ) : relations.map((relation) => (
            <div key={relation.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-2">
              <Link to={relation.related_issue ? `/issues/${relation.related_issue.id}` : '#'} className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{relation.relation_type.replace('_', ' ')}</Badge>
                  <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{formatIssueKey(relation.related_issue)}</span>
                </div>
                <div className="mt-1 truncate text-sm font-medium">{relation.related_issue?.title ?? 'Unknown issue'}</div>
              </Link>
              <Button type="button" size="icon" variant="ghost" aria-label="Remove relation" onClick={() => onRemoveRelation(relation.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="grid gap-2">
          <Select
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={relationType}
            onChange={(event) => onRelationTypeChange(event.target.value as IssueRelationType)}
            options={relationTypeOptions}
          />
          <div className="flex gap-2">
            <Select
              className="border border-[var(--color-border)] bg-[var(--color-background)]"
              value={selectedRelationIssueId}
              onChange={(event) => onSelectedRelationIssueChange(event.target.value)}
              placeholder={availableRelationIssues.length === 0 ? 'No issues' : 'Select issue'}
              options={availableRelationIssues.map((item) => ({
                value: item.id,
                label: `${formatIssueKey(item)} · ${item.title}`,
              }))}
            />
            <Button type="button" size="icon" variant="outline" aria-label="Add relation" onClick={onAddRelation} disabled={!selectedRelationIssueId} loading={addRelationPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
        <h3 className="text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">External links</h3>
        <div className="space-y-2">
          {issueLinks.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No links.</p>
          ) : issueLinks.map((link) => (
            <div key={link.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-2">
              <a href={link.url ?? '#'} target="_blank" rel="noreferrer" className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{link.link_type}</Badge>
                  <span className="truncate text-sm font-medium">{link.title ?? link.url}</span>
                </div>
                <div className="mt-1 truncate text-xs text-[var(--color-muted-foreground)]">{link.url}</div>
              </a>
              <Button type="button" size="icon" variant="ghost" aria-label="Remove link" onClick={() => onRemoveLink(link.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <form onSubmit={onAddLink} className="grid gap-2">
          <Input value={linkTitle} onChange={(event) => onLinkTitleChange(event.target.value)} placeholder="Title" aria-label="Link title" />
          <Input value={linkUrl} onChange={(event) => onLinkUrlChange(event.target.value)} placeholder="https://example.com" aria-label="Link URL" />
          <div className="flex gap-2">
            <Select
              className="border border-[var(--color-border)] bg-[var(--color-background)]"
              value={linkType}
              onChange={(event) => onLinkTypeChange(event.target.value as IssueLinkType)}
              options={linkTypeOptions}
            />
            <Button type="submit" size="icon" variant="outline" aria-label="Add link" disabled={!linkUrl.trim()} loading={addLinkPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  </section>
)
