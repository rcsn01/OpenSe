import { useRef, useState } from 'react'
import { FileText } from 'lucide-react'
import { EmptyState } from '@repo/ui'
import {
  getProductAttachmentPublicUrl,
  type ProductAttachment,
} from '../../api/productDetail'
import {
  useProductAttachments,
  useUploadProductAttachment,
} from '../../hooks/queries/useProductDetailTabs'
import { bindStyles } from '../../lib/bindStyles'
import styles from './ProductDetailSurface.module.css'

const sx = bindStyles(styles)

export const ProductAttachmentsTab = ({ productId, companyId }: { productId: string; companyId: string }) => {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { data: files = [], isLoading } = useProductAttachments(companyId, productId)
  const uploadMutation = useUploadProductAttachment(companyId, productId)

  const formatFileSize = (size: number) => {
    if (size >= 1024 * 1024) {
      const mb = size / (1024 * 1024)
      return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`
    }

    if (size >= 1024) {
      return `${(size / 1024).toFixed(1)} KB`
    }

    return `${size} B`
  }

  const formatDateLabel = (value: string) => new Date(value).toISOString().slice(0, 10)

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
    <section className={sx('product-tab-shell')} aria-label="Files">
      <div className={sx('product-tab-header')}>
        <div>
          <h3 className={sx('product-tab-title')}>Uploaded Documents</h3>
        </div>
        <button
          type="button"
          className={sx('product-section-link')}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : '+ Upload File'}
        </button>
        <input ref={inputRef} type="file" hidden onChange={handleUpload} accept=".pdf,.doc,.docx,.xls,.xlsx" />
      </div>

      {isLoading ? (
        <div className={sx('product-detail-empty-copy')}>Loading files...</div>
      ) : files.length === 0 ? (
        <EmptyState title="No attachments" description="Upload PDFs or documents for this product." />
      ) : (
        <div className={sx('product-file-list')}>
          {files.map((file: ProductAttachment) => (
            <button
              key={file.id}
              type="button"
              className={sx('product-file-row')}
              onClick={() => handleDownload(file.name)}
            >
              <span className={sx('product-file-icon')} aria-hidden="true">
                <FileText size={18} />
              </span>
              <span className={sx('product-file-copy')}>
                <span className={sx('product-file-name')}>{file.name}</span>
                <span className={sx('product-file-meta')}>{formatFileSize(file.size)} • Added {formatDateLabel(file.created_at)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
