import { useState } from 'react'
import { EmptyState } from '../EmptyState'

type LocationLabel = {
  id: string
  code: string
  label: string
}

export const LocationLabelsTab = () => {
  const [locations, setLocations] = useState<LocationLabel[]>([])
  const [zone, setZone] = useState('A')
  const [aisle, setAisle] = useState('1')
  const [shelf, setShelf] = useState('1')
  const [bin, setBin] = useState('')

  const handleAdd = () => {
    const codeComponents = [zone, aisle, shelf, bin].filter(Boolean)
    const code = `LOC-${codeComponents.join('-')}`
    const label = `Zone ${zone}, Aisle ${aisle}, Shelf ${shelf}${bin ? `, Bin ${bin}` : ''}`

    const newLocation: LocationLabel = {
      id: Math.random().toString(36).substring(7),
      code: code.toUpperCase(),
      label,
    }

    setLocations((prev) => [...prev, newLocation])
  }

  const handleClear = () => setLocations([])

  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Generate Locations</h3>
        <p className="muted small">Create barcodes for shelves and bins.</p>

        <div className="grid grid-2">
          <label className="stack">
            Zone
            <input className="input" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="e.g A" />
          </label>
          <label className="stack">
            Aisle
            <input className="input" value={aisle} onChange={(e) => setAisle(e.target.value)} placeholder="e.g 1" />
          </label>
          <label className="stack">
            Shelf
            <input className="input" value={shelf} onChange={(e) => setShelf(e.target.value)} placeholder="e.g B" />
          </label>
          <label className="stack">
            Bin (Optional)
            <input className="input" value={bin} onChange={(e) => setBin(e.target.value)} placeholder="e.g 01" />
          </label>
        </div>

        <button className="button" onClick={handleAdd}>Add to Queue</button>
        <button className="button ghost" onClick={handleClear} disabled={locations.length === 0}>Clear Queue</button>
      </div>

      <div className="card stack">
        <div className="flex-between">
          <h3 className="section-title">Print Queue</h3>
          <div className="muted small">{locations.length} labels</div>
        </div>

        {locations.length === 0 ? (
          <EmptyState title="Queue Empty" description="Add locations to generate shelf labels." />
        ) : (
          <div className="label-grid">
            {locations.map((loc) => (
              <div key={loc.id} className="label-card" style={{ borderColor: '#94a3b8', borderStyle: 'solid', borderWidth: 2 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{loc.code}</div>
                <div className="small muted">{loc.label}</div>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(loc.code)}`}
                  alt="QR"
                />
              </div>
            ))}
          </div>
        )}

        {locations.length > 0 && (
          <button className="button" onClick={() => window.print()}>Print Batch</button>
        )}
      </div>
    </div>
  )
}
