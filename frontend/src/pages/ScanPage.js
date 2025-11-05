import React, { useState } from 'react';
import { API } from '../api';
import { useAuth } from '../AuthContext';

const STATUSES = [
  'Out of Stock',
  'Near Out of Stock',
  'Ordered',
  'Restocked',
];

export default function ScanPage() {
  const { token } = useAuth();
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [status, setStatus] = useState(STATUSES[0]);
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState(null);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(null); setError(null);
    try {
      const res = await API.createUpdate(token, {
        product_code: productCode,
        product_name: productName,
        status,
        notes,
        image,
      });
      setMsg(`Saved update #${res.id} for ${res.product?.code}`);
      setProductCode('');
      setProductName('');
      setNotes('');
      setImage(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '20px auto' }}>
      <h2>Scan / Report Status</h2>
      <form onSubmit={onSubmit}>
        <div style={{ display: 'grid', gap: 12 }}>
          <label>
            Product Code (QR)
            <input value={productCode} onChange={e => setProductCode(e.target.value)} required />
          </label>
          <label>
            Product Name (optional)
            <input value={productName} onChange={e => setProductName(e.target.value)} />
          </label>
          <label>
            Status
            <select value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>
            Notes
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </label>
          <label>
            Image (optional)
            <input type="file" accept="image/*" onChange={e => setImage(e.target.files?.[0] || null)} />
          </label>
          <button type="submit">Submit Update</button>
          {msg && <div style={{ color: 'green' }}>{msg}</div>}
          {error && <div style={{ color: 'red' }}>{String(error)}</div>}
        </div>
      </form>
    </div>
  );
}
