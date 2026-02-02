import { useMemo, useState } from 'react'
import { EmptyState } from '../EmptyState'
import { toast } from 'sonner'

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
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [aisleRange, setAisleRange] = useState('1-5')
  const [shelfRange, setShelfRange] = useState('A-D')

  const parseRange = (value: string) => {
    const trimmed = value.replace(/\s/g, '').trim()
    if (!trimmed.includes('-')) return [trimmed]

    const [startRaw, endRaw] = trimmed.split('-').map((v) => v.trim())
    const isNumeric = !isNaN(Number(startRaw)) && !isNaN(Number(endRaw))

    if (isNumeric) {
      const start = Number(startRaw)
      const end = Number(endRaw)
      const step = start <= end ? 1 : -1
      const result = [] as string[]
      for (let i = start; step > 0 ? i <= end : i >= end; i += step) result.push(String(i))
      return result
    }

    const startChar = startRaw.toUpperCase().charCodeAt(0)
    const endChar = endRaw.toUpperCase().charCodeAt(0)
    const step = startChar <= endChar ? 1 : -1
    const result = [] as string[]
    for (let c = startChar; step > 0 ? c <= endChar : c >= endChar; c += step) {
      result.push(String.fromCharCode(c))
    }
    return result
  }

  const bulkPreview = useMemo(() => {
    if (mode !== 'bulk') return []
    const aisles = parseRange(aisleRange)
    const shelves = parseRange(shelfRange)
    return aisles.flatMap((a) => shelves.map((s) => `${a}-${s}`))
  }, [mode, aisleRange, shelfRange])

  const handleAdd = () => {
    if (mode === 'single') {
      const codeComponents = [zone, aisle, shelf, bin].filter(Boolean)
      const code = `LOC-${codeComponents.join('-')}`
      const label = `Zone ${zone}, Aisle ${aisle}, Shelf ${shelf}${bin ? `, Bin ${bin}` : ''}`

      const newLocation: LocationLabel = {
        id: Math.random().toString(36).substring(7),
        code: code.toUpperCase(),
        label,
      }

      setLocations((prev) => [...prev, newLocation])
      toast.success('Labels added to the queue')
      return
    }

    const aisles = parseRange(aisleRange)
    const shelves = parseRange(shelfRange)
    const additions: LocationLabel[] = []

    aisles.forEach((a) => {
      shelves.forEach((s) => {
        const codeComponents = [zone, a, s, bin].filter(Boolean)
        const code = `LOC-${codeComponents.join('-')}`
        const label = `Zone ${zone}, Aisle ${a}, Shelf ${s}${bin ? `, Bin ${bin}` : ''}`
        additions.push({
          id: Math.random().toString(36).substring(7),
          code: code.toUpperCase(),
          label,
        })
      })
    })

    setLocations((prev) => [...prev, ...additions])
    toast.success(`Added ${additions.length} labels to the queue`)
  }

  const handleClear = () => setLocations([])

  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Generate Locations</h3>
        <p className="muted small">Create barcodes for shelves and bins.</p>

        <div className="row">
          <button
            className={`button ghost small ${mode === 'single' ? 'active' : ''}`}
            type="button"
            onClick={() => setMode('single')}
          >
            Single
          </button>
          <button
            className={`button ghost small ${mode === 'bulk' ? 'active' : ''}`}
            type="button"
            onClick={() => setMode('bulk')}
          >
            Bulk
          </button>
        </div>

        <div className="grid grid-2">
          <label className="stack">
            Zone
            <input className="input" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="e.g A" />
          </label>
          {mode === 'single' ? (
            <>
              <label className="stack">
                Aisle
                <input className="input" value={aisle} onChange={(e) => setAisle(e.target.value)} placeholder="e.g 1" />
              </label>
              <label className="stack">
                Shelf
                <input className="input" value={shelf} onChange={(e) => setShelf(e.target.value)} placeholder="e.g B" />
              </label>
            </>
          ) : (
            <>
              <label className="stack">
                Aisle Range
                <input className="input" value={aisleRange} onChange={(e) => setAisleRange(e.target.value)} placeholder="e.g 1-5" />
              </label>
              <label className="stack">
                Shelf Range
                <input className="input" value={shelfRange} onChange={(e) => setShelfRange(e.target.value)} placeholder="e.g A-D" />
              </label>
            </>
          )}
          <label className="stack">
            Bin (Optional)
            <input className="input" value={bin} onChange={(e) => setBin(e.target.value)} placeholder="e.g 01" />
          </label>
        </div>

        {mode === 'bulk' && (
          <div className="pill" style={{ alignSelf: 'flex-start' }}>
            {bulkPreview.length} labels will be generated
          </div>
        )}

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
              <div key={loc.id} className="label-card queue-item" style={{ borderColor: '#94a3b8', borderStyle: 'solid', borderWidth: 2 }}>
                <button
                  type="button"
                  className="hover-remove kebab-button"
                  onClick={() => setLocations((prev) => prev.filter((item) => item.id !== loc.id))}
                  aria-label="Remove label"
                >
                  🗑️
                </button>
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
