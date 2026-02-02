import { useState } from 'react'
import { useCompany } from '../../contexts/CompanyContext'
import { EmptyState } from '../EmptyState'

export const ShippingLabelsTab = () => {
  const { companyName } = useCompany()
  const [recipient, setRecipient] = useState('')
  const [address, setAddress] = useState('')
  const [weight, setWeight] = useState('')
  const [generated, setGenerated] = useState<any>(null)

  const handleGenerate = () => {
    if (!recipient || !address) return
    setGenerated({
      tracking: `1Z999${Math.floor(Math.random() * 1000000)}042`,
      date: new Date().toLocaleDateString(),
      service: 'Ground',
      weight: weight || '1.0',
    })
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Shipping Details</h3>
        <label className="stack">
          Recipient Name
          <input className="input" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Customer Name" />
        </label>
        <label className="stack">
          Address
          <textarea className="textarea" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, Zip" />
        </label>
        <label className="stack">
          Weight (lbs)
          <input className="input" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </label>
        <label className="stack">
          Service
          <select className="select">
            <option>UPS Ground</option>
            <option>FedEx 2Day</option>
            <option>USPS Priority</option>
          </select>
        </label>
        <button className="button" onClick={handleGenerate}>Create Label</button>
      </div>

      <div className="card stack">
        <h3 className="section-title">Label Preview (4x6)</h3>
        {!generated ? (
          <EmptyState title="No Label" description="Enter details to generate a shipping label." />
        ) : (
          <div style={{ 
            width: 400, 
            height: 600, 
            border: '1px solid #000', 
            padding: 20, 
            margin: '0 auto', 
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontFamily: 'monospace'
          }}>
            <div style={{ borderBottom: '2px solid #000', paddingBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 24 }}>FTS LOGISTICS</div>
              <div className="small">FROM: {companyName?.toUpperCase() ?? 'WAREHOUSE'}</div>
            </div>

            <div style={{ padding: '20px 0' }}>
              <div className="small muted">SHIP TO:</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{recipient.toUpperCase()}</div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 16 }}>{address.toUpperCase()}</div>
            </div>

            <div className="grid grid-2" style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '10px 0' }}>
              <div>
                <div className="small">WEIGHT</div>
                <div>{generated.weight} LBS</div>
              </div>
              <div>
                <div className="small">DATE</div>
                <div>{generated.date}</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, fontWeight: 700 }}>{generated.service.toUpperCase()}</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ height: 60, background: '#000', width: '80%', margin: '0 auto 10px' }} />
              <div className="small">TRACKING #: {generated.tracking}</div>
            </div>
          </div>
        )}
        {generated && (
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="button secondary" onClick={() => window.print()}>Print 4x6</button>
          </div>
        )}
      </div>
    </div>
  )
}
