import { useEffect, useState } from 'react'

export const PickPackTab = ({ scanValue }: { scanValue: string }) => {
  const [order] = useState({
    id: 'SO-1001',
    customer: 'Acme Corp',
    items: [
      { id: '1', name: 'Widget A', sku: 'WID-A', qty: 5, picked: 0 },
      { id: '2', name: 'Gadget B', sku: 'GAD-B', qty: 2, picked: 0 },
    ],
  })
  const [items, setItems] = useState(order.items)

  useEffect(() => {
    if (scanValue) {
      setItems((prev) =>
        prev.map((item) => {
          if (item.sku === scanValue || item.id === scanValue || scanValue.includes(item.sku)) {
            return { ...item, picked: Math.min(item.qty, item.picked + 1) }
          }
          return item
        }),
      )
    }
  }, [scanValue])

  const progress = (items.reduce((acc, i) => acc + i.picked / i.qty, 0) / items.length) * 100

  return (
    <div className="grid grid-2">
      <div className="card stack">
        <div className="flex-between">
          <h3 className="section-title">Order {order.id}</h3>
          <span className="badge warning">Pending</span>
        </div>
        <div className="small muted">Customer: {order.customer}</div>
        <div style={{ height: 4, background: '#eee', width: '100%', borderRadius: 2 }}>
          <div style={{ height: '100%', background: 'var(--success)', width: `${progress}%`, transition: 'width 0.3s' }} />
        </div>
        <div className="list">
          {items.map((item) => (
            <div key={item.id} className="flex-between" style={{ opacity: item.picked >= item.qty ? 0.5 : 1 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{item.name}</div>
                <div className="small muted">SKU: {item.sku}</div>
              </div>
              <div className="row">
                <span className="pill">{item.picked} / {item.qty}</span>
                {item.picked >= item.qty && <span className="badge success">Done</span>}
              </div>
            </div>
          ))}
        </div>
        {progress === 100 && <button className="button">Complete Order</button>}
      </div>
      <div className="card stack">
        <h3 className="section-title">Instructions</h3>
        <p className="muted">Scan items to verify the pick list. Once all items are scanned, you can complete the order.</p>
        <div className="small muted">Last scan: {scanValue || 'None'}</div>

        <div className="card" style={{ boxShadow: 'none', background: '#f8fafc', marginTop: 'auto' }}>
          <h4 style={{ margin: '0 0 8px' }}>Active Order</h4>
          <select className="select" disabled>
            <option>SO-1001 (Acme Corp)</option>
          </select>
        </div>
      </div>
    </div>
  )
}
