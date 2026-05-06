import { useMemo } from 'react'
import { Button, Card } from '@repo/ui'
import { useLabelPrintJobs } from '../../hooks/queries/useLabelStudio'
import { downloadLabelPdf } from './downloadLabelPdf'

const formatRequestedBy = (job: {
  requested_by: string | null
  requester: { full_name: string | null; username: string | null } | null
}) => {
  if (job.requester?.full_name) return job.requester.full_name
  if (job.requester?.username) return job.requester.username
  if (job.requested_by) return 'Unknown User'
  return 'System'
}

const formatRelativeDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `Today, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  }
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) {
    return `Yesterday, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + `, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

const buildExportFileName = (job: { id: string; quantity: number; created_at: string }) => {
  return `label-export-${job.id.slice(0, 8)}.pdf`
}

type LabelDownloadsTabProps = {
  companyId: string
  title?: string
  emptyStateMessage?: string
}

export const LabelDownloadsTab = ({
  companyId,
  title = 'Downloads',
  emptyStateMessage = 'No PDF exports yet.',
}: LabelDownloadsTabProps) => {
  const { data: jobs = [], isLoading } = useLabelPrintJobs(companyId)

  const downloads = useMemo(
    () => jobs.filter((job) => job.format === 'pdf' && !!job.output_url),
    [jobs],
  )

  return (
    <Card className="export-downloads-card flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{title}</h3>
      </div>
      {isLoading ? (
        <div className="empty-state">Loading downloads...</div>
      ) : downloads.length === 0 ? (
        <div className="empty-state">{emptyStateMessage}</div>
      ) : (
        <div className="export-downloads-list">
          {downloads.map((job) => (
            <div key={job.id} className="export-download-row">
              <div className="export-download-icon-wrap">
                <span className="export-download-icon">🖨</span>
              </div>
              <div className="export-download-info">
                <div className="export-download-name">{buildExportFileName(job)}</div>
                <div className="text-sm text-[var(--color-muted-foreground)]">
                  {formatRelativeDate(job.created_at)} · {formatRequestedBy(job)} · {job.quantity} items
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="export-download-action"
                aria-label={`Download ${buildExportFileName(job)}`}
                onClick={() => downloadLabelPdf(job.output_url as string, buildExportFileName(job))}
              >
                ⬇
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
