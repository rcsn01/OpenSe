import { useEffect, useState } from 'react'

export const PutawayTab = ({ scanValue }: { scanValue: string }) => {
  const [scannedItem, setScannedItem] = useState<string | null>(null)

  useEffect(() => {
    if (scanValue) setScannedItem(scanValue)
  }, [scanValue])

  return (
    <div className="grid grid-2">
      <div className="card stack">
        <h3 className="section-title">Receiving & Putaway</h3>
        {!scannedItem ? (
          <div className="empty-state">Scan a received item to get a location suggestion.</div>
        ) : (
          <div className="stack">
            <div className="card" style={{ background: '#f0f9ff', borderColor: '#bae6fd', boxShadow: 'none' }}>
              <div className="small muted">Scanned Item</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{scannedItem}</div>
            </div>
            <div className="card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', textAlign: 'center', padding: 32, boxShadow: 'none' }}>
              <div className="muted" style={{ marginBottom: 8 }}>Suggested Location</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#15803d' }}>Shelf B-04</div>
              <div className="small muted">Zone 2 &middot; Aisle 1</div>
            </div>
            <button className="button" onClick={() => setScannedItem(null)}>Confirm Putaway</button>
          </div>
        )}
      </div>
      <div className="card">
        <h3 className="section-title">Incoming Shipments</h3>
        <div className="list">
          <div className="flex-between">
            <div>PO-9921</div>
            <span className="badge success">Arrived</span>
          </div>
          <div className="flex-between">
            <div>PO-9924</div>
            <span className="badge warning">In Transit</span>
          </div>
          <div className="flex-between">
            <div>PO-9925</div>
            <span className="badge">Ordered</span>
          </div>
        </div>
      </div>
    </div>
  )
}
