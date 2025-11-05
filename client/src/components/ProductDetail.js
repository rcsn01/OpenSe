import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function ProductDetail({ token }) {
  const { qrCode } = useParams();
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('empty');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProduct();
  }, [qrCode]);

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`/api/products/${encodeURIComponent(qrCode)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProduct(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to load product');
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('qrCode', product.qr_code);
    formData.append('status', status);
    formData.append('notes', notes);
    if (image) formData.append('image', image);

    try {
      await axios.post('/api/reports', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setSuccess('Report submitted successfully!');
      setNotes('');
      setImage(null);
      setStatus('empty');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to submit report');
    }
  };

  if (!product) {
    return (
      <div className="card">
        {error ? <div className="error">{error}</div> : <p>Loading product...</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>{product.name}</h2>
        <p style={{ color: '#6b7280' }}>{product.description}</p>
        <p style={{ fontSize: '12px', color: '#9ca3af' }}>QR: {product.qr_code}</p>
      </div>

      <div className="card">
        <h3>Report Stock</h3>
        {success && <div className="success">{success}</div>}
        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmitReport}>
          <div className="form-group">
            <label>Stock Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="empty">Empty</option>
              <option value="low">Low Stock</option>
              <option value="in-stock">In Stock</option>
            </select>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
          </div>

          <div className="form-group">
            <label>Upload Image (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-success">Submit Report</button>
            <button type="button" className="btn btn-secondary" onClick={() => { setNotes(''); setImage(null); setStatus('empty'); }}>Reset</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductDetail;
