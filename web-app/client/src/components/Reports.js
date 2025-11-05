import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Reports({ token }) {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await axios.get('/api/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(response.data);
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  const filteredReports = filter === 'all' 
    ? reports 
    : reports.filter(report => report.status.toLowerCase() === filter);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: '#1f2937' }}>Stock Reports</h2>
        <div>
          <label style={{ marginRight: '10px', fontWeight: '600' }}>Filter:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: '8px 16px', borderRadius: '6px', border: '2px solid #e5e7eb' }}
          >
            <option value="all">All Reports</option>
            <option value="empty">Empty</option>
            <option value="low">Low Stock</option>
            <option value="in-stock">In Stock</option>
          </select>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
          No reports found.
        </p>
      ) : (
        filteredReports.map(report => (
          <div key={report.id} className="report-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div style={{ flex: 1 }}>
                <h3>{report.product_name}</h3>
                <p><strong>QR Code:</strong> {report.qr_code}</p>
                <p><strong>Reported by:</strong> {report.username}</p>
                <span className={`status-badge status-${report.status.toLowerCase().replace(' ', '-')}`}>
                  {report.status}
                </span>
                {report.notes && (
                  <div style={{ marginTop: '10px', padding: '10px', background: '#f3f4f6', borderRadius: '6px' }}>
                    <p><strong>Notes:</strong> {report.notes}</p>
                  </div>
                )}
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '10px' }}>
                  {new Date(report.created_at).toLocaleString()}
                </p>
              </div>
              {report.image_url && (
                <div>
                  <img 
                    src={report.image_url} 
                    alt="Report" 
                    className="image-preview"
                  />
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default Reports;
