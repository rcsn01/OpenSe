import { useState } from 'react'
import {
  useCreateInventoryLocation,
  useInventoryReferenceData,
} from '../../hooks/queries/useInventory'

type Props = {
  companyId: string | null
}

export const LocationsTab = ({ companyId }: Props) => {
  const { data, isLoading } = useInventoryReferenceData(companyId)
  const createLocationMutation = useCreateInventoryLocation(companyId)

  const [locationName, setLocationName] = useState('')
  const [locationCode, setLocationCode] = useState('')
  const [locationDescription, setLocationDescription] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const locations = data?.locations ?? []

  const createLocation = async () => {
    if (!locationName.trim()) return
    try {
      setMessage(null)
      await createLocationMutation.mutateAsync({
        name: locationName.trim(),
        code: locationCode.trim(),
        description: locationDescription,
      })
      setLocationName('')
      setLocationCode('')
      setLocationDescription('')
      setMessage('Location created.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create location.')
    }
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '340px 1fr', gap: 16 }}>
      <div className="card stack" style={{ gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Add Location</h3>

        <label className="stack" style={{ gap: 4 }}>
          <span className="small muted">Location Name</span>
          <input className="input" style={{ borderRadius: 8 }} value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder="e.g. Main Warehouse" />
        </label>
        <label className="stack" style={{ gap: 4 }}>
          <span className="small muted">Location Code</span>
          <input className="input" style={{ borderRadius: 8 }} value={locationCode} onChange={(event) => setLocationCode(event.target.value)} placeholder="e.g. WH-A" />
        </label>
        <label className="stack" style={{ gap: 4 }}>
          <span className="small muted">Description</span>
          <input className="input" style={{ borderRadius: 8 }} value={locationDescription} onChange={(event) => setLocationDescription(event.target.value)} placeholder="Optional" />
        </label>
        <button className="button small" style={{ alignSelf: 'flex-start', borderRadius: 8 }} onClick={createLocation} disabled={createLocationMutation.isPending}>Add Location</button>
        {message && <div className="small muted" style={{ color: 'var(--success)' }}>{message}</div>}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-info-bar">
          <span style={{ fontWeight: 600 }}>Locations</span>
          <span className="pill">{locations.length}</span>
        </div>
        {isLoading ? (
          <div className="empty-state" style={{ padding: 48 }}>Loading locations...</div>
        ) : locations.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>No locations yet. Add your first location.</div>
        ) : (
          <div>
            {locations.map((location, i) => (
              <div
                key={location.id}
                className="flex-between"
                style={{
                  padding: '12px 16px',
                  borderBottom: i < locations.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{location.name}</div>
                  <div className="small muted">{location.code ?? 'No code'} · {location.description ?? '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
