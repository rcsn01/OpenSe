import { useMemo } from 'react'
import { useLabelPrintJobs } from '../../hooks/queries/useLabelStudio'

const formatRequestedBy = (job: {
  requested_by: string | null
  requester: { full_name: string | null; username: string | null } | null
}) => {
  if (job.requester?.full_name) return job.requester.full_name
  if (job.requester?.username) return job.requester.username
  if (job.requested_by) return 'Unknown User'
  return 'System'
}

export const LabelDownloadsTab = ({ companyId }: { companyId: string }) => {
  const { data: jobs = [], isLoading } = useLabelPrintJobs(companyId)

  const downloads = useMemo(
    () => jobs.filter((job) => job.format === 'pdf' && !!job.output_url),
    [jobs],
  )

  const downloadFile = (url: string, fileName: string) => {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  return (
    <div className="card stack">
      <h3 className="section-title">Downloads</h3>
      {isLoading ? (
        <div className="empty-state">Loading downloads...</div>
      ) : downloads.length === 0 ? (
        <div className="empty-state">No PDF exports yet.</div>
      ) : (
        <div className="list">
          {downloads.map((job) => (
            <div key={job.id} className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>PDF Export</div>
                <div className="small muted">
                  Created by {formatRequestedBy(job)} · {new Date(job.created_at).toLocaleString()} · {job.quantity} labels
                </div>
              </div>
              <button
                className="button"
                onClick={() => downloadFile(job.output_url as string, `label-export-${job.id}.pdf`)}
              >
                Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
