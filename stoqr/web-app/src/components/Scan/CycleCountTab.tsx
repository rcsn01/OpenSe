import { useEffect, useState } from 'react'

export const CycleCountTab = ({ scanValue }: { scanValue: string }) => {
  const [mode, setMode] = useState<'scan_item' | 'enter_qty'>('scan_item')
  const [activeItem, setActiveItem] = useState<{ sku: string } | null>(null)
  const [count, setCount] = useState('')

  useEffect(() => {
    if (scanValue && mode === 'scan_item') {
      setActiveItem({ sku: scanValue })
      setMode('enter_qty')
    }
  }, [scanValue, mode])

  const handleSave = () => {
    alert(`Recorded count ${count} for ${activeItem?.sku}. In a real app, this would log a discrepancy report.`)
    setMode('scan_item')
    setActiveItem(null)
    setCount('')
  }

  return (
    <div className="grid grid-2">
      <div className="card stack">
        <h3 className="section-title">Blind Count: Zone A</h3>
        {mode === 'scan_item' ? (
          <div className="empty-state">
            <p>Scan an item on the shelf.</p>
            <div className="muted small">System will not show expected quantity to ensure accuracy.</div>
          </div>
        ) : (
          <div className="stack">
            <div className="flex-between">
              <h4 style={{ margin: 0 }}>Item: {activeItem?.sku}</h4>
              <button className="button ghost small" onClick={() => setMode('scan_item')}>Cancel</button>
            </div>
            <label className="stack">
              Enter Counted Quantity
              <input className="input" type="number" value={count} onChange={(e) => setCount(e.target.value)} autoFocus />
            </label>
            <button className="button" onClick={handleSave}>Submit Count</button>
          </div>
        )}
      </div>
      <div className="card">
        <h3 className="section-title">Session Progress</h3>
        <div className="list">
          <div className="flex-between small"><span className="muted">Items counted</span><span>0</span></div>
          <div className="flex-between small"><span className="muted">Discrepancies</span><span>0</span></div>
        </div>
      </div>
    </div>
  )
}
