import { useMemo, useState } from 'react'
import { useCompany } from '../../contexts/CompanyContext'
import { EmptyState } from '../EmptyState'
import { toast } from 'sonner'

export const ShippingLabelsTab = () => {
  const { companyName } = useCompany()
  const [recipient, setRecipient] = useState('')
  const [street1, setStreet1] = useState('')
  const [street2, setStreet2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [weight, setWeight] = useState('')
  const [generated, setGenerated] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [estimatedCost, setEstimatedCost] = useState<string | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState('')

  const orders = useMemo(
    () => [
      {
        id: 'ORD-1042',
        recipient: 'Jamie Collins',
        address: {
          street1: '124 Market St',
          street2: 'Suite 400',
          city: 'San Francisco',
          state: 'CA',
          zip: '94105',
        },
      },
      {
        id: 'ORD-1043',
        recipient: 'Sasha Rivera',
        address: {
          street1: '560 Lakeview Ave',
          street2: '',
          city: 'Austin',
          state: 'TX',
          zip: '73301',
        },
      },
      {
        id: 'ORD-1044',
        recipient: 'Morgan Lee',
        address: {
          street1: '32 Pine St',
          street2: 'Apt 8B',
          city: 'Chicago',
          state: 'IL',
          zip: '60601',
        },
      },
    ],
    [],
  )

  const handleGenerate = async () => {
    if (!recipient || !street1 || !city || !state || !zip) return
    setIsGenerating(true)
    const toastId = toast.loading('Generating label...')

    await new Promise((resolve) => setTimeout(resolve, 800))

    setGenerated({
      tracking: `1Z999${Math.floor(Math.random() * 1000000)}042`,
      date: new Date().toLocaleDateString(),
      service: 'Ground',
      weight: weight || '1.0',
    })
    toast.success('Shipping label created', { id: toastId })
    setIsGenerating(false)
  }

  const handleOrderSelect = (value: string) => {
    setSelectedOrderId(value)
    const order = orders.find((o) => o.id === value)
    if (!order) return
    setRecipient(order.recipient)
    setStreet1(order.address.street1)
    setStreet2(order.address.street2)
    setCity(order.address.city)
    setState(order.address.state)
    setZip(order.address.zip)
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Shipping Details</h3>
        <label className="stack">
          Select Order
          <input
            className="input"
            list="orders"
            placeholder="Search orders..."
            value={selectedOrderId}
            onChange={(e) => handleOrderSelect(e.target.value)}
          />
          <datalist id="orders">
            {orders.map((order) => (
              <option key={order.id} value={order.id}>{order.id} — {order.recipient}</option>
            ))}
          </datalist>
        </label>
        <label className="stack">
          Recipient Name
          <input className="input" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Customer Name" />
        </label>
        <label className="stack">
          Street 1
          <input className="input" value={street1} onChange={(e) => setStreet1(e.target.value)} placeholder="Street address" />
        </label>
        <label className="stack">
          Street 2
          <input className="input" value={street2} onChange={(e) => setStreet2(e.target.value)} placeholder="Apt, Suite, etc." />
        </label>
        <div className="grid grid-2">
          <label className="stack">
            City
            <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
          </label>
          <label className="stack">
            State
            <input className="input" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
          </label>
          <label className="stack">
            Zip
            <input className="input" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP" />
          </label>
        </div>
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
        <button
          className="button ghost"
          type="button"
          onClick={() => setEstimatedCost(`$${(Math.random() * 12 + 4).toFixed(2)}`)}
        >
          Calculate Rate
        </button>
        <div className="row">
          <button className="button" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Create Label'}
          </button>
          {estimatedCost && <span className="pill">Estimated Cost: {estimatedCost}</span>}
        </div>
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
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 16 }}>
                {[street1, street2, `${city}, ${state} ${zip}`].filter(Boolean).join('\n').toUpperCase()}
              </div>
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
