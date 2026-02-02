import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { EmptyState } from '../EmptyState'

type Attachment = {
  name: string
  id: string
  created_at: string
  mimetype: string
  size: number
}

export const ProductAttachmentsTab = ({ productId, companyId }: { productId: string; companyId: string }) => {
  const [files, setFiles] = useState<Attachment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const STORAGE_PATH = `${companyId}/${productId}`

  const loadFiles = async () => {
    setIsLoading(true)
    const { data, error } = await supabase.storage
      .from('product-images')
      .list(STORAGE_PATH)

    if (error) {
      console.error('Error listing files', error)
      setFiles([])
    } else {
      const fileList = data.map((f) => ({
        name: f.name,
        id: f.id,
        created_at: f.created_at,
        mimetype: f.metadata?.mimetype ?? 'application/octet-stream',
        size: f.metadata?.size ?? 0,
      }))
      setFiles(fileList)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadFiles()
  }, [productId, companyId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const { error } = await supabase.storage
      .from('product-images')
      .upload(`${STORAGE_PATH}/${file.name}`, file, {
        upsert: true,
      })

    setUploading(false)
    if (error) {
      alert(`Upload failed: ${error.message}`)
    } else {
      loadFiles()
    }
  }

  const handleDownload = async (filename: string) => {
    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(`${STORAGE_PATH}/${filename}`)

    if (data) window.open(data.publicUrl, '_blank')
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
            {files.map((f) => (
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
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#475569',
                      }}
                    >
                      {f.name.split('.').pop()?.toUpperCase().slice(0, 3)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{f.name}</div>
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
