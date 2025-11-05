import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Products({ token }) {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to load products');
    }
  };

  return (
    <div>
      <div className="card">
        <h2 style={{ color: '#1f2937' }}>Products</h2>
        <p style={{ color: '#6b7280' }}>Click a product to view details and report stock.</p>
      </div>

      {error && <div className="error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        {products.map((p) => (
          <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/product/${encodeURIComponent(p.qr_code)}`)}>
            <h3 style={{ color: '#1f2937' }}>{p.name}</h3>
            <p style={{ color: '#6b7280' }}>{p.description}</p>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>QR: {p.qr_code}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Products;
