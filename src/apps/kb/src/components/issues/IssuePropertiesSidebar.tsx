import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { Badge, Button, Input, Select } from '@repo/ui'
import { AtSign, Bell, Download, Paperclip, Plus, ThumbsUp, Trash2, X } from 'lucide-react'
import type {
  Cycle,
  CycleIssueLink,
  EstimatePoint,
  Issue,
  IssueAssignee,
  IssueAttachment,
  IssueLabel,
  IssueLabelLink,
  IssueMention,
  IssueSubscriber,
  IssueVote,
  ModuleIssueLink,
  OpenKbTeam,
  OrganisationMemberProfile,
  ProjectModule,
} from '../../types'
import { formatFileSize } from '../../lib/fileFormatting'
import { formatLongDate } from '../../lib/dateFormatting'
import { formatProfileName } from '../../lib/profileFormatting'

export const IssuePropertiesSidebar = ({
  issue,
  subscribers,
  attachments,
  attachmentsLoading,
  estimatePoints,
  estimatePointId,
  teams,
  teamId,
  cycleLinks,
  moduleLinks,
  assignees,
  mentions,
  labelLinks,
  availableCycles,
  availableModules,
  availableAssignees,
  availableMentions,
  availableLabels,
  selectedCycleId,
  selectedModuleId,
  selectedAssigneeId,
  selectedMentionId,
  selectedLabelId,
  newLabelColor,
  newLabelName,
  fileInputKey,
  selectedFile,
  currentSubscriber,
  currentVote,
  votes,
  watchPending,
  votePending,
  uploadPending,
  removeAttachmentPending,
  createLabelPending,
  addLabelPending,
  currentProfileId,
  onToggleSubscribe,
  onToggleVote,
  onEstimatePointIdChange,
  onTeamIdChange,
  onAttachmentFile,
  onUploadAttachment,
  onRemoveAttachment,
  onSelectedCycleIdChange,
  onSelectedModuleIdChange,
  onSelectedAssigneeIdChange,
  onSelectedMentionIdChange,
  onSelectedLabelIdChange,
  onNewLabelColorChange,
  onNewLabelNameChange,
  onAddCycle,
  onRemoveCycle,
  onAddModule,
  onRemoveModule,
  onAddAssignee,
  onRemoveAssignee,
  onAddMention,
  onRemoveMention,
  onAddLabel,
  onCreateLabel,
  onRemoveLabel,
}: {
  issue: Issue
  subscribers: IssueSubscriber[]
  attachments: IssueAttachment[]
  attachmentsLoading: boolean
  estimatePoints: EstimatePoint[]
  estimatePointId: string
  teams: OpenKbTeam[]
  teamId: string
  cycleLinks: CycleIssueLink[]
  moduleLinks: ModuleIssueLink[]
  assignees: IssueAssignee[]
  mentions: IssueMention[]
  labelLinks: IssueLabelLink[]
  availableCycles: Cycle[]
  availableModules: ProjectModule[]
  availableAssignees: OrganisationMemberProfile[]
  availableMentions: OrganisationMemberProfile[]
  availableLabels: IssueLabel[]
  selectedCycleId: string
  selectedModuleId: string
  selectedAssigneeId: string
  selectedMentionId: string
  selectedLabelId: string
  newLabelColor: string
  newLabelName: string
  fileInputKey: number
  selectedFile: File | null
  currentSubscriber: IssueSubscriber | undefined
  currentVote: IssueVote | undefined
  votes: IssueVote[]
  watchPending: boolean
  votePending: boolean
  uploadPending: boolean
  removeAttachmentPending: boolean
  createLabelPending: boolean
  addLabelPending: boolean
  currentProfileId: string | null
  onToggleSubscribe: () => void
  onToggleVote: () => void
  onEstimatePointIdChange: (value: string) => void
  onTeamIdChange: (value: string) => void
  onAttachmentFile: (event: ChangeEvent<HTMLInputElement>) => void
  onUploadAttachment: (event: FormEvent<HTMLFormElement>) => void
  onRemoveAttachment: (attachmentId: string, storagePath?: string | null) => void
  onSelectedCycleIdChange: (value: string) => void
  onSelectedModuleIdChange: (value: string) => void
  onSelectedAssigneeIdChange: (value: string) => void
  onSelectedMentionIdChange: (value: string) => void
  onSelectedLabelIdChange: (value: string) => void
  onNewLabelColorChange: (value: string) => void
  onNewLabelNameChange: (value: string) => void
  onAddCycle: () => void
  onRemoveCycle: (linkId: string) => void
  onAddModule: () => void
  onRemoveModule: (linkId: string) => void
  onAddAssignee: () => void
  onRemoveAssignee: (assigneeId: string) => void
  onAddMention: () => void
  onRemoveMention: (mentionId: string) => void
  onAddLabel: () => void
  onCreateLabel: (event: FormEvent<HTMLFormElement>) => void
  onRemoveLabel: (linkId: string) => void
}) => (
  <aside className="space-y-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
    <div className="grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant={currentSubscriber ? 'primary' : 'outline'}
        onClick={onToggleSubscribe}
        loading={watchPending}
        disabled={!currentProfileId}
      >
        <Bell className="h-4 w-4" />
        {currentSubscriber ? 'Watching' : 'Watch'}
      </Button>
      <Button
        type="button"
        variant={currentVote ? 'primary' : 'outline'}
        onClick={onToggleVote}
        loading={votePending}
        disabled={!currentProfileId}
      >
        <ThumbsUp className="h-4 w-4" />
        {votes.length}
      </Button>
    </div>
    <div>
      <p className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">Project</p>
      <p className="mt-1 font-medium">{issue.project?.name ?? 'Unknown project'}</p>
    </div>
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">Team</p>
      <Select
        className="border border-[var(--color-border)] bg-[var(--color-background)]"
        value={teamId}
        onChange={(event) => onTeamIdChange(event.target.value)}
        options={[
          { value: '', label: 'No team' },
          ...teams.map((team) => ({ value: team.id, label: team.name })),
        ]}
      />
    </div>
    <div>
      <p className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">Created</p>
      <p className="mt-1">{formatLongDate(issue.created_at)}</p>
    </div>
    <div>
      <p className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">Target date</p>
      <p className="mt-1">{formatLongDate(issue.target_date)}</p>
    </div>
    <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">Subscribers</p>
        <Badge variant="neutral">{subscribers.length}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {subscribers.length === 0 ? (
          <span className="text-xs text-[var(--color-muted-foreground)]">None</span>
        ) : subscribers.map((subscriber) => (
          <span key={subscriber.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--color-muted)] px-2 py-1 text-xs">
            <span className="truncate">{formatProfileName(subscriber.profile)}</span>
          </span>
        ))}
      </div>
    </div>
    <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">Attachments</p>
        <Badge variant="neutral">{attachments.length}</Badge>
      </div>
      <form onSubmit={onUploadAttachment} className="space-y-2">
        <Input
          key={fileInputKey}
          type="file"
          aria-label="Issue attachment"
          className="border border-[var(--color-border)] bg-[var(--color-background)] text-xs"
          onChange={onAttachmentFile}
        />
        <Button type="submit" variant="outline" className="w-full" disabled={!selectedFile} loading={uploadPending}>
          <Paperclip className="h-4 w-4" />
          Upload
        </Button>
      </form>
      {attachmentsLoading ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">Loading attachments...</p>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">None</p>
      ) : (
        <div className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-2">
              <div className="min-w-0">
                <div className="truncate text-xs font-medium">{attachment.name ?? attachment.metadata.file_name}</div>
                <div className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">
                  {formatFileSize(attachment.metadata.size)}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {attachment.signed_url ? (
                  <a
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                    href={attachment.signed_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Download attachment"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                ) : null}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Remove attachment"
                  onClick={() => onRemoveAttachment(attachment.id, attachment.metadata.storage_path)}
                  disabled={removeAttachmentPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
      <p className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">Estimate</p>
      <Select
        className="border border-[var(--color-border)] bg-[var(--color-background)]"
        value={estimatePointId}
        onChange={(event) => onEstimatePointIdChange(event.target.value)}
        options={[
          { value: '', label: 'No estimate' },
          ...estimatePoints.map((point) => ({
            value: point.id,
            label: `${point.estimate?.name ?? 'Estimate'} · ${point.name ?? point.value}`,
          })),
        ]}
      />
    </div>
    <SidebarLinkGroup
      title="Cycles"
      emptyLabel="None"
      selectedId={selectedCycleId}
      addLabel={availableCycles.length === 0 ? 'No cycles' : 'Add cycle'}
      items={cycleLinks.map((link) => ({ id: link.id, label: link.cycle?.name ?? 'Unknown cycle' }))}
      options={availableCycles.map((cycle) => ({ value: cycle.id, label: cycle.name }))}
      onSelectedIdChange={onSelectedCycleIdChange}
      onAdd={onAddCycle}
      onRemove={onRemoveCycle}
    />
    <SidebarLinkGroup
      title="Modules"
      emptyLabel="None"
      selectedId={selectedModuleId}
      addLabel={availableModules.length === 0 ? 'No modules' : 'Add module'}
      items={moduleLinks.map((link) => ({ id: link.id, label: link.module?.name ?? 'Unknown module' }))}
      options={availableModules.map((projectModule) => ({ value: projectModule.id, label: projectModule.name }))}
      onSelectedIdChange={onSelectedModuleIdChange}
      onAdd={onAddModule}
      onRemove={onRemoveModule}
    />
    <SidebarLinkGroup
      title="Assignees"
      emptyLabel="None"
      selectedId={selectedAssigneeId}
      addLabel={availableAssignees.length === 0 ? 'No members' : 'Add assignee'}
      items={assignees.map((assignee) => ({ id: assignee.id, label: formatProfileName(assignee.profile) }))}
      options={availableAssignees.map((member) => ({
        value: member.profile_id,
        label: formatProfileName(member.profile),
      }))}
      onSelectedIdChange={onSelectedAssigneeIdChange}
      onAdd={onAddAssignee}
      onRemove={onRemoveAssignee}
    />
    <SidebarLinkGroup
      title="Mentions"
      emptyLabel="None"
      selectedId={selectedMentionId}
      addLabel={availableMentions.length === 0 ? 'No members' : 'Mention teammate'}
      icon={<AtSign className="h-3 w-3" />}
      items={mentions.map((mention) => ({ id: mention.id, label: formatProfileName(mention.profile) }))}
      options={availableMentions.map((member) => ({
        value: member.profile_id,
        label: formatProfileName(member.profile),
      }))}
      onSelectedIdChange={onSelectedMentionIdChange}
      onAdd={onAddMention}
      onRemove={onRemoveMention}
    />
    <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
      <p className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">Labels</p>
      <div className="flex flex-wrap gap-2">
        {labelLinks.length === 0 ? (
          <span className="text-xs text-[var(--color-muted-foreground)]">None</span>
        ) : labelLinks.map((link) => (
          <span key={link.id} className="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-1 text-xs" style={{ backgroundColor: `${link.label?.color ?? '#64748b'}22` }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: link.label?.color ?? '#64748b' }} />
            <span className="truncate">{link.label?.name ?? 'Unknown label'}</span>
            <button type="button" aria-label="Remove label" onClick={() => onRemoveLabel(link.id)}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Select
          className="border border-[var(--color-border)] bg-[var(--color-background)]"
          value={selectedLabelId}
          onChange={(event) => onSelectedLabelIdChange(event.target.value)}
          placeholder={availableLabels.length === 0 ? 'No labels' : 'Add label'}
          options={availableLabels.map((label) => ({ value: label.id, label: label.name }))}
        />
        <Button type="button" size="icon" variant="outline" aria-label="Add label" onClick={onAddLabel} disabled={!selectedLabelId}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <form onSubmit={onCreateLabel} className="grid grid-cols-[2rem_minmax(0,1fr)_2.25rem] gap-2">
        <Input
          aria-label="Label color"
          type="color"
          value={newLabelColor}
          onChange={(event) => onNewLabelColorChange(event.target.value)}
          className="h-9 p-1"
        />
        <Input
          aria-label="New label name"
          value={newLabelName}
          onChange={(event) => onNewLabelNameChange(event.target.value)}
          placeholder="New label"
        />
        <Button type="submit" size="icon" variant="outline" aria-label="Create label" loading={createLabelPending || addLabelPending}>
          <Plus className="h-4 w-4" />
        </Button>
      </form>
    </div>
  </aside>
)

const SidebarLinkGroup = ({
  title,
  emptyLabel,
  selectedId,
  addLabel,
  icon,
  items,
  options,
  onSelectedIdChange,
  onAdd,
  onRemove,
}: {
  title: string
  emptyLabel: string
  selectedId: string
  addLabel: string
  icon?: ReactNode
  items: Array<{ id: string; label: string }>
  options: Array<{ value: string; label: string }>
  onSelectedIdChange: (value: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
}) => (
  <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
    <p className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">{title}</p>
    <div className="flex flex-wrap gap-2">
      {items.length === 0 ? (
        <span className="text-xs text-[var(--color-muted-foreground)]">{emptyLabel}</span>
      ) : items.map((item) => (
        <span key={item.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--color-muted)] px-2 py-1 text-xs">
          {icon}
          <span className="truncate">{item.label}</span>
          <button type="button" aria-label={`Remove ${title.toLowerCase()}`} onClick={() => onRemove(item.id)}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
    <div className="flex gap-2">
      <Select
        className="border border-[var(--color-border)] bg-[var(--color-background)]"
        value={selectedId}
        onChange={(event) => onSelectedIdChange(event.target.value)}
        placeholder={addLabel}
        options={options}
      />
      <Button type="button" size="icon" variant="outline" aria-label={addLabel} onClick={onAdd} disabled={!selectedId}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  </div>
)
