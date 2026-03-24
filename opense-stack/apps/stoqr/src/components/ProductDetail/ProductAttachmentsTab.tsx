import { useState } from 'react'
import { EmptyState } from '../EmptyState'
import {
  getProductAttachmentPublicUrl,
  type ProductAttachment,
} from '../../api/productDetail'
import {
  useProductAttachments,
  useUploadProductAttachment,
} from '../../hooks/queries/useProductDetailTabs'

export const ProductAttachmentsTab = ({ productId, companyId }: { productId: string; companyId: string }) => {
  const [uploading, setUploading] = useState(false)
  const { data: files = [], isLoading } = useProductAttachments(companyId, productId)
  const uploadMutation = useUploadProductAttachment(companyId, productId)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      await uploadMutation.mutateAsync(file)
    } catch (error) {
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (filename: string) => {
    const publicUrl = getProductAttachmentPublicUrl(companyId, productId, filename)
    if (publicUrl) window.open(publicUrl, '_blank')
  }

  return (
    <div className="stack">
      <div className="card stack">
        <div className="flex-between">
          <div>
            <h3 className="section-title">Files & Compliance</h3>
            <p className="muted small">SDS, Manuals, Warranty Info, etc.</p>
          </div>
          <label className={`button small ${uploading ? 'secondary' : ''}`}>
            {uploading ? 'Uploading...' : 'Upload File'}
            <input type="file" hidden onChange={handleUpload} accept=".pdf,.doc,.docx,.xls,.xlsx" />
          </label>
        </div>

        {isLoading ? (
          <div className="empty-state">Loading files...</div>
        ) : files.length === 0 ? (
          <EmptyState title="No attachments" description="Upload PDFs or documents for this product." />
        ) : (
          <div className="list">
            {files.map((f: ProductAttachment) => (
              <div key={f.id} className="card" style={{ boxShadow: 'none', background: '#f8fafc', padding: 12 }}>
                <div className="flex-between">
                  <div className="row">
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        background: '#cbd5e1',
                        borderRadius: 6,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 'var(--type-size-2xs)',
                        fontWeight: 'var(--type-weight-bold)',
                        color: '#475569',
                      }}
                    >
                      {f.name.split('.').pop()?.toUpperCase().slice(0, 3)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)' }}>{f.name}</div>
                      <div className="small muted">
                        {(f.size / 1024).toFixed(1)} KB &middot; {new Date(f.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <button className="button ghost small" onClick={() => handleDownload(f.name)}>
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
