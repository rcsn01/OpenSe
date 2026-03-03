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
    <div className="grid" style={{ gridTemplateColumns: '360px 1fr', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Manage Locations</h3>

        <label className="stack">
          Location Name
          <input className="input" value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder="e.g. Main Warehouse" />
        </label>
        <label className="stack">
          Location Code
          <input className="input" value={locationCode} onChange={(event) => setLocationCode(event.target.value)} placeholder="e.g. WH-A" />
        </label>
        <label className="stack">
          Location Description
          <input className="input" value={locationDescription} onChange={(event) => setLocationDescription(event.target.value)} placeholder="Optional" />
        </label>
        <button className="button" onClick={createLocation} disabled={createLocationMutation.isPending}>Add Location</button>
        {message && <div className="small muted">{message}</div>}
      </div>

      <div className="card stack">
        <div className="flex-between">
          <h3 className="section-title">Locations</h3>
          <span className="pill">{locations.length}</span>
        </div>
        {isLoading ? (
          <div className="empty-state">Loading locations...</div>
        ) : locations.length === 0 ? (
          <div className="empty-state">No locations yet.</div>
        ) : (
          <div className="list">
            {locations.map((location) => (
              <div key={location.id} className="flex-between">
                <div>
                  <div style={{ fontWeight: 600 }}>{location.name}</div>
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
