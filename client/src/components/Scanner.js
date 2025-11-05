import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';

function Scanner({ token }) {
  const [scanning, setScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [status, setStatus] = useState('empty');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (scanning) {
      const scanner = new Html5QrcodeScanner('reader', {
        qrbox: {
          width: 250,
          height: 250,
        },
        fps: 5,
      });

      scanner.render(onScanSuccess, onScanError);

      function onScanSuccess(decodedText) {
        scanner.clear();
        setScanning(false);
        handleQRCodeScanned(decodedText);
      }

      function onScanError(err) {
        // Handle scan error silently
      }

      return () => {
        scanner.clear().catch(err => console.error(err));
      };
    }
  }, [scanning]);

  const handleQRCodeScanned = async (qrCode) => {
    setError('');
    try {
      const response = await axios.get(`/api/products/${qrCode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setScannedProduct(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Product not found. Please try again.');
    }
  };

  const handleManualInput = async (e) => {
    e.preventDefault();
    const qrCode = e.target.qrCode.value;
    handleQRCodeScanned(qrCode);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('qrCode', scannedProduct.qr_code);
    formData.append('status', status);
    formData.append('notes', notes);
    if (image) {
      formData.append('image', image);
    }

    try {
      await axios.post('/api/reports', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setSuccess('Report submitted successfully!');
      setScannedProduct(null);
      setNotes('');
      setImage(null);
      setStatus('empty');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report. Please try again.');
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '20px', color: '#1f2937' }}>QR Code Scanner</h2>
      
      {success && <div className="success">{success}</div>}
      {error && <div className="error">{error}</div>}

      {!scannedProduct && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <button 
              className={scanning ? "btn btn-danger" : "btn btn-primary"}
              onClick={() => setScanning(!scanning)}
              style={{ marginRight: '10px' }}
            >
              {scanning ? '⏹ Stop Scanner' : '📷 Start Scanner'}
            </button>
          </div>

          {scanning && <div id="reader"></div>}

          <div style={{ marginTop: '30px' }}>
            <h3 style={{ marginBottom: '15px', color: '#1f2937' }}>Or enter QR code manually:</h3>
            <form onSubmit={handleManualInput} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                name="qrCode"
                placeholder="e.g., product-01"
                style={{ flex: 1, padding: '12px', border: '2px solid #e5e7eb', borderRadius: '6px' }}
              />
              <button type="submit" className="btn btn-primary">
                Search
              </button>
            </form>
          </div>
        </>
      )}

      {scannedProduct && (
        <div className="scanner-result">
          <h3>Product Found!</h3>
          <p><strong>Name:</strong> {scannedProduct.name}</p>
          <p><strong>QR Code:</strong> {scannedProduct.qr_code}</p>
          <p><strong>Description:</strong> {scannedProduct.description}</p>

          <form onSubmit={handleSubmitReport} style={{ marginTop: '30px' }}>
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
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="4"
                placeholder="Add any additional notes about the stock condition..."
              />
            </div>

            <div className="form-group">
              <label>Upload Image (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0])}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-success">
                Submit Report
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setScannedProduct(null)}
              >
                Scan Another
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Scanner;
