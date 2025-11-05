import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Dashboard({ token }) {
  const [products, setProducts] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchRecentReports();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchRecentReports = async () => {
    try {
      const response = await axios.get('/api/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentReports(response.data.slice(0, 5));
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  return (
    <div>
      <div className="card">
        <h2 style={{ marginBottom: '20px', color: '#1f2937' }}>Dashboard</h2>
        <p style={{ color: '#6b7280', marginBottom: '30px' }}>
          Welcome to Fill The Shelf! Scan QR codes to manage stock levels.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '30px', borderRadius: '12px', color: 'white' }}>
            <h3 style={{ fontSize: '36px', marginBottom: '10px' }}>{products.length}</h3>
            <p>Total Products</p>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', padding: '30px', borderRadius: '12px', color: 'white' }}>
            <h3 style={{ fontSize: '36px', marginBottom: '10px' }}>{recentReports.length}</h3>
            <p>Recent Reports</p>
          </div>
        </div>
        <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/scanner')}>
            📷 Scan QR Code
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/reports')}>
            📊 View All Reports
          </button>
        </div>
      </div>

      {recentReports.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '20px', color: '#1f2937' }}>Recent Reports</h3>
          {recentReports.map(report => (
            <div key={report.id} className="report-item">
              <h4>{report.product_name} ({report.qr_code})</h4>
              <p><strong>Reported by:</strong> {report.username}</p>
              <p><strong>Status:</strong> 
                <span className={`status-badge status-${report.status.toLowerCase().replace(' ', '-')}`}>
                  {report.status}
                </span>
              </p>
              {report.notes && <p><strong>Notes:</strong> {report.notes}</p>}
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                {new Date(report.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
