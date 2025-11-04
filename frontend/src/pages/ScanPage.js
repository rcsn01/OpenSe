import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../api';

function ScanPage() {
  const [qrIdentifier, setQrIdentifier] = useState('');
  const [status, setStatus] = useState('Out of Stock');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scanning, setScanning] = useState(true);
  
  const navigate = useNavigate();

  useEffect(() => {
    let scanner = null;

    if (scanning && !qrIdentifier) {
      scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        false
      );

      scanner.render(
        (decodedText) => {
          setQrIdentifier(decodedText);
          setScanning(false);
          scanner.clear();
        },
        (error) => {
          // Scanning errors are normal, don't display them
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [scanning, qrIdentifier]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('qr_identifier', qrIdentifier);
      formData.append('status', status);
      formData.append('notes', notes);
      
      if (image) {
        formData.append('image', image);
      }

      const response = await api.post('/api/updates', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess('Update submitted successfully!');
      
      // Reset form after 1.5 seconds and navigate to dashboard
      setTimeout(() => {
        navigate('/');
      }, 1500);
      
    } catch (err) {
      setError(
        err.response?.data?.error || 
        'Failed to submit update. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRescan = () => {
    setQrIdentifier('');
    setStatus('Out of Stock');
    setNotes('');
    setImage(null);
    setImagePreview(null);
    setError('');
    setSuccess('');
    setScanning(true);
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 120px)',
      padding: '2rem',
      backgroundColor: '#ecf0f1'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '1.5rem', color: '#2c3e50' }}>
          Scan Product QR Code
        </h2>

        {!qrIdentifier ? (
          <div>
            <div id="qr-reader" style={{ marginBottom: '1rem' }}></div>
            <p style={{ textAlign: 'center', color: '#777', fontSize: '0.9rem' }}>
              Position the QR code within the frame to scan
            </p>
          </div>
        ) : (
          <div>
            <div style={{
              padding: '1rem',
              backgroundColor: '#d5f4e6',
              borderRadius: '4px',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong>Scanned Product:</strong> {qrIdentifier}
              </div>
              <button
                onClick={handleRescan}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Rescan
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#555',
                  fontWeight: 'bold'
                }}>
                  Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="Out of Stock">Out of Stock</option>
                  <option value="Near Out of Stock">Near Out of Stock</option>
                  <option value="Ordered">Ordered</option>
                  <option value="Restocked">Restocked</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#555',
                  fontWeight: 'bold'
                }}>
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="4"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    resize: 'vertical'
                  }}
                  placeholder="Add any additional notes..."
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#555',
                  fontWeight: 'bold'
                }}>
                  Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
                {imagePreview && (
                  <div style={{ marginTop: '1rem' }}>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}
                    />
                  </div>
                )}
              </div>

              {error && (
                <div style={{
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  backgroundColor: '#fee',
                  color: '#c33',
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  backgroundColor: '#d5f4e6',
                  color: '#27ae60',
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}>
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: loading ? '#95a5a6' : '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Submitting...' : 'Submit Update'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScanPage;
